import sharp from 'sharp';
import { mkdir } from 'fs/promises';
import { join } from 'path';

const baseDir = '/Users/peleke/Documents/Projects/graphix/otters-yacht/golden-hour';
const captionedDir = join(baseDir, 'captioned');
const outputDir = join(baseDir, 'pages-captioned');

// Page dimensions (comic standard)
const PAGE_WIDTH = 2100;
const PAGE_HEIGHT = 2800;
const GUTTER = 30;
const MARGIN = 60;

await mkdir(outputDir, { recursive: true });

// Helper to compose a 6-panel grid page
async function compose6Grid(panelPaths, outputName) {
  const cols = 2;
  const rows = 3;
  const panelWidth = Math.floor((PAGE_WIDTH - 2 * MARGIN - (cols - 1) * GUTTER) / cols);
  const panelHeight = Math.floor((PAGE_HEIGHT - 2 * MARGIN - (rows - 1) * GUTTER) / rows);

  const composites = [];

  for (let i = 0; i < panelPaths.length && i < 6; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = MARGIN + col * (panelWidth + GUTTER);
    const y = MARGIN + row * (panelHeight + GUTTER);

    const resized = await sharp(panelPaths[i])
      .resize(panelWidth, panelHeight, { fit: 'cover' })
      .toBuffer();

    composites.push({
      input: resized,
      left: x,
      top: y
    });
  }

  await sharp({
    create: {
      width: PAGE_WIDTH,
      height: PAGE_HEIGHT,
      channels: 3,
      background: { r: 255, g: 255, b: 255 }
    }
  })
  .composite(composites)
  .png()
  .toFile(join(outputDir, outputName));

  console.log(`Created ${outputName}`);
}

// Helper to compose a 2-panel page
async function compose2Panel(panelPaths, outputName) {
  const panelWidth = PAGE_WIDTH - 2 * MARGIN;
  const panelHeight = Math.floor((PAGE_HEIGHT - 2 * MARGIN - GUTTER) / 2);

  const composites = [];

  for (let i = 0; i < panelPaths.length && i < 2; i++) {
    const x = MARGIN;
    const y = MARGIN + i * (panelHeight + GUTTER);

    const resized = await sharp(panelPaths[i])
      .resize(panelWidth, panelHeight, { fit: 'cover' })
      .toBuffer();

    composites.push({
      input: resized,
      left: x,
      top: y
    });
  }

  await sharp({
    create: {
      width: PAGE_WIDTH,
      height: PAGE_HEIGHT,
      channels: 3,
      background: { r: 255, g: 255, b: 255 }
    }
  })
  .composite(composites)
  .png()
  .toFile(join(outputDir, outputName));

  console.log(`Created ${outputName}`);
}

// Compose pages
const panels = Array.from({ length: 20 }, (_, i) =>
  join(captionedDir, `panel_${String(i + 1).padStart(2, '0')}.png`)
);

// Page 1: panels 1-6
await compose6Grid(panels.slice(0, 6), 'page_01_captioned.png');

// Page 2: panels 7-12
await compose6Grid(panels.slice(6, 12), 'page_02_captioned.png');

// Page 3: panels 13-18
await compose6Grid(panels.slice(12, 18), 'page_03_captioned.png');

// Page 4: panels 19-20 (2 panel layout)
await compose2Panel(panels.slice(18, 20), 'page_04_captioned.png');

console.log('Done! Captioned pages created.');
