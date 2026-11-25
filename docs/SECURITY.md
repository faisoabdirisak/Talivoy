# Route security review

## Live deployment verification — 22 November 2026

The public HTTPS deployment uses PostgreSQL and a Secure guest cookie. Live smoke checks
confirmed saved selection and completed-task restoration. My manual acceptance confirmed
the adviser feedback and weekly check-in journeys. See [LIVE_VERIFICATION.md](LIVE_VERIFICATION.md).
The detailed isolation, expiry and revocation claims below are supported by local regression
tests; the live checks do not constitute an independent penetration test or comprehensive audit.
Per-instance rate limits, guest recovery and retention limitations remain unchanged.

The initial ST-5 review was recorded on 6 November 2026. This document was extended on 18 November 2026 with recent feature controls and regression evidence.

## Route-by-route result

| Route | Checks reviewed | Result |
| --- | --- | --- |
| GET /health | Returns only process status | No configuration or secrets returned; not a dependency-readiness probe |
| POST /api/analyze | Input/output Zod schemas, body limit, AI rate limit, safe upstream/save failures, cookie creation | Secret non-leak tested; validated output persisted; fit inputs still rely on AI judgment |
| GET /api/sessions/me | Token lookup, missing token, public seed tokens, JSON response projection, storage failure | Guest access scoped to token; no token in JSON; no-store; DB failure now sanitized 500 rather than false empty response |
| PATCH /api/sessions/me/progress | Body validation, token, plan-item ownership, timestamp update, DB rejection | Other guests and public seed tokens cannot write; failed promises forwarded to safe error handler |
| PATCH /api/sessions/me/select | Body validation, opportunity ownership, null selection, DB rejection | Owned selections only; invalid/stale storage failures safely returned |
| DELETE /api/sessions/me | Token-scoped lookup, cascade delete, cookie clearing, origin gate, failure behavior | No other-session ID accepted; failed deletion no longer silently clears client state |
| POST /api/sessions/demo | Persona whitelist, token projection, read-only route, live-cookie preservation | Public fictional data only; no Set-Cookie or writes; public seed credentials blocked on live routes |
| POST /api/resume | Upload limit, MIME/signature checks, bounded draft and Docling/local fallback | Worker reviews extracted and model-suggested fields |
| POST /api/job-comparison | Input/output bounds, live ownership and quoted evidence checks | Unsupported quoted evidence rejected |
| POST /api/job-comparison/action | Signed action, owner binding, expiry, transactional ownership and deterministic task ID | Tampering and other-guest replay denied; retries preserve progress |
| /api/support/reminders | Guest ownership, future timestamp and milestone-scoped updates/deletion | Other guests cannot read or change reminders |
| /api/support/adviser-shares | Guest ownership, selected-task validation, field projection and expiry options | Selected fields enter the snapshot; listing omits tokens |
| POST /api/support/adviser-review/read | Random-token hash lookup, expiry and no-store policy | Expired/revoked links denied; only chosen snapshot returned |
| POST /api/sessions/me/refine | Guest ownership, bounded constraints and revision check | Changed plans require another preview |
| /api/evaluations | Publication consent, bounded answers, live ownership or demo persona, submission limit | Public projection omits reviewer code; identity self-reported |
| POST /api/support/adviser-review/respond | Current token, expiry, opportunity association, bounded fields and repeat-request identity | Returns submission confirmation without revealing other responses |
| GET /api/support/adviser-feedback | Opportunity/session ownership and explicit response projection | Guest-private answers, no token or share ID |
| POST /api/support/adviser-feedback/:id/accept | Worker ownership and transactional task upsert | Repeated acceptance keeps task identity and completed progress |
| /api/support/check-ins and /check-ins/:id/refine | Owner scoping, bounded notes, repeat-request identity and revision fingerprint | Private history and explicit reviewed adjustment, with completed guidance retained |
| Unknown /api routes | Production SPA boundary | JSON 404 instead of index.html |

## Common protections and fixes

- Helmet headers; 16 KB JSON limit; malformed JSON and oversized bodies have safe JSON errors.
- Restricted CORS with credentials plus an independent mutation Origin/fetch-metadata check. CORS alone is not a write authorization mechanism.
- HttpOnly, SameSite=Strict guest cookie; Secure in production. An opaque cookie is a bearer credential, not account authentication.
- Per-process analysis/session rate limits and no-store headers on API responses.
- Express 4 async route failures explicitly forwarded to error middleware. Raw database exceptions are not sent to the browser.
- New model-generated resource links accept only HTTP/HTTPS. Model output remains untrusted even after schema validation.
- Automated regression tests use fake credentials and mocked SDK boundaries, plus a disposable real SQLite persistence and guest-isolation check. No live Gemini requests made for this review.

## Remaining limits before broader use

