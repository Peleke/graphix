/**
 * Caption Renderer
 *
 * Generates SVG bubbles and text for comic captions.
 * Supports speech bubbles, thought bubbles, narration boxes, SFX, and whispers.
 */

import sharp from "sharp";
import type { CaptionType, CaptionStyle, CaptionPosition } from "../db/index.js";
import {
  type RenderableCaption,
  type CaptionBounds,
  type RenderedCaption,
  getMergedStyle,
} from "./caption-types.js";
import {
  type CaptionEffect,
  generateSpeedLinesDefs,
  generateExplosionPath,
  generateGradientDef,
  generateWobbleFilter,
  generateGlowFilter,
  generateElectricEffect,
  generateMangaEmphasis,
  generateScreentonePattern,
  getEffectPreset,
} from "./caption-effects.js";

/**
 * Estimate text dimensions (rough approximation)
 * In production, you'd use a proper text measurement library
 */
function estimateTextDimensions(
  text: string,
  fontSize: number,
  maxWidth: number,
  fontFamily: string
): { width: number; height: number; lines: string[] } {
  // Approximate character width based on font size
  // This is a rough estimate - Comic Sans is wider than average
  const isMonospace = fontFamily.toLowerCase().includes("mono");
  const charWidthRatio = isMonospace ? 0.6 : 0.55;
  const charWidth = fontSize * charWidthRatio;
  const lineHeight = fontSize * 1.3;

  // Word wrap
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = testLine.length * charWidth;

    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }

  // Calculate dimensions
  const longestLine = Math.max(...lines.map((l) => l.length));
  const width = Math.min(longestLine * charWidth, maxWidth);
  const height = lines.length * lineHeight;

  return { width, height, lines };
}

/**
 * Generate SVG for a speech bubble
 */
function generateSpeechBubbleSVG(
  text: string,
  style: CaptionStyle,
  tailDirection?: CaptionPosition,
  panelWidth?: number,
  panelHeight?: number
): { svg: string; width: number; height: number } {
  const maxWidthPx = panelWidth
    ? (style.maxWidth / 100) * panelWidth
    : 200;
  const { width: textWidth, height: textHeight, lines } = estimateTextDimensions(
    text,
    style.fontSize,
    maxWidthPx,
    style.fontFamily
  );

  const padding = style.padding;
  const bubbleWidth = textWidth + padding * 2;
  const bubbleHeight = textHeight + padding * 2;
  const tailSize = 20;

  // Total SVG size including tail
  const svgWidth = bubbleWidth + 10;
  const svgHeight = bubbleHeight + tailSize + 10;

  // Calculate tail points
  const tailStartX = bubbleWidth * 0.3;
  const tailEndX = bubbleWidth * 0.5;
  let tailPointX = bubbleWidth * 0.4;
  let tailPointY = bubbleHeight + tailSize;

  // Adjust tail direction if specified
  if (tailDirection && panelWidth && panelHeight) {
    // Point tail toward the speaker
    const dx = (tailDirection.x / 100) * panelWidth - bubbleWidth / 2;
    const dy = (tailDirection.y / 100) * panelHeight - bubbleHeight / 2;
    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal tail
      tailPointX = dx > 0 ? bubbleWidth + tailSize : -tailSize;
      tailPointY = bubbleHeight / 2;
    }
  }

  const strokeDash = style.borderStyle === "dashed" ? 'stroke-dasharray="5,5"' : "";

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}">
  <defs>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="2" stdDeviation="2" flood-opacity="0.3"/>
    </filter>
  </defs>
  <g filter="url(#shadow)" opacity="${style.opacity}">
    <!-- Bubble body -->
    <ellipse
      cx="${bubbleWidth / 2}"
      cy="${bubbleHeight / 2}"
      rx="${bubbleWidth / 2}"
      ry="${bubbleHeight / 2}"
      fill="${style.backgroundColor}"
      stroke="${style.borderColor}"
      stroke-width="${style.borderWidth}"
      ${strokeDash}
    />
    <!-- Tail -->
    <polygon
      points="${tailStartX},${bubbleHeight - 5} ${tailEndX},${bubbleHeight - 5} ${tailPointX},${tailPointY}"
      fill="${style.backgroundColor}"
      stroke="${style.borderColor}"
      stroke-width="${style.borderWidth}"
    />
    <!-- Cover tail connection -->
    <rect
      x="${tailStartX}"
      y="${bubbleHeight / 2}"
      width="${tailEndX - tailStartX}"
      height="${bubbleHeight / 2}"
      fill="${style.backgroundColor}"
    />
  </g>
  <!-- Text -->
  <text
    x="${bubbleWidth / 2}"
    y="${padding + style.fontSize}"
    font-family="${style.fontFamily}"
    font-size="${style.fontSize}"
    font-weight="${style.fontWeight}"
    fill="${style.fontColor}"
    text-anchor="middle"
  >
    ${lines.map((line, i) => `<tspan x="${bubbleWidth / 2}" dy="${i === 0 ? 0 : style.fontSize * 1.3}">${escapeXml(line)}</tspan>`).join("\n    ")}
  </text>
