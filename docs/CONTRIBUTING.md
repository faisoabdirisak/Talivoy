# Contributing

Use Node 22.13+ in the 22.x line, or a supported Node 24+ release, with npm 9+.
Run commands from the application root. Use `npm ci` for the committed lockfile and consult README.md for local environment setup.
Do not change the separate `gemini-test` folder or commit credentials, SQLite files, generated build info, coverage, or verification logs.

## Changes and checks

1. Inspect the current plan and preserve its stage numbering.
2. Add behavior-focused regression tests for new functionality or a bug fix.
3. Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:coverage`, `npm run build`, and `npm audit`.
4. Review `git diff` and explicitly stage intended files. Never paste API keys into issues or reviews.
5. Keep docs and the existing plan accurate. Do not mark public deployment complete without a real verified deployment.

Server coverage must meet 80% aggregate statements, branches, functions, and lines across all `server/src` production code.
Do not lower thresholds or exclude difficult modules merely to pass CI. Simulate Granite, Gemini and hosted Docling boundaries in automated tests. Use fictional data for separate live smoke checks.
Most route tests mock Prisma; `server/src/persistence.test.ts` also checks a disposable real SQLite database. Extend these checks when persistence behavior or migrations change.
Never test destructive schema changes against the user's development database.

## Manual acceptance

Submit a fictional profile; verify three results and plan content. Navigate Home -> Opportunities -> Dashboard.
Select an opportunity, complete tasks, refresh and reopen the same host in the same browser.
Switch demo personas and exit demo; the live results should remain unchanged. Confirm demo tasks do not mutate shared seed records.
Test Start over only on a disposable guest session. Check mobile layout and keyboard access before a submission.
Fit scores are not completion percentages; confirm the lower task progress changes on completion.

## Acceptance checks for recent features

- Choose manual entry and verify résumé controls collapse. Choose a file and verify selection sends no request. Analyze, review the draft and confirm it before recommendations.
- Verify role, location, skills, education, stated experience and interests when present in the résumé. Check missing-field guidance.
- Focus a saved opportunity, compare a fictional job posting, review quotes/questions and deliberately add an action. Retry saving to check task identity and progress.
- Create a reminder in local time, refresh and export it. Verify the imported event time and alert in the chosen calendar.
- Preview selected adviser details, create a link and open it without the worker cookie. Verify omitted details, expiry and revocation.
- Submit fictional evaluation feedback with publication consent and check its public fields.
- Preview and apply time/budget refinement. Verify completed-task progress and stale-preview handling.

SQLite integration tests cover support-feature ownership, snapshot disclosure, expiry, revocation and cascading deletion. Calendar tests cover UTC conversion, escaping and folding. Component tests cover deliberate submission, selection and the shared view.

Record verification dates and scope while retaining earlier stage records as history. Private adviser responses and weekly check-ins have implemented forms, storage and worker review flows. Keep verification evidence aligned with the current schema.

## Commit examples

- `feat: ...` for behavior, `fix: ...` for a defect, `test: ...` for tests, `docs: ...` for documentation.
- Emoji conventions used here include `🔒 fix: harden guest session API` and `📋 docs: update development status`.

PRs should describe the concrete change, tests run, and any data or deployment implications.
No automatic deployment is enabled by CI. Publishing, destructive migrations, and history rewrites require explicit authorization.


## Adviser response and check-in acceptance

- Create a fresh link, open it in a separate browser and submit fictional adviser details. Check the submission confirmation and owner-only dashboard response.
- Revoke or expire a link and confirm new responses are rejected. Previously submitted responses should remain visible to the worker.
- Confirm acceptance requires worker review and adds one milestone even when retried.
- Save a check-in, reload history, preview guidance and confirm applying requires review.
- Change a task between preview and apply to verify stale-preview handling.
- Verify completed task descriptions and timestamps remain saved after adjustments.
- Confirm response and check-in rows disappear when their disposable guest session is deleted.
