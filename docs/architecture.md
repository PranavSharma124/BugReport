# BugLens — Architecture

## Overview

BugLens is a Chrome extension (Manifest V3) built with **WXT + React + TypeScript** that helps users capture webpage context and turn it into a structured, editable bug report exportable as Markdown.

## Stack

| Layer | Technology |
|-------|-----------|
| Extension framework | WXT (srcDir: `src/`, MV3) |
| UI | React 18 + TypeScript |
| Styling | Vanilla CSS (no Tailwind) |
| Testing | Vitest (node env for Person A; jsdom per-file for Person B) |
| Build | Vite (via WXT) |

## Folder Structure

```
BugReport/
├── src/
│   ├── entrypoints/
│   │   ├── background.ts          # Person A — MV3 service worker
│   │   └── popup/
│   │       ├── index.html         # Popup HTML entry
│   │       └── main.tsx           # React mount point
│   ├── types/                     # Shared contracts (DO NOT change without coordination)
│   │   ├── bug-report.ts          # CapturedContext, BugReport
│   │   └── messages.ts            # CaptureRequest, CaptureResponse
│   ├── utils/
│   │   ├── capture.ts             # Person A — captureActiveTab()
│   │   └── __tests__/
│   │       └── capture.test.ts    # Person A — capture unit tests
│   ├── lib/                       # Person B — pure logic modules
│   │   ├── reportInit.ts          # Report init from context + mocks + validation
│   │   ├── markdown.ts            # Markdown generation, copy, download
│   │   └── __tests__/
│   │       ├── reportInit.test.ts # 18 unit tests
│   │       └── markdown.test.ts   # 19 unit tests (jsdom env)
│   └── popup/
│       ├── App.tsx                # Root component (Person A scaffold + Person B wired in)
│       ├── popup.css              # Person A's styles + Person B's bl- prefixed styles
│       └── components/
│           ├── CaptureButton.tsx   # Person A
│           ├── CapturePreview.tsx  # Person A
│           ├── ErrorBanner.tsx     # Person A
│           ├── ReportEditor.tsx    # Person B — full report form
│           ├── StepsEditor.tsx     # Person B — reproduction steps add/edit/remove
│           ├── ExportPanel.tsx     # Person B — Markdown preview + copy/download
│           ├── Toast.tsx           # Person B — copy/download feedback
│           └── ValidationWarnings.tsx  # Person B — incomplete field warnings
├── docs/
│   ├── architecture.md
│   ├── decisions.md
│   ├── testing.md
│   └── ai-workflow.md
├── wxt.config.ts
├── vitest.config.ts
└── tsconfig.json
```

## Data Flow

```
Person A (browser capture)              Person B (report UI)
────────────────────────────────────    ──────────────────────────────────────
background.ts (service worker)          App.tsx
  └─ listens for CAPTURE_TAB msg         └─ handleCapture() sends CAPTURE_TAB
       └─ captureActiveTab()                  receives CaptureResponse
            ├─ chrome.tabs.query()            └─ on success:
            └─ chrome.scripting                    initReportFromContext(ctx)
                 .executeScript()                  → BugReport state
                                              └─ ReportEditor
                                                   user edits all fields
                                              └─ ExportPanel
                                                   generateMarkdown(report)
                                                   copyMarkdown() / downloadMarkdown()
```

## Shared Contract

All shared types live in `src/types/`:

```ts
// src/types/bug-report.ts
type CapturedContext = { url, title, selectedText, capturedAt }
type BugReport       = { title, sourceUrl, summary, evidence,
                         reproductionSteps, expectedBehavior, actualBehavior }

// src/types/messages.ts
type CaptureRequest  = { type: "CAPTURE_TAB" }
type CaptureResponse = { ok: true; data: CapturedContext }
                     | { ok: false; error: string }
```

## Component Responsibilities

