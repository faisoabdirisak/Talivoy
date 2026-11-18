# API reference

Development base URL: `http://localhost:3001`. The frontend normally uses its same-origin Vite proxy.
For JSON requests, use `Content-Type: application/json` and include browser credentials. Never put guest tokens into URLs.
All `/api` responses are marked `Cache-Control: no-store`. Cross-origin browser mutations are rejected.

## Routes

| Method and path | Input | Success | Key failures |
| --- | --- | --- | --- |
| GET `/health` | None | 200 `{ "status": "ok" }` | Health does not check DB or provider availability |
| POST `/api/resume?interpret=true` | Raw PDF or DOCX bytes | 200 editable draft | 400 file type or signature, 403 origin, 413 size, 422 unreadable file, 429 rate limit |
| POST `/api/analyze` | Profile below | 200 Session + Set-Cookie | 400 validation, 403 origin, 413 size, 429 rate limit, 500 save, 502 AI |
| GET `/api/sessions/me` | Guest cookie | 200 Session, or 204 when absent/unrecognized | 500 storage failure |
| PATCH `/api/sessions/me/progress` | `{ "planItemId": "...", "isCompleted": true }` | 204 | 400 body, 401 cookie, 403 item ownership, 500 storage |
| PATCH `/api/sessions/me/select` | `{ "opportunityId": "..." }` or null | 204 | 400 body, 401 cookie, 403 opportunity ownership, 500 storage/stale session |
| DELETE `/api/sessions/me` | Guest cookie | 204, clears cookie; deletes owned session if present | 403 origin, 500 storage |
| POST `/api/sessions/me/refine` | `opportunityId`, `constraints` and optional `revision` | 200 original/refined/revision | 400 input, 401 cookie, 404 opportunity, 409 stale preview |
| GET `/api/evaluations` | None | 200 latest 100 published evaluations | 500 storage |
| POST `/api/evaluations` | Valid evaluation with `publish: true` | 201 published evaluation | 400 validation, 401 live cookie, 404 recommendation, 429 limit |
| POST `/api/sessions/demo` | `{ "personaId": "maria" }` (`james`, `aisha` also allowed) | 200 fictional Session; no cookie changes | 400 persona, 404 not seeded, 500 storage |

AI analysis: 10 requests per 15 minutes per IP. Résumé intake: 5 requests per 15 minutes per IP. Session endpoints: 120 requests per minute per IP.
Limits are in-memory per server process. Browser mutations require an allowed Origin when supplied and reject cross-site fetch metadata.
A non-browser client may omit Origin, but ownership requirements still apply.

## Résumé draft

Send raw bytes with `application/pdf` or `application/vnd.openxmlformats-officedocument.wordprocessingml.document`. The upload limit is 5 MB. With `interpret=true`, the server requests model interpretation. The response includes `draft` with any available `currentRole`, `location`, `skills`, `experience`, `education`, and `interests`; `extraction` as `docling` or `local`; and `interpreted` indicating whether the model supplied usable fields. Missing fields can be filled manually. Submit the confirmed profile separately to `POST /api/analyze`.

## Profile

```json
{
  "currentRole": "Retail manager",
  "skills": "Customer service and team leadership",
  "experience": "Six years leading a retail team",
  "location": "Chicago, IL",
  "startupBudget": 500,
  "interests": "Remote operations",
  "constraints": "Ten hours weekly for training",
  "goals": "Explore a practical career transition"
}
```

Required: currentRole (1-200 chars), skills (1-1000), experience (1-500), location (1-200), goals (1-1000).
Optional: startupBudget (integer USD, 0-1,000,000; default 0), interests (up to 500), constraints (up to 1000), education (up to 500), urgency (up to 200).
The body limit is 16 KB. Use fictional data; profile contents are sent to the AI provider.

## Session response

