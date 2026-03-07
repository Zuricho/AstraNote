# AstraNote Current Website Working Notes

## Purpose

This note describes how the current website version of AstraNote works based on the files that are actually present in the repository today.

The repository is not a normal source tree right now. It is effectively a shipped static build:

- `index.html`
- `assets/index-ZPN9QvMs.js`

That matters because any behavior change currently requires editing compiled output instead of changing original React source files.

## What Is Actually In The Repo

### Files that matter at runtime

- `index.html`
- `assets/index-ZPN9QvMs.js`

### What is missing

- No `src/`
- No `package.json`
- No Vite config in repo root
- No editable component source files
- No build scripts

So the current website is a static client app that must be served over HTTP and loaded in the browser.

## Runtime Model

## 1. Entry page

`index.html` is the only HTML entry point.

It does several jobs:

- sets the page title to `AstraNote`
- loads Tailwind from CDN
- defines some inline Tailwind theme extensions
- defines small custom CSS for scrollbars and TipTap placeholder behavior
- provides an import map for browser-side ESM packages from `esm.sh`
- loads the compiled app bundle from `assets/index-ZPN9QvMs.js`

Important detail:

- this app is browser-assembled from CDN imports plus one compiled local JS bundle
- it is not server-rendered
- it is not using a backend

## 2. Mounting the app

Inside the compiled bundle, the app finds `#root`, creates a React root, and renders the top-level app component.

At a high level, the boot flow is:

1. browser loads `index.html`
2. import map resolves React, TipTap, marked, turndown, Gemini client, etc.
3. `assets/index-ZPN9QvMs.js` executes
4. React mounts into `<div id="root"></div>`

## 3. Top-level state

The app component currently owns a small set of top-level state:

- document content as Markdown string
- current mode: `VISUAL` or `SOURCE`
- dark mode boolean
- editor ref for cross-mode actions

It also contains:

- initial starter Markdown content
- toolbar action dispatcher
- markdown file download handler

The current starter text has already been rewritten from the original ZenMark/Gemini demo copy to AstraNote-specific copy.

## Main UI Structure

## 1. Toolbar/header

The header component still exists as a compiled React component in the bundle.

Current visible toolbar functions:

- undo
- redo
- bold
- italic
- quote
- inline code
- bullet list
- ordered list
- switch between `Visual` and `Source`
- download Markdown
- toggle light/dark theme

Important current state:

- the `AI Assistant` button has been removed from the visible toolbar
- the header function signature still includes an `onToggleAI` prop in the compiled code, but the current app render path does not use it
- this is harmless dead interface surface, but it is evidence that the repo is currently edited at bundle level rather than source level

## 2. Main editor area

The main content area centers a single editor surface with max width.

The app conditionally renders one of two editor implementations:

- `EA(...)`: visual editor
- `Kv(...)`: source editor

Only one is shown at a time depending on `viewMode`.

## Editor Modes

## 1. Visual mode

The visual editor is powered by TipTap.

From the compiled bundle, the important pieces are:

- `@tiptap/react`
- `@tiptap/starter-kit`
- `@tiptap/extension-placeholder`
- `marked`
- `turndown`

### How visual mode works

The visual editor receives:

- `content`: current Markdown string
- `onChange`: callback to update top-level Markdown state

Internally it:

1. creates a TipTap editor instance
2. uses `marked` to parse Markdown into HTML when it needs to set editor content
3. uses `turndown` to convert current TipTap HTML back into Markdown on every update

So the visual editor is not storing a rich internal document as the canonical source of truth. The canonical app state is still Markdown text.

The effective loop is:

1. Markdown string exists in React state
2. `marked` turns Markdown into HTML for TipTap when syncing inward
3. user edits visually in TipTap
4. TipTap HTML is converted back to Markdown by `turndown`
5. Markdown state is updated

### Visual mode command support

The visual editor exposes imperative commands through a ref:

- `focus`
- `getSelection`
- `replaceSelection`
- `execute`

`execute` currently supports:

- bold
- italic
- code
- quote
- bullet-list
- ordered-list
- undo
- redo

These commands are called by the toolbar.

## 2. Source mode

Source mode is a plain `<textarea>` editor.

It receives:

- `value`: current Markdown string
- `onChange`: updates top-level Markdown state

It also exposes a ref API:

- `getSelection`
- `replaceSelection`
- `focus`
- `execute`

In source mode, formatting actions are implemented by string manipulation:

