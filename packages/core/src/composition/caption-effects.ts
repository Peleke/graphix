/**
 * Caption Effects
 *
 * Advanced SVG effects for stylized comic captions:
 * - Speed lines (manga action lines)
 * - Explosion/burst shapes
 * - Gradient fills
 * - Hand-drawn wobble
 * - Glow/neon
 * - Jagged borders
 */

// ============================================================================
// Types
// ============================================================================

export type EffectType =
  | "speed_lines"
  | "explosion"
  | "gradient"
  | "wobble"
  | "glow"
  | "jagged"
  | "electric"
  | "manga_emphasis"
  | "screentone";

export interface SpeedLinesEffect {
  type: "speed_lines";
  direction: "left" | "right" | "radial";
  density: number; // 1-10, number of lines
  color?: string;
  opacity?: number;
}

export interface ExplosionEffect {
  type: "explosion";
  spikes: number; // 6-16
  innerRadius?: number; // 0-1, ratio of outer radius
  color?: string;
  secondaryColor?: string;
}

export interface GradientEffect {
  type: "gradient";
  style: "linear" | "radial";
  colors: string[]; // 2+ colors
  angle?: number; // for linear, 0-360
}

export interface WobbleEffect {
  type: "wobble";
  intensity: number; // 1-10
  seed?: number;
}

export interface GlowEffect {
  type: "glow";
  color: string;
  blur: number; // 2-20
  spread?: number;
}

export interface JaggedEffect {
  type: "jagged";
  spikes: number; // 4-20
  depth: number; // 1-10
}

export interface ElectricEffect {
  type: "electric";
  bolts: number; // 2-8
  color?: string;
}

export interface MangaEmphasisEffect {
  type: "manga_emphasis";
  style: "impact" | "surprise" | "dramatic" | "comedy";
}

export interface ScreentoneEffect {
  type: "screentone";
  pattern: "dots" | "lines" | "crosshatch";
  density: number; // 1-10
  color?: string;
}

export type CaptionEffect =
  | SpeedLinesEffect
  | ExplosionEffect
  | GradientEffect
  | WobbleEffect
  | GlowEffect
  | JaggedEffect
  | ElectricEffect
  | MangaEmphasisEffect
  | ScreentoneEffect;

// ============================================================================
// SVG Generators
// ============================================================================

/**
 * Generate SVG defs for speed lines effect
 */
export function generateSpeedLinesDefs(
  effect: SpeedLinesEffect,
  width: number,
  height: number,
  id: string
): string {
  const color = effect.color ?? "#000000";
  const opacity = effect.opacity ?? 0.3;
  const lines: string[] = [];

  if (effect.direction === "radial") {
    // Radial speed lines emanating from center
    const cx = width / 2;
    const cy = height / 2;
    const maxRadius = Math.max(width, height);
    const angleStep = 360 / (effect.density * 8);

    for (let angle = 0; angle < 360; angle += angleStep) {
      const rad = (angle * Math.PI) / 180;
      const x2 = cx + Math.cos(rad) * maxRadius;
      const y2 = cy + Math.sin(rad) * maxRadius;
      const startR = maxRadius * 0.3;
      const x1 = cx + Math.cos(rad) * startR;
      const y1 = cy + Math.sin(rad) * startR;

      lines.push(
        `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="1" opacity="${opacity}"/>`
      );
    }
  } else {
    // Horizontal speed lines
    const direction = effect.direction === "left" ? -1 : 1;
    const lineCount = effect.density * 3;
    const spacing = height / lineCount;

    for (let i = 0; i < lineCount; i++) {
      const y = spacing * i + spacing / 2;
      const length = width * (0.3 + Math.random() * 0.4);
      const startX = direction === 1 ? -length * 0.2 : width + length * 0.2;
      const endX = startX + direction * length;

      lines.push(
        `<line x1="${startX}" y1="${y}" x2="${endX}" y2="${y}" stroke="${color}" stroke-width="${1 + Math.random()}" opacity="${opacity * (0.5 + Math.random() * 0.5)}" stroke-linecap="round"/>`
      );
    }
  }

  return `<g id="${id}-speedlines">${lines.join("\n")}</g>`;
}

/**
 * Generate SVG path for explosion/burst shape
 */
