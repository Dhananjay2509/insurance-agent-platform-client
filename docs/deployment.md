# Deploying the client to Vercel

The client is a static Vite build. Vercel runs `npm run build` and serves
`dist/` from its edge; there is no server-side runtime in this project.

`vercel.json` in the project root carries the configuration, so the dashboard
only needs the Root Directory and one environment variable.

| Setting | Value |
| --- | --- |
| Framework Preset | Vite |
| Root Directory | *(repository root — leave blank)* |
| Install Command | `npm install --include=dev` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

> **Why devDependencies always install.** Setting `NODE_ENV=production` makes npm
> set `omit=dev` and skip every devDependency — and `vite` and `typescript` are
> devDependencies, so the build would fail with
> `sh: line 1: tsc: command not found`. A committed `.npmrc` containing
> `include=dev` overrides that, so no dashboard setting is required.

## Deploy the API first

The client needs the API's URL at **build time**, so deploy
[the API to Render](https://github.com/abnair715-png/Insurance-Agent-Platform-server/blob/main/docs/deployment.md) first and note
its URL.

## Steps

1. **Add New → Project** → import the repository.
2. Leave **Root Directory** blank — this repository root is the project root.
   Framework Preset: **Vite**.
3. Add the one environment variable:

   | Variable | Value |
   | --- | --- |
   | `VITE_API_URL` | `https://<your-service>.onrender.com/api` |

   Note the **`/api` suffix** — it is the base path, not just the host.

4. Deploy. Note the URL — call it `<CLIENT_URL>`.
5. **Go back to Render** and set `CLIENT_URL=<CLIENT_URL>` on the API, then
   redeploy it. Until you do, CORS blocks every request from the browser.

## `VITE_API_URL` is baked in at build time

Vite **inlines** `VITE_*` variables into the bundle during the build. Two
consequences:

- Changing it in the Vercel dashboard does nothing until you **redeploy**.
- **Never put a secret in a `VITE_*` variable** — it ships to the browser in
  plain text and is readable by anyone who opens the bundle.

Leave it empty locally: `vite.config.ts` proxies `/api` to the Express process
on port 4000, which keeps the browser on a single origin in development.

## Preview deployments

Every Vercel preview gets its own URL, which the API's CORS allow-list does not
know. To let previews talk to the API, add their origins to
`CORS_ADDITIONAL_ORIGINS` on Render (comma-separated).

Simpler, if you do not need previews: test against production only.

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Build fails: `tsc: command not found` | devDependencies were skipped | The committed `.npmrc` (`include=dev`) fixes this; redeploy without a cached install |
| Login page renders, nothing loads, console shows a CORS error | `CLIENT_URL` on the API does not match this deployment's origin | Set it on Render (with `https://`, no trailing slash) and redeploy the API |
| Requests go to the client's own origin instead of the API | `VITE_API_URL` unset at build time | Set it and **redeploy** — a dashboard edit alone has no effect |
| Requests 404 with a doubled or missing path | `VITE_API_URL` missing the `/api` suffix, or has a trailing slash | Use `https://<service>.onrender.com/api` |
| First request after a quiet period hangs ~50s | Render's free plan spun the API down | Expected; see [the API guide](https://github.com/abnair715-png/Insurance-Agent-Platform-server/blob/main/docs/deployment.md) |
| A deep link like `/customers/123` 404s on refresh | SPA fallback rewrite missing | It is in `vercel.json`; check no dashboard override replaced it |
| Signed in, then signed out again on refresh | The session token could not be stored | The SPA keeps its JWT in `localStorage`; private mode or blocked site data prevents that |

## Local development

```bash
npm install
echo 'VITE_API_URL=' > .env    # empty locally
npm run dev              # http://localhost:5173
```

The API must be running on port 4000 for the proxy to reach it — see the API
repository.
