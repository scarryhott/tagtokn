# Deployment binding

The production application is bound to the Vercel project identified in `vercel-binding.json`:

- GitHub repository: `scarryhott/tagtokn`
- Production branch: `main`
- Vercel project: `tagtoken`
- Vercel project ID: `prj_eZGLHSZcMUMr3yvllDhmyaDILHz2`
- Vercel team: `harrys-projects-08015ef2`
- Vercel team ID: `team_8lwRiE0ISUD66ftmTcnduSCb`

A hostname such as `tagtoken-gxcqxpti5-harrys-projects-08015ef2.vercel.app` identifies one generated deployment, not the project itself. It may expire, be removed, or be superseded. Project identity is therefore checked using the stable project ID, team ID, GitHub source repository, and production branch.

The repository test suite verifies this binding together with `vercel.json` on every pull request.