export function generateExplosionPath(
  effect: ExplosionEffect,
  cx: number,
  cy: number,
  outerRadius: number,
  id: string
): string {
  const spikes = effect.spikes ?? 12;
  const innerRatio = effect.innerRadius ?? 0.5;
  const innerRadius = outerRadius * innerRatio;

  const points: string[] = [];
  const angleStep = (Math.PI * 2) / spikes;

  for (let i = 0; i < spikes; i++) {
    // Outer point
    const outerAngle = angleStep * i - Math.PI / 2;
    const ox = cx + Math.cos(outerAngle) * outerRadius;
    const oy = cy + Math.sin(outerAngle) * outerRadius;
    points.push(`${ox},${oy}`);

    // Inner point
    const innerAngle = outerAngle + angleStep / 2;
    const ix = cx + Math.cos(innerAngle) * innerRadius;
    const iy = cy + Math.sin(innerAngle) * innerRadius;
    points.push(`${ix},${iy}`);
  }

  const color = effect.color ?? "#FFFF00";
  const secondaryColor = effect.secondaryColor ?? "#FF6600";

  return `
    <defs>
      <radialGradient id="${id}-explosion-grad">
        <stop offset="0%" stop-color="${color}"/>
        <stop offset="100%" stop-color="${secondaryColor}"/>
      </radialGradient>
    </defs>
    <polygon points="${points.join(" ")}" fill="url(#${id}-explosion-grad)" stroke="#000000" stroke-width="2"/>
  `;
}

/**
 * Generate gradient definition
 */
export function generateGradientDef(
  effect: GradientEffect,
  id: string
): string {
  const stops = effect.colors.map((color, i) => {
    const offset = (i / (effect.colors.length - 1)) * 100;
    return `<stop offset="${offset}%" stop-color="${color}"/>`;
  });

  if (effect.style === "radial") {
    return `
      <radialGradient id="${id}">
        ${stops.join("\n")}
      </radialGradient>
    `;
  } else {
    const angle = effect.angle ?? 0;
    const rad = (angle * Math.PI) / 180;
    const x1 = 50 - Math.cos(rad) * 50;
    const y1 = 50 - Math.sin(rad) * 50;
    const x2 = 50 + Math.cos(rad) * 50;
    const y2 = 50 + Math.sin(rad) * 50;

    return `
      <linearGradient id="${id}" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">
        ${stops.join("\n")}
      </linearGradient>
    `;
  }
}

/**
 * Generate wobble filter for hand-drawn effect
 */
export function generateWobbleFilter(
  effect: WobbleEffect,
  id: string
): string {
  const intensity = effect.intensity ?? 3;
  const seed = effect.seed ?? Math.floor(Math.random() * 1000);

  return `
    <filter id="${id}" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="turbulence" baseFrequency="${0.01 * intensity}" numOctaves="2" seed="${seed}" result="turbulence"/>
      <feDisplacementMap in="SourceGraphic" in2="turbulence" scale="${intensity * 2}" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
  `;
}

/**
 * Generate glow filter
 */
export function generateGlowFilter(
  effect: GlowEffect,
  id: string
): string {
  const spread = effect.spread ?? 1;

  return `
    <filter id="${id}" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="${effect.blur}" result="blur"/>
      <feFlood flood-color="${effect.color}" flood-opacity="${spread}" result="color"/>
      <feComposite in="color" in2="blur" operator="in" result="glow"/>
      <feMerge>
        <feMergeNode in="glow"/>
        <feMergeNode in="glow"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  `;
}

/**
 * Generate jagged border path
 */
export function generateJaggedPath(
  effect: JaggedEffect,
  width: number,
  height: number,
  padding: number = 5
): string {
  const spikes = effect.spikes ?? 12;
  const depth = effect.depth ?? 5;

  const points: Array<{ x: number; y: number }> = [];

  // Generate points along each edge with jags
  const addJaggedEdge = (
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    isHorizontal: boolean
  ) => {
    const length = isHorizontal ? Math.abs(endX - startX) : Math.abs(endY - startY);
    const segmentCount = Math.ceil((length / (width + height)) * spikes * 2);
    const dx = (endX - startX) / segmentCount;
    const dy = (endY - startY) / segmentCount;

    for (let i = 0; i <= segmentCount; i++) {
      const x = startX + dx * i;
      const y = startY + dy * i;

      // Add random jag perpendicular to edge
      const jag = (Math.random() - 0.5) * depth * 2;
      if (isHorizontal) {
        points.push({ x, y: y + jag });
      } else {
        points.push({ x: x + jag, y });
      }
    }
  };

  // Top edge
  addJaggedEdge(padding, padding, width - padding, padding, true);
  // Right edge
  addJaggedEdge(width - padding, padding, width - padding, height - padding, false);
  // Bottom edge
  addJaggedEdge(width - padding, height - padding, padding, height - padding, true);
  // Left edge
  addJaggedEdge(padding, height - padding, padding, padding, false);

  return `M ${points.map((p) => `${p.x},${p.y}`).join(" L ")} Z`;
}

