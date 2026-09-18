# Raincheck

A client-rendered React application for checking Tomorrow.io's hourly rain forecast at a latitude and longitude. A Cloudflare Worker keeps the Tomorrow.io API key out of browser code and normalizes the next 24 hourly records.

## Requirements

- Node.js 20 or newer
- A Tomorrow.io API key

## Local development

```bash
npm install
cp .env.example .env.local
```

For local Worker development, put `TOMORROW_IO_API_KEY` in `.dev.vars`, then start the Worker and Vite build together:

```bash
npm run dev:worker
```

Wrangler serves the app at the local URL it prints, normally `http://localhost:8787`.

To work only on the interface, use `npm run dev`.

### Bring your own key (standalone Vite dev)

The app uses the managed Worker route first. If the Worker is not configured,
or Tomorrow.io rate-limits the managed key with HTTP 429, the app lets the user
enter a personal Tomorrow.io key. That key is stored only in the browser and is
sent directly to Tomorrow.io; it is never sent to Cloudflare.

## Commands

```bash
npm run lint
npm test -- --run
npm run build
npm run dev:worker
npm run deploy
```

## Deployment

The repository contains `wrangler.jsonc`, which deploys the Worker entry point
and the Vite `dist` directory as one application. The Worker handles
`/api/forecast`; all other requests are served from the static assets.

For a manual first deployment:

```bash
npx wrangler login
npx wrangler secret put TOMORROW_IO_API_KEY
npm run deploy
```

### Passkey favorites

Passkey accounts and favorite places are stored in Cloudflare D1. Create the
database once, copy its returned `database_id` into `wrangler.jsonc`, then
apply the migration locally and remotely:

```bash
npx wrangler d1 create raincheck-auth
npx wrangler d1 execute raincheck-auth --local --file=migrations/0001_passkey_favorites.sql
npx wrangler d1 execute raincheck-auth --remote --file=migrations/0001_passkey_favorites.sql
```

Passkeys require HTTPS, except for localhost during development. The Worker
uses the current request hostname as the relying-party ID and its origin as the
expected origin, so deploy the app only to the HTTPS hostnames intended for
Raincheck. Session cookies are `Secure`, `HttpOnly`, and `SameSite=Lax`; do not
add a browser token or expose credential/challenge data in application storage.

After creating the D1 database, deploy as usual with `npm run deploy`.

For Git push-to-deploy, connect the repository under the Worker in Cloudflare
Workers Builds:

- Production branch: `main`
- Build command: `npm ci && npm run build`
- Deploy command: `npx wrangler deploy`

Add `TOMORROW_IO_API_KEY` as an encrypted secret on the Worker. Do not put it
in GitHub, `vars`, `.env`, or a variable beginning with `VITE_`.

Never expose the key through a variable beginning with `VITE_`; Vite embeds those variables in browser assets.

## Forecast behavior

The supplied `/v4/weather/realtime` endpoint reports current conditions only. Raincheck uses `/v4/weather/forecast` with the `1h` timestep and metric units to show the next 24 hourly values. "Next rain" means the first returned hour where Tomorrow.io reports `rainIntensity` above zero. Forecasts remain probabilistic and should not replace official severe-weather advisories.