# AstraNote

AstraNote is a minimal WYSIWYG Markdown editor. The current repository is a small browser-based prototype focused on the editor core only.

## Overview

The product goal is to make Markdown editing feel direct and visual without giving up Markdown as the saved document format.

## Current State

- Current form: static web app
- Editor model: TipTap visual editor with Markdown serialization
- UI model: a single editor surface with local CSS only
- Runtime dependency model: bundled local JavaScript, no CDN dependency at use time
- Removed from this trimmed version: page chrome, source mode, file controls, math support, PDF export, theme switching, and sidebar UI

## Offline Use

The committed site can be served and used without internet access because the runtime JavaScript is bundled locally into `assets/app.js`.

To rebuild the bundle after source changes:

```bash
npm install
npm run build
```

Then serve the repository root with a static server such as:

```bash
python3 -m http.server 8000
```

## Vision

AstraNote is still aimed at a future desktop workflow, but this repository currently keeps only the essential editor surface and Markdown file handling.
