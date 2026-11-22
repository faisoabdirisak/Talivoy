# Deployment preparation

This repository supports a **single Express process with SQLite on persistent storage**,
or a **Netlify API function with managed PostgreSQL**. For Netlify, follow
[NETLIFY.md](NETLIFY.md); the SQLite instructions below apply to a conventional Node server.
Neither configuration has been published by these workflows.

## Runtime

1. Provision a Node 22.13+ (22.x) or supported 24+ environment with HTTPS and a persistent writable volume.
2. Install using `npm ci` (development dependencies are required by the current tsx runtime).
3. Run `npm run build` to create `client/dist`; server/shared build scripts typecheck rather than emit standalone JavaScript.
4. Inject server-only environment variables through the host's secret manager:
   Set `AI_PROVIDER` and the matching provider settings from the [README](../README.md). Also set
   `NODE_ENV=production`, `CLIENT_ORIGIN=https://your-public-host`,
   `DATABASE_URL=file:/absolute/persistent/path/talivoy.db`, and the host's `PORT`.
5. Run `npm run db:generate --workspace=server` if the host did not generate Prisma Client during install.
6. Back up any existing database, inspect schema changes, then run `npm run db:push --workspace=server` as a controlled release step.
   Do not use `--accept-data-loss` or reset against user data. A migration/backup process is needed before operating a production service.
7. With those variables injected, seed fictional personas once using
   `npx tsx prisma/seed.ts` from the root. This bypasses the development-only seed script's local `.env` requirement.
8. Run `npm start`; check `/health`, the homepage, and a disposable guest session over HTTPS.

The environment must be available to every setup and start command; `npm start` intentionally does not load a development `.env` file.
Use the same public origin for UI and API so the Strict cookie works. Existing development cookies do not transfer to the deployed host.

## Operational limits

- Secure cookies require HTTPS. Do not weaken the production flag to make an HTTP preview work.
- The health route checks process responsiveness only; add private DB/provider checks and monitoring before real-world operation.
- Keep one application instance with a persistent SQLite volume. Ephemeral or serverless disks lose sessions; horizontal replicas need shared storage, a supported database, and a shared rate-limit store.
- If the host is behind a proxy, configure Express trust proxy only for the actual trusted topology. The current default is conservative and may rate-limit all visitors under a proxy's IP.
- Backups, account recovery, automatic session expiry/deletion, and service-level guarantees are not implemented.
- Helmet's default content policy may block external Google Fonts; system font fallback is available. Review external assets before changing the policy.
- Netlify configuration and a disposable PostgreSQL/function integration check are included in CI.
  Public deployment, hosting billing and live browser acceptance still require setup.


## Updating an existing installation

Back up SQLite and stop the development server before applying schema changes. On Windows, a running Prisma process can lock the query-engine DLL during client generation. Apply the schema and start one server instance.

```powershell
npm run db:push --workspace=server
npm run dev --workspace=server
```

The support features add `MilestoneReminder` and `AdviserShare` tables. The additive changes were checked with a backed-up local database and disposable SQLite integration tests. Set the database environment for deployment commands and keep a production backup/release process.

If `EADDRINUSE` reports port 3001, identify the listening application and stop that instance before starting another. The backend health endpoint can confirm an existing server responds.

## Reminder and sharing acceptance

1. Save a reminder, refresh and confirm its local display time.
2. Import the ICS event into the chosen calendar and verify its actual alert settings.
3. Create a snapshot from selected details and open its link without the worker cookie.
4. Confirm omitted details are absent, revoke the link and verify another read is denied.
5. Repeat the link check on the deployed HTTPS origin with a remote reviewer.

A localhost link identifies the viewer's own computer. Remote review requires a reachable deployed origin. Workers choose how to send generated links. Dashboard notices require the app to be open, and calendar alerts require importing the event. Actual calendar delivery and public remote review remain acceptance checks.

Job-comparison action authorizations use ACTION_SIGNING_SECRET when configured. Keep this secret
stable across restarts (required on Netlify). Without it, conventional local servers use a
process-memory key and restarts invalidate pending actions. Existing adviser snapshots remain
readable until database expiry or revocation, subject to storage availability.


## Adviser response and check-in schema update

The current update adds AdviserFeedback and WeeklyCheckIn tables and an optional opportunityId on AdviserShare. Back up SQLite, stop the server, apply the schema using the existing db:push command and start the server. The local database was backed up before this additive update.

Create a fresh adviser link to enable responses. Existing snapshots remain readable. Verify a response from a browser without the worker cookie, private retrieval from the owner dashboard, rejection after revocation, and acceptance of a next step. Submit a weekly check-in, reload its history, review an adjustment and verify completed tasks retain their state.

These features use the existing saved guest session. Losing the guest cookie also loses dashboard access to private responses and check-in history.


## Career pathway schema and acceptance

This update adds CareerPathwayItem. Back up SQLite, stop the backend and run the existing db:push command before starting the updated server. The local database was backed up and the additive table was applied during implementation.

Test both supported roles and states, a saved checklist after refresh, a reviewed action save and selection of that action for adviser sharing. Confirm source links reach the named authorities and local career resources. Review the catalog when requirements or source locations change. Public deployment does not expand the catalog beyond its displayed coverage.
