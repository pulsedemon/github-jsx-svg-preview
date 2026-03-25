# GitHub JSX SVG Preview

A Chrome extension that detects SVG markup embedded in JSX/TSX files on GitHub pull requests and renders a live preview directly in the diff view.

## The Problem

When reviewing PRs that add or modify icon components, you see raw SVG path data like `<path d="M20.447 20.452h-3.554v-5.569c0-1.328..."/>` — impossible to visualize without running the code.

This extension automatically detects inline SVGs in `.jsx`, `.tsx`, `.js`, and `.ts` files and shows you what they actually look like.

## Features

- **Automatic detection** of SVG elements inside JSX/TSX code on GitHub PR diffs
- **Inline preview panel** with an eye icon toggle in each file header
- **Size controls** — view SVGs at 32px, 64px, or 128px
- **Background switching** — light, dark, or checkerboard backgrounds
- **JSX-to-SVG conversion** — handles `className`, camelCase attributes, JSX expressions, `currentColor`, and spread props
- **Auto-preview mode** — optionally show previews without clicking
- **Works with GitHub navigation** — MutationObserver and turbo event listeners handle dynamic page loading

## Install

1. Clone or download this repository
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode** (toggle in the top right)
4. Click **Load unpacked** and select the project folder
5. Navigate to any GitHub pull request with JSX/TSX icon files

## Usage

- On PR "Files changed" pages, files containing inline SVGs will show an **eye icon** (👁) in their file header
- Click the eye icon to toggle the SVG preview panel
- Use the **S / M / L** buttons to change the preview size
- Use the **Light / Dark / Check** buttons to change the background
- Click the extension icon in the toolbar to access settings:
  - **Enable previews** — turn the extension on/off
  - **Auto-preview** — automatically open preview panels without clicking

## How It Works

1. **Detection** — A content script scans GitHub diff pages for file containers with `.jsx`/`.tsx`/`.js`/`.ts` extensions
2. **Extraction** — Code lines are parsed to find `<svg>...</svg>` blocks, skipping deleted diff lines
3. **Conversion** — JSX SVG is converted to valid HTML SVG:
   - `className` → `class`
   - camelCase attrs → kebab-case (`strokeWidth` → `stroke-width`)
   - JSX expressions `{...}` are stripped
   - `currentColor` replaced with a visible gray
4. **Rendering** — SVG is parsed via `DOMParser` and injected into a preview panel

## Project Structure

```
manifest.json          — Chrome extension manifest (V3)
content.js             — Main content script orchestrator
content.css            — Preview panel styles
lib/
  jsx-to-svg.js        — JSX attribute conversion
  svg-extractor.js     — DOM scanning and SVG extraction
  preview-renderer.js  — UI injection and controls
popup/
  popup.html           — Extension popup
  popup.js             — Popup logic
icons/                 — Extension icons
test/
  test-page.html       — Local test harness
```
