# Task Dashboard

A mobile-first task and reminder dashboard built with React, TypeScript, Cloudflare Pages Functions, and Cloudflare D1.

## Features

- Name-only shared profiles with normalized, persistent identity
- Tasks with optional dates and reminders with exact or relative times
- Dashboard, monthly calendar, and completed-item archive
- In-app due reminder dialog and browser notifications while the site is open
- Responsive desktop and mobile navigation
- Cloudflare D1 persistence with server-side validation and ownership filtering

## Local development

Requirements: Node.js 20 or newer and a Cloudflare account for production deployment.

```bash
npm install
npm run dev
```

The complete local application runs at `http://localhost:5173`. For frontend-only work without the API, use `npm run dev:ui`.

## Checks

```bash
npm test
npm run typecheck
npm run build
```

## Cloudflare deployment

1. Create a D1 database named `task`.
2. Replace the placeholder `database_id` in `wrangler.toml` with the production database ID.
3. Apply the production migration with `npm run db:migrate:production`.
4. Create a Cloudflare Pages project connected to the GitHub repository.
5. Use `npm run build` as the build command and `dist` as the output directory.
6. Bind the D1 database to the Pages project as `DB`.
7. Keep preview deployments disconnected from the production D1 database.

The name-only profile model is intentionally not authentication. Anyone entering the same normalized name can access that profile's items.
