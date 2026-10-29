# BugLens — Chrome Extension

BugLens is a lightweight, privacy-focused Chrome Extension (Manifest V3) that turns active webpage context into structured, production-ready bug reports in seconds.

Capture URL, title, metadata, and user-selected text with one click, edit and enrich the bug details in an intuitive editor, and export or copy clean Markdown formatted for GitHub, Jira, GitLab, or Linear.

---

## Features

- **📸 One-Click Webpage Capture**: Instantly grabs active tab URL, page title, timestamp, browser environment, and user-selected text.
- **📝 Structured Report Editor**:
  - Auto-seeded title with severity tag (`[P2]`, `[P1]`, etc.) and page context.
  - Severity selector (`P0 - Blocker`, `P1 - Critical`, `P2 - Major`, `P3 - Minor`, `P4 - Trivial`).
  - Expected vs. Actual behavior side-by-side comparison.
  - Interactive Step-by-Step reproduction editor (add, edit, remove numbered steps).
  - Selected text evidence field (with character counter).
  - Read-only environment metadata (URL, page title, captured timestamp).
- **🔒 Privacy & Sensitive Data Review**: Inspect and sanitize evidence or remove sensitive cookies/tokens before exporting.
- **📋 Dual Export Options**:
  - **Copy Markdown**: One-click clipboard copy with visual toast confirmation.
  - **Download `.md`**: Exports a dated file (e.g. `bug-report-2026-10-29.md`).
- **⚡ Zero External AI Dependency**: Generates deterministic, clean bug reports without sending data to third-party LLMs or remote servers.

---

## Tech Stack

- **Framework**: [WXT](https://wxt.dev/) (Chrome Manifest V3)
- **UI**: React 18, TypeScript
- **Styling**: Vanilla CSS with dark/light responsive tokens (`bl-*` design system)
- **Testing**: Vitest + JSDOM (59 unit tests)
- **Build**: Vite 5 (integrated via WXT)

---

## Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9

---

## Installation & Setup

```bash
# Clone the repository
git clone https://github.com/PranavSharma124/BugReport.git
cd BugReport

# Install dependencies
npm install
```

---

## Development

```bash
# Start dev server with hot reload
npm run dev
```

This compiles the extension in watch mode into `.output/chrome-mv3/`.

### Load into Chrome:
1. Open `chrome://extensions` in Google Chrome.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked**.
4. Select the `.output/chrome-mv3/` directory inside this repository.
5. Click the BugLens icon in the extension toolbar to open the popup.

---

## Production Build

```bash
# Build the production bundle
npm run build
```

Bundle size: ~164 kB total in `.output/chrome-mv3/`.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Run WXT development server with hot-reload |
| `npm run build` | Compile optimized production extension to `.output/chrome-mv3/` |
| `npm test` | Run Vitest unit tests (59 tests across 3 suites) |
| `npm run test:watch` | Run tests in interactive watch mode |
| `npm run type-check` | Validate TypeScript types (`tsc --noEmit`) |
| `npm run lint` | Run ESLint checks |
| `npm run zip` | Package production build into a ZIP for Web Store distribution |

---

## Project Structure

```
BugReport/
├── docs/                   # Architecture, decision records, and testing guides
│   ├── ai-workflow.md      # AI pair programming logs & audit trail
│   ├── architecture.md     # Extension architecture & data flow
│   ├── decisions.md        # Architecture Decision Records (ADRs)
│   └── testing.md          # Test suite documentation & manual test matrix
├── src/
│   ├── entrypoints/        # WXT entrypoints
│   │   ├── background.ts   # MV3 Service worker (tab querying & script injection)
│   │   └── popup/          # Extension popup HTML entrypoint
│   ├── popup/              # Popup UI application
│   │   ├── components/     # React UI components
│   │   │   ├── CaptureButton.tsx       # Capture trigger button
│   │   │   ├── CapturePreview.tsx      # Captured context banner
│   │   │   ├── ErrorBanner.tsx         # User-facing error messaging
│   │   │   ├── ExportPanel.tsx         # Copy / Download action buttons
│   │   │   ├── ReportEditor.tsx        # Bug report form fields & controls
│   │   │   ├── StepsEditor.tsx         # Dynamic reproduction steps list
│   │   │   ├── Toast.tsx               # Feedback notifications
│   │   │   └── ValidationWarnings.tsx  # Missing field hints
│   │   ├── App.tsx         # Main popup orchestrator
│   │   └── popup.css       # Unified styling tokens & layouts
│   ├── lib/                # Report generation & export logic
│   │   ├── markdown.ts     # Markdown serialization, clipboard copy & file download
│   │   ├── reportInit.ts   # Report factory, validation & mock context
│   │   └── __tests__/      # Vitest suites for reportInit & markdown
│   ├── utils/              # Browser capture helpers
│   │   ├── capture.ts      # Active tab context extractor
│   │   └── __tests__/      # Capture unit tests
│   └── types/              # Shared TypeScript contracts
│       ├── bug-report.ts   # BugReport & CapturedContext models
│       └── messages.ts     # Internal messaging protocol
├── package.json
├── tsconfig.json
└── wxt.config.ts           # WXT & Chrome manifest configuration
```

---

## Permissions & Security

BugLens strictly adheres to the principle of least privilege in Chrome Manifest V3:

| Permission | Purpose |
|------------|---------|
| `tabs` | Retrieve the active tab's URL and title for environment context |
| `scripting` | Execute a lightweight one-shot script to retrieve `window.getSelection()` |
| `activeTab` | Restrict `scripting` strictly to the user-invoked tab (no broad host permissions) |
| `clipboardWrite` | Allow copying the generated Markdown report to system clipboard |

No persistent host access (`<all_urls>`) is requested. All operations run locally within the extension.

---

## Testing

BugLens includes 59 automated unit tests verifying core logic:

```bash
npm test
```

- **`src/lib/__tests__/reportInit.test.ts`** (18 tests): Default report initialization, severity defaults, title formulation, validation warning rules.
- **`src/lib/__tests__/markdown.test.ts`** (19 tests): Markdown schema formatting, section omission rules, clipboard integration, file download triggers.
- **`src/utils/__tests__/capture.test.ts`** (22 tests): Tab context querying, error boundaries, empty selection edge cases.

---

## Documentation

- [Architecture & Data Flow](docs/architecture.md)
- [Architecture Decision Records](docs/decisions.md)
- [Testing Matrix & Checklist](docs/testing.md)
- [AI Workflow & Audit Log](docs/ai-workflow.md)
