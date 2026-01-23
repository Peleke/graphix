/**
 * Graphix Design Tokens
 *
 * These tokens define the design system foundation.
 * They are consumed by Panda CSS to generate atomic styles.
 *
 * Architecture:
 * - Primitive tokens: Raw values (colors, sizes)
 * - Semantic tokens: Meaningful names that map to primitives
 * - Component tokens: Component-specific values
 */

// ============================================================================
// PRIMITIVE TOKENS
// ============================================================================

/**
 * Color primitives - raw color values
 * Using HSL for easier manipulation
 */
export const primitiveColors = {
  // Grayscale
  gray: {
    50: { value: "hsl(0 0% 98%)" },
    100: { value: "hsl(0 0% 96%)" },
    200: { value: "hsl(0 0% 90%)" },
    300: { value: "hsl(0 0% 83%)" },
    400: { value: "hsl(0 0% 64%)" },
    500: { value: "hsl(0 0% 45%)" },
    600: { value: "hsl(0 0% 32%)" },
    700: { value: "hsl(0 0% 25%)" },
    800: { value: "hsl(0 0% 15%)" },
    900: { value: "hsl(0 0% 9%)" },
    950: { value: "hsl(0 0% 4%)" },
  },

  // Brand colors - warm purple tones
  brand: {
    50: { value: "hsl(270 100% 98%)" },
    100: { value: "hsl(270 95% 95%)" },
    200: { value: "hsl(270 90% 87%)" },
    300: { value: "hsl(270 85% 77%)" },
    400: { value: "hsl(270 80% 65%)" },
    500: { value: "hsl(270 75% 55%)" }, // Primary
    600: { value: "hsl(270 70% 45%)" },
    700: { value: "hsl(270 65% 35%)" },
    800: { value: "hsl(270 60% 25%)" },
    900: { value: "hsl(270 55% 18%)" },
    950: { value: "hsl(270 50% 10%)" },
  },

  // Semantic colors
  success: {
    50: { value: "hsl(142 76% 97%)" },
    500: { value: "hsl(142 71% 45%)" },
    700: { value: "hsl(142 76% 26%)" },
  },
  warning: {
    50: { value: "hsl(38 92% 95%)" },
    500: { value: "hsl(38 92% 50%)" },
    700: { value: "hsl(32 95% 35%)" },
  },
  error: {
    50: { value: "hsl(0 86% 97%)" },
    500: { value: "hsl(0 84% 60%)" },
    700: { value: "hsl(0 74% 42%)" },
  },
  info: {
    50: { value: "hsl(214 100% 97%)" },
    500: { value: "hsl(214 100% 50%)" },
    700: { value: "hsl(214 100% 35%)" },
  },
} as const;

/**
 * Typography primitives
 */
