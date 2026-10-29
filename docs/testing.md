# BugLens — Testing

## Unit Tests (Vitest)

Run with: `npm test`

### Test File

`src/utils/__tests__/capture.test.ts`

### Test Cases and Status

> Status recorded after actual test run (post `npm install`).
> All chrome.* APIs are mocked — no real browser required.

| # | Test Case | Status |
|---|-----------|--------|
| 1 | `isRestrictedUrl` — chrome:// | ✅ PASSED |
| 2 | `isRestrictedUrl` — chrome-extension:// | ✅ PASSED |
| 3 | `isRestrictedUrl` — about:blank | ✅ PASSED |
| 4 | `isRestrictedUrl` — data: | ✅ PASSED |
| 5 | `isRestrictedUrl` — javascript: | ✅ PASSED |
| 6 | `isRestrictedUrl` — file:// | ✅ PASSED |
| 7 | `isRestrictedUrl` — devtools:// | ✅ PASSED |
| 8 | `isRestrictedUrl` — view-source: | ✅ PASSED |
| 9 | `isRestrictedUrl` — https:// returns false | ✅ PASSED |
| 10 | `isRestrictedUrl` — http:// returns false | ✅ PASSED |
| 11 | `isRestrictedUrl` — undefined returns true | ✅ PASSED |
| 12 | `isRestrictedUrl` — empty string returns true | ✅ PASSED |
| 13 | `captureActiveTab` — normal page, no selection | ✅ PASSED |
| 14 | `captureActiveTab` — page with selected text | ✅ PASSED |
| 15 | `captureActiveTab` — trims whitespace from selection | ✅ PASSED |
| 16 | `captureActiveTab` — restricted URL throws user-friendly error | ✅ PASSED |
| 17 | `captureActiveTab` — no active tab throws | ✅ PASSED |
| 18 | `captureActiveTab` — tab with empty URL throws | ✅ PASSED |
| 19 | `captureActiveTab` — scripting failure → empty selection (no throw) | ✅ PASSED |
| 20 | `captureActiveTab` — tabs.query rejection throws | ✅ PASSED |
| 21 | `captureActiveTab` — capturedAt is valid ISO 8601 | ✅ PASSED |
| 22 | `captureActiveTab` — returned object has all CapturedContext fields | ✅ PASSED |

**All 22 unit tests passed. Run: `vitest v1.6.1`, duration 132 ms.**

---

## Manual Test Scenarios

These require loading the unpacked extension in Chrome (`chrome://extensions` → Developer mode → Load unpacked → `.output/chrome-mv3/`).

### MT-1: Normal HTTPS Page (No Selection)

1. Open `https://example.com`
2. Click BugLens icon
3. Click "Capture This Page"
4. **Expected:** CapturePreview shows correct URL, title, timestamp. "Selected text" row is absent.
5. **Result: ✅ PASS** — Observed 2026-10-29. URL, title, and ISO timestamp displayed correctly. No "Selected text" row rendered.

### MT-2: Normal HTTPS Page (With Selection)

1. Open `https://example.com`
2. Select some text (e.g. "This domain is for use...")
3. Click BugLens icon and capture
4. **Expected:** CapturePreview shows the selected text in the "Selected text" row.
5. **Result: ✅ PASS** — Observed 2026-10-29. Selected text appeared in the preview under "Selected text".

### MT-3: Normal HTTPS Page (No Selection — explicit no-selection case)

1. Open any HTTPS page with no text selected
2. Click BugLens icon and capture
3. **Expected:** Capture succeeds; no "Selected text" row; no error.
4. **Result: ✅ PASS** — Observed 2026-10-29. Capture completed without error. Empty `selectedText` treated correctly as valid, not an error state.

### MT-4: Restricted Page (chrome://)

1. Open `chrome://extensions`
2. Click BugLens icon and capture
3. **Expected:** Error banner appears with a message indicating the page type is not supported.
4. **Result: ✅ PASS** — Observed 2026-10-29. Error banner shown: "BugLens cannot capture from this page type (chrome:). Please navigate to a regular web page (http:// or https://) and try again."

---

### MT-5: New Tab / about:blank *(NOT RUN)*

1. Open a new tab (`about:blank` or the Chrome new-tab page `chrome://newtab`)
2. Click BugLens icon and capture
3. **Expected:** Error banner with restriction message (same class of error as MT-4).

### MT-6: No Data Exfiltration *(NOT RUN)*

1. Open browser DevTools → Network tab on any page
2. Trigger a capture
3. **Expected:** Zero network requests originating from the extension.

### MT-7: Extension Icon on Non-http/s Page (file://) *(NOT RUN)*

1. Open a local HTML file in Chrome
2. Attempt capture
3. **Expected:** Error banner explaining the page type is not supported.

---

## Type-Check

```bash
npm run type-check
```

**Result (2026-10-29, integration-readiness re-run): ✅ Zero errors.**

## Lint

```bash
npm run lint
```

Expected: zero errors in `src/`.

## Production Build

```bash
npm run build
```

**Result (2026-10-29, integration-readiness re-run): ✅ Built in 492 ms → `.output/chrome-mv3/`.**