/**
 * Generate electric/lightning effect
 */
export function generateElectricEffect(
  effect: ElectricEffect,
  width: number,
  height: number,
  id: string
): string {
  const bolts = effect.bolts ?? 4;
  const color = effect.color ?? "#00FFFF";
  const paths: string[] = [];

  for (let b = 0; b < bolts; b++) {
    // Random start position along edges
    const startEdge = Math.floor(Math.random() * 4);
    let startX: number, startY: number;

    switch (startEdge) {
      case 0: startX = Math.random() * width; startY = 0; break;
      case 1: startX = width; startY = Math.random() * height; break;
      case 2: startX = Math.random() * width; startY = height; break;
      default: startX = 0; startY = Math.random() * height;
    }

    // Generate lightning path
    const segments = 5 + Math.floor(Math.random() * 5);
    const points = [`M ${startX},${startY}`];

    let x = startX;
    let y = startY;
    const targetX = width / 2;
    const targetY = height / 2;

    for (let s = 0; s < segments; s++) {
      const progress = s / segments;
      const nextX = x + (targetX - x) * 0.3 + (Math.random() - 0.5) * 30;
      const nextY = y + (targetY - y) * 0.3 + (Math.random() - 0.5) * 30;
      points.push(`L ${nextX},${nextY}`);
      x = nextX;
      y = nextY;
    }

    paths.push(
      `<path d="${points.join(" ")}" fill="none" stroke="${color}" stroke-width="2" opacity="0.8"/>`
    );
    // Add glow layer
    paths.push(
      `<path d="${points.join(" ")}" fill="none" stroke="${color}" stroke-width="6" opacity="0.3" filter="url(#${id}-blur)"/>`
    );
  }

  return `
    <defs>
      <filter id="${id}-blur">
        <feGaussianBlur stdDeviation="3"/>
      </filter>
    </defs>
    <g id="${id}-electric">${paths.join("\n")}</g>
  `;
}

/**
 * Generate manga emphasis marks
 */
export function generateMangaEmphasis(
  effect: MangaEmphasisEffect,
  cx: number,
  cy: number,
  radius: number,
  id: string
): string {
  const marks: string[] = [];

  switch (effect.style) {
    case "impact":
      // Impact lines radiating outward
      for (let i = 0; i < 16; i++) {
        const angle = (i / 16) * Math.PI * 2;
        const innerR = radius * 1.1;
        const outerR = radius * 1.5;
        const x1 = cx + Math.cos(angle) * innerR;
        const y1 = cy + Math.sin(angle) * innerR;
        const x2 = cx + Math.cos(angle) * outerR;
        const y2 = cy + Math.sin(angle) * outerR;
        marks.push(
          `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#000000" stroke-width="${2 + Math.random()}"/>`
        );
      }
      break;

    case "surprise":
      // Exclamation marks around
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(angle) * radius * 1.3;
        const y = cy + Math.sin(angle) * radius * 1.3;
        marks.push(
          `<text x="${x}" y="${y}" font-size="14" font-weight="bold" text-anchor="middle" dominant-baseline="middle">!</text>`
        );
      }
      break;

    case "dramatic":
      // Thick black wedges
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const innerR = radius * 1.05;
        const outerR = radius * 1.4;
        const spread = 0.1;
        const x1 = cx + Math.cos(angle - spread) * innerR;
        const y1 = cy + Math.sin(angle - spread) * innerR;
        const x2 = cx + Math.cos(angle) * outerR;
        const y2 = cy + Math.sin(angle) * outerR;
        const x3 = cx + Math.cos(angle + spread) * innerR;
        const y3 = cy + Math.sin(angle + spread) * innerR;
        marks.push(
          `<polygon points="${x1},${y1} ${x2},${y2} ${x3},${y3}" fill="#000000"/>`
        );
      }
      break;

    case "comedy":
      // Sweat drops / motion lines
      for (let i = 0; i < 3; i++) {
        const angle = -Math.PI / 4 + (i - 1) * 0.3;
        const x = cx + Math.cos(angle) * radius * 1.2;
        const y = cy + Math.sin(angle) * radius * 1.2;
        marks.push(
          `<ellipse cx="${x}" cy="${y}" rx="3" ry="6" fill="#4444FF" transform="rotate(${(angle * 180) / Math.PI + 45} ${x} ${y})"/>`
        );
      }
      break;
  }

  return `<g id="${id}-emphasis">${marks.join("\n")}</g>`;
}

