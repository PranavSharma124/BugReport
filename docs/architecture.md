# BugLens — Architecture

## Overview

BugLens is a Manifest V3 Chrome extension. It has three contexts:

1. **Popup** (`src/popup/`) — The visible UI. Renders when the user clicks the extension icon.
2. **Background Service Worker** (`src/background/`) — The privileged context that runs `chrome.tabs` and `chrome.scripting`.
3. **Injected Script** — An ephemeral function injected by `chrome.scripting.executeScript` to read `window.getSelection()`.

## Capture Flow

```
User clicks "Capture This Page" in Popup
        │
        ▼
Popup sends { type: "CAPTURE_TAB" } via chrome.runtime.sendMessage
        │
        ▼
Background Service Worker receives message
        │
        ▼
captureActiveTab() [src/utils/capture.ts]
    ├─ chrome.tabs.query({ active: true, currentWindow: true })
    │       → gets tab.id, tab.url, tab.title
    ├─ isRestrictedUrl(tab.url)
    │       → throws user-friendly Error if restricted
    ├─ getSelectedText(tabId, url) [internal]
    │       → chrome.scripting.executeScript injects:
    │           () => window.getSelection()?.toString() ?? ""
    │       → returns "" on any failure (never blocks capture)
    └─ new Date().toISOString()  → capturedAt
        │
        ▼
Returns CapturedContext { url, title, selectedText, capturedAt }
        │
        ▼
Background sends { ok: true, data: CapturedContext } back to Popup
        │
        ▼
Popup updates state → renders CapturePreview
        │
        ▼
[Person B] ReportEditor receives CapturedContext as prop
```

## Why the Background Handles Capture

In Manifest V3:
- `chrome.scripting.executeScript` can be called from the popup directly **with `activeTab`**.  
- However, delegating to the background keeps the popup thin and stateless, makes the capture logic independently testable without a DOM or browser context, and follows the standard MV3 pattern where privileged API calls live in the service worker.

## Extension Contexts

| Context | File | Runs When |
|---------|------|-----------|
| Popup | `src/popup/` | User clicks the extension icon |
| Service Worker | `src/background/index.ts` | On-demand, when a message arrives or the extension is first installed |
| Content (injected) | Ephemeral closure | Only when `captureActiveTab()` executes `scripting.executeScript` |

## Permission Model

```
activeTab  ──────┐
                 ├──► chrome.scripting.executeScript(tabId)
scripting  ──────┘         (scoped to the single active tab only)

tabs  ────────────────► chrome.tabs.query(...)  (read url, title)
```

No host permissions (`<all_urls>`, `*://*/*`) are requested. `activeTab` plus `scripting` gives temporary access to the current page only for the duration of the API call.

## Data Flow (no external calls)

```
chrome.tabs API → captureActiveTab() → CapturedContext (in memory)
                                             │
                                             ▼
                                    chrome.runtime message
                                             │
                                             ▼
                                    React state (popup only)
                                             │
                                             ▼
                              [Person B] BugReport (in memory)
                                             │
                                             ▼
                                    Markdown export (clipboard / download)
```

All data stays in the browser. Nothing is sent to an external server.
