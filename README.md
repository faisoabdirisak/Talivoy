# Talivoy

Your talent. Your next chapter.

Career exploration, upskilling and practical next steps for newcomers, resettled workers, career changers and people returning to work.
I developed Talivoy with love for the IBM AI Challenge, with IBM Bob as my primary AI development assistant.

| Layer | Technology |
| --- | --- |
| Interface | React 18, TypeScript, Vite, Tailwind CSS, Framer Motion |
| API | Express 4, Zod |
| AI | IBM Granite through watsonx.ai, with Gemini as a configurable alternative |
| Document extraction | Docling for IBM watsonx, with local PDF and DOCX extraction as a fallback |
| Storage | Prisma 5; PostgreSQL on Netlify, SQLite locally |
| Quality | Vitest, Testing Library, ESLint, GitHub Actions, CodeQL |

## Netlify deployment

Netlify configuration now includes the React site, an Express API function and a PostgreSQL
schema migration for Netlify Database. Local development continues to use SQLite.
**Live application: [talivoy.netlify.app](https://talivoy.netlify.app/).** Deployment and core live workflows were verified on 22 November 2026.
See the [live verification record](docs/LIVE_VERIFICATION.md) for automated checks, my manual acceptance results and remaining work.
The [Netlify setup instructions](docs/NETLIFY.md) cover future deployments. Local database files and sessions are not uploaded.

## Who Talivoy serves

Talivoy supports newcomers, immigrants, resettled professionals, career changers and people returning to work. It also helps organizations and advisers work with them on career options and practical next steps.

| Audience | How they could use Talivoy |
| --- | --- |
| Resettlement organizations | Help newcomers discuss career options and track agreed next steps. |
| Workforce development teams | Support workers exploring retraining or a career transition. |
| Community colleges and adult-learning programs | Help learners connect existing experience with training goals. |
| Career advisers | Review selected plans, provide feedback, and follow up through check-ins. |

Workers choose what to share through adviser review links. Weekly check-in history stays in the worker's guest session and can inform discussions with their adviser. These audiences use the existing worker/adviser workflows.

## How the IBM tools are used

**IBM Bob was the primary AI development assistant.** I used Bob to build Talivoy in stages, from the initial application and recommendation pipeline through guest sessions, dashboard progress, and CI. Bob helped implement changes and diagnose issues such as the Prisma startup failure. I set the project direction and tested the worker and guest demo journeys.

**IBM Granite on watsonx.ai interprets résumés and generates career recommendations.** After a worker selects a file and clicks **Analyze My Résumé**, Granite suggests a recent role, location, skills, experience, education, and stated interests from the extracted text. The worker edits and confirms those details before **Generate My Opportunities** sends the completed profile to the configured model. The API validates the returned opportunities and computes the feasibility scores in TypeScript.

**Docling for IBM watsonx extracts document text.** The backend can send a PDF or DOCX to hosted Docling and retrieve the converted Markdown. If the hosted conversion fails or is disabled, the server reads text-based PDFs and DOCX files locally. A live hosted test encountered a storage error, so the verified live résumé flow used local extraction followed by model interpretation. The hosted success path is covered by simulated tests.

## IBM Bob development evidence

I added five screenshots from my work in IBM Bob to [bobscrenshot](bobscrenshot/). They show the staged development checklist, session-persistence tasks, Bob's application workspace and Agent/Plan controls.

The [IBM Bob evidence gallery](docs/IBM_BOB_EVIDENCE.md) includes all five images with captions explaining what each capture shows. The screenshots record my development process. Current feature status and verification results are documented in the [development plan](talivoy-plan.md).

![Bob workspace showing the development plan and application folders](bobscrenshot/plan%203.png)

## What works

- Enter a profile manually or upload a résumé and review the extracted fields.
- Submit a fictional or non-sensitive profile to generate three ranked opportunities.
- Explore career pivots, upskilling, and micro-business ideas with 12 action items over 30 days.
- Open Explain My Opportunity in a full-screen popup for weighted score factors, estimated cost, risks, assumptions, and verification questions.
- Compare all career options with preference highlights, budget/time checks, worker-reviewed skills and physical demands, and matching pathway sources.
- Save recommendations, an opportunity selection, and task progress in a browser-specific guest session.
- View dashboard completion and a UTC-calendar-day activity streak.
- Try Maria, James, and Aisha's fictional demo profiles without a live recommendation request.
- Navigate and refresh without losing saved results; deliberately delete the session with Start over.
- Print a transition plan for adviser handoff and preview time/budget adjustments before applying them.
- Compare skills with a pasted job posting and review a suggested additional milestone.
- Save milestone reminders and download calendar events for notification delivery.
- Choose plan details for an expiring adviser review link and revoke the link from the guest session.
- Receive private adviser feedback and approve a recommended next step for your plan.
- Save weekly check-ins and review time/budget adjustments before applying them.
- Use My U.S. Career Pathway to save source-linked state/role checklists and add reviewed actions to your plan.
- Submit publication-consented evaluations for live or fictional demo opportunities.
- Read the About page and use the footer contact link.

Feasibility scores are **fit scores out of 100, not success probabilities or task completion percentages**.
TypeScript applies fixed weights to bounded AI-generated signals. Those inputs still depend on model judgment.
Costs and suggested resources are not independently verified. This is a challenge prototype, not a guarantee of employment or income.

## Local setup (PowerShell)

Use Node 22.13+ within the 22.x line, or a supported Node 24+ release, and npm 9+.
Run these commands inside the `Talivoy` application folder. The repository is [faisoabdirisak/Talivoy](https://github.com/faisoabdirisak/Talivoy).

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
These conventional-server commands remain available for SQLite hosting. The public deployment uses Netlify Functions and managed PostgreSQL. GitHub pushes trigger the connected Netlify deployment; GitHub Actions runs quality checks separately. See [deployment instructions](docs/DEPLOYMENT.md).

## Data and limitations

- The configured AI provider receives extracted résumé text during interpretation and the confirmed profile during recommendation generation. When hosted Docling is enabled, it receives the uploaded file for conversion. The app stores generated recommendations and progress in PostgreSQL on Netlify and SQLite locally. Recommendations may repeat details from the profile.
- Résumé uploads accept PDF and DOCX up to 4 MB on Netlify and 5 MB locally. Local PDF extraction requires selectable text. Use fictional résumés when demonstrating the app.
- PostgreSQL on Netlify, or SQLite locally, stores recommendations, plan items, selection, and completion timestamps. The browser holds a 30-day HttpOnly guest cookie.
- No accounts, cross-device access, password recovery, or automatic database expiry/retention cleanup.
- Losing the cookie makes the saved session inaccessible through the UI; back up storage appropriately and use fictional data for judging.
- New analyses save a validated version-1 explanation with estimated costs, risks, assumptions, verification questions, and scoring signals. Older saved opportunities remain intact and show explanation unavailable. Missing estimates remain unknown rather than being replaced with zero.
- The public deployment uses shared PostgreSQL storage. SQLite hosting requires one persistent instance. API rate-limit counters remain per instance.
- The separate `gemini-test` folder is outside this application and must not be included in its repository.

## Compare My Career Options — added 25 November 2026

On Opportunities, open **Compare My Career Options** to review all recommendations in a modal
with Back/Close controls. Lower cost and faster transition highlight the lowest known saved
cost or launch estimate, including ties and missing-data notices. Less physical work uses only
physical-demand ratings I enter after reviewing duties; the app does not infer demands from titles.
Fit scores, completed tasks and the focused plan remain unchanged until I deliberately choose a plan.

The cards show skill-fit reasoning, early plan steps to investigate, unverified cost, launch time,
the next unfinished milestone and risks. I can enter skills/training notes and an estimated weekly
effort to compare with my available hours. Weekly effort is never inferred from launch days.
State and matching-career selectors reuse the Illinois/Minnesota nursing/software pathway catalog;
other roles require further research. Source review dates are preserved and current rules need checking.

Comparison notes and preference inputs are temporary and clear when leaving the results or refreshing.
Choosing a live plan uses the existing saved selection route; demo choices remain isolated in demo state.
This feature makes no new AI requests and needs no database migration. Local implementation and
tests are complete; production deployment and live acceptance for this update remain pending.

## Compare your skills with a job posting

On the Dashboard, choose **Focus** on an opportunity, then open **Compare a job**. Review your skills, role, experience and qualifications and paste the job posting. Click **Compare My Skills** to send those details to the configured AI provider.

The result shows supported matches with quotes from both inputs, requirements to discuss or build, and one proposed action. The server checks that evidence quotes occur in the supplied text. Review the action, then choose **Add to My 30-Day Plan** to save it as a Week 4 milestone. Completed tasks retain their progress. Retrying the same saved action reuses its task record.

Profile details entered during the current visit can prefill the comparison. After refresh, enter the relevant details again because the original profile is held in browser memory. Fictional demo comparisons require a fictional profile and keep added actions in the current demo tab.

Suggestions remain AI estimates, and employer requirements and job availability need verification. A comparison authorization expires after 30 minutes. The stable ACTION_SIGNING_SECRET configured on Netlify survives restarts; local servers without it use a temporary process key. If saving fails after that, run the comparison again.

## Milestone reminders and adviser review links

On the Dashboard, focus an opportunity to open **Milestone reminders** and **Career adviser review link**.

Choose an unfinished milestone and a local date/time, then save a reminder. The app stores it with the guest plan and shows due reminders on the focused dashboard. **Download calendar reminder** creates an ICS file that can be imported into a calendar for alerts while the app is closed. Calendar notification settings control delivery. Removing an app reminder requires deleting any imported calendar event separately. These reminders use in-app notices and calendar events.

For adviser review, select the title, summary, reasoning and individual milestones you wish to share. Completion status is optional. The preview displays the selected content before **Create Review Link** saves a snapshot. Links expire after seven days by default, with one-day and 30-day options. Anyone holding a link can read its snapshot. Workers can revoke active links from their guest session, and deleting the guest session removes its shares. A shared snapshot stays as it was when created.

Review links use the current app origin. A localhost link works on the same computer; public review links now use https://talivoy.netlify.app. Demo plans offer the existing printable report, while persistent reminders and share links use live guest plans.

Existing installations need to regenerate Prisma Client and apply the additive schema changes before starting the updated server.

```powershell
npm run db:push --workspace=server
```

Back up the database before applying the schema. The new tables are `MilestoneReminder` and `AdviserShare`.

## Adviser handoff, refinement and evaluations

The focused opportunity offers **Print / Save as PDF** with the opportunity, explanation and milestone progress. Live reports first reload the saved selection and progress. Printing or saving the preview lets the worker share it through their preferred channel.

Plan View offers a refinement preview using the worker's total budget and available weekly hours. Applying a preview updates guidance for remaining milestones. Completed milestones keep their progress. The adjustment uses shared TypeScript rules for time allocation and cost guidance. A saved-plan revision check asks for a new preview if the plan changed in the meantime.

The Evaluation page publishes submitted usefulness feedback after explicit publication consent. The form records the reviewer's name, self-reported role and affiliation, fit/usefulness answers, suggested next step and comments. Visitors can read published feedback. The reviewer code is stored and omitted from public responses. Public evaluations remain in their own table when a guest session is deleted.

## Private adviser feedback — implemented

**Status — implemented; the core live journey was manually confirmed on 22 November 2026.**

Focus a saved opportunity on the Dashboard and create an adviser review link. The adviser opens the selected snapshot, enters a name and self-reported role, assesses practicality, suggests milestone changes and recommends one next step. **Send Feedback to Worker** stores those answers privately. The shared page returns a submission confirmation and displays the worker-selected snapshot.

On the Dashboard, open **Private adviser feedback** and use **Refresh responses** to load new replies. Review the assessment and recommended next step, check the confirmation box, then choose **Add Reviewed Next Step** to add a Week 4 milestone. Existing task completion remains saved. Repeat saves reuse the same task.

Expired and revoked links reject further responses. Responses already submitted remain available to the worker after a link is revoked. Deleting the guest session removes its private responses. Reviewer names and roles are self-reported. Older links created before this update still show their saved snapshots; create a new link to enable the response form.

## Weekly check-ins — implemented

**Status — implemented; the core live journey was manually confirmed on 22 November 2026.**

Focus a saved opportunity and open **Check In This Week**. Record what you worked on, blockers, your total available budget and weekly hours. Saving creates a private history entry. Record task completion using the plan checkboxes so dashboard progress reflects completed milestones.

From an entry, choose **Review Proposed Adjustments**. The app uses the existing time/budget rules to propose guidance for unfinished tasks. Review the current and proposed descriptions, confirm the changes, and choose **Apply Reviewed Adjustments**, or keep the current plan. Blockers remain in the history for discussion. If saved tasks change after the preview, generate a fresh preview before applying. Completed milestones retain their guidance and completion state.

Private adviser feedback and check-in history use saved live guest plans. The fictional demo keeps its existing temporary plan interactions.

## My U.S. Career Pathway

**Status — implemented and locally verified.** The About page introduces the workflow, source links, private checklist notes and initial state/career coverage.

Focus an opportunity on the Dashboard and open **Explore My Pathway**. Initial coverage includes Registered Nurse and Software Developer in Illinois and Minnesota. Choose the state and career you want to investigate. The panel shows the official sources reviewed on 22 November 2026, practical questions and possible next steps.

Profile details available in the current visit prefill a background discussion space. This space stays on the page. Save findings you want to keep in individual checklist notes. Set each item to **To check**, **Confirmed** or **Completed** and choose **Save Step**. These are worker-recorded review statuses. The authority or employer determines the requirements that apply to the worker.

Review a saved action and explicitly add it to Week 4 of the selected plan. Repeating the save reuses that task and its completion state. The source URL and review date accompany the plan action. Choose the action in an adviser review link to discuss it with an adviser. Personal checklist notes are kept in the worker's guest plan.

Each state/career combination has its own saved checklist. Opening the panel restores the most recently updated saved combination. The demo keeps temporary local entries. Official links open external resources for current details, training and opportunities. The panel uses a curated source list and questions to verify. It does not automatically retrieve current job listings or determine licensing eligibility.

### Sources reviewed

- [Illinois IDFPR nursing](https://idfpr.illinois.gov/profs/nursing.html)
- [Minnesota Board of Nursing licensure](https://mn.gov/boards/nursing/licensure/)
- [U.S. Department of Education foreign qualification recognition](https://www.ed.gov/about/initiatives/international-affairs/recognition-of-foreign-qualifications)
- [BLS software developer occupation overview](https://www.bls.gov/ooh/computer-and-information-technology/software-developers.htm)
- [Illinois workNet](https://www.illinoisworknet.com/)
- [Minnesota CareerForce](https://careerforce.mn.gov/)

## Project references

- [Development plan and stage status](talivoy-plan.md)
- [IBM Bob development evidence and screenshot gallery](docs/IBM_BOB_EVIDENCE.md)
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


## Talivoy identity

Talivoy combines the ideas of talent and a voyage toward the next career chapter. The app helps workers build on previous experience, explore skills and opportunities, and review practical plans with advisers. The About page includes newcomers, immigrants and resettled professionals alongside other workers in transition.

The interface, adviser reports, calendar event text and package names use Talivoy. New guest sessions use talivoy_sid; the server accepts existing restart_sid cookies so saved plans remain accessible. Start over clears both names. The onboarding preference transfers to talivoy-onboarding-done. Calendar event UIDs retain their previous namespace so previously imported reminders keep their identity.

The development plan is talivoy-plan.md. The local application folder is Talivoy and the GitHub repository is faisoabdirisak/Talivoy. The footer contact link opens its GitHub issues page unless a contact email is configured.

## My Skills Evidence

From **Dashboard**, focus an opportunity and open **Build My Skills Evidence**. Record a skill, its source (work, education, volunteering or a personal project), your example and next step. Choose **I have evidence** or **I want to develop this**. Experience from another country is welcome. Entries are self-reported, never independently verified.

Live entries are private to the current browser's guest session, with up to 30 per opportunity. A development goal needs no evidence yet. Avoid sensitive personal information and confidential employer material. **Draft from my example** reuses your text without an AI call. Optional **Ask AI to rephrase** requires permission to send the selected saved skill/source/example to the configured Granite/Gemini service. Review every fact and explicitly confirm wording before saving; editing source fields clears approval.

Print/PDF adviser reports and expiring adviser links have separate, unchecked evidence selections. Only chosen entries and worker-reviewed wording are included. Links contain snapshots: later edits/deletion do not erase a shared copy; revoke the link to stop future access. Demo evidence is temporary in the current dashboard view and excluded from live adviser reports.

The local schema is updated. The next Netlify deployment applies additive migration **0002_skills_evidence.sql**. This feature is not live until deployed.