- bold wraps selection with `**`
- italic wraps selection with `*`
- code wraps selection with `` ` ``
- quote prefixes with `> `
- bullet list prefixes with `- `
- ordered list prefixes with `1. `

Undo/redo are not custom-implemented in source mode through JS command logic. The current bundle’s source-mode `execute` path is essentially formatting-oriented, while visual mode uses TipTap commands for undo/redo.

## How Content Flows Through The App

The most important design fact in the current build is this:

- the single shared state is Markdown text

That means both modes are editing the same Markdown document, just through different interfaces.

### Flow in source mode

1. user types directly into textarea
2. textarea `onChange` updates Markdown state
3. switching to visual mode later causes Markdown to be parsed into TipTap content

### Flow in visual mode

1. user edits in TipTap
2. TipTap update callback grabs HTML
3. `turndown` converts HTML to Markdown
4. Markdown state updates
5. switching to source mode later shows the latest Markdown string

This is why the app can switch modes without a separate serialization step at switch time. The conversion is already happening during editing.

## Download Function

The download button is entirely client-side.

The handler:

1. creates a `Blob` from the current Markdown string
2. creates a temporary `<a>` element
3. assigns an object URL to it
4. downloads `document.md`

There is no save-to-disk integration beyond browser download.

## Theme Handling

Dark mode is also client-only.

The app keeps a boolean in React state and applies/removes the `dark` class on `document.documentElement` in an effect.

That controls:

- Tailwind dark styles
- prose styles
- scrollbar colors

Current limitation:

- there is no persistence
- refresh likely resets theme to the hardcoded initial state from the bundle

## AI/Gemini Status

This needs to be described carefully because the current app is in an in-between state.

### What is still present

The compiled bundle still contains:

- Gemini client code
- AI helper prompt templates
- AI side panel component code

### What is currently wired

The visible app path no longer renders the AI panel from the top-level app component.

Specifically:

- the starter content no longer promotes AI use
- the top-level app render path no longer mounts the side panel
- the toolbar no longer shows the AI button

### What this means

Functionally, the current UI behaves like a basic markdown editor.

Architecturally, the bundle still contains dormant AI code because the repository only has compiled assets. That dead code will stay in the shipped JS until the original source project is recovered and rebuilt cleanly.

## Why The Site Must Be Served Over HTTP

This app should be opened through a local server, not by double-clicking `index.html`.

Reason:

- it uses module loading
- it depends on absolute asset paths like `/assets/...`
- browser module/CORS/path behavior is safer and more predictable over `http://localhost`

So local testing should use a static server such as:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Risks In The Current Repository Shape

## 1. Built-only editing risk

This is the biggest engineering problem right now.

Because only the compiled bundle exists:

- code is minified/compiled
- edits are fragile
- small changes can easily break runtime behavior
- dead code removal is risky because dependencies are not obvious at source level

## 2. Product/source mismatch

The repo title and README describe AstraNote, but parts of the compiled artifact still originate from a ZenMark/Gemini demo.

Current state is mixed:

- branding in visible entry and starter content is AstraNote
- internals still contain old demo artifacts

## 3. No rebuild path

Without original source files:

- you cannot safely refactor
- you cannot re-bundle
- you cannot remove unused dependencies cleanly
- you cannot upgrade React/TipTap in a controlled way

## Practical Plan From Here

## Short-term

If the immediate goal is only to demo the app:

1. keep changes minimal and UI-level
2. avoid deeper bundle surgery
3. test through a local static server after every change
4. avoid removing dormant bundled code unless absolutely necessary

## Medium-term

To make AstraNote maintainable:

1. recover or recreate the original source tree
2. rebuild the app as a normal Vite/React project
3. separate core editor functions from optional AI/demo features
4. make Markdown the explicit document model in source code rather than inferring from compiled output
5. then remove unused Gemini code at source level and rebuild

## Recommended Reconstruction Targets

If rebuilding from scratch, the source project should likely have modules roughly like:

- `App`
- `Toolbar`
- `VisualEditor`
- `SourceEditor`
- `theme`
- `markdownConversion`
- optional `aiAssistant`

That would make the current runtime model explicit and maintainable.

## Summary

The current website is a static, browser-run React app built around one shared Markdown string.

Its core working model is:

1. one Markdown state
2. two editing surfaces: TipTap visual mode and textarea source mode
3. conversion between Markdown and HTML using `marked` and `turndown`
4. toolbar-driven formatting actions
5. client-only download and theme toggling

It currently behaves like a basic markdown editor, but it is being maintained from compiled output, which is the main technical constraint and risk.