/**
 * Generate screentone pattern
 */
export function generateScreentonePattern(
  effect: ScreentoneEffect,
  id: string
): string {
  const density = effect.density ?? 5;
  const color = effect.color ?? "#000000";
  const size = 20 / density;

  switch (effect.pattern) {
    case "dots":
      return `
        <pattern id="${id}" patternUnits="userSpaceOnUse" width="${size}" height="${size}">
          <circle cx="${size / 2}" cy="${size / 2}" r="${size / 4}" fill="${color}" opacity="0.5"/>
        </pattern>
      `;

    case "lines":
      return `
        <pattern id="${id}" patternUnits="userSpaceOnUse" width="${size}" height="${size}">
          <line x1="0" y1="0" x2="${size}" y2="0" stroke="${color}" stroke-width="1" opacity="0.5"/>
        </pattern>
      `;

    case "crosshatch":
      return `
        <pattern id="${id}" patternUnits="userSpaceOnUse" width="${size}" height="${size}">
          <line x1="0" y1="0" x2="${size}" y2="${size}" stroke="${color}" stroke-width="0.5" opacity="0.3"/>
          <line x1="${size}" y1="0" x2="0" y2="${size}" stroke="${color}" stroke-width="0.5" opacity="0.3"/>
        </pattern>
      `;

    default:
      return "";
  }
}

// ============================================================================
// Effect Presets
// ============================================================================

export const EFFECT_PRESETS: Record<string, CaptionEffect[]> = {
  // Action manga style
  action_impact: [
    { type: "explosion", spikes: 12, color: "#FFFF00", secondaryColor: "#FF6600" },
    { type: "speed_lines", direction: "radial", density: 5, color: "#000000" },
  ],

  // Dramatic reveal
  dramatic: [
    { type: "glow", color: "#FFFFFF", blur: 10, spread: 0.8 },
    { type: "manga_emphasis", style: "dramatic" },
  ],

  // Comedy/surprise
  comedy_surprise: [
    { type: "manga_emphasis", style: "surprise" },
    { type: "wobble", intensity: 3 },
  ],

  // Electric/shock
  electric_shock: [
    { type: "electric", bolts: 4, color: "#00FFFF" },
    { type: "glow", color: "#00FFFF", blur: 5 },
    { type: "jagged", spikes: 16, depth: 5 },
  ],

  // Soft thought
  soft_thought: [
    { type: "gradient", style: "radial", colors: ["#FFFFFF", "#E0E0E0"] },
    { type: "wobble", intensity: 2 },
  ],

  // Whisper/quiet
  whisper_soft: [
    { type: "gradient", style: "linear", colors: ["#F8F8F8", "#E8E8E8"], angle: 90 },
    { type: "glow", color: "#FFFFFF", blur: 3, spread: 0.5 },
  ],

  // Retro screentone
  retro_manga: [
    { type: "screentone", pattern: "dots", density: 6 },
  ],

  // Neon glow
  neon: [
    { type: "glow", color: "#FF00FF", blur: 8, spread: 1.2 },
    { type: "gradient", style: "linear", colors: ["#FF00FF", "#00FFFF"], angle: 45 },
  ],

  // Hand-drawn organic
  hand_drawn: [
    { type: "wobble", intensity: 4 },
  ],
};

/**
 * Get preset effects by name
 */
export function getEffectPreset(name: string): CaptionEffect[] {
  return EFFECT_PRESETS[name] ?? [];
}

/**
 * List available effect presets
 */
export function listEffectPresets(): string[] {
  return Object.keys(EFFECT_PRESETS);
}