export const primitiveFonts = {
  sans: { value: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  mono: { value: '"JetBrains Mono", "Fira Code", Consolas, monospace' },
  display: { value: '"Plus Jakarta Sans", Inter, sans-serif' },
} as const;

export const primitiveFontSizes = {
  xs: { value: "0.75rem" }, // 12px
  sm: { value: "0.875rem" }, // 14px
  md: { value: "1rem" }, // 16px
  lg: { value: "1.125rem" }, // 18px
  xl: { value: "1.25rem" }, // 20px
  "2xl": { value: "1.5rem" }, // 24px
  "3xl": { value: "1.875rem" }, // 30px
  "4xl": { value: "2.25rem" }, // 36px
  "5xl": { value: "3rem" }, // 48px
} as const;

export const primitiveFontWeights = {
  normal: { value: "400" },
  medium: { value: "500" },
  semibold: { value: "600" },
  bold: { value: "700" },
} as const;

export const primitiveLineHeights = {
  none: { value: "1" },
  tight: { value: "1.25" },
  snug: { value: "1.375" },
  normal: { value: "1.5" },
  relaxed: { value: "1.625" },
  loose: { value: "2" },
} as const;

/**
 * Spacing primitives (4px base)
 */
export const primitiveSpacing = {
  0: { value: "0" },
  px: { value: "1px" },
  0.5: { value: "0.125rem" }, // 2px
  1: { value: "0.25rem" }, // 4px
  1.5: { value: "0.375rem" }, // 6px
  2: { value: "0.5rem" }, // 8px
  2.5: { value: "0.625rem" }, // 10px
  3: { value: "0.75rem" }, // 12px
  3.5: { value: "0.875rem" }, // 14px
  4: { value: "1rem" }, // 16px
  5: { value: "1.25rem" }, // 20px
  6: { value: "1.5rem" }, // 24px
  7: { value: "1.75rem" }, // 28px
  8: { value: "2rem" }, // 32px
  9: { value: "2.25rem" }, // 36px
  10: { value: "2.5rem" }, // 40px
  12: { value: "3rem" }, // 48px
  14: { value: "3.5rem" }, // 56px
  16: { value: "4rem" }, // 64px
  20: { value: "5rem" }, // 80px
  24: { value: "6rem" }, // 96px
  28: { value: "7rem" }, // 112px
  32: { value: "8rem" }, // 128px
} as const;

/**
 * Border radius primitives
 */
export const primitiveRadii = {
  none: { value: "0" },
  sm: { value: "0.125rem" }, // 2px
  md: { value: "0.375rem" }, // 6px
  lg: { value: "0.5rem" }, // 8px
  xl: { value: "0.75rem" }, // 12px
  "2xl": { value: "1rem" }, // 16px
  "3xl": { value: "1.5rem" }, // 24px
  full: { value: "9999px" },
} as const;

/**
 * Shadow primitives
 */
export const primitiveShadows = {
  sm: { value: "0 1px 2px 0 rgb(0 0 0 / 0.05)" },
  md: { value: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)" },
  lg: { value: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)" },
  xl: { value: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)" },
  "2xl": { value: "0 25px 50px -12px rgb(0 0 0 / 0.25)" },
  inner: { value: "inset 0 2px 4px 0 rgb(0 0 0 / 0.05)" },
  none: { value: "none" },
} as const;

/**
 * Animation/transition primitives
 */
export const primitiveAnimations = {
  fast: "150ms",
  normal: "200ms",
  slow: "300ms",
  slower: "500ms",
} as const;

export const primitiveEasings = {
  default: "cubic-bezier(0.4, 0, 0.2, 1)",
  in: "cubic-bezier(0.4, 0, 1, 1)",
  out: "cubic-bezier(0, 0, 0.2, 1)",
  inOut: "cubic-bezier(0.4, 0, 0.2, 1)",
} as const;

// ============================================================================
// SEMANTIC TOKENS
// ============================================================================

/**
 * Semantic color tokens - map to primitives based on theme
 */
export const semanticTokensDark = {
  colors: {
    // Background layers
    bg: {
      canvas: primitiveColors.gray[950].value,
      surface: primitiveColors.gray[900].value,
      subtle: primitiveColors.gray[800].value,
      muted: primitiveColors.gray[700].value,
    },

    // Foreground (text)
    fg: {
      default: primitiveColors.gray[50].value,
      muted: primitiveColors.gray[400].value,
      subtle: primitiveColors.gray[500].value,
      disabled: primitiveColors.gray[600].value,
    },

    // Border colors
    border: {
      default: primitiveColors.gray[700].value,
      subtle: primitiveColors.gray[800].value,
      strong: primitiveColors.gray[600].value,
    },

    // Brand colors
    brand: {
      default: primitiveColors.brand[500].value,
      hover: primitiveColors.brand[400].value,
      active: primitiveColors.brand[600].value,
      subtle: primitiveColors.brand[900].value,
    },

    // Status colors
    success: {
      default: primitiveColors.success[500].value,
      subtle: primitiveColors.success[700].value,
    },
    warning: {
      default: primitiveColors.warning[500].value,
      subtle: primitiveColors.warning[700].value,
    },
    error: {
      default: primitiveColors.error[500].value,
      subtle: primitiveColors.error[700].value,
    },
    info: {
      default: primitiveColors.info[500].value,
      subtle: primitiveColors.info[700].value,
    },
  },
} as const;

export const semanticTokensLight = {
  colors: {
    // Background layers
    bg: {
      canvas: primitiveColors.gray[50].value,
      surface: "white",
      subtle: primitiveColors.gray[100].value,
      muted: primitiveColors.gray[200].value,
    },

    // Foreground (text)
    fg: {
      default: primitiveColors.gray[900].value,
      muted: primitiveColors.gray[600].value,
      subtle: primitiveColors.gray[500].value,
      disabled: primitiveColors.gray[400].value,
    },

    // Border colors
    border: {
      default: primitiveColors.gray[300].value,
      subtle: primitiveColors.gray[200].value,
      strong: primitiveColors.gray[400].value,
    },

    // Brand colors
    brand: {
      default: primitiveColors.brand[600].value,
      hover: primitiveColors.brand[700].value,
      active: primitiveColors.brand[800].value,
      subtle: primitiveColors.brand[100].value,
    },

    // Status colors (same as dark, they work)
    success: {
      default: primitiveColors.success[500].value,
      subtle: primitiveColors.success[50].value,
    },
    warning: {
      default: primitiveColors.warning[500].value,
      subtle: primitiveColors.warning[50].value,
    },
    error: {
      default: primitiveColors.error[500].value,
      subtle: primitiveColors.error[50].value,
    },
    info: {
      default: primitiveColors.info[500].value,
      subtle: primitiveColors.info[50].value,
    },
  },
} as const;

// ============================================================================
// COMPONENT TOKENS
// ============================================================================

/**
 * Component-specific tokens for consistent component styling
 */
export const componentTokens = {
  button: {
    height: {
      sm: "2rem", // 32px
      md: "2.5rem", // 40px
      lg: "3rem", // 48px
    },
    padding: {
      sm: primitiveSpacing[3].value,
      md: primitiveSpacing[4].value,
      lg: primitiveSpacing[6].value,
    },
    fontSize: {
      sm: primitiveFontSizes.sm.value,
      md: primitiveFontSizes.md.value,
      lg: primitiveFontSizes.lg.value,
    },
  },

  input: {
    height: {
      sm: "2rem",
      md: "2.5rem",
      lg: "3rem",
    },
    padding: primitiveSpacing[3].value,
    borderRadius: primitiveRadii.md.value,
  },

  panel: {
    borderRadius: primitiveRadii.lg.value,
    padding: primitiveSpacing[4].value,
    gap: primitiveSpacing[4].value,
  },

  modal: {
    borderRadius: primitiveRadii.xl.value,
    padding: primitiveSpacing[6].value,
    maxWidth: "32rem",
  },

  canvas: {
    gridSize: 20,
    panelGap: 10,
    selectionColor: primitiveColors.brand[500].value,
  },
} as const;

// ============================================================================
// EXPORTS
// ============================================================================

export const tokens = {
  colors: primitiveColors,
  fonts: primitiveFonts,
  fontSizes: primitiveFontSizes,
  fontWeights: primitiveFontWeights,
  lineHeights: primitiveLineHeights,
  spacing: primitiveSpacing,
  radii: primitiveRadii,
  shadows: primitiveShadows,
  animations: primitiveAnimations,
  easings: primitiveEasings,
} as const;

export const semanticTokens = {
  dark: semanticTokensDark,
  light: semanticTokensLight,
} as const;

export type Theme = "dark" | "light";
export type Tokens = typeof tokens;
export type SemanticTokens = typeof semanticTokensDark;
