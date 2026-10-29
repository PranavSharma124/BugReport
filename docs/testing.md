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

These require loading the extension in Chrome. Run after `npm run build`.

### MT-1: Normal HTTPS Page (No Selection)

1. Open `https://example.com`
2. Click BugLens icon
3. Click "Capture This Page"
4. **Expected:** CapturePreview shows correct URL, title, timestamp. "Selected text" row is absent.

### MT-2: Normal HTTPS Page (With Selection)

1. Open `https://example.com`
2. Select some text (e.g. "This domain is for use...")
3. Click BugLens icon and capture
4. **Expected:** CapturePreview shows the selected text in the "Selected text" row.

### MT-3: Restricted Page (chrome://)

1. Open `chrome://extensions`
2. Click BugLens icon and capture
3. **Expected:** Error banner appears: "BugLens cannot capture from this page type (chrome:)."

### MT-4: New Tab / about:blank

1. Open a new tab (about:blank or the Chrome new-tab page)
2. Attempt capture
3. **Expected:** Error banner with restriction message.

### MT-5: No Data Exfiltration

1. Open browser DevTools → Network tab on any page
2. Trigger a capture
3. **Expected:** Zero network requests originating from the extension.

### MT-6: Extension Icon on Non-http/s Page (file://)

1. Open a local HTML file in Chrome
2. Attempt capture
3. **Expected:** Error banner explaining the page type is not supported.

---

## Type-Check

```bash
npm run type-check
```

Expected: zero errors after `wxt prepare` generates `.wxt/types/`.

## Lint

```bash
npm run lint
```

Expected: zero errors in `src/`.
