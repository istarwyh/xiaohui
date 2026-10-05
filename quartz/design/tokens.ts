import type { ColorScheme, Theme } from "../util/theme"
import { paperTextureCss } from "./paperTexture"

/**
 * Xiaohui / 晓灰 · editorial system v1
 * The only source of brand values. CSS is emitted by joinStyles at build time.
 * See design/README.md before adding a token or migrating a component.
 */
export const foundations = {
  "font-body":
    '"Noto Sans SC", system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif',
  "font-code":
    '"IBM Plex Mono", ui-monospace, "SFMono-Regular", Consolas, "Liberation Mono", monospace',
  "font-heading": "var(--font-body)",
  "text-caption": "0.75rem",
  "text-meta": "0.8125rem",
  "text-small": "0.875rem",
  "text-body": "1rem",
  "text-lead": "1.0625rem",
  "text-h3": "1.125rem",
  "text-h2": "1.5rem",
  "text-title": "clamp(1.75rem, 1.4rem + 1vw, 2.25rem)",
  // Homepage-only display hierarchy; article titles keep the 28–36px scale above.
  "text-display": "clamp(3.5rem, 4.8vw, 4.5rem)",
  "text-display-mobile": "clamp(2.25rem, 10.25vw, 2.75rem)",
  "text-section": "clamp(1.625rem, 2.25vw, 2.25rem)",
  "weight-regular": "400",
  "weight-medium": "500",
  "weight-strong": "600",
  "weight-heading": "700",
  "leading-tight": "1.35",
  "leading-ui": "1.5",
  "leading-reading": "1.85",
  "leading-code": "1.6",
  "space-1": "0.25rem",
  "space-2": "0.5rem",
  "space-3": "0.75rem",
  "space-4": "1rem",
  "space-5": "1.25rem",
  "space-6": "1.5rem",
  "space-8": "2rem",
  "space-10": "2.5rem",
  "space-12": "3rem",
  "radius-small": "0.25rem",
  "radius-medium": "0.5rem",
  "radius-large": "0.75rem",
  "radius-round": "999px",
  "border-width": "1px",
  "focus-width": "2px",
  "focus-offset": "3px",
  "control-size": "2.25rem",
  "control-touch": "2.75rem",
  "icon-size": "1.25rem",
  "measure-reading": "44rem",
  "measure-page": "100rem",
  "measure-brand": "72rem",
  "measure-home": "86.5rem",
  "duration-fast": "120ms",
  "duration-normal": "180ms",
  "ease-standard": "cubic-bezier(0.2, 0, 0, 1)",
  "layer-overlay": "999",
  "layer-skip": "100001",
  // Component contracts: retain the approved compact feed, including 128×96 max images.
  "feed-title-size": "1.05rem",
  "feed-title-mobile-size": "0.975rem",
  "feed-row-padding": "var(--space-3) 0.4rem",
  "feed-row-mobile-padding": "0.65rem 0.2rem",
  "feed-thumbnail-width": "8rem",
  "feed-thumbnail-ratio": "4 / 3",
  "feed-image-gap": "var(--space-2)",
} as const

export const light = {
  "color-canvas": "#fcfbfa",
  "color-surface": "#f8f7f5",
  "color-surface-raised": "#ffffff",
  "color-surface-hover": "#f0eeeb",
  "color-text": "#34322f",
  "color-text-strong": "#242320",
  "color-text-muted": "#68645e",
  "color-accent": "#895538",
  "color-accent-hover": "#704127",
  "color-accent-soft": "#eee3d9",
  "color-border": "#dad5cc",
  "color-border-strong": "#81786d",
  "color-focus": "#895538",
  "color-selection": "#e6d3c1",
  "color-mark": "#eee0b1",
  "color-overlay": "rgba(36, 35, 32, 0.3)",
  "color-positive": "#476348",
  "color-warning": "#805b20",
  "color-danger": "#a13f3f",
  "texture-paper": paperTextureCss("light"),
  "shadow-popover": "0 0.5rem 1.5rem rgba(36, 35, 32, 0.12)",
  "shadow-overlay": "0 1rem 3rem rgba(36, 35, 32, 0.18)",
} as const

// Identical semantic keys, deliberately distinct luminance relationships.
export const dark = {
  "color-canvas": "#1c1c1b",
  "color-surface": "#252523",
  "color-surface-raised": "#2c2b28",
  "color-surface-hover": "#36332e",
  "color-text": "#d4d0c8",
  "color-text-strong": "#f0ede7",
  "color-text-muted": "#aaa398",
  "color-accent": "#d4ad8b",
  "color-accent-hover": "#ebc7a5",
  "color-accent-soft": "#3b3027",
  "color-border": "#46423b",
  "color-border-strong": "#8d8477",
  "color-focus": "#d4ad8b",
  "color-selection": "#574330",
  "color-mark": "#594b22",
  "color-overlay": "rgba(0, 0, 0, 0.55)",
  "color-positive": "#abc7a1",
  "color-warning": "#dcc18a",
  "color-danger": "#e8aaa4",
  "texture-paper": paperTextureCss("dark"),
  "shadow-popover": "0 0.5rem 1.5rem rgba(0, 0, 0, 0.24)",
  "shadow-overlay": "0 1rem 3rem rgba(0, 0, 0, 0.36)",
} satisfies Record<keyof typeof light, string>

// Keep upstream Quartz, graph canvas, syntax tooling and social images compatible.
function quartzColors(colors: Record<keyof typeof light, string>): ColorScheme {
  return {
    light: colors["color-canvas"],
    lightgray: colors["color-border"],
    gray: colors["color-text-muted"],
    darkgray: colors["color-text"],
    dark: colors["color-text-strong"],
    secondary: colors["color-accent"],
    tertiary: colors["color-accent-hover"],
    highlight: colors["color-accent-soft"],
    textHighlight: colors["color-mark"],
  }
}

export const designTokens = {
  shared: {
    ...foundations,
    titleFont: "var(--font-heading)",
    headerFont: "var(--font-heading)",
    bodyFont: "var(--font-body)",
    codeFont: "var(--font-code)",
    "graph-current-node": "var(--color-accent)",
    "graph-current-node-ring": "var(--color-text-strong)",
  },
  light,
  dark,
}

export const xiaohuiTheme: Theme = {
  fontOrigin: "googleFonts",
  cdnCaching: true,
  typography: {
    header: "Noto Sans SC",
    body: "Noto Sans SC",
    code: "IBM Plex Mono",
  },
  colors: { lightMode: quartzColors(light), darkMode: quartzColors(dark) },
  tokens: designTokens,
}
