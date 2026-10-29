# BugLens — Chrome Extension

BugLens is a lightweight, privacy-focused Chrome Extension (Manifest V3) that turns active webpage context into structured, production-ready bug reports in seconds.

Capture URL, title, metadata, and user-selected text with one click, edit and enrich the bug details in an intuitive editor, and export or copy clean Markdown formatted for GitHub, Jira, GitLab, or Linear.

---

## Features

- **📸 Dual Capture Modes**:
  - **Instant Snapshot**: Instantly grabs active tab URL, page title, timestamp, and user-selected text.
  - **Reproduce & Capture Session**: Start a recording session that survives popup closure, reproduce a bug on the page, automatically catch future unhandled JavaScript errors and promise rejections, review events in an interactive checklist, and attach relevant errors as evidence.
- **📝 Structured Report Editor**:
  - Auto-seeded title with page context.
  - Expected vs. Actual behavior side-by-side comparison.
  - Interactive Step-by-Step reproduction editor (add, edit, remove numbered steps).
  - Selected text evidence field (clearly tagged as captured from page).
  - Read-only environment metadata (URL, page title, captured timestamp).
- **🔒 Privacy & Sensitive Data Review**: Inspect and sanitize evidence or remove sensitive cookies/tokens before exporting.
- **📋 Dual Export Options**:
  - **Copy Markdown**: One-click clipboard copy with visual toast confirmation.
  - **Download `.md`**: Exports a slugified file (e.g. `bug-on-example-domain.md`).
- **⚡ Zero External AI Dependency**: Generates deterministic, clean bug reports without sending data to third-party LLMs or remote servers.

---

## Tech Stack

- **Framework**: [WXT](https://wxt.dev/) (Chrome Manifest V3)
- **UI**: React 18, TypeScript
- **Styling**: Vanilla CSS with dark/light responsive tokens (`bl-*` design system)
- **Testing**: Vitest + JSDOM (95 unit tests)
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
| `npm test` | Run Vitest unit tests (95 tests across 5 suites) |
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
│   │   ├── background.ts   # MV3 Service worker (tab querying, session orchestration & listeners)
│   │   └── popup/          # Extension popup HTML entrypoint & React mount
│   ├── popup/              # Popup UI application
│   │   ├── components/     # React UI components
│   │   │   ├── CaptureButton.tsx       # Instant capture trigger button
│   │   │   ├── CapturePreview.tsx      # Captured context banner
│   │   │   ├── ErrorBanner.tsx         # User-facing error & invalidation messaging
│   │   │   ├── ExportPanel.tsx         # Copy / Download action buttons & preview
│   │   │   ├── ReportEditor.tsx        # Bug report form fields & controls
│   │   │   ├── SessionReview.tsx       # Reproduce & capture evidence review gate
│   │   │   ├── StepsEditor.tsx         # Dynamic reproduction steps list
│   │   │   ├── Toast.tsx               # Feedback notifications
│   │   │   └── ValidationWarnings.tsx  # Missing field hints
│   │   ├── App.tsx         # Main popup orchestrator (capture state + session + report workflow)
│   │   └── popup.css       # Unified styling tokens & layouts
│   ├── lib/                # Pure report generation & export logic
│   │   ├── markdown.ts     # Markdown serialization, clipboard copy & file download
│   │   ├── reportInit.ts   # Report factory, validation & mock context
│   │   └── __tests__/      # Vitest suites for reportInit & markdown
│   ├── utils/              # Browser capture & session helpers
│   │   ├── capture.ts      # Active tab context extractor (instant & by ID)
│   │   ├── sanitize.ts     # Error sanitization, validation & bounds enforcement
│   │   ├── session.ts      # Reproduce & capture session lifecycle & serialization queue
│   │   └── __tests__/      # Vitest suites for capture, session, and sanitize
│   └── types/              # Shared TypeScript contracts
│       ├── bug-report.ts   # BugReport & CapturedContext models
│       ├── messages.ts     # Internal extension messaging protocol
│       └── session.ts      # CaptureSession & error event types
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
| `scripting` | Execute lightweight scripts in isolated/main worlds to read selection and capture uncaught errors |
| `activeTab` | Restrict `scripting` strictly to the user-invoked tab (no broad host permissions) |
| `clipboardWrite` | Allow copying the generated Markdown report to system clipboard |
| `storage` | Store active capture session state across service worker idle sleep |

No persistent host access (`<all_urls>`) is requested. All operations run locally within the extension.

---

## Testing

BugLens includes 95 automated unit tests verifying core logic:

```bash
npm test
```

- **`src/utils/__tests__/capture.test.ts`** (25 tests): Tab context querying, `captureTabById`, error boundaries, empty selection edge cases.
- **`src/utils/__tests__/session.test.ts`** (15 tests): Session start/stop lifecycle, 20-event bounding, reload invalidation, expired-session restart, sender tab validation, concurrent burst serialization queue.
- **`src/utils/__tests__/sanitize.test.ts`** (14 tests): Error message truncation (300 chars), source URL sanitization, query/hash removal, bridge payload validation.
- **`src/lib/__tests__/reportInit.test.ts`** (22 tests): Default report initialization, severity defaults, session error formatting, validation rules.
- **`src/lib/__tests__/markdown.test.ts`** (19 tests): Markdown schema formatting, section omission rules, clipboard integration, file download triggers.

---

## Documentation

- [Architecture & Data Flow](docs/architecture.md)
- [Architecture Decision Records](docs/decisions.md)
- [Testing Matrix & Checklist](docs/testing.md)
- [AI Workflow & Audit Log](docs/ai-workflow.md)
