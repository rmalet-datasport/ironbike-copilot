# Iron Bike Co-Pilot

Marketing automation tool for the Iron Bike Race Einsiedeln 2026 organizer (Datasport). See
`STATUS.md` for current state, `CLAUDE.md` for project structure and rules, `docs/` for detailed
specs (data model, gates, AI prompts, testing, deployment).

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

Copy `.env.example` to `.env.local` and fill in the values, and place your local copy of
`data/participants.csv` (real participant data, distributed outside git — see
`IRONBIKE_BRIEF.md` §7bis) before running the dev server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result
(redirects to `/gate/registration`).

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deployment

Deployed on Vercel (team `datasport`, project `ironbike-copilot`) — see `docs/DEPLOYMENT.md`
for the full setup (Blob storage fallback for real participant data, env vars, how to
redeploy).
