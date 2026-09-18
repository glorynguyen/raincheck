# Raincheck

A client-rendered React application for checking Tomorrow.io's hourly rain forecast at a latitude and longitude. A Vercel Function keeps the Tomorrow.io API key out of browser code and normalizes the next 24 hourly records.

## Requirements

- Node.js 20 or newer
- A Tomorrow.io API key

## Local development

```bash
npm install
cp .env.example .env.local
```

Set `TOMORROW_IO_API_KEY` in `.env.local`, then start the frontend and local function together:

```bash
npm run dev:full
```

Open the URL printed by Vercel CLI, normally `http://localhost:3000`. The first run may ask you to sign in or configure a local Vercel project.

To work only on the interface, use `npm run dev`. Forecast requests require the Vercel function and will not work through the standalone Vite server.

### Bring your own key (standalone Vite dev)

If you'd rather skip `vercel dev`, run `npm run dev` and paste a Tomorrow.io
API key into the "Tomorrow.io API key (dev only)" field in the app. The key
is stored in your browser's local storage and requests go straight from the
browser to Tomorrow.io, bypassing the server function entirely. This is a
local-development convenience only — never use it for shared or production
deployments, since the key is visible in the browser.

## Commands

```bash
npm run lint
npm test -- --run
npm run build
```

## Deployment

1. Import the repository into Vercel as a Vite project.
2. Add `TOMORROW_IO_API_KEY` in the Vercel project environment variables.
3. Deploy using the default `npm run build` command and `dist` output directory.

Never expose the key through a variable beginning with `VITE_`; Vite embeds those variables in browser assets.

## Forecast behavior

The supplied `/v4/weather/realtime` endpoint reports current conditions only. Raincheck uses `/v4/weather/forecast` with the `1h` timestep and metric units to show the next 24 hourly values. "Next rain" means the first returned hour where Tomorrow.io reports `rainIntensity` above zero. Forecasts remain probabilistic and should not replace official severe-weather advisories.