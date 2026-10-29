# BugLens — Decisions Log

## D-001: WXT as the Extension Framework

**Decision:** Use WXT (v0.19) instead of raw Webpack/Vite config or Plasmo.

**Rationale:**
- WXT is purpose-built for Manifest V3, handles hot reload, and produces a correct `manifest.json` from a typed config file.
- Plasmo was considered but WXT has cleaner TypeScript support and doesn't impose a file-naming convention that fights React conventions.
- Plain Vite + `@crxjs/vite-plugin` was another option but requires manual manifest management.

**Trade-off:** WXT is less well-known than Plasmo. If a team member has no WXT experience, the learning curve is one afternoon.

---

## D-002: Capture in the Background Service Worker

**Decision:** Route capture through the background SW instead of calling `chrome.scripting` directly from the popup.

**Rationale:**
- The popup is torn down when it loses focus. If capture happened asynchronously in the popup and the user accidentally closed it, the result would be lost.
- The background SW is the stable context for privileged API calls.
- Separation makes `captureActiveTab()` unit-testable without a DOM.

**Trade-off:** Adds a `chrome.runtime.sendMessage` round trip. Latency is negligible (< 5 ms) for this use case.

---

## D-003: Selected Text via `chrome.scripting.executeScript`

**Decision:** Read `window.getSelection()` by injecting an ephemeral function into the active tab.

**Rationale:**
- There is no direct Chrome extension API to read a page's current selection from the background context. A content script is required.
- Using `scripting.executeScript` with a function (not a file) means no persistent content script is registered — the injection happens on demand and the code is garbage-collected immediately.
- This requires `scripting` + `activeTab` and avoids needing `<all_urls>`.

**Alternative considered:** A persistent content script declared in `manifest.json`. Rejected because it runs on every page load and asks for host permissions.

**Limitation:** The injection cannot access cross-origin iframes. If the selected text is inside an iframe with a different origin, it is not captured. This is a browser security boundary; there is no workaround without weaker security.

---

## D-004: Empty Selection Is Not an Error

**Decision:** An empty `selectedText` field is valid and does not fail or retry capture.

**Rationale:**
- Many valid bug reports don't involve selected text.
- Confusing "nothing selected" with "capture failed" would mislead the user.
- Person B's report editor should simply leave the `evidence` field empty when `selectedText` is `""`.

---

## D-005: Restricted Page Handling

**Decision:** Detect restricted URL schemes before attempting API calls and surface a human-readable error.

**Rationale:**
- Chrome's error messages for restricted page access are cryptic (`Cannot access a chrome:// URL`).
- Early detection lets us give the user a clear "navigate to a normal web page" instruction.
- `file://` is included in the restricted list even though Chrome can grant file access — requiring the user to explicitly grant that permission via `chrome://extensions` is safer than silently failing.

---

## D-006: Permissions — Minimal Set

**Decision:** Request only `tabs`, `scripting`, and `activeTab`.

| Permission | Why needed | Why not broader |
|------------|-----------|-----------------|
| `tabs` | Read `tab.url` and `tab.title` | Only reads active tab metadata |
| `scripting` | Inject selection-reader function | Scoped by `activeTab` to current tab only |
| `activeTab` | Grants temporary access to current tab | Expires when popup closes; no persistent host access |

No `<all_urls>`, no `cookies`, no `history`, no `webRequest`.

---

## D-007: Shared Type Contract Location

**Decision:** Place shared types in `src/types/bug-report.ts` and messaging types in `src/types/messages.ts`.

**Rationale:**
- Both Person A and Person B import from the same file; no duplication risk.
- If types need to change, there is one place to update and TypeScript will catch mismatches at compile time.
