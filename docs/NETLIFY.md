# Deploy Talivoy on Netlify

**Current status:** live at https://talivoy.netlify.app/, verified 22 November 2026.
See [LIVE_VERIFICATION.md](LIVE_VERIFICATION.md) for completed checks and remaining acceptance work.

The browser, API and cookies use one HTTPS origin. Express runs in a Netlify Function;
saved sessions, plans, feedback, reminders, check-ins and adviser snapshots live in managed
PostgreSQL, not the function's temporary filesystem. SQLite remains the local development database.

## 1. Import the repository

Commit the deployment changes, then import the Talivoy GitHub repository into Netlify.
Use the repository root as the base directory, `npm run build:netlify` as the build command
and `client/dist` as the publish directory. The committed netlify.toml supplies these settings.
Leave both Base directory and Package directory empty: this app deploys from the repository root.
Clear an automatically selected Package directory of client. During the first deployment, that
setting coincided with missing production tables; clearing it and redeploying resolved the issue.
Reserve your final site name before testing.

## 2. Configure secrets before the first successful deploy

In Project configuration > Environment variables, set the following for Functions/runtime.
Only VITE_RESUME_MAX_MB is a public browser setting; API credentials must never use a VITE_ prefix.

| Variable | Value |
| --- | --- |
| AI_PROVIDER | granite |
| WATSONX_API_KEY | Your current IBM Cloud API key |
| WATSONX_PROJECT_ID | Your watsonx.ai project ID |
| WATSONX_URL | Your working regional endpoint, e.g. https://us-south.ml.cloud.ibm.com |
| WATSONX_MODEL | Your enabled model ID, e.g. ibm/granite-4-h-small |
| CLIENT_ORIGIN | Your exact public HTTPS site origin, without a trailing slash |
| ACTION_SIGNING_SECRET | At least 32 cryptographically random characters; retain across deployments |
| DOCLING_ENABLED | true if hosted Docling is configured; otherwise false |
| DOCLING_SERVICE_URL | Your hosted Docling service URL, if enabled |
| DOCLING_SERVICE_API_KEY | Your Docling key, if enabled |

Mark WATSONX_API_KEY, ACTION_SIGNING_SECRET and any Docling API key as secret values.
Keep AI_PROVIDER, WATSONX_URL, WATSONX_MODEL, CLIENT_ORIGIN and DOCLING_ENABLED unmarked:
these are public configuration, and marking them secret causes false-positive deployment scans.
WATSONX_PROJECT_ID can remain secret. Do not disable secret scanning.

Generate the signing secret locally, then paste its output only into Netlify's secret field:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

The function sets production mode automatically. If CLIENT_ORIGIN is omitted, it uses Netlify's
URL environment variable. Explicitly set the origin when using a custom domain. Preview hosts
need their own matching origin in that deployment context; don't send production mutations
from an unrelated preview origin. Do not copy server/.env into the repository or publish directory.

## 3. Enable persistent storage

Netlify Database requires a Credit-based plan and consumes credits for compute and bandwidth.
Review your plan and spending controls before provisioning it. Installing @netlify/database
enables automatic provisioning on deploy. You can also use Data & Storage > Database in the
project dashboard. Netlify supplies NETLIFY_DB_URL to functions; don't paste your local
`file:./dev.db` DATABASE_URL into Netlify.

The baseline SQL in netlify/database/migrations creates the app tables on the new PostgreSQL
database. Netlify applies migrations before publishing and blocks publication on a migration
failure. No local SQLite data is imported: create a new guest session on the public site.
Existing local data stays local. Fictional persona demos can fall back to the bundled demo
catalog without seeding the cloud database.

Never edit an applied SQL migration. For later model changes, generate and review an additive
PostgreSQL migration and test it before publishing. Keep backups according to your hosting
plan. Deleting the hosted database removes its saved data.

## 4. Build and test

```powershell
npm run test:netlify
npm run build:netlify
```

The integration command uses Netlify's in-memory PostgreSQL emulator, applies the committed
migration, calls the bundled function adapter, checks upload limits, guest ownership and progress, and verifies
saved work through a second database connection. It never reads .env or calls IBM.
The generated PostgreSQL client has a separate output directory under node_modules;
it does not replace the SQLite client used by the running local app. Netlify packages the
Linux OpenSSL 3 engine along with this generated client and the PDF extraction dependencies.

## 5. Publish and perform live acceptance checks

After environment variables and Database are configured, trigger a deploy. Confirm the
build, function packaging and database migration succeed. Then:

1. Visit /health and confirm the API returns JSON with status ok.
2. Try all fictional personas, select a plan and tick tasks.
3. Generate a live opportunity from a non-sensitive test profile; select it, tick a task and refresh.
4. Save a weekly check-in and create an adviser link. Open that link in a private browser window.
5. Submit adviser feedback there and confirm only the worker can retrieve the private response.
6. Redeploy without deleting the database; confirm the original browser restores the same saved work.
7. Upload a small text-based résumé, review extracted details and generate opportunities.

The same browser cookie is still required after a restart. Clearing cookies or using another
device does not recover a guest session; this deployment does not introduce user accounts.

## Limits and troubleshooting

- Deployed résumé uploads are limited to 4 MB to allow for Netlify's base64 request overhead;
  local development retains the 5 MB limit. The deployed form displays the correct limit.
- Synchronous functions have a 60-second limit. On Netlify, Docling has an 8-second budget
  before local fallback, IBM authentication 8 seconds, and model inference 32 seconds.
  Slow requests can still fail safely; retry rather than assuming results were saved.
- Rate-limit counters currently live inside each function instance. They are not a shared
  global quota across instances; configure platform abuse controls and IBM spending limits.
- If the function reports a missing signing secret, set ACTION_SIGNING_SECRET and redeploy.
- If storage initialization fails, check Database provisioning, migration logs and NETLIFY_DB_URL.
- A 403 mutation error often means CLIENT_ORIGIN differs from the URL used in the browser.
- A page working without API calls does not prove persistence. Complete the checks above.

References: [Express on Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/express/),
[Netlify Database](https://docs.netlify.com/build/data-and-storage/netlify-database/),
[migrations](https://docs.netlify.com/build/data-and-storage/netlify-database/migrations/),
and [function limits](https://docs.netlify.com/build/functions/configuration/).

## Recommendation validation

Granite recommendation requests use JSON-schema constrained output for three opportunities
with twelve tasks each and a larger output-token allowance. Server-side Zod validation still
rejects malformed or incomplete plans before any database write. Rejection logs include field
paths and validation codes only, never worker profiles or generated recommendation text.

## My Skills Evidence rollout

Apply **0002_skills_evidence.sql** with the matching API/client deployment. It creates SkillEvidence and its Opportunity foreign key; do not edit 0001_initial.sql. Disposable PostgreSQL checks cover creation, ownership, idempotent migrations and retrieval from a second connection. After deploying, verify refresh persistence, wording approval and selective exports. No production deployment was performed for this local implementation.

The Netlify build explicitly regenerates the standard Prisma client before typechecking, as well as its separate PostgreSQL runtime client. Cached node_modules must not supply types from an older schema. Client generation does not alter database contents.