- Confirmed profile text is sent to the configured model and may reappear in generated results. Résumé analysis sends extracted text to the configured model, and hosted Docling receives the file when enabled. Do not collect sensitive information for the challenge demo.
- Raw profile fields are not persisted, but generated results are. Cookie expiry does not delete DB records: automatic retention cleanup is not implemented.
- Cookie loss means no recovery; no accounts or cross-device access. A stolen guest cookie can access that guest's data.
- Repeated valid analysis creates a new saved session; old sessions need an eventual retention policy.
- An IP rate limiter is not a global provider-spend cap. Proxy configuration and shared limiting need deployment-specific review.
- Prompt injection and misleading suggestions remain possible; schema validation and fixed scoring weights do not prove factual accuracy.
- Granite and Docling adapters use request timeouts. Cancellation across the full browser/server/provider workflow and provider-spend controls remain follow-up work. Resource availability and cost/risk estimates require independent verification.
- New opportunities save bounded, validated cost/risk estimates, assumptions, questions and scoring signals in versioned explanation text. These can repeat profile details and are protected by the same guest access checks. Old rows remain without explanations. Scores are not success probabilities.
- SQLite concurrency, backups, production HTTPS, migrations, hosting, and dependency monitoring require operational work.
- No independent accessibility review, external penetration test, or deployed end-to-end assessment is claimed.

## Shared, public and retained data

A share token is an expiring bearer credential. Anyone holding it can read the chosen snapshot until expiry or revocation. It travels in a link fragment and POST body. The database stores its hash. Revocation controls subsequent reads, while recipients can keep copies of received content.

Reminders cascade with milestone deletion. Shares cascade with guest-session deletion. Expired shares are denied on read; automated deletion of expired rows remains pending. Public evaluations are independent records and remain after guest deletion. Reviewer names, roles, affiliations and answers are public after consent. Reviewer codes are stored and omitted from public responses.

Calendar export puts selected task content into a calendar file. Notification settings and imported copies are controlled in the worker's calendar. Automatic email and push delivery would require a separate implementation.

## Reproduce checks

`npm run lint`, `npm run typecheck`, `npm test`, `npm run test:coverage`, `npm run build`, `npm audit`.
Coverage includes all server production modules and enforces 80% on four aggregate metrics.
GitHub CodeQL success means the scan completed; inspect Security alerts and annotations separately.

References: [Express 4 async error handling](https://expressjs.com/en/guide/error-handling.html),
[Vitest coverage](https://vitest.dev/guide/coverage.html).


## Adviser response and check-in retention

The adviser form describes that answers go to the worker. Names and roles are self-reported. A bearer link permits submission while valid. It does not authenticate a professional identity. The worker reviews the response before adding its suggested next step.

Revocation and expiry deny new adviser submissions. Responses already submitted are retained under the worker's opportunity. They cascade with guest-session deletion. Weekly check-ins have the same opportunity/session ownership and deletion boundary. Public evaluation records remain independent.

The response and check-in request IDs support safe retries. The API validates ownership again inside mutations. Check-in previews use a revision fingerprint, and applying a stale preview returns a conflict. Applying a current preview preserves completed tasks and updates unfinished guidance only.

Disposable SQLite tests verify private reads, expiry/revocation rejection, response retention after revocation, replay-safe task creation, check-in history, stale-preview rejection, completion preservation and cascaded deletion.


## U.S. career pathway boundary

Pathway entries are scoped through the opportunity's guest session. Shared validation rejects unsupported states, careers and step keys. The action route reads content and HTTPS URLs from the curated catalog and creates a deterministic milestone inside an ownership-checked transaction. Retries preserve existing progress.

Worker notes are private guest data. Adviser snapshots can contain selected pathway actions through the existing task-selection flow. Those actions include official resource links and review dates and omit private checklist notes. Worker-marked Confirmed/Completed statuses record personal review rather than a determination by a licensing authority.

Current source checks and limited geographic/role coverage are displayed in the UI. Ongoing source review is an editorial maintenance task. Automated tests check catalog validation and the actual SQLite ownership, persistence, retry and deletion boundaries.

## Skills evidence privacy

Evidence is self-reported, never independently verified. Avoid sensitive identifiers, confidential employer material and private documents. Entries belong to the browser guest session; clearing cookies loses access, with no cross-device recovery added.

AI rephrasing requires opt-in to send the chosen saved skill/source/example to the configured provider. Templates make no AI request. Drafts are not automatically saved/shared. Workers confirm wording before persistence; source edits clear approval. The server validates lengths, ownership and revision fingerprints, limits requests and sanitizes errors. Numeric checks cannot establish truth.

Adviser reports include only checked entries and approved wording. Snapshots retain previously shared content after original edits/deletion; revoke future link access, but downloaded copies cannot be recalled. Guest deletion cascades private records. Demo entries stay temporary and excluded from live shares.
