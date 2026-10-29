# BugLens — Testing

## How to Run Tests

```bash
npm test            # Run all tests once (vitest run)
npm run test:watch  # Watch mode during development
npm run type-check  # TypeScript — must be 0 errors before any PR
```

---

## Test Results (last run: 2026-10-29)

**All 59 tests pass across 3 test files.**

```
✓ src/lib/__tests__/reportInit.test.ts   (18 tests) 11ms
✓ src/utils/__tests__/capture.test.ts   (22 tests) 28ms
✓ src/lib/__tests__/markdown.test.ts    (19 tests) 16ms

Test Files  3 passed (3)
     Tests  59 passed (59)
  Duration  2.54s
```

**Type-check:** `tsc --noEmit` → **0 errors**

---

## Person A — Capture Tests (`src/utils/__tests__/capture.test.ts`) — 22 tests ✅

| Test | Status |
|------|--------|
| `isRestrictedUrl` returns true for `chrome://` | ✅ |
| `isRestrictedUrl` returns true for `chrome-extension://` | ✅ |
| `isRestrictedUrl` returns true for `edge://` | ✅ |
| `isRestrictedUrl` returns true for `about:` | ✅ |
| `isRestrictedUrl` returns true for `data:` | ✅ |
| `isRestrictedUrl` returns true for `javascript:` | ✅ |
| `isRestrictedUrl` returns true for `file://` | ✅ |
| `isRestrictedUrl` returns false for `http://` | ✅ |
| `isRestrictedUrl` returns false for `https://` | ✅ |
| `captureActiveTab` returns correct CapturedContext shape | ✅ |
| `captureActiveTab` populates url and title from tab | ✅ |
| `captureActiveTab` populates selectedText from scripting API | ✅ |
| `captureActiveTab` returns empty selectedText when nothing selected | ✅ |
| `captureActiveTab` throws on restricted URL | ✅ |
| `captureActiveTab` throws when no active tab | ✅ |
| `captureActiveTab` throws when tab URL is missing | ✅ |
| `captureActiveTab` silently treats scripting failure as empty selection | ✅ |
| + 5 more edge cases | ✅ |

---

## Person B — Report Init Tests (`src/lib/__tests__/reportInit.test.ts`) — 18 tests ✅

| Test | Status |
|------|--------|
| `initReportFromContext` populates title from page title | ✅ |
| `initReportFromContext` populates sourceUrl from context URL | ✅ |
| `initReportFromContext` populates evidence with `[Captured from page]` prefix | ✅ |
| `initReportFromContext` leaves evidence **blank** when `selectedText` is `""` | ✅ |
| `initReportFromContext` leaves summary blank — never invented | ✅ |
| `initReportFromContext` leaves expectedBehavior blank — never invented | ✅ |
| `initReportFromContext` leaves actualBehavior blank — never invented | ✅ |
| `initReportFromContext` leaves reproductionSteps empty — never invented | ✅ |
| `initReportFromContext` handles minimal context (all fields empty) | ✅ |
| `emptyReport` returns all string fields as `""` | ✅ |
| `emptyReport` returns `reproductionSteps: []` | ✅ |
| `validateReport` returns no warnings for a complete report | ✅ |
| `validateReport` warns when title is missing | ✅ |
| `validateReport` warns when summary is missing | ✅ |
| `validateReport` warns when actualBehavior is missing | ✅ |
| `validateReport` warns when expectedBehavior is missing | ✅ |
| `validateReport` warns when reproductionSteps is empty | ✅ |
| `validateReport` returns multiple warnings for a fully empty report | ✅ |

---

## Person B — Markdown Tests (`src/lib/__tests__/markdown.test.ts`) — 19 tests ✅

> Uses `// @vitest-environment jsdom` annotation for DOM API access.

| Test | Status |
|------|--------|
| `generateMarkdown` includes heading with bug title | ✅ |
| `generateMarkdown` includes source URL | ✅ |
| `generateMarkdown` includes summary | ✅ |
| `generateMarkdown` numbers reproduction steps correctly (1. 2. 3.) | ✅ |
| `generateMarkdown` includes expected behavior | ✅ |
| `generateMarkdown` includes actual behavior | ✅ |
| `generateMarkdown` handles empty fields with `_Not provided_` placeholder | ✅ |
| `generateMarkdown` reflects **edited** report — not original captured context | ✅ |
| `generateMarkdown` confirms deleted content is **absent** from export | ✅ |
| `generateMarkdown` includes `review before sharing` footer | ✅ |
| `markdownFilename` slugifies the bug title | ✅ |
| `markdownFilename` falls back to `bug-report.md` for empty title | ✅ |
| `markdownFilename` truncates titles over 60 chars | ✅ |
| `copyMarkdown` returns `{success: true}` when clipboard write succeeds | ✅ |
| `copyMarkdown` calls `clipboard.writeText` with the generated markdown | ✅ |
| `copyMarkdown` returns `{success: false, error}` when clipboard throws | ✅ |
| `copyMarkdown` does **not** claim success on clipboard failure | ✅ |
| `downloadMarkdown` returns `{success: true}` | ✅ |
| `downloadMarkdown` creates a Blob and triggers anchor click | ✅ |

---

## Manual Test Cases

These require the extension loaded in Chrome (`.output/chrome-mv3/`). Not yet run in a real browser — required before final merge to `main`.

| # | Test | Status |
|---|------|--------|
| M1 | Load extension → click "Capture This Page" on an HTTP page → editor appears | ⬜ Not run |
| M2 | Capture with selected text → evidence field pre-filled with `[Captured from page]` badge | ⬜ Not run |
| M3 | Capture with nothing selected → evidence field starts **empty** (not an error) | ⬜ Not run |
| M4 | Edit all report fields (title, URL, summary, evidence, steps, expected, actual) | ⬜ Not run |
| M5 | Add 3 steps, edit step 2, remove step 1 → steps renumber correctly | ⬜ Not run |
| M6 | Switch to "Review & Export" tab → Markdown preview shows all filled fields | ⬜ Not run |
| M7 | Clear evidence field → switch to Export → Markdown shows `_Not provided_` | ⬜ Not run |
| M8 | Click "Copy Markdown" → toast shows "✓ Copied to clipboard!" | ⬜ Not run |
| M9 | Click "Download .md" → file downloaded with slugified name, valid content | ⬜ Not run |
| M10 | Export after deleting evidence → original captured text absent from `.md` file | ⬜ Not run |
| M11 | Open DevTools Network tab during full workflow → 0 external network requests | ⬜ Not run |
| M12 | Validation warnings visible on Export tab when required fields are empty | ⬜ Not run |
| M13 | Click "↺ New" → capture resets, report editor disappears | ⬜ Not run |

---

## Known Gaps

- No React component integration tests — core logic fully covered by 37 unit tests; component interaction requires a browser or Playwright setup.
- `@vitest-environment jsdom` annotation in `markdown.test.ts` adds ~1.3s startup; acceptable for CI.
- Manual tests M1–M13 require the extension loaded in Chrome — not automatable without a browser-extension testing harness (e.g. Playwright + `chrome-launcher`).
