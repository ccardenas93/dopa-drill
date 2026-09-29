# Dopa Drill

Source: http://127.0.0.1:8766/app/?lang=es

To create a video from this capture, use the `product-launch-video` skill.

## What's in This Capture

| File | Contents |
|------|----------|
| `screenshots/contact-sheet.jpg` | **View this first.** All scroll screenshots in labeled grid — see the entire page at a glance |
| `screenshots/scroll-*.png` | Individual viewport screenshots if you need detail on a specific section. |
| `extracted/tokens.json` | Design tokens: 19 colors, 2 fonts, 4 headings, 0 CTAs |
| `extracted/design-styles.json` | Computed styles from live DOM: typography hierarchy, button/card/nav styles, spacing scale, border-radius, box shadows. Primary data source for DESIGN.md. |
| `extracted/asset-descriptions.md` | One-line description of every downloaded asset. Read this for asset selection — only open individual files for safe-zone checking. |
| `extracted/visible-text.txt` | Page text in DOM order, prefixed with HTML tag (`[h1]`, `[p]`, `[a]`). Use as context — rephrase freely. |
| `extracted/shaders.json` | WebGL shader source (GLSL). |
| `assets/contact-sheet.jpg` | All downloaded images in one labeled grid. |
| `assets/svgs/contact-sheet.jpg` | SVGs rendered as thumbnails in labeled grid |
| `assets/` | Individual downloaded images, SVGs, and font files. |

## Brand Summary

- **Colors**: #1B1D4D (accent), #FFF8EC (bg-light), #FFFFFF (bg-light), #3B6BFF (accent), #FFD23F (surface-light), #FFF4C4 (bg-light), #FF4F6D (accent), #E3EBFF (bg-light), #FF7AB6 (accent), #FFD0E4 (surface-light)
- **Fonts**: Dela Gothic One (400,700), Zen Maru Gothic (700,900)