</svg>`;

  return { svg: svg.trim(), width: svgWidth, height: svgHeight };
}

/**
 * Generate SVG for a thought bubble (cloud shape with small circles)
 */
function generateThoughtBubbleSVG(
  text: string,
  style: CaptionStyle,
  tailDirection?: CaptionPosition,
  panelWidth?: number,
  panelHeight?: number
): { svg: string; width: number; height: number } {
  const maxWidthPx = panelWidth
    ? (style.maxWidth / 100) * panelWidth
    : 180;
  const { width: textWidth, height: textHeight, lines } = estimateTextDimensions(
    text,
    style.fontSize,
    maxWidthPx,
    style.fontFamily
  );

  const padding = style.padding;
  const bubbleWidth = textWidth + padding * 2;
  const bubbleHeight = textHeight + padding * 2;

  const svgWidth = bubbleWidth + 30;
  const svgHeight = bubbleHeight + 40;

  // Cloud bumps
  const bumps: string[] = [];
  const numBumps = Math.ceil(bubbleWidth / 30);
  for (let i = 0; i < numBumps; i++) {
    const x = (bubbleWidth / numBumps) * (i + 0.5);
    const y = 5;
    const r = 15 + Math.random() * 5;
    bumps.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="${style.backgroundColor}" stroke="${style.borderColor}" stroke-width="${style.borderWidth}"/>`);
  }
  for (let i = 0; i < numBumps; i++) {
    const x = (bubbleWidth / numBumps) * (i + 0.5);
    const y = bubbleHeight - 5;
    const r = 15 + Math.random() * 5;
    bumps.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="${style.backgroundColor}" stroke="${style.borderColor}" stroke-width="${style.borderWidth}"/>`);
  }

  // Thought trail (small circles leading to thinker)
  const trailCircles = `
    <circle cx="${bubbleWidth * 0.4}" cy="${bubbleHeight + 15}" r="8" fill="${style.backgroundColor}" stroke="${style.borderColor}" stroke-width="${style.borderWidth}"/>
    <circle cx="${bubbleWidth * 0.35}" cy="${bubbleHeight + 28}" r="5" fill="${style.backgroundColor}" stroke="${style.borderColor}" stroke-width="${style.borderWidth}"/>
    <circle cx="${bubbleWidth * 0.32}" cy="${bubbleHeight + 38}" r="3" fill="${style.backgroundColor}" stroke="${style.borderColor}" stroke-width="${style.borderWidth}"/>
  `;

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}">
  <g opacity="${style.opacity}">
    <!-- Cloud bumps -->
    ${bumps.join("\n    ")}
    <!-- Main body -->
    <ellipse
      cx="${bubbleWidth / 2}"
      cy="${bubbleHeight / 2}"
      rx="${bubbleWidth / 2 - 10}"
      ry="${bubbleHeight / 2 - 5}"
      fill="${style.backgroundColor}"
    />
    <!-- Thought trail -->
    ${trailCircles}
  </g>
  <!-- Text -->
  <text
    x="${bubbleWidth / 2}"
    y="${padding + style.fontSize}"
    font-family="${style.fontFamily}"
    font-size="${style.fontSize}"
    font-weight="${style.fontWeight}"
    fill="${style.fontColor}"
    text-anchor="middle"
    font-style="italic"
  >
    ${lines.map((line, i) => `<tspan x="${bubbleWidth / 2}" dy="${i === 0 ? 0 : style.fontSize * 1.3}">${escapeXml(line)}</tspan>`).join("\n    ")}
  </text>
</svg>`;

  return { svg: svg.trim(), width: svgWidth, height: svgHeight };
}