Session contains `id`, ISO `createdAt`/`updatedAt`, nullable `selectedOpportunityId`, and `opportunities` sorted by rank.
Each opportunity contains `id`, `title`, `category`, `summary`, `reasoning`, `feasibilityScore`, `rank`, and `planItems`.
Each plan item contains `id`, `day`, `week`, `title`, optional `description`/`resourceUrl`, `isCompleted`, and nullable `completedAt`.
New AI resource URLs are restricted to HTTP or HTTPS. Optional absent values may be omitted from JSON.
The guest `cookieToken`, API key, and original profile are not in this response.
New opportunities include nullable `explanation`:

- `version: 1`, `source: "ai-estimate"` or `"fictional-demo"`.
- `estimatedCostUSD`: nonnegative integer or null (unknown, distinct from 0).
- `risks`: up to 500 characters or null.
- `assumptions` and `questionsToVerify`: up to six strings each, at most 300 characters per string.
- `signals`: skillFitPct and affordabilityPct (0-100), launchTimeDays (1-365), complexityScore (1-10).

The server creates this envelope from validated model output and stores it as versioned JSON text in SQLite.
The same version-1 formula supplies server scores and UI contributions. Assumptions and questions default to empty arrays if absent,
not invented statements. Old, malformed, or unsupported saved explanations are returned as null without changing the saved score or plan.
Demo signals are deliberately synthetic; only new live analyses have AI-estimated inputs.

## Errors and cookies

Validation errors use `{ "error": "Invalid request", "details": { "field": ["message"] } }`.
Other errors use a safe `{ "error": "..." }` message, never a raw stack or database error.
`talivoy_sid` is HttpOnly, SameSite=Strict, Path=/, with a 30-day maximum age and Secure in production.
Public fictional seed tokens are rejected as guest credentials. Demo progress is temporary client state.

## Job posting comparison

POST `/api/job-comparison` accepts `opportunityId`, `opportunityTitle`, `profile` (20–4000 characters), `posting` (50–7000), and `demo` (default false). Live requests require the guest cookie and ownership of the opportunity. Responses contain `matches`, `gaps`, `action`, and a live-only signed `actionToken`. Quotes are checked against the submitted inputs. Errors include 400 invalid input, 401 missing session, 403 ownership, 429 rate limit, and 502 failed or unsupported model output.

POST `/api/job-comparison/action` accepts `opportunityId`, `title`, `description`, `expires`, and `token` from the reviewed comparison. The response is a PlanItem. The server verifies the signature and ownership inside a transaction, then upserts a deterministic task ID at day 30, week 4. Retries preserve existing progress. Invalid or expired authorization returns 409. These endpoints share a 10-request-per-15-minute rate limit per IP. Signing keys are held in process memory, so pending authorizations expire on server restart.

## Milestone reminders and adviser sharing

All endpoints in this section have the prefix `/api/support` and share a limit of 60 requests per minute per IP. Guest cookies are required except for the public review read.

| Method and path | Input and behavior |
| --- | --- |
| GET `/reminders` | List the current guest's reminder IDs, milestone IDs and UTC due times. |
| POST `/reminders` | `planItemId` and future ISO `dueAt`; verify ownership and upsert one reminder per milestone. |
| DELETE `/reminders/:id` | Delete only a reminder owned by the current guest; return 204. |
| GET `/adviser-shares` | List the current guest's active share IDs and creation/expiry times. |
| POST `/adviser-shares` | `opportunityId`, booleans `includeTitle`, `includeSummary`, `includeReasoning`, `includeProgress`, selected `taskIds`, and `expiresInDays` (1, 7 or 30). Return 201 with a random token and share metadata. |
| DELETE `/adviser-shares/:id` | Revoke only a link owned by the current guest; return 204. |
| POST `/adviser-review/read` | Public `token` in JSON. Return the selected snapshot, expiry and canRespond flag, or 404 for invalid, expired or revoked links. |

Share tokens contain 32 random bytes encoded as hex. Only SHA-256 hashes are stored. Browser links place the token in the URL fragment and send it in the read request body. Responses use the API's no-store policy. The snapshot contains only selected title/summary/reasoning and selected milestones with their descriptions and day/week. Completion status is omitted unless chosen. Existing copies held by recipients cannot be revoked.

