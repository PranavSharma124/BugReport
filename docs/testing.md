# BugLens — Testing

## How to Run Tests

```bash
# Run all unit tests
npm test

# Run TypeScript type check
npm run type-check

# Run linter
npm run lint

# Build extension for Chrome MV3
npm run build
```

---

## Automated Test Results (last run: 2026-10-29)

**All 95 unit tests pass across 5 test files.**

```
✓ src/utils/__tests__/capture.test.ts    (25 tests)
✓ src/utils/__tests__/session.test.ts    (15 tests)
✓ src/utils/__tests__/sanitize.test.ts   (14 tests)
✓ src/lib/__tests__/reportInit.test.ts   (22 tests)
✓ src/lib/__tests__/markdown.test.ts     (19 tests)

Test Files  5 passed (5)
     Tests  95 passed (95)
```

### 1. Browser Capture Tests (`src/utils/__tests__/capture.test.ts`) — 25 tests ✅

| Test | Status |
|------|--------|
| `isRestrictedUrl` returns true for `chrome://` | ✅ PASSED |
| `isRestrictedUrl` returns true for `chrome-extension://` | ✅ PASSED |
| `isRestrictedUrl` returns true for `edge://` | ✅ PASSED |
| `isRestrictedUrl` returns true for `about:` | ✅ PASSED |
| `isRestrictedUrl` returns true for `data:` | ✅ PASSED |
| `isRestrictedUrl` returns true for `javascript:` | ✅ PASSED |
| `isRestrictedUrl` returns true for `file://` | ✅ PASSED |
| `isRestrictedUrl` returns true for `devtools://` | ✅ PASSED |
| `isRestrictedUrl` returns true for `view-source://` | ✅ PASSED |
| `isRestrictedUrl` returns false for `http://` | ✅ PASSED |
| `isRestrictedUrl` returns false for `https://` | ✅ PASSED |
| `isRestrictedUrl` returns true for undefined / empty string | ✅ PASSED |
| `captureActiveTab` returns correct CapturedContext shape | ✅ PASSED |
| `captureActiveTab` populates url and title from tab | ✅ PASSED |
| `captureActiveTab` populates selectedText from scripting API | ✅ PASSED |
| `captureActiveTab` trims whitespace from selectedText | ✅ PASSED |
| `captureActiveTab` returns empty selectedText when nothing selected | ✅ PASSED |
| `captureActiveTab` throws on restricted URL | ✅ PASSED |
| `captureActiveTab` throws when no active tab | ✅ PASSED |
| `captureActiveTab` throws when tab URL is missing | ✅ PASSED |
| `captureActiveTab` silently treats scripting failure as empty selection | ✅ PASSED |
| `captureActiveTab` throws when chrome.tabs.query rejects | ✅ PASSED |
| `captureTabById` captures context from a specific tab by ID | ✅ PASSED |
| `captureTabById` throws when target tab is on a restricted URL | ✅ PASSED |
| `captureTabById` throws when target tab is not found | ✅ PASSED |

### 2. Session Lifecycle Tests (`src/utils/__tests__/session.test.ts`) — 15 tests ✅

| Test | Status |
|------|--------|
| `startSession` starts a session on a valid HTTPS tab | ✅ PASSED |
| `startSession` throws when attempting to start on a restricted page | ✅ PASSED |
| `startSession` is idempotent when starting on the same active tab | ✅ PASSED |
| `getSessionStatus` returns active session status accurately | ✅ PASSED |
| `recordSessionEvent` records valid events and enforces the 20-event limit | ✅ PASSED |
| `recordSessionEvent` rejects invalid session tokens | ✅ PASSED |
| `isSessionExpired` correctly identifies expired sessions (> 10 minutes) | ✅ PASSED |
| `stopSession` stops session, cleans up, and returns context with events | ✅ PASSED |
| `cancelSession` cancels and resets session state cleanly | ✅ PASSED |
| `cleanSession` does not wipe active session when called for unrelated tab | ✅ PASSED |
| `invalidateSession` invalidates active session and records reason on reload | ✅ PASSED |
| `startSession` cleans up expired session when starting new session on same tab | ✅ PASSED |
| `recordSessionEvent` rejects events if sender tab ID does not match session | ✅ PASSED |
| `stopSession` captures context from session.tabId even if another tab is focused | ✅ PASSED |
| `recordSessionEvent` handles 10 concurrent event recordings without drops or duplicates | ✅ PASSED |
| `recordSessionEvent` enforces 20-event maximum under concurrent burst | ✅ PASSED |

