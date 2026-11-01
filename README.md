# Task Dashboard

A mobile-first task and reminder dashboard built with React, TypeScript, Cloudflare Workers (static assets + API), and Cloudflare D1.

## Features

- Name-only shared profiles with normalized, persistent identity
- Tasks with optional dates and reminders with exact or relative times
- Edit titles, notes, task dates, and reminder times from the dashboard, calendar, or archive
- Dashboard, monthly calendar, and completed-item archive
- In-app due reminder dialog and browser notifications while the site is open
- Responsive desktop and mobile navigation
- Bundled Momo Trust Display font with Turkish glyphs and a consistent regular weight
- Cloudflare D1 persistence with server-side validation and ownership filtering

## Local development

Requirements: Node.js 20 or newer and a Cloudflare account for production deployment.

```bash
npm install
npm run dev
```

The complete local application runs at `http://localhost:5173` through `wrangler dev`. For frontend-only work without the API, use `npm run dev:ui`.

## Structure

- `src/`: React app, built by Vite into `dist/`.
- `worker/index.ts`: Worker entry point. It holds the API route table, maps unknown `/api/*` paths to `404` and wrong methods to `405` with an `Allow` header, and turns thrown errors into JSON responses.
- `worker/routes/`: one handler per endpoint, `(request, env) => Promise<Response>`.
- `worker/lib/`: shared server code (validation, D1 row mapping, HTTP helpers).
- `shared/contracts.ts`: request and response types used by both sides.

Only `/api/*` runs the Worker (`run_worker_first`). Every other path is served from `dist/`, and unknown paths fall back to `index.html` (`not_found_handling = "single-page-application"`), so client routes such as `/calendar` work on reload.

## Checks

```bash
npm test
npm run typecheck
npm run build
```

## Cloudflare deployment

The app is a single Worker with static assets, configured in `wrangler.toml`.

1. Create a D1 database named `task` and put its ID in `database_id` in `wrangler.toml`.
2. Apply migrations with `npm run db:migrate:production`.
3. Deploy with `npm run deploy` (builds, then `wrangler deploy`), or connect the repository under **Worker → Settings → Build** with build command `npm run build`, deploy command `npx wrangler deploy` and production branch `main`.
4. Keep preview builds and preview URLs disabled: they would run against the production D1 database.

The name-only profile model is intentionally not authentication. Anyone entering the same normalized name can access that profile's items.
