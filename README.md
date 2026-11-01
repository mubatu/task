# Task Dashboard

A mobile-first task and reminder dashboard built with React, TypeScript, Cloudflare Workers (static assets + API), and Cloudflare D1.

## Features

- Google sign-in with server-side, cookie-based sessions
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
- `worker/routes/`: one handler per endpoint. Public routes take `(request, env)`; every other route takes `(request, env, user)` with the signed-in user.
- `worker/lib/`: shared server code (sessions, Google ID token verification, validation, D1 row mapping, HTTP helpers).
- `shared/contracts.ts`: request and response types used by both sides.

Only `/api/*` runs the Worker (`run_worker_first`). Every other path is served from `dist/`, and unknown paths fall back to `index.html` (`not_found_handling = "single-page-application"`), so client routes such as `/calendar` work on reload.

## Google sign-in

1. In Google Cloud Console, create an OAuth 2.0 Client ID of type **Web application**.
2. Add every origin that serves the app under **Authorized JavaScript origins**: `https://task.mubatu.com`, plus `http://localhost` and `http://localhost:5173` for local development. Wildcards are not accepted. No redirect URI or client secret is needed.
3. Put the client ID in `GOOGLE_CLIENT_ID` under `[vars]` in `wrangler.toml`. It is public and safe to commit. To override it locally, put `GOOGLE_CLIENT_ID=...` in `.dev.vars`.

The browser receives a Google ID token, `POST /api/auth/google` verifies it against Google's public keys and sets an `HttpOnly` session cookie that lasts 90 days. Only `/api/auth/*` is public. Every other `/api/*` route requires that cookie and acts on the signed-in user; clients never send their own user ID. Writes whose `Origin` header names another site are rejected.

On first sign-in a person either creates a new profile or links an existing name-only profile by typing that name. A name can be linked only once. To link a profile for someone in advance, set its email; their first Google sign-in then links it without asking:

```bash
npx wrangler d1 execute task --remote --command "UPDATE users SET email = 'person@gmail.com' WHERE id = '<user id>' AND google_sub IS NULL"
```

The privacy policy is served from `public/privacy.html` at `/privacy`.

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
