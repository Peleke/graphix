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
    50: "hsl(0 0% 98%)",
    100: "hsl(0 0% 96%)",
    200: "hsl(0 0% 90%)",
    300: "hsl(0 0% 83%)",
    400: "hsl(0 0% 64%)",
    500: "hsl(0 0% 45%)",
    600: "hsl(0 0% 32%)",
    700: "hsl(0 0% 25%)",
    800: "hsl(0 0% 15%)",
    900: "hsl(0 0% 9%)",
    950: "hsl(0 0% 4%)",
  },

  // Brand colors - warm purple tones
  brand: {
    50: "hsl(270 100% 98%)",
    100: "hsl(270 95% 95%)",
    200: "hsl(270 90% 87%)",
    300: "hsl(270 85% 77%)",
    400: "hsl(270 80% 65%)",
    500: "hsl(270 75% 55%)", // Primary
    600: "hsl(270 70% 45%)",
    700: "hsl(270 65% 35%)",
    800: "hsl(270 60% 25%)",
    900: "hsl(270 55% 18%)",
    950: "hsl(270 50% 10%)",
  },

  // Semantic colors
  success: {
    50: "hsl(142 76% 97%)",
    500: "hsl(142 71% 45%)",
    700: "hsl(142 76% 26%)",
  },
  warning: {
    50: "hsl(38 92% 95%)",
    500: "hsl(38 92% 50%)",
    700: "hsl(32 95% 35%)",
  },
  error: {
    50: "hsl(0 86% 97%)",
    500: "hsl(0 84% 60%)",
    700: "hsl(0 74% 42%)",
  },
  info: {
    50: "hsl(214 100% 97%)",
    500: "hsl(214 100% 50%)",
    700: "hsl(214 100% 35%)",
  },
} as const;

/**
 * Typography primitives
 */
export const primitiveFonts = {
  sans: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  mono: '"JetBrains Mono", "Fira Code", Consolas, monospace',
  display: '"Plus Jakarta Sans", Inter, sans-serif',
} as const;

export const primitiveFontSizes = {
  xs: "0.75rem", // 12px
  sm: "0.875rem", // 14px
  md: "1rem", // 16px
  lg: "1.125rem", // 18px
  xl: "1.25rem", // 20px
  "2xl": "1.5rem", // 24px
  "3xl": "1.875rem", // 30px
  "4xl": "2.25rem", // 36px
  "5xl": "3rem", // 48px
} as const;

export const primitiveFontWeights = {
  normal: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
} as const;

export const primitiveLineHeights = {
  none: "1",
  tight: "1.25",
  snug: "1.375",
  normal: "1.5",
  relaxed: "1.625",
  loose: "2",
} as const;

/**
 * Spacing primitives (4px base)
 */
export const primitiveSpacing = {
  0: "0",
  px: "1px",
  0.5: "0.125rem", // 2px
  1: "0.25rem", // 4px
  1.5: "0.375rem", // 6px
  2: "0.5rem", // 8px
  2.5: "0.625rem", // 10px
  3: "0.75rem", // 12px
  3.5: "0.875rem", // 14px
  4: "1rem", // 16px
  5: "1.25rem", // 20px
  6: "1.5rem", // 24px
  7: "1.75rem", // 28px
  8: "2rem", // 32px
  9: "2.25rem", // 36px
  10: "2.5rem", // 40px
  12: "3rem", // 48px
  14: "3.5rem", // 56px
  16: "4rem", // 64px
  20: "5rem", // 80px
  24: "6rem", // 96px
  28: "7rem", // 112px
  32: "8rem", // 128px
} as const;

/**
 * Border radius primitives
 */
export const primitiveRadii = {
  none: "0",
  sm: "0.125rem", // 2px
  md: "0.375rem", // 6px
  lg: "0.5rem", // 8px
  xl: "0.75rem", // 12px
  "2xl": "1rem", // 16px
  "3xl": "1.5rem", // 24px
  full: "9999px",
} as const;

/**
 * Shadow primitives
 */
export const primitiveShadows = {
  sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
  "2xl": "0 25px 50px -12px rgb(0 0 0 / 0.25)",
  inner: "inset 0 2px 4px 0 rgb(0 0 0 / 0.05)",
  none: "none",
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
      canvas: primitiveColors.gray[950],
      surface: primitiveColors.gray[900],
      subtle: primitiveColors.gray[800],
      muted: primitiveColors.gray[700],
    },

    // Foreground (text)
    fg: {
      default: primitiveColors.gray[50],
      muted: primitiveColors.gray[400],
      subtle: primitiveColors.gray[500],
      disabled: primitiveColors.gray[600],
    },

    // Border colors
    border: {
      default: primitiveColors.gray[700],
      subtle: primitiveColors.gray[800],
      strong: primitiveColors.gray[600],
    },

    // Brand colors
    brand: {
      default: primitiveColors.brand[500],
      hover: primitiveColors.brand[400],
      active: primitiveColors.brand[600],
      subtle: primitiveColors.brand[900],
    },

    // Status colors
    success: {
      default: primitiveColors.success[500],
      subtle: primitiveColors.success[700],
    },
    warning: {
      default: primitiveColors.warning[500],
      subtle: primitiveColors.warning[700],
    },
    error: {
      default: primitiveColors.error[500],
      subtle: primitiveColors.error[700],
    },
    info: {
      default: primitiveColors.info[500],
      subtle: primitiveColors.info[700],
    },
  },
} as const;

export const semanticTokensLight = {
  colors: {
    // Background layers
    bg: {
      canvas: primitiveColors.gray[50],
      surface: "white",
      subtle: primitiveColors.gray[100],
      muted: primitiveColors.gray[200],
    },

    // Foreground (text)
    fg: {
      default: primitiveColors.gray[900],
      muted: primitiveColors.gray[600],
      subtle: primitiveColors.gray[500],
      disabled: primitiveColors.gray[400],
    },

    // Border colors
    border: {
      default: primitiveColors.gray[300],
      subtle: primitiveColors.gray[200],
      strong: primitiveColors.gray[400],
    },

    // Brand colors
    brand: {
      default: primitiveColors.brand[600],
      hover: primitiveColors.brand[700],
      active: primitiveColors.brand[800],
      subtle: primitiveColors.brand[100],
    },

    // Status colors (same as dark, they work)
    success: {
      default: primitiveColors.success[500],
      subtle: primitiveColors.success[50],
    },
    warning: {
      default: primitiveColors.warning[500],
      subtle: primitiveColors.warning[50],
    },
    error: {
      default: primitiveColors.error[500],
      subtle: primitiveColors.error[50],
    },
    info: {
      default: primitiveColors.info[500],
      subtle: primitiveColors.info[50],
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
      sm: primitiveSpacing[3],
      md: primitiveSpacing[4],
      lg: primitiveSpacing[6],
    },
    fontSize: {
      sm: primitiveFontSizes.sm,
      md: primitiveFontSizes.md,
      lg: primitiveFontSizes.lg,
    },
  },

  input: {
    height: {
      sm: "2rem",
      md: "2.5rem",
      lg: "3rem",
    },
    padding: primitiveSpacing[3],
    borderRadius: primitiveRadii.md,
  },

  panel: {
    borderRadius: primitiveRadii.lg,
    padding: primitiveSpacing[4],
    gap: primitiveSpacing[4],
  },

  modal: {
    borderRadius: primitiveRadii.xl,
    padding: primitiveSpacing[6],
    maxWidth: "32rem",
  },

  canvas: {
    gridSize: 20,
    panelGap: 10,
    selectionColor: primitiveColors.brand[500],
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