Reminders cascade with milestone deletion, and shares cascade with guest-session deletion. Expired shares are denied on read; automatic removal of expired rows is not implemented. Reminder delivery consists of notices in the open dashboard and optional calendar export; the server does not schedule outbound messages.


## Refinement and public evaluations

For refinement, `constraints` contains `budget` (integer USD from 0 to 1,000,000) and `hours` (weekly hours from 0.5 to 168). Omitting `revision` generates a preview. Sending the returned revision applies the proposal if saved tasks and constraints match its fingerprint. Shared TypeScript logic adjusts unfinished task descriptions.

Public evaluation input includes `opportunityId`, `name`, `role`, `affiliation`, `reviewerCode`, `fit`, `reason`, `firstStep`, `usefulness`, `reportChanges`, `friction` and `publish: true`. Optional `demoPersona` is `maria`, `james` or `aisha`. Live evaluation verifies guest ownership of the opportunity. The form bounds answers and requires publication consent. Submissions are limited to 10 per 15 minutes per IP.

Public responses include source, ID, creation time, opportunity title, reviewer name/role/affiliation and answer fields. They omit the reviewer code. Reviewer identities are self-reported. Private adviser responses and check-in endpoints are described below.


## Private adviser responses

All paths below use the prefix /api/support and its shared 60-request-per-minute limit.

| Method and path | Input | Access and behavior |
| --- | --- | --- |
| POST /adviser-review/respond | token, requestId (UUID), reviewerName, reviewerRole, practicality, assessment, milestoneSuggestion, nextStep, nextStepDetails | Public holder of a valid unexpired response-enabled link. Return 201 with submitted true. Invalid input returns 400; unavailable or revoked link returns 404. |
| GET /adviser-feedback?opportunityId=... | Opportunity ID | Guest-owned responses with creation and acceptance timestamps. Other guests receive an empty list. |
| POST /adviser-feedback/:id/accept | Empty JSON object | Worker ownership required. Return the added/reused PlanItem, or 404 if unavailable. |

Practicality is Practical, Needs changes, or More information needed. Names and roles have a 100-character limit, the next step has a 200-character limit, and assessment, milestone suggestions and step details allow 1000 characters each. Name, role, assessment and next step are required. Suggestions and step details may be empty strings. A deterministic response ID combines the token hash and requestId so a repeated request keeps the original response.

Private reads omit token, share ID and submission request ID. Acceptance uses a deterministic task ID, preserves existing progress and sets acceptedAt transactionally. The new milestone goes to Week 4, day 30. Revocation removes the share association while retaining submitted responses under their opportunity. Session deletion cascades through the opportunity to its responses.

## Weekly check-ins

| Method and path | Input | Access and behavior |
| --- | --- | --- |
| GET /check-ins?opportunityId=... | Opportunity ID | Guest-owned history ordered newest first. |
| POST /check-ins | opportunityId, requestId (UUID), completedWork, blockers, budget, hours | Return 201 with the saved history entry. Validation errors return 400; unavailable opportunity returns 403. |
| POST /check-ins/:id/refine | Optional revision | Preview guidance when revision is absent; apply a reviewed preview when supplied. Return original, refined and revision. Missing ownership returns 404; stale/already-applied previews return 409. |

Completed work requires 1–1000 characters; blockers allow up to 1000. Budget is integer USD from 0 to 1,000,000 and weekly hours range from 0.5 to 168. Repeated save requests with the same opportunity and requestId reuse the stored record. History exposes appliedAt and omits the internal appliedRevision.

Check-in adjustments reuse shared TypeScript refinement logic. A fingerprint protects the preview from concurrent task changes. Applying updates only unfinished descriptions and sets appliedAt and appliedRevision in the same transaction. Retrying the same applied revision returns current saved state. These routes record progress notes and propose time/budget guidance. Task checkboxes control actual completion.

Existing guest cookies named `restart_sid` are accepted during the Talivoy rebrand. New sessions use `talivoy_sid`. Start over clears both cookie names.