/**
 * Generate SVG for a narration box
 */
function generateNarrationBoxSVG(
  text: string,
  style: CaptionStyle,
  panelWidth?: number
): { svg: string; width: number; height: number } {
  const maxWidthPx = panelWidth
    ? (style.maxWidth / 100) * panelWidth
    : 300;
  const { width: textWidth, height: textHeight, lines } = estimateTextDimensions(
    text,
    style.fontSize,
    maxWidthPx,
    style.fontFamily
  );

  const padding = style.padding;
  const boxWidth = textWidth + padding * 2;
  const boxHeight = textHeight + padding * 2;
  const borderRadius = 4;

  const svgWidth = boxWidth + 10;
  const svgHeight = boxHeight + 10;

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}">
  <defs>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="1" dy="1" stdDeviation="1" flood-opacity="0.2"/>
    </filter>
  </defs>
  <g filter="url(#shadow)" opacity="${style.opacity}">
    <rect
      x="2"
      y="2"
      width="${boxWidth}"
      height="${boxHeight}"
      rx="${borderRadius}"
      ry="${borderRadius}"
      fill="${style.backgroundColor}"
      stroke="${style.borderColor}"
      stroke-width="${style.borderWidth}"
    />
  </g>
  <text
    x="${padding + 2}"
    y="${padding + style.fontSize}"
    font-family="${style.fontFamily}"
    font-size="${style.fontSize}"
    font-weight="${style.fontWeight}"
    fill="${style.fontColor}"
  >
    ${lines.map((line, i) => `<tspan x="${padding + 2}" dy="${i === 0 ? 0 : style.fontSize * 1.3}">${escapeXml(line)}</tspan>`).join("\n    ")}
  </text>
</svg>`;

  return { svg: svg.trim(), width: svgWidth, height: svgHeight };
}

/**
 * Generate SVG for SFX text (stylized, no bubble)
 */
function generateSFXTextSVG(
  text: string,
  style: CaptionStyle
): { svg: string; width: number; height: number } {
  const fontSize = style.fontSize;
  const charWidth = fontSize * 0.7;
  const textWidth = text.length * charWidth;
  const textHeight = fontSize * 1.2;

  const svgWidth = textWidth + 20;
  const svgHeight = textHeight + 20;

  // Add stroke outline for SFX effect
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}">
  <defs>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <text
    x="${svgWidth / 2}"
    y="${svgHeight / 2 + fontSize / 3}"
    font-family="${style.fontFamily}"
    font-size="${fontSize}"
    font-weight="${style.fontWeight}"
    fill="${style.fontColor}"
    stroke="${style.borderColor}"
    stroke-width="${style.borderWidth}"
    text-anchor="middle"
    filter="url(#glow)"
    opacity="${style.opacity}"
  >${escapeXml(text.toUpperCase())}</text>
</svg>`;

  return { svg: svg.trim(), width: svgWidth, height: svgHeight };
}

/**
 * Generate SVG for whisper bubble (dashed border)
 */
