# HackHoster submission copy

These fields are prepared text, **not evidence of a submitted entry**. Use the project's actual accessible repository or demo URL; do not submit a local path or a placeholder URL.

## Project name

TraceStep

## One-line description

Turn scattered meeting notes into a private, editable action plan where every next step links to its exact source.

## Problem and audience

Small-team meeting facilitators often leave a call with several pages of notes, scattered follow-up messages and no trustworthy list of next steps. A fluent summary can hide unanswered questions: who owns the action, when it is due, whether it is blocked, and which sentence supports it.

## What we built

TraceStep is a zero-dependency browser tool for turning a few text sources into a reviewable plan. It finds explicit action candidates, merges literal duplicates, preserves source quotes and line numbers, and flags missing owners, ambiguous dates and blockers. The user edits and confirms each action. Only a confirmed, assigned, dated and unblocked item can become the recommended next step.

## Walkthrough (required)

Open the source package's `dist/index.html` in a modern browser, or run `npm start` with Node.js 18+ and use the printed local URL. Click **Try the product-launch example**. Three synthetic sources produce eight action candidates and nine evidence links. Open **Review the launch checklist**: the duplicate is one candidate, supported by exact quotes from two sources. Confirm it, and the next-step card changes from a review request to a confirmed action. Open the task about the accessibility test owner: “Friday” stays unresolved, so enter the intended owner and date yourself. Export Markdown to carry the plan and evidence into another workflow, or save a JSON workspace to resume later.

## How it works

The app runs transparent English text patterns entirely in the browser. Explicit markers, checkboxes, supported starting verbs and simple named commitments identify candidates. Source-relative dates resolve only when a source date is present. Prioritization is a deterministic heuristic, not a model score. Source content locks after extraction to keep provenance stable; edited actions retain their original quotes. No network calls, account, paid API, analytics or backend storage are used by the app.

## What works and validation

The complete app supports multiple sources, text-file import, extraction, duplicate evidence, source context, editable owner/date/priority/blocker fields, confirmation and completion states, filters, Markdown export and workspace save/open. Engine behavior is checked by the included Node.js tests. Browser validation and the exact test count are recorded in `VALIDATION.md`. The bundled example is synthetic and demonstrates functionality; no real-world accuracy or productivity gain is claimed.

## At least one limitation

This is a focused rule-based prototype, not a language model. It can miss implied commitments and misread prose outside the documented patterns. It supports one action per line and English action patterns. Weekdays such as “Friday,” slash dates and “next week” are deliberately left for human confirmation. It does not parse PDFs or create tasks in third-party services. Refreshing an unsaved tab loses the workspace; save a file before leaving.

## Originality and work completed during the challenge

The interface, extraction engine, evidence-preserving edits, synthetic demo, exports, tests and documentation were created for this October challenge during its published window. The central design choice is to make uncertainty and provenance part of the next-step workflow, rather than presenting every extracted sentence as a reliable task.

## Credits / AI disclosure

OpenAI Codex assisted substantially with concept development, original code, styling, synthetic fixtures, tests, debugging and documentation. No AI model is called by the app at runtime. There are no third-party runtime dependencies, stock assets or external datasets. The code, prose and synthetic examples are original and MIT licensed; see `CREDITS.md` and `LICENSE`. The entrant is responsible for final review and accurate eligibility declarations.

## Links to fill from verified state

- Source repository: use the verified public repository URL after publication.
- Live demo: use the verified deployed URL if one is available. Otherwise judges can run the source; no live deployment is claimed here.
- Walkthrough video: optional; no video is claimed unless a real recording exists.

## Entrant-only information

Complete HackHoster onboarding with the entrant's real information and any required guardian permission, check team eligibility, then use the official project form. A saved draft does not count: verify the site's final submitted state after submitting.
