# AstraNote Current Website Working Notes

## Runtime Shape

The website is a static client-side app with two runtime files:

- `index.html`
- `assets/app.js`

It must be served over HTTP because the app uses browser ESM imports and an absolute module path for `/assets/app.js`.

## What The Current App Does

The repository now keeps only the editor core:

- one TipTap visual editor
- one Markdown string as the persisted document format
- one full-page writing surface with local CSS

## What Was Removed

The trimmed build no longer includes:

- toolbar buttons and file controls
- separate Markdown source mode
- math support
- PDF export
- dark mode and theme persistence
- outline, stats, and status sidebar
- Tailwind and KaTeX CDN assets

## Content Model

The data flow is:

1. Markdown is stored in React state
2. `marked` converts that Markdown into HTML for TipTap
3. TipTap edits visually
4. a custom serializer converts TipTap JSON back into Markdown

That serializer is the key bridge that keeps the app a Markdown editor rather than a plain rich-text editor.
