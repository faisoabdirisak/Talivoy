# IBM Bob development evidence

I used IBM Bob as my primary AI development assistant while building Talivoy. I directed the application, reviewed the changes and tested the worker journeys. The screenshots below document my use of Bob for staged development planning, implementation tracking and review of the application workspace.

These are historical development captures. Task counters, stage names, filenames and repository messages reflect the workspace when each image was taken. The current implementation status is recorded in the [development plan](../talivoy-plan.md), and verification instructions are in the [contributor guide](CONTRIBUTING.md).

## Evidence index

| Screenshot | What is visible |
| --- | --- |
| [Development plan, first view](../bobscrenshot/plan%201.png) | Bob's task list with scaffold/design, frontend experience, core AI pipeline and saved-session implementation tasks. |
| [Development plan, continuation](../bobscrenshot/plan%202.png) | Session restoration and progress tasks, a listed tests/typecheck/build task, and later dashboard/demo and quality stages. |
| [Bob application workspace](../bobscrenshot/plan%203.png) | Bob's workspace with client/server/shared/Prisma folders, the development checklist, changed-file controls and a session-route documentation update. |
| [Bob Agent and Plan controls](../bobscrenshot/agent%201.png) | The Agent/Plan/Ask selector alongside a response discussing sensitive-file exclusions and repository state. |
| [Talivoy README in Bob](../bobscrenshot/agent%202.png) | The Talivoy README open in Bob, my primary-assistant attribution, the technology overview and Bob's mode controls. |

## Planning and implementation tracking

I used a staged plan to organize the foundation, AI pipeline, persistence and dashboard work. The first screenshot shows the session work broken into schema changes, server routes, cookie handling, client API integration and dashboard state.

![Bob development checklist showing scaffold, pipeline and session tasks](../bobscrenshot/plan%201.png)

The continuation includes a verification task and the dashboard/demo and quality stages. The displayed counter records progress at capture time. Actual test results are recorded separately in the development plan and GitHub Actions.

![Continuation of Bob's checklist showing verification and later stages](../bobscrenshot/plan%202.png)

## Bob workspace and review

This capture places the development checklist alongside the application folders and Bob's review interface. It also shows documentation work around session restoration.

![IBM Bob workspace with application folders, checklist and session documentation](../bobscrenshot/plan%203.png)

The next capture shows the mode selector and a repository review response. It provides context for how I used Bob while checking the project. Current repository rules and file tracking should be checked against the present working tree.

![Bob mode selector and historical repository review response](../bobscrenshot/agent%201.png)

## Talivoy project context in Bob

This screenshot shows Talivoy's README within Bob, including the project description, technology stack and my account of Bob's development role.

![Talivoy README displayed inside IBM Bob with its mode selector](../bobscrenshot/agent%202.png)

## How this relates to the application

I used Bob as my primary AI development assistant for the staged build and debugging process. The screenshots support that development account by showing the actual planning and workspace context. The application code, automated tests, Git history and CI results provide the implementation and verification record.

IBM Granite through watsonx.ai and Docling have separate runtime roles in the app. Granite supports profile interpretation and career recommendations. Docling supports document extraction, with a local extraction fallback. Their integration is described in the [README](../README.md) and [architecture guide](ARCHITECTURE.md).