function generateWhisperBubbleSVG(
  text: string,
  style: CaptionStyle,
  tailDirection?: CaptionPosition,
  panelWidth?: number,
  panelHeight?: number
): { svg: string; width: number; height: number } {
  // Use speech bubble with dashed style
  const whisperStyle: CaptionStyle = {
    ...style,
    borderStyle: "dashed",
  };
  return generateSpeechBubbleSVG(text, whisperStyle, tailDirection, panelWidth, panelHeight);
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Apply effects to an SVG caption
 * Returns modified SVG with effects applied
 */
function applyEffects(
  baseSvg: string,
  effects: CaptionEffect[],
  width: number,
  height: number,
  id: string
): string {
  if (effects.length === 0) return baseSvg;

  const defs: string[] = [];
  const backgroundLayers: string[] = [];
  const foregroundLayers: string[] = [];
  let filterRef = "";
  let fillOverride = "";

  for (const effect of effects) {
    const effectId = `${id}-${effect.type}`;

    switch (effect.type) {
      case "speed_lines":
        backgroundLayers.push(generateSpeedLinesDefs(effect, width, height, effectId));
        break;

      case "explosion":
        backgroundLayers.push(generateExplosionPath(effect, width / 2, height / 2, Math.min(width, height) / 2, effectId));
        break;

      case "gradient":
        defs.push(generateGradientDef(effect, effectId));
        fillOverride = `url(#${effectId})`;
        break;

      case "wobble":
        defs.push(generateWobbleFilter(effect, effectId));
        filterRef = `filter="url(#${effectId})"`;
        break;

      case "glow":
        defs.push(generateGlowFilter(effect, effectId));
        filterRef = `filter="url(#${effectId})"`;
        break;

      case "electric":
        foregroundLayers.push(generateElectricEffect(effect, width, height, effectId));
        break;

      case "manga_emphasis":
        foregroundLayers.push(generateMangaEmphasis(effect, width / 2, height / 2, Math.min(width, height) / 2.5, effectId));
        break;

      case "screentone":
        defs.push(generateScreentonePattern(effect, effectId));
        // Screentone is applied as a fill pattern overlay
        foregroundLayers.push(`<rect x="0" y="0" width="${width}" height="${height}" fill="url(#${effectId})" opacity="0.3"/>`);
        break;
    }
  }

  // Reconstruct SVG with effects
  // Find the closing </svg> tag and inject our layers before it
  const svgCloseIdx = baseSvg.lastIndexOf("</svg>");
  if (svgCloseIdx === -1) return baseSvg;

  // Find existing <defs> or create insertion point after <svg> tag
  const defsMatch = baseSvg.match(/<defs[^>]*>([\s\S]*?)<\/defs>/);
  let modifiedSvg = baseSvg;

  if (defs.length > 0) {
    if (defsMatch) {
      // Append to existing defs
      modifiedSvg = modifiedSvg.replace(
        defsMatch[0],
        `<defs>${defsMatch[1]}\n${defs.join("\n")}</defs>`
      );
    } else {
      // Insert new defs after opening svg tag
      const svgOpenEnd = modifiedSvg.indexOf(">") + 1;
      modifiedSvg =
        modifiedSvg.slice(0, svgOpenEnd) +
        `\n<defs>${defs.join("\n")}</defs>` +
        modifiedSvg.slice(svgOpenEnd);
    }
  }

  // Add filter attribute to main content group if needed
  if (filterRef) {
    // Wrap existing content in a filtered group
    const contentStart = modifiedSvg.indexOf(">", modifiedSvg.indexOf("<svg")) + 1;
    const contentEnd = modifiedSvg.lastIndexOf("</svg>");
    const existingContent = modifiedSvg.slice(contentStart, contentEnd);

    // Don't wrap defs in the filter
    const defsPattern = /<defs[\s\S]*?<\/defs>/g;
    const defsContent = existingContent.match(defsPattern)?.join("") ?? "";
    const nonDefsContent = existingContent.replace(defsPattern, "");

    modifiedSvg =
      modifiedSvg.slice(0, contentStart) +
      defsContent +
      backgroundLayers.join("\n") +
      `<g ${filterRef}>${nonDefsContent}</g>` +
      foregroundLayers.join("\n") +
      "</svg>";
  } else {
    // Just add background and foreground layers
    const contentEnd = modifiedSvg.lastIndexOf("</svg>");
    modifiedSvg =
      modifiedSvg.slice(0, contentEnd) +
      foregroundLayers.join("\n") +
      "</svg>";

    // Insert background layers after defs (or at start)
    if (backgroundLayers.length > 0) {
      const insertPoint = modifiedSvg.indexOf("</defs>");
      if (insertPoint !== -1) {
        modifiedSvg =
          modifiedSvg.slice(0, insertPoint + 7) +
          backgroundLayers.join("\n") +
          modifiedSvg.slice(insertPoint + 7);
      }
    }
  }

  return modifiedSvg;
}

/**
 * Render a single caption to SVG and PNG buffer
 */
export async function renderCaption(
  caption: RenderableCaption,
  panelWidth: number,
  panelHeight: number
): Promise<RenderedCaption> {
  const style = getMergedStyle(caption.type, caption.style);

  let result: { svg: string; width: number; height: number };

  switch (caption.type) {
    case "speech":
      result = generateSpeechBubbleSVG(
        caption.text,
        style,
        caption.tailDirection,
        panelWidth,
        panelHeight
      );
      break;
    case "thought":
      result = generateThoughtBubbleSVG(
        caption.text,
        style,
        caption.tailDirection,
        panelWidth,
        panelHeight
      );
      break;
    case "narration":
      result = generateNarrationBoxSVG(caption.text, style, panelWidth);
      break;
    case "sfx":
      result = generateSFXTextSVG(caption.text, style);
      break;
    case "whisper":
      result = generateWhisperBubbleSVG(
        caption.text,
        style,
        caption.tailDirection,
        panelWidth,
        panelHeight
      );
      break;
    default:
      throw new Error(`Unknown caption type: ${caption.type}`);
  }

  // Apply effects if specified
  let finalSvg = result.svg;
  const effects = caption.effects ?? (caption.effectPreset ? getEffectPreset(caption.effectPreset) : []);

  if (effects.length > 0) {
    const captionId = caption.id ?? `caption-${Date.now()}`;
    finalSvg = applyEffects(result.svg, effects, result.width, result.height, captionId);
  }

  // Convert SVG to PNG buffer
  const buffer = await sharp(Buffer.from(finalSvg))
    .png()
    .toBuffer();

  // Calculate pixel position
  const x = (caption.position.x / 100) * panelWidth - result.width / 2;
  const y = (caption.position.y / 100) * panelHeight - result.height / 2;

  return {
    caption,
    bounds: {
      x: Math.max(0, x),
      y: Math.max(0, y),
      width: result.width,
      height: result.height,
    },
    svgContent: finalSvg,
    buffer,
  };
}

/**
 * Render multiple captions, sorted by zIndex
 */
export async function renderCaptions(
  captions: RenderableCaption[],
  panelWidth: number,
  panelHeight: number
): Promise<RenderedCaption[]> {
  // Sort by zIndex
  const sorted = [...captions].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));

  // Render all captions
  const rendered = await Promise.all(
    sorted.map((caption) => renderCaption(caption, panelWidth, panelHeight))
  );

  return rendered;
}

/**
 * Composite captions onto an image
 */
export async function compositeCaptions(
  imagePath: string,
  captions: RenderableCaption[],
  outputPath?: string
): Promise<Buffer> {
  // Get image dimensions
  const image = sharp(imagePath);
  const metadata = await image.metadata();
  const width = metadata.width ?? 512;
  const height = metadata.height ?? 768;

  // Render all captions
  const rendered = await renderCaptions(captions, width, height);

  // Build composite operations
  const composites = rendered.map((r) => ({
    input: r.buffer,
    top: Math.round(r.bounds.y),
    left: Math.round(r.bounds.x),
  }));

  // Composite onto image
  let result = image.composite(composites);

  if (outputPath) {
    await result.toFile(outputPath);
  }

  return result.toBuffer();
}
