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
├── background/      # MV3 Service Worker (capture logic lives here)
├── popup/           # Extension popup UI
│   ├── components/  # CaptureButton, CapturePreview, ErrorBanner
│   ├── App.tsx      # Root component — wire Person B's editor here
│   └── popup.css    # Styles
├── types/
│   ├── bug-report.ts  # Shared CapturedContext + BugReport types
│   └── messages.ts    # Extension messaging contract
└── utils/
    ├── capture.ts       # Core capture logic
    └── __tests__/       # Unit tests
```

## Permissions

| Permission | Reason |
|------------|--------|
| `tabs` | Read the active tab's URL and title |
| `scripting` | Inject a one-shot function to read `window.getSelection()` |
| `activeTab` | Scope `scripting` to only the current active tab — no broad host access |

## Docs

- [`docs/architecture.md`](docs/architecture.md)
- [`docs/decisions.md`](docs/decisions.md)
- [`docs/testing.md`](docs/testing.md)
- [`docs/ai-workflow.md`](docs/ai-workflow.md)
