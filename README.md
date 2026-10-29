# BugLens — Chrome Extension

A professional Chrome extension for creating structured, editable bug reports from the webpage you are currently viewing.

## Tech Stack

- [WXT](https://wxt.dev/) — Chrome Extension framework (Manifest V3)
- React 18 + TypeScript
- Vitest for unit tests

## Prerequisites

- Node.js ≥ 18
- npm ≥ 9

## Setup

```bash
npm install
```

## Development

```bash
npm run dev
```

This starts WXT in watch mode and outputs the unpacked extension to `.output/chrome-mv3/`.

## Load in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `.output/chrome-mv3/` directory

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Production build |
| `npm run type-check` | TypeScript type checking |
| `npm run lint` | ESLint |
| `npm test` | Run unit tests |
| `npm run zip` | Package for Web Store submission |

## Project Structure

```
src/
├── entrypoints/
│   ├── background.ts    # Person A — MV3 Service Worker (capture handler)
│   └── popup/
│       ├── index.html   # Popup entry HTML
│       └── main.tsx     # React mount point
├── popup/               # Extension popup UI
│   ├── components/      # UI components
│   │   ├── CaptureButton.tsx       # Person A — trigger capture
│   │   ├── CapturePreview.tsx      # Person A — captured data summary
│   │   ├── ErrorBanner.tsx         # Person A — error display
│   │   ├── ReportEditor.tsx        # Person B — bug report form
│   │   ├── StepsEditor.tsx         # Person B — reproduction steps manager
│   │   ├── ExportPanel.tsx         # Person B — Markdown preview & export
│   │   ├── Toast.tsx               # Person B — feedback notifications
│   │   └── ValidationWarnings.tsx  # Person B — completeness warnings
│   ├── App.tsx          # Root component (capture state + report workflow)
│   └── popup.css        # Styles (Person A base + Person B bl-* components)
├── lib/                 # Pure business logic (Person B)
│   ├── reportInit.ts    # Context to BugReport initializer & validator
│   ├── markdown.ts      # Markdown generator, copy & download
│   └── __tests__/       # Lib unit tests
├── types/
│   ├── bug-report.ts    # Shared CapturedContext + BugReport types
│   └── messages.ts      # Extension messaging contract
└── utils/
    ├── capture.ts       # Core browser capture logic
    └── __tests__/       # Capture unit tests
```

## Permissions

| Permission | Reason |
|------------|--------|
| `tabs` | Read the active tab's URL and title |
| `scripting` | Inject a one-shot function to read `window.getSelection()` |
| `activeTab` | Scope `scripting` to only the current active tab — no broad host access |
| `clipboardWrite` | Write generated Markdown report to clipboard on user copy action |

## Docs

- [`docs/architecture.md`](docs/architecture.md)
- [`docs/decisions.md`](docs/decisions.md)
- [`docs/testing.md`](docs/testing.md)
- [`docs/ai-workflow.md`](docs/ai-workflow.md)
