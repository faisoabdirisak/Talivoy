# Architecture

## Boundaries

`client/` is the React UI; `shared/` supplies Zod schemas and types; `server/` exposes the Express API.
`prisma/schema.prisma` defines SQLite persistence. npm workspaces and the root lockfile are the dependency source of truth.
The separate `gemini-test` directory is outside this repository; the application neither imports nor requires it.

## Résumé intake

The profile page offers manual entry and résumé-assisted entry. Selecting a file shows its name locally. **Analyze My Résumé** sends the file to `POST /api/resume?interpret=true`. The server checks the MIME type, file signature, and size before processing.

When enabled, hosted Docling converts the file to Markdown. The adapter submits a job, polls for completion, and retrieves the Markdown artifact. If Docling is unavailable, PDF.js or Mammoth extracts text on the server. The configured model interprets a bounded excerpt, with common contact patterns removed, into validated draft fields. Recognizable document labels provide a fallback if interpretation fails. The worker reviews and confirms the editable draft before generating recommendations. The résumé endpoint returns the draft without saving a guest session.

## Analysis flow

1. ProfileForm validates a non-sensitive profile and posts JSON to `/api/analyze`.
2. The server validates bounds, builds a prompt, and calls the configured provider using server-only credentials. Granite uses the watsonx.ai chat endpoint and IBM Cloud IAM authentication. Gemini uses the Google Gen AI SDK.
3. JSON fences are removed and the model output is validated: exactly three opportunities, each with 12 plan items.
4. TypeScript computes a rounded score: skill fit 40%, affordability 30%, launch speed 20%, simplicity 10%.
   Launch speed maps 1 day to 100 and 365 days to 0; simplicity maps complexity 1 to 100 and 10 to 0.
   Scores depend on AI-supplied signals; deterministic arithmetic does not make those inputs objective.
5. Prisma saves opportunity and plan data, and the server sets an opaque HttpOnly guest cookie.
6. The browser stores the returned session in `useSession`; GET `/api/sessions/me` restores it after reload.

## Persistence and progress

Session owns Opportunity; Opportunity owns PlanItem; each PlanItem has at most one ProgressEntry.
Session also holds selectedOpportunityId. Cascading deletion removes the session's results and progress.
Task completion is persisted through PATCH `/api/sessions/me/progress`; the dashboard computes percentages from completed items.
Streaks count consecutive UTC calendar days ending today or yesterday with at least one currently completed task.
Undoing completion removes its timestamp from that calculation. Re-checking a task records a new completion time.
The original profile is not stored. New opportunities store a versioned explanation JSON text column containing cost/risk estimates, assumptions, verification questions, and scoring signals. Older rows remain null; malformed or unsupported explanations are safely projected as null.

## Guest identity and demo

The random guest token is an access credential. It is sent only in an HttpOnly, SameSite=Strict cookie,
with Secure enabled in production, and never returned as a JSON field. There is no account recovery or cross-device identity.
Fictional seeded personas are publicly readable through a whitelist of persona IDs. Public seed tokens cannot authenticate live API requests.
Demo state remains in memory separately from a live session and has a bundled mock fallback.

## Job posting comparison

The worker reviews career details, pastes a posting and submits both to the configured provider through `/api/job-comparison`. Shared Zod schemas bound inputs and outputs. The server checks quoted evidence against each supplied text and returns matches, questions and one proposed action.

Live comparisons verify opportunity ownership. Saving the reviewed action verifies a signed authorization bound to the guest and checks ownership again inside a transaction. A deterministic task ID gives retries the same milestone record, including existing progress. The action is placed in Week 4, day 30. Its signing key is held in process memory and its authorization lasts 30 minutes. Demo actions stay in demo client state.

## Reminders and calendar events

A `MilestoneReminder` belongs to a `PlanItem` through a unique milestone ID. The API saves a future UTC due time after checking guest ownership. The dashboard accepts local date/time input and shows due reminders for unfinished tasks in the focused opportunity. It refreshes its due-time calculation every 30 seconds.

Calendar export generates an ICS event with a stable reminder UID, UTC start time and display alarm. Workers import the event into their calendar for notification delivery. Removing an app reminder requires a separate removal from an external calendar.

## Adviser review snapshots

An `AdviserShare` belongs to a `Session`. Creation loads the owned opportunity in a transaction, validates selected task IDs and serializes the chosen title, summary, reasoning and milestones with their descriptions. Completion status is optional. Each snapshot expires after 1, 7 or 30 days.

The server returns a random 32-byte token once and stores its SHA-256 hash. The client places the token in the link fragment. The adviser page posts that token in the body to `/api/support/adviser-review/read` and renders the chosen snapshot. It opens without a worker guest cookie. Guest ownership is required to list or revoke shares. Expiry and revocation deny subsequent reads. Recipients can retain previously copied content.

