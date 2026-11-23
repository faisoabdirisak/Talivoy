# Live deployment and acceptance — 22 November 2026

Public application: https://talivoy.netlify.app/

Talivoy now runs on Netlify with a React frontend, an Express API function and managed
PostgreSQL storage. Local development continues to use SQLite. IBM Bob remains my primary
AI development assistant; Granite through watsonx.ai provides AI interpretation and recommendations.
Hosted Docling is currently disabled on the deployed site; the verified résumé flow uses local
document extraction followed by AI interpretation.

## Completed checks

| Workflow | Evidence |
| --- | --- |
| Public website and API health | Live HTTP 200 checks on the homepage and /health |
| Production database access | /api/evaluations returns HTTP 200 and a JSON list |
| Recommendation generation | Live fictional profile returns three opportunities, each with twelve plan tasks |
| Selected opportunity | Saved and restored through separate API requests using the guest cookie |
| Completed milestones | Task completion saved and restored through the public API |
| Guest cookie | Secure flag confirmed on the public HTTPS site |
| Résumé intake | Live fictional PDF extracted its stated role and two years of experience; I also confirmed my résumé journey works |
| Full worker journey | I confirmed résumé, recommendations and saved progress work on the public site |
| Adviser handoff | I confirmed creating a review link, opening it separately, submitting feedback and reading it in the worker dashboard |
| Weekly check-ins | I confirmed saving and reloading a check-in and the reviewed adjustment workflow with completed work retained |

The automated live persistence smoke test created a fictional guest session and removed only
that disposable session after checking saved selection and progress. My manual acceptance
reports are distinct from automated tests and from independent user research.

## Deployment fixes recorded

- Switched the Netlify account to an eligible credit-based Free plan for managed Database access.
- Kept provider/model/public URL settings separate from actual secret credentials.
- Fixed function startup collisions with Netlify's ESM compatibility bindings; added a regression check.
- Included PDF extraction dependencies and verified a real binary PDF upload.
- Added schema-constrained Granite recommendation output, sufficient output allowance and validation before saving.
- Cleared the client Package directory so the full app deploys from the repository root; production tables and save/restore then worked.

Deployment fixes were committed as e2b3f93, ec80ca2 and 7bb01b6. The final directory correction
was a Netlify dashboard setting. No database reset or destructive schema repair was used.

## Recorded automated quality checks

The latest recorded package counts are 28 shared, 102 server and 56 client tests (186 total).
The latest backend change passed all 102 backend tests, type checking, lint, the Netlify/PDF/
PostgreSQL integration command and server coverage. Coverage was 93.56% statements, 87.16%
branches, 99.01% functions and 94.85% lines, exceeding the 80% aggregate thresholds.
These results do not assert that every feature has a fresh independent production test or
that the latest GitHub Actions run has been inspected.

## Remaining work

- Verify saved sessions across a further production redeploy and rehearse database backup/restore.
- Collect consented usefulness feedback from independent workers, newcomers and advisers.
- Recheck job comparison, pathway checklists, print/PDF export and public evaluation submission on the deployed release.
- Verify calendar alert delivery in the chosen calendar application.
- Verify hosted Docling conversion before describing it as a successful live hosted integration.
- Monitor hosting credits, model spending, per-instance rate limiting and production performance.
- Prepare the final walkthrough, submission text and current CI/security evidence.

Guest sessions remain browser-specific; cookies are not an account recovery mechanism.
Fit scores and costs remain estimates. Functional acceptance does not establish employment
outcomes, independent impact, comprehensive security assurance or a guaranteed competition result.