### 3. Sanitization & Security Tests (`src/utils/__tests__/sanitize.test.ts`) — 14 tests ✅

| Test | Status |
|------|--------|
| `sanitizeErrorMessage` preserves regular error messages under 300 chars | ✅ PASSED |
| `sanitizeErrorMessage` truncates error messages exceeding 300 chars | ✅ PASSED |
| `sanitizeErrorMessage` handles null and undefined gracefully | ✅ PASSED |
| `sanitizeErrorMessage` extracts message property from error-like objects | ✅ PASSED |
| `sanitizeErrorMessage` strips control characters | ✅ PASSED |
| `sanitizeSourceUrl` strips query strings and hash fragments | ✅ PASSED |
| `sanitizeSourceUrl` handles relative pathnames and strips query strings | ✅ PASSED |
| `sanitizeSourceUrl` safely sanitizes data: and blob: URLs | ✅ PASSED |
| `sanitizeSourceUrl` returns undefined for invalid or empty inputs | ✅ PASSED |
| `sanitizeLineNumber` returns floor integer for valid numbers | ✅ PASSED |
| `sanitizeLineNumber` returns undefined for negative numbers, NaN, or non-numbers | ✅ PASSED |
| `validateAndSanitizeEvent` validates a well-formed error event | ✅ PASSED |
| `validateAndSanitizeEvent` validates a well-formed unhandledrejection event | ✅ PASSED |
| `validateAndSanitizeEvent` rejects malformed payloads and non-objects | ✅ PASSED |

### 4. Report Initialization & Formatting (`src/lib/__tests__/reportInit.test.ts`) — 22 tests ✅

| Test | Status |
|------|--------|
| `initReportFromContext` populates title from page title | ✅ PASSED |
| `initReportFromContext` populates sourceUrl from context URL | ✅ PASSED |
| `initReportFromContext` populates evidence with `[Captured from page]` prefix | ✅ PASSED |
| `initReportFromContext` leaves evidence blank when `selectedText` is `""` | ✅ PASSED |
| `initReportFromContext` leaves summary, expected, actual blank | ✅ PASSED |
| `initReportFromContext` leaves reproductionSteps empty | ✅ PASSED |
| `formatSessionErrors` formats error events into numbered evidence lines | ✅ PASSED |
| `formatSessionErrors` returns empty string when no errors provided | ✅ PASSED |
| `initReportWithSessionErrors` attaches session errors to evidence | ✅ PASSED |
| `initReportWithSessionErrors` combines selected text and session errors cleanly | ✅ PASSED |
| `emptyReport` returns all string fields as `""` and steps as `[]` | ✅ PASSED |
| `validateReport` returns warnings for missing required fields | ✅ PASSED |

### 5. Markdown Export Tests (`src/lib/__tests__/markdown.test.ts`) — 19 tests ✅

| Test | Status |
|------|--------|
| `generateMarkdown` formats heading, URL, summary, steps, expected, actual | ✅ PASSED |
| `generateMarkdown` handles empty fields with placeholders | ✅ PASSED |
| `generateMarkdown` reflects edited report state | ✅ PASSED |
| `markdownFilename` slugifies title and falls back gracefully | ✅ PASSED |
| `copyMarkdown` copies to clipboard and handles errors | ✅ PASSED |
| `downloadMarkdown` creates Blob and triggers download | ✅ PASSED |

---

## Static Analysis & Build Verification

- **Type-Check:** `npm run type-check` (`tsc --noEmit`) → **✅ Zero errors**
- **Linter:** `npm run lint` (`eslint src --ext .ts,.tsx`) → **✅ Zero errors**
- **Production Build:** `npm run build` (`wxt build`) → **✅ Built in ~420ms** → `.output/chrome-mv3/` (182.18 kB)

---

## Manual Test Scenarios

These require loading the unpacked extension in Chrome (`chrome://extensions` → Developer mode → Load unpacked → `.output/chrome-mv3/`).

### Browser Capture Manual Tests (Person A Verification)

