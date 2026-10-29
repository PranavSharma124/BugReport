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

**All 59 unit tests pass across 3 test files.**

```
✓ src/utils/__tests__/capture.test.ts    (22 tests)
✓ src/lib/__tests__/reportInit.test.ts   (18 tests)
✓ src/lib/__tests__/markdown.test.ts     (19 tests)

Test Files  3 passed (3)
     Tests  59 passed (59)
```

### Person A — Capture Tests (`src/utils/__tests__/capture.test.ts`) — 22 tests ✅

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

### Person B — Report Init Tests (`src/lib/__tests__/reportInit.test.ts`) — 18 tests ✅

| Test | Status |
|------|--------|
| `initReportFromContext` populates title from page title | ✅ PASSED |
| `initReportFromContext` populates sourceUrl from context URL | ✅ PASSED |
| `initReportFromContext` populates evidence with `[Captured from page]` prefix | ✅ PASSED |
| `initReportFromContext` leaves evidence **blank** when `selectedText` is `""` | ✅ PASSED |
| `initReportFromContext` leaves summary blank — never invented | ✅ PASSED |
| `initReportFromContext` leaves expectedBehavior blank — never invented | ✅ PASSED |
| `initReportFromContext` leaves actualBehavior blank — never invented | ✅ PASSED |
| `initReportFromContext` leaves reproductionSteps empty — never invented | ✅ PASSED |
| `initReportFromContext` handles minimal context (all fields empty) | ✅ PASSED |
| `emptyReport` returns all string fields as `""` | ✅ PASSED |
| `emptyReport` returns `reproductionSteps: []` | ✅ PASSED |
| `validateReport` returns no warnings for a complete report | ✅ PASSED |
| `validateReport` warns when title is missing | ✅ PASSED |
| `validateReport` warns when sourceUrl is missing | ✅ PASSED |
| `validateReport` warns when summary is missing | ✅ PASSED |
| `validateReport` warns when actualBehavior is missing | ✅ PASSED |
| `validateReport` warns when expectedBehavior is missing | ✅ PASSED |
| `validateReport` warns when reproductionSteps is empty | ✅ PASSED |

### Person B — Markdown Tests (`src/lib/__tests__/markdown.test.ts`) — 19 tests ✅

> Uses `// @vitest-environment jsdom` annotation for DOM API access.

| Test | Status |
|------|--------|
| `generateMarkdown` includes heading with bug title | ✅ PASSED |
| `generateMarkdown` includes source URL | ✅ PASSED |
| `generateMarkdown` includes summary | ✅ PASSED |
| `generateMarkdown` numbers reproduction steps correctly (1. 2. 3.) | ✅ PASSED |
| `generateMarkdown` includes expected behavior | ✅ PASSED |
| `generateMarkdown` includes actual behavior | ✅ PASSED |
| `generateMarkdown` handles empty fields with `_Not provided_` placeholder | ✅ PASSED |
| `generateMarkdown` reflects **edited** report — not original captured context | ✅ PASSED |
| `generateMarkdown` confirms deleted content is **absent** from export | ✅ PASSED |
| `generateMarkdown` includes `review before sharing` footer | ✅ PASSED |
| `markdownFilename` slugifies the bug title | ✅ PASSED |
| `markdownFilename` falls back to `bug-report.md` for empty title | ✅ PASSED |
| `markdownFilename` truncates titles over 60 chars | ✅ PASSED |
| `copyMarkdown` returns `{success: true}` when clipboard write succeeds | ✅ PASSED |
| `copyMarkdown` calls `clipboard.writeText` with the generated markdown | ✅ PASSED |
| `copyMarkdown` returns `{success: false, error}` when clipboard throws | ✅ PASSED |
| `copyMarkdown` does **not** claim success on clipboard failure | ✅ PASSED |
| `downloadMarkdown` returns `{success: true}` | ✅ PASSED |
| `downloadMarkdown` creates a Blob and triggers anchor click | ✅ PASSED |

---

## Static Analysis & Build Verification

- **Type-Check:** `npm run type-check` (`tsc --noEmit`) → **✅ Zero errors**
- **Linter:** `npm run lint` (`eslint src --ext .ts,.tsx`) → **✅ Zero errors**
- **Production Build:** `npm run build` (`wxt build`) → **✅ Built in ~400ms** → `.output/chrome-mv3/`

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

These scenarios verify the combined product end-to-end.

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