## Other implemented flows

- Adviser PDF export reloads saved live progress before rendering the printable report.
- Plan refinement applies shared TypeScript time/budget guidance to unfinished tasks after a reviewed revision check.
- Public evaluations live in `Evaluation` after publication consent. Public responses show self-reported reviewer details and answers and omit the reviewer code.
- The About page describes the app and stakeholders. Footer contact uses the configured email or the project's GitHub issues page.

## Development and production

Vite on 5173 proxies `/api` to Express on 3001. Production Express serves `client/dist` and a non-API SPA fallback.
Unknown API routes return JSON 404; API failures return sanitized JSON instead of raw exceptions.
The production runtime uses tsx and requires installed development dependencies. See DEPLOYMENT.md for the environment and storage model.

## Boundaries of verification

Vitest route tests simulate model and hosted Docling responses, and résumé tests exercise local PDF extraction. A disposable SQLite integration test verifies actual
schema setup, persistence, ownership and deletion. Automated tests use simulated provider calls and a disposable database. Separate fictional live smoke checks verified résumé interpretation and job comparison. Public hosting and production migration verification remain pending. Coverage is a useful regression measure, not proof of correctness.
The user has manually exercised navigation, restored progress, demo separation, and streak behavior in the local application.

## Version-1 explanation boundary

`shared/src/explanation.ts` defines bounds and the canonical score breakdown. `server/src/lib/scoring.ts` delegates to it,
so the API and explanation panel use identical normalization and weights. `server/src/lib/explanation.ts` constructs
and validates the persisted envelope. The UI never accepts a model-supplied final score or raw HTML.
The synthetic demo builder constructs consistent, explicitly fictional inputs matching its sample scores.
Schema application adds a nullable column and preserves existing opportunity and progress records.


## Verification of recent storage behavior

SQLite integration checks cover reminder updates, cross-guest denial, selected snapshot disclosure, expiry, revocation and cascading deletion. Calendar tests cover UTC conversion, escaping and line folding. Component tests exercise deliberate submission and the shared snapshot view.

## Private adviser responses and weekly check-ins

**Status — implemented and locally verified.**

AdviserShare now stores an optional opportunityId. New links support the private response form; legacy shares keep their readable snapshot. AdviserFeedback belongs to Opportunity and optionally to AdviserShare. Removing the share sets its response shareId to null, retaining submitted responses for the worker. Deleting the opportunity cascades to its responses.

The public submission route validates a current share token, expiry and opportunity association in a transaction. Request IDs make retries reuse the original response. The public route returns a submission confirmation. Private worker routes list owned responses and add an approved next step using a deterministic PlanItem ID. The response does not edit an existing milestone.

WeeklyCheckIn belongs to Opportunity and stores progress notes, blockers, budget, hours and application timestamps. A deterministic check-in ID makes save retries stable. Preview loads current task/progress data through the existing session projection and calls shared refineRemainingTasks logic. The preview fingerprint includes tasks and constraints. Applying checks that fingerprint, updates unfinished descriptions and marks the entry applied in one transaction. Completed guidance and progress remain saved.

The dashboard displays private response cards and check-in history for a focused live opportunity. Accepting an adviser next step and applying check-in guidance require explicit worker confirmation. Both sets of records cascade with guest-session deletion through their opportunity. Public evaluations continue in their separate publication-consented flow.


## U.S. career pathway catalog and storage

shared/src/usCareerPathway.ts defines the supported states, careers, question-based steps and source metadata. The curated catalog covers Registered Nurse and Software Developer in Illinois and Minnesota. Source-reviewed dates record editorial checks. The API validates step keys and obtains source URLs from this catalog when constructing actions.

CareerPathwayItem belongs to Opportunity. Its composite key isolates state/career/step histories under the selected opportunity. An optional unique PlanItem relation records the added action. Deleting an opportunity removes its pathway entries. Deleting a linked milestone clears the optional relation.

The dashboard restores owned saved entries, shows the latest saved combination and supports temporary demo entries. Background discussion text comes from profile details available in the current visit and remains in component state. Individual checklist notes are persisted through the guest API. Reviewed actions join the existing plan and can be selected for adviser sharing. Checklist status and plan-task completion are tracked separately.


## Development-process evidence

I used IBM Bob as my primary AI development assistant for the staged application build. The [evidence gallery](IBM_BOB_EVIDENCE.md) links the original screenshots of planning, persistence tasks, the Bob workspace and its Agent/Plan controls. The images document development context. The implementation descriptions and automated checks in this guide describe current behavior.
