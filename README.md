# ReStart AI Cloud

Career exploration and actionable next steps for people navigating a work transition.
Developed with love by Faiso for the IBM AI Challenge, with IBM Bob as the primary AI development assistant.

| Layer | Technology |
| --- | --- |
| Interface | React 18, TypeScript, Vite, Tailwind CSS, Framer Motion |
| API | Express 4, Zod |
| AI | IBM Granite through watsonx.ai, with Gemini as a configurable alternative |
| Document extraction | Docling for IBM watsonx, with local PDF and DOCX extraction as a fallback |
| Storage | Prisma 5 with SQLite |
| Quality | Vitest, Testing Library, ESLint, GitHub Actions, CodeQL |

## How the IBM tools are used

**IBM Bob was the primary AI development assistant.** Faiso used Bob to build ReStart AI Cloud in stages, from the initial application and recommendation pipeline through guest sessions, dashboard progress, and CI. Bob helped implement changes and diagnose issues such as the Prisma startup failure. Faiso set the project direction and tested the worker and guest demo journeys.

**IBM Granite on watsonx.ai interprets résumés and generates career recommendations.** After a worker selects a file and clicks **Analyze My Résumé**, Granite suggests a recent role, location, skills, experience, education, and stated interests from the extracted text. The worker edits and confirms those details before **Generate My Opportunities** sends the completed profile to the configured model. The API validates the returned opportunities and computes the feasibility scores in TypeScript.

**Docling for IBM watsonx extracts document text.** The backend can send a PDF or DOCX to hosted Docling and retrieve the converted Markdown. If the hosted conversion fails or is disabled, the server reads text-based PDFs and DOCX files locally. A live hosted test encountered a storage error, so the verified live résumé flow used local extraction followed by model interpretation. The hosted success path is covered by simulated tests.

## What works

- Enter a profile manually or upload a résumé and review the extracted fields.
- Submit a fictional or non-sensitive profile to generate three ranked opportunities.
- Explore career pivots, upskilling, and micro-business ideas with 12 action items over 30 days.
- Open Explain My Opportunity in a full-screen popup for weighted score factors, estimated cost, risks, assumptions, and verification questions.
- Save recommendations, an opportunity selection, and task progress in a browser-specific guest session.
- View dashboard completion and a UTC-calendar-day activity streak.
- Try Maria, James, and Aisha's fictional demo profiles without a live recommendation request.
- Navigate and refresh without losing saved results; deliberately delete the session with Start over.
- Print a transition plan for adviser handoff and preview time/budget adjustments before applying them.
- Compare skills with a pasted job posting and review a suggested additional milestone.
- Save milestone reminders and download calendar events for notification delivery.
- Choose plan details for an expiring adviser review link and revoke the link from the guest session.
- Submit publication-consented evaluations for live or fictional demo opportunities.
- Read the About page and use the footer contact link.

Feasibility scores are **fit scores out of 100, not success probabilities or task completion percentages**.
TypeScript applies fixed weights to bounded AI-generated signals. Those inputs still depend on model judgment.
Costs and suggested resources are not independently verified. This is a challenge prototype, not a guarantee of employment or income.

## Local setup (PowerShell)

Use Node 22.13+ within the 22.x line, or a supported Node 24+ release, and npm 9+.
Run these commands inside `restart-ai-cloud`, not its parent folder:

```powershell
npm ci
if (!(Test-Path server/.env)) { Copy-Item .env.example server/.env }
```

Keep your existing `server/.env` and edit it locally. To use Granite, set the following values using your watsonx.ai project and region.

```dotenv
AI_PROVIDER=granite
WATSONX_API_KEY=your_ibm_cloud_api_key
WATSONX_PROJECT_ID=your_watsonx_project_id
WATSONX_URL=https://us-south.ml.cloud.ibm.com
WATSONX_MODEL=ibm/granite-4-h-small
DATABASE_URL=file:./dev.db
PORT=3001
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:5173
```

Confirm that the region and model match your project. To use Gemini, set `AI_PROVIDER=gemini`, `GEMINI_API_KEY`, and optionally `GEMINI_MODEL`. The sample environment defaults to Gemini.

