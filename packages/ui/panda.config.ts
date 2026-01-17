import { defineConfig } from "@pandacss/dev";
import {
  tokens,
  semanticTokensDark,
  semanticTokensLight,
} from "./src/theme/tokens";

export default defineConfig({
  // Where to look for your CSS declarations
  include: ["./src/**/*.{js,jsx,ts,tsx}"],

  // Files to exclude
  exclude: [],

  // Useful for theme library authors
  preflight: true,

  // The output directory for your css system
  outdir: "styled-system",

  // Use JSX style props
  jsxFramework: "react",

  // Theme configuration
  theme: {
    extend: {
      // Primitive tokens
      tokens: {
        colors: tokens.colors,
        fonts: tokens.fonts,
        fontSizes: tokens.fontSizes,
        fontWeights: tokens.fontWeights,
        lineHeights: tokens.lineHeights,
        spacing: tokens.spacing,
        radii: tokens.radii,
        shadows: tokens.shadows,
        durations: {
          fast: { value: tokens.animations.fast },
          normal: { value: tokens.animations.normal },
          slow: { value: tokens.animations.slow },
          slower: { value: tokens.animations.slower },
        },
      },

      // Semantic tokens (theme-aware)
      semanticTokens: {
        colors: {
          // Background tokens
          "bg.canvas": {
            value: {
              base: semanticTokensLight.colors.bg.canvas,
              _dark: semanticTokensDark.colors.bg.canvas,
            },
          },
          "bg.surface": {
            value: {
              base: semanticTokensLight.colors.bg.surface,
              _dark: semanticTokensDark.colors.bg.surface,
            },
          },
          "bg.subtle": {
            value: {
              base: semanticTokensLight.colors.bg.subtle,
              _dark: semanticTokensDark.colors.bg.subtle,
            },
          },
          "bg.muted": {
            value: {
              base: semanticTokensLight.colors.bg.muted,
              _dark: semanticTokensDark.colors.bg.muted,
            },
          },

          // Foreground tokens
          "fg.default": {
            value: {
              base: semanticTokensLight.colors.fg.default,
              _dark: semanticTokensDark.colors.fg.default,
            },
          },
          "fg.muted": {
            value: {
              base: semanticTokensLight.colors.fg.muted,
              _dark: semanticTokensDark.colors.fg.muted,
            },
          },
          "fg.subtle": {
            value: {
              base: semanticTokensLight.colors.fg.subtle,
              _dark: semanticTokensDark.colors.fg.subtle,
            },
          },
          "fg.disabled": {
            value: {
              base: semanticTokensLight.colors.fg.disabled,
              _dark: semanticTokensDark.colors.fg.disabled,
            },
          },

          // Border tokens
          "border.default": {
            value: {
              base: semanticTokensLight.colors.border.default,
              _dark: semanticTokensDark.colors.border.default,
            },
          },
          "border.subtle": {
            value: {
              base: semanticTokensLight.colors.border.subtle,
              _dark: semanticTokensDark.colors.border.subtle,
            },
          },
          "border.strong": {
            value: {
              base: semanticTokensLight.colors.border.strong,
              _dark: semanticTokensDark.colors.border.strong,
            },
          },

          // Brand tokens
          "brand.default": {
            value: {
              base: semanticTokensLight.colors.brand.default,
              _dark: semanticTokensDark.colors.brand.default,
            },
          },
          "brand.hover": {
            value: {
              base: semanticTokensLight.colors.brand.hover,
              _dark: semanticTokensDark.colors.brand.hover,
            },
          },
          "brand.active": {
            value: {
              base: semanticTokensLight.colors.brand.active,
              _dark: semanticTokensDark.colors.brand.active,
            },
          },
          "brand.subtle": {
            value: {
              base: semanticTokensLight.colors.brand.subtle,
              _dark: semanticTokensDark.colors.brand.subtle,
            },
          },

          // Status tokens
          "success.default": {
            value: {
              base: semanticTokensLight.colors.success.default,
              _dark: semanticTokensDark.colors.success.default,
            },
          },
          "success.subtle": {
            value: {
              base: semanticTokensLight.colors.success.subtle,
              _dark: semanticTokensDark.colors.success.subtle,
            },
          },
          "warning.default": {
            value: {
              base: semanticTokensLight.colors.warning.default,
              _dark: semanticTokensDark.colors.warning.default,
            },
          },
          "warning.subtle": {
            value: {
              base: semanticTokensLight.colors.warning.subtle,
              _dark: semanticTokensDark.colors.warning.subtle,
            },
          },
          "error.default": {
            value: {
              base: semanticTokensLight.colors.error.default,
              _dark: semanticTokensDark.colors.error.default,
            },
          },
          "error.subtle": {
            value: {
              base: semanticTokensLight.colors.error.subtle,
              _dark: semanticTokensDark.colors.error.subtle,
            },
          },
          "info.default": {
            value: {
              base: semanticTokensLight.colors.info.default,
              _dark: semanticTokensDark.colors.info.default,
            },
          },
          "info.subtle": {
            value: {
              base: semanticTokensLight.colors.info.subtle,
              _dark: semanticTokensDark.colors.info.subtle,
            },
          },
        },
      },

      // Keyframes
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        fadeOut: {
          from: { opacity: "1" },
          to: { opacity: "0" },
        },
        slideIn: {
          from: { transform: "translateY(-10px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        slideOut: {
          from: { transform: "translateY(0)", opacity: "1" },
          to: { transform: "translateY(-10px)", opacity: "0" },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        spin: {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
      },
    },
  },

  // Global CSS
  globalCss: {
    html: {
      fontFamily: "fonts.sans",
      fontSize: "fontSizes.md",
      lineHeight: "lineHeights.normal",
      color: "fg.default",
      bg: "bg.canvas",
      colorScheme: {
        base: "light",
        _dark: "dark",
      },
    },
    body: {
      minHeight: "100vh",
      margin: 0,
    },
    "*, *::before, *::after": {
      boxSizing: "border-box",
    },
    // Scrollbar styling for dark mode
    "::-webkit-scrollbar": {
      width: "8px",
      height: "8px",
    },
    "::-webkit-scrollbar-track": {
      bg: "bg.subtle",
    },
    "::-webkit-scrollbar-thumb": {
      bg: "border.default",
      borderRadius: "radii.full",
      _hover: {
        bg: "border.strong",
      },
    },
  },

  // Conditions for responsive and state variants
  conditions: {
    light: "[data-theme=light] &",
    dark: "[data-theme=dark] &",
  },
});