### `App.tsx` (shared — Person A scaffold, Person B adds below capture section)
- Person A: Capture button → sends `CAPTURE_TAB` → handles response state.
- Person B: On `captureState.status === "success"`, renders `ReportEditor` + `ExportPanel` in a tab layout below `CapturePreview`.

### `reportInit.ts` (Person B)
- `initReportFromContext(ctx)`: deterministic mapping, **no invented content**.
- `emptyReport()`: blank report when no context available.
- `validateReport(report)`: list of human-readable warnings for incomplete fields.
- Exported mock contexts for testing.

### `markdown.ts` (Person B)
- `generateMarkdown(report)`: typed, handles empty fields, numbered steps.
- `markdownFilename(report)`: safe slug from title.
- `copyMarkdown(report)`: async, returns `{success, error?}` — **never silently fails**.
- `downloadMarkdown(report)`: sync Blob download, returns `{success, error?}`.

## CSS Strategy

Person A's styles use classes like `.buglens-*`, `.capture-*`, `.error-*`.

Person B's additions use the `bl-` prefix (e.g. `.bl-report-editor`, `.bl-tabs`, `.bl-btn`) and are appended at the bottom of `popup.css` under a clearly marked section header. This prevents any collision.

Both sections share the same `:root` CSS variables defined by Person A.

---

## Reproduce & Capture Architecture & Security Model

The "Reproduce & Capture" feature allows QA testers to start a recording session, reproduce an issue on the page, and capture future uncaught JavaScript exceptions and unhandled promise rejections.

### Security Boundaries & The Bridge Pattern

1. **Why `world: "MAIN"` is required for listeners:**
   Chrome extension content scripts execute in an **Isolated World** by default. Because error events are dispatched in the page's **Main World**, isolated content script listeners cannot see uncaught runtime exceptions from page scripts. Script injection with `world: "MAIN"` is required to attach the error handlers.

2. **Why extension data is NEVER stored on `window`:**
   Page scripts running in the Main World can inspect, modify, and tamper with `window` objects. BugLens strictly avoids storing session buffers or internal tokens on `window`.

3. **Validated Bridge from Page World to Extension (Token-Isolated):**
   - The Main World listener captures only native `ErrorEvent` and `PromiseRejectionEvent` properties.
   - It emits a session-specific DOM `CustomEvent` on `document` with an independent channel name (`__buglens_event_ch_<channelId>__`). The secret `sessionToken` is never passed to or exposed in the Main World.
   - The Isolated World content script receives the event via `document` and forwards it with the private `sessionToken` via `chrome.runtime.sendMessage`.
   - The background worker validates sender tab identity (`_sender.tab.id === session.tabId`), session token, and serializes all writes through a bounded in-memory promise queue to avoid concurrency race conditions.
   - Schema validation and sanitization via `validateAndSanitizeEvent`:
     - Truncates messages to **300 characters**.
     - Strips URL query strings (`?token=...`) and hash fragments (`#...`) to prevent credential leakage.
     - Strips control characters.
     - Enforces a hard cap of **20 events per session**.
     - Drops malformed or untrusted payloads.

4. **Session Lifecycle, Reload Invalidation & Cleanup:**
   - Sessions auto-expire after **10 minutes** via timestamp comparison.
   - Page navigation or reload on the target tab explicitly invalidates the session and alerts the user.
   - Sessions and page listeners are cleanly removed upon:
     - User clicking "Stop & Review Evidence" (context captured specifically from `session.tabId`)
     - User clicking "Cancel Session"
     - Tab navigation / page reload (`chrome.tabs.onUpdated`)
     - Tab closure (`chrome.tabs.onRemoved`)

5. **Review Gate Before Report Attachment:**
   Captured events are presented in an interactive review screen (`SessionReview.tsx`). The QA tester explicitly selects which events to attach as evidence. Attached events are injected into the editable `evidence` field in `ReportEditor`, allowing manual review and redaction prior to Markdown export.
