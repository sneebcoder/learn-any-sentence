@AGENTS.md

## Automated: "push to GitHub"

Whenever the user says "push to GitHub", do the following in order:

1. Stage all changed/untracked files (excluding .env files), write a concise commit message, and commit.
2. Run `git push origin main` to push to GitHub.
3. Wait ~30 seconds for Vercel to pick up the push, then run `vercel ls` to get the latest deployment URL and status.
4. If the deployment status is not `Ready`, run `vercel logs <deployment-url>` to fetch the build logs and report any errors to the user.
5. Report back: deployment URL + status (Ready / Error).