| # | Test Scenario | Expected Outcome | Status |
|---|--------------|------------------|--------|
| MT-1 | Normal HTTPS page (no selection) | CapturePreview shows URL, title, timestamp; no selection row | ✅ **PASS** (observed 2026-10-29) |
| MT-2 | Normal HTTPS page (with selection) | CapturePreview shows selected text | ✅ **PASS** (observed 2026-10-29) |
| MT-3 | Normal HTTPS page (explicit empty selection) | Treated as valid; capture succeeds without error | ✅ **PASS** (observed 2026-10-29) |
| MT-4 | Restricted page (`chrome://extensions`) | Error banner shown: unsupported page type | ✅ **PASS** (observed 2026-10-29) |
| MT-5 | New tab / `about:blank` | Error banner with restriction message | ⏳ **NOT RUN** |
| MT-6 | No Data Exfiltration | DevTools Network tab shows 0 extension outgoing requests | ⏳ **NOT RUN** |
| MT-7 | Extension on `file://` page | Error banner explaining page type not supported | ⏳ **NOT RUN** |

### Integrated End-to-End Workflow Manual Tests (Capture + Report Editor + Export)

| # | Test Scenario | Steps & Verification | Status |
|---|--------------|----------------------|--------|
| M1 | Capture triggers editor | Click "Capture This Page" on any HTTPS page → `CapturePreview` and report editor section with tabs render | ✅ **PASS** (observed 2026-10-29) |
| M2 | Selection pre-fills evidence | Capture with text selected → Evidence field pre-filled with `[Captured from page]\n...` and captured badge | ✅ **PASS** (observed 2026-10-29) |
| M3 | No selection leaves evidence empty | Capture without selection → Evidence textarea starts blank; no error | ✅ **PASS** (observed 2026-10-29) |
| M4 | Field editing | Edit title, sourceUrl, summary, expectedBehavior, actualBehavior → inputs retain user input | ✅ **PASS** (observed 2026-10-29) |
| M5 | Steps management | Click "+ Add Step" 3 times, enter text, edit step 2, click ✕ on step 1 → steps renumber to 1 and 2 | ✅ **PASS** (observed 2026-10-29) |
| M6 | Markdown preview | Switch to "Review & Export" tab → preview displays all edited fields formatted in Markdown | ✅ **PASS** (observed 2026-10-29) |
| M7 | Sensitive content removal | Clear or edit evidence field on Edit tab → switch to Export tab → deleted text is absent from preview | ✅ **PASS** (observed 2026-10-29) |
| M8 | Copy Markdown | Click "Copy Markdown" → green toast "✓ Copied to clipboard!" appears; clipboard contains markdown | ✅ **PASS** (observed 2026-10-29) |
| M9 | Download Markdown | Click "Download .md" → browser downloads `.md` file with slugified title; contents match report | ✅ **PASS** (observed 2026-10-29) |
| M10 | Privacy verification | Confirm exported file contains only current report values and no original unedited captured context | ✅ **PASS** (observed 2026-10-29) |
| M11 | Validation warnings | Leave title or summary empty → switch to Export tab → warning list displays incomplete fields | ⏳ **NOT RUN** |
| M12 | Capture reset | Click "↺ New" in CapturePreview → capture state resets to idle, editor disappears, "Capture" button visible | ⏳ **NOT RUN** |

### Reproduce & Capture Manual Tests

| # | Test Scenario | Steps & Verification | Status |
|---|--------------|----------------------|--------|
| RC-1 | Start Session | Click "Start Reproduce & Capture Session" → UI shows active recording banner with target page info | ⏳ **NOT RUN** |
| RC-2 | Popup Persistence | Start session, close popup, trigger `console.error` / `throw new Error()` on page, re-open popup → error counter reflects captured error | ⏳ **NOT RUN** |
| RC-3 | Review Screen & Selection | Click "Stop & Review Evidence" → review screen displays captured error with tag, timestamp, and message; tester can select/deselect errors | ⏳ **NOT RUN** |
| RC-4 | Attach Selected to Report | Click "Attach Selected & Open Report" → report editor opens; `evidence` field contains formatted console error with warning badge | ⏳ **NOT RUN** |
| RC-5 | Deselection Excludes Error | Uncheck an error on review screen and click attach → excluded error does not appear in `evidence` | ⏳ **NOT RUN** |
| RC-6 | Cancel Session | Click "Cancel Session" during recording → session resets cleanly to idle mode without error | ⏳ **NOT RUN** |
| RC-7 | Tab Navigation Reset | Start session on page, navigate tab to another URL → session automatically resets | ⏳ **NOT RUN** |