To enable hosted document extraction, set `DOCLING_ENABLED=true`, `DOCLING_SERVICE_URL` to the full instance URL, and `DOCLING_SERVICE_API_KEY` to the Docling key. These are separate from the watsonx.ai model credentials. Set `DOCLING_ENABLED=false` for local extraction.

Keep keys on the server and `server/.env` out of Git. Revoke any previously exposed key.

```powershell
git check-ignore server/.env
npm run db:push --workspace=server
npm run db:seed --workspace=server
npm run dev --workspace=server
```

If Prisma warns about destructive changes, stop and back up the database before proceeding.
Seeding replaces only the fictional demo sessions. In a second terminal, from the same project folder:

```powershell
npm run dev --workspace=client
```

Open the frontend URL (normally http://localhost:5173). The backend on port 3001 is an API, not the development homepage.
Use the same hostname throughout; `localhost` and `127.0.0.1` have different cookie scopes.
If port 3001 is occupied, check the existing server instead of launching another copy.

## Guest demo

Choose Try Demo, switch between the three personas, open a plan, and view the dashboard.
The client requests fictional seeded sessions from `/api/sessions/demo`. If unavailable, it uses bundled fictional mock data.
Demo checkbox changes and selections are kept separately for each persona while the tab is open; they do not overwrite a live session or the shared seed records. Offline fallback data is persona-specific.
Exit the demo to return to the saved live session.

## Quality checks

```powershell
npm run lint
npm run typecheck
npm test
npm run test:coverage
npm run build
npm audit
```

Coverage measures **all server source files** except tests and enforces an 80% aggregate minimum for statements, branches, functions, and lines.
Open `server/coverage/index.html` after the coverage command. Most API tests mock Prisma; a disposable SQLite integration test checks real persistence and ownership. Automated tests simulate model and hosted Docling responses.
GitHub CI runs these code checks and server coverage; CodeQL runs separately. A successful scan is not a guarantee of no vulnerabilities.

## Production execution

Build first with `npm ci` and `npm run build`. Inject `NODE_ENV=production`, an HTTPS `CLIENT_ORIGIN`,
the credentials for the selected `AI_PROVIDER`, and a persistent `DATABASE_URL` into the server environment.
Then run `npm start`. Runtime TypeScript uses `tsx`, so the current deployment must install development dependencies too.
Serve through HTTPS: production guest cookies have the Secure flag and will not work on plain HTTP.
See [deployment instructions](docs/DEPLOYMENT.md). No public deployment is created by these workflows.

## Data and limitations

- The configured AI provider receives extracted résumé text during interpretation and the confirmed profile during recommendation generation. When hosted Docling is enabled, it receives the uploaded file for conversion. The app stores generated recommendations and progress in SQLite. Recommendations may repeat details from the profile.
- Résumé uploads accept PDF and DOCX up to 5 MB. Local PDF extraction requires selectable text. Use fictional résumés when demonstrating the app.
- SQLite stores recommendations, plan items, selection, and completion timestamps. The browser holds a 30-day HttpOnly guest cookie.
- No accounts, cross-device access, password recovery, or automatic database expiry/retention cleanup.
- Losing the cookie makes the saved session inaccessible through the UI; back up storage appropriately and use fictional data for judging.
- New analyses save a validated version-1 explanation with estimated costs, risks, assumptions, verification questions, and scoring signals. Older saved opportunities remain intact and show explanation unavailable. Missing estimates remain unknown rather than being replaced with zero.
- SQLite on one persistent instance is the prototype deployment model, not a horizontally scaled service.
- The separate `gemini-test` folder is outside this application and must not be included in its repository.

## Compare your skills with a job posting

On the Dashboard, choose **Focus** on an opportunity, then open **Compare a job**. Review your skills, role, experience and qualifications and paste the job posting. Click **Compare My Skills** to send those details to the configured AI provider.

The result shows supported matches with quotes from both inputs, requirements to discuss or build, and one proposed action. The server checks that evidence quotes occur in the supplied text. Review the action, then choose **Add to My 30-Day Plan** to save it as a Week 4 milestone. Completed tasks retain their progress. Retrying the same saved action reuses its task record.

Profile details entered during the current visit can prefill the comparison. After refresh, enter the relevant details again because the original profile is held in browser memory. Fictional demo comparisons require a fictional profile and keep added actions in the current demo tab.

Suggestions remain AI estimates, and employer requirements and job availability need verification. A comparison authorization expires after 30 minutes or a server restart. If saving fails after that, run the comparison again.

## Milestone reminders and adviser review links

On the Dashboard, focus an opportunity to open **Milestone reminders** and **Career adviser review link**.

Choose an unfinished milestone and a local date/time, then save a reminder. The app stores it with the guest plan and shows due reminders on the focused dashboard. **Download calendar reminder** creates an ICS file that can be imported into a calendar for alerts while the app is closed. Calendar notification settings control delivery. Removing an app reminder requires deleting any imported calendar event separately. These reminders use in-app notices and calendar events.

For adviser review, select the title, summary, reasoning and individual milestones you wish to share. Completion status is optional. The preview displays the selected content before **Create Review Link** saves a snapshot. Links expire after seven days by default, with one-day and 30-day options. Anyone holding a link can read its snapshot. Workers can revoke active links from their guest session, and deleting the guest session removes its shares. A shared snapshot stays as it was when created.

Review links use the current app origin. A localhost link works on the same computer; sharing with remote advisers requires a public deployment. Demo plans offer the existing printable report, while persistent reminders and share links use live guest plans.

Existing installations need to regenerate Prisma Client and apply the additive schema changes before starting the updated server.

```powershell
npm run db:push --workspace=server
```

Back up the database before applying the schema. The new tables are `MilestoneReminder` and `AdviserShare`.

## Adviser handoff, refinement and evaluations

The focused opportunity offers **Print / Save as PDF** with the opportunity, explanation and milestone progress. Live reports first reload the saved selection and progress. Printing or saving the preview lets the worker share it through their preferred channel.

Plan View offers a refinement preview using the worker's total budget and available weekly hours. Applying a preview updates guidance for remaining milestones. Completed milestones keep their progress. The adjustment uses shared TypeScript rules for time allocation and cost guidance. A saved-plan revision check asks for a new preview if the plan changed in the meantime.

The Evaluation page publishes submitted usefulness feedback after explicit publication consent. The form records the reviewer's name, self-reported role and affiliation, fit/usefulness answers, suggested next step and comments. Visitors can read published feedback. The reviewer code is stored and omitted from public responses. Public evaluations remain in their own table when a guest session is deleted.

## Proposed next features

| Feature | Proposed worker journey | Status |
| --- | --- | --- |
| Private adviser feedback on a shared plan | Adviser submits a name, self-reported role, practicality assessment, milestone suggestion and next step. The worker reviews responses privately and chooses any changes to apply. | Proposed |
| Weekly check-ins | Worker records progress, blockers and changes to time or budget, then reviews proposed plan adjustments. | Proposed |

The current adviser link displays the chosen snapshot. Its page and API support reading that snapshot. The existing Evaluation page provides the implemented public feedback workflow.

## Project references

- [Development plan and stage status](restart-ai-cloud-plan.md)
- [Architecture](docs/ARCHITECTURE.md)
- [API reference](docs/API.md)
- [Contributing and verification](docs/CONTRIBUTING.md)
- [Route security review and remaining limits](docs/SECURITY.md)

## Explain My Opportunity

Select Explain My Opportunity on a card or in Plan View. It opens a full-screen popup with Back and Close controls; Escape also returns you to the previous view. It shows fixed score weights (40/30/20/10),
normalized factor ratings and contributed points, then a rounded fit score. AI still estimates the inputs;
this is not independent verification or a success probability. Launch time is an estimate, not a deadline or promise.
Fictional demo inputs and costs are explicitly labelled synthetic examples.

For existing installations, back up SQLite before `npm run db:push --workspace=server` and regenerate Prisma Client.
The schema adds one nullable `Opportunity.explanationJson` text column. Do not reset the database or use `--accept-data-loss`.
Existing rows need no backfill. New AI analyses receive explanation details; the app does not infer missing facts for older results.
The demo seed includes fictional explanations; seeding refreshes only the three public fictional sessions.
