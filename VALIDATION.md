# TraceStep validation

Validated on October 30, 2026, Asia/Shanghai. This reports actual fixture and browser behavior, not general extraction accuracy or a user study.

## Automated checks

- **18 / 18 behavioral tests passed**, using Node.js v24.19.0 and the built-in test runner.
- `node --check dist/engine.js` and `node --check dist/app.js` passed.
- Tests include year-boundary relative dates, invalid dates, ambiguous dates, negative/completed lines, unknown owners, duplicates, blockers, confirmation gating, next-step ordering, Markdown escaping, source-integrity validation, CRLF lines, generic pronouns and input limits.
- Two issues found during early testing were resolved: `Priority: high` was not recognized, and an initial escaping assertion incorrectly searched for a substring inside an escaped string. Final tests passed after correction. Later ownership and size limits were added and tested.

## Browser checks

The app was served on loopback and inspected in the Codex in-app Chromium browser. The page returned HTTP 200. The observed desktop CSS viewport was 1280 × 720.

| Check | Observed result |
| --- | --- |
| Initial page | Empty workspace and explanatory UI loaded |
| Synthetic example | 3 sources → 8 candidates, 9 evidence links, 3 candidates with gaps |
| Duplicate review | One checklist action showed exact quotes from Launch sync line 3 and Pilot feedback line 6 |
| Confirm step | Confirmation count changed to 1; next-step card changed from review request to confirmed action |
| Resolve ambiguity | Entering synthetic owner Jordan and date 2026-10-30 changed confirmations to 2 and gaps to 2 |
| Confirmed filter | Showed the two confirmed actions |
| Markdown export | Actual 2,216-byte file found on disk, read and copied as `examples/sample-plan.md`; evidence quotes present |
| JSON save | Actual workspace file saved; 3 sources, 8 actions, 1 confirmation and 9 evidence references verified |
| JSON open | File selected through the browser chooser; UI restored the saved counts and source evidence |
| Markdown import | Local sample imported with 417 characters and preserved line structure |
| Missing source date | Imported “tomorrow” stayed unconfirmed; it was not anchored to the plan date |
| Browser errors | No error or warning entries returned by the captured browser log query after these flows |

The download-event API timed out, but export success was established by inspecting the actual files and round-tripping the JSON in the browser. A toast alone was not treated as proof of download.

## Visual evidence

- `evidence/01-workspace.jpg`: desktop workspace and source-linked plan.
- `evidence/02-source-trace.jpg`: review modal with two original source references.
- `evidence/03-confirmed-filter.jpg`: confirmed-only state after manual review.

## Verification boundaries

- A direct `file:` browser test was rejected by the browser tool's URL security policy. It was not bypassed. The verified runtime method is the optional local HTTP preview; direct opening is supported by the buildless structure but was not exercised by this tool.
- A 390 × 844 viewport override did not change the actual viewport, which remained 1280 × 720. No mobile test success is claimed. Responsive CSS is present but still needs a real small-screen pass.
- No cross-browser matrix, screen-reader audit, performance benchmark or real-user accuracy evaluation was run.
- No recorded video, competition submission or deployment is implied by screenshots or tests.
