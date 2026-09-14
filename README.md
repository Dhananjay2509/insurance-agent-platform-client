# Insurance Agent Platform — Client

React + TypeScript + Tailwind single-page app for insurance agents. Takes an
agent from a first conversation with a prospective customer through to an active
policy.

> **This repository is the frontend.** The Express API is a separate repository:
> [Insurance-Agent-Platform-server](https://github.com/abnair715-png/Insurance-Agent-Platform-server).
> Full system documentation — architecture, data model, business rules,
> idempotency, security — lives there.

**Live demo:** _<add your Vercel URL here>_
**API:** _<add your Render URL here>_
**Demo credentials:** published in the API repository's README.

---

## Quick start

The API must be running first — see its README.

```bash
git clone https://github.com/abnair715-png/Insurance-Agent-Platform-client.git
cd Insurance-Agent-Platform-client
npm install

echo 'VITE_API_URL=' > .env   # empty locally — the Vite proxy handles /api
npm run dev               # http://localhost:5173
```

`vite.config.ts` proxies `/api` to the API on port 4000, so the browser stays on
a single origin in development. In production the two are on different hosts —
see [Authentication](#authentication).

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server with the `/api` proxy, on `:5173` |
| `npm run build` | `tsc -b && vite build` → `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm test` | 84 tests (Vitest + React Testing Library) |
| `npm run test:watch` | Same, in watch mode |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |

## Screens

| Route | Screen |
| --- | --- |
| `/login`, `/signup` | Agent authentication |
| `/` | Dashboard — customers, active policies, pending payments, products |
| `/products` | Live catalogue with plain-English eligibility criteria |
| `/customers` | Searchable table with per-row edit and guarded delete |
| `/customers/new`, `/customers/:id/edit` | Customer form with client-side validation |
| `/customers/:id` | Profile · applicable products · quotations and policies |
| `/quotations/:id` | The agent journey: PDF → WhatsApp → payment link → active policy |
| `/policies` | Every policy activated after a confirmed payment |
| `/payment/success`, `/payment/cancelled` | **Public** — where Stripe returns the customer |

## Layout

```
src/
├── App.tsx           # routes: public auth · public customer · protected dashboard
├── components/
│   ├── ui/           # Button, Card, Badge, Field, DataTable, ConfirmDialog,
│   │                 #   Alert, EmptyState, Spinner, StatCard, DetailList
│   └── layout/       # AppLayout, PageHeader, ProtectedRoute
├── features/         # cross-page domain UI
│   ├── customers/    #   CustomerForm + its pure validation logic
│   ├── eligibility/  #   EligibleProducts
│   └── quotations/   #   JourneyStepper, WhatsAppShare
├── pages/            # one file per screen
├── hooks/            # useAuth, useAsync, usePolling, useToast
├── services/         # apiClient, authToken, one typed function per endpoint
├── types/api.ts      # the API contract
└── utils/            # formatting, class names
```

## Design decisions

- **No data-fetching library.** `useAsync` is ~90 lines and gives every screen
  loading / refreshing / error / empty / loaded, with abort-on-unmount. It
  distinguishes a **first load** from a **background refresh**, so a screen that
  polls for webhook confirmation never blanks out under the user. React Query
  becomes the right call when caching or optimistic updates are needed; neither
  is yet.
- **No global store.** Only the session is global (`AuthProvider`). Everything
  else is server state fetched by the screen that shows it.
- **One HTTP entry point.** `services/apiClient.ts` owns the base URL, the
  response envelope, the auth header and the global 401 hook — so an expired
  session signs the user out from one place rather than from every caller.
- **Money is never arithmetic in a component.** Amounts arrive as integers in
  minor units (paise) and pass through `utils/format.ts`.
- **Validation mirrors the server, and is not trusted.** The form gives fast
  feedback; the API re-validates everything and is the only real control.
- **The payment return page never claims success on Stripe's redirect alone.**
  That redirect is an ordinary browser navigation anyone can type. The page asks
  the server for the authoritative status and polls until the webhook has
  settled it. There are tests for exactly this.

## Authentication

The API issues its JWT twice: as an httpOnly cookie **and** in the response body.

Because the client and API are deployed to different origins, a `SameSite=Lax`
cookie is not sent cross-site — and `SameSite=None` is blocked by Safari's ITP
and Chrome's third-party cookie restrictions. So this SPA stores the token and
sends `Authorization: Bearer`, which the API already accepts.

**The trade-off, stated plainly:** a token in `localStorage` is readable by
JavaScript, so an XSS bug could exfiltrate it — the exact exposure an httpOnly
cookie prevents. What limits the blast radius: a 12-hour expiry, a strict CORS
allow-list on the API, React's default output escaping, no
`dangerouslySetInnerHTML` anywhere, and no third-party scripts. Putting both
projects behind one domain would restore the cookie with no code change, because
the server never stopped issuing it.

## Configuration

One variable. `.env.example` is not committed, so this is the reference:

| Variable | Local | Production |
| --- | --- | --- |
| `VITE_API_URL` | empty — the Vite proxy handles `/api` | `https://<your-service>.onrender.com/api` |

**Vite inlines `VITE_*` at build time.** Two consequences: changing it in the
Vercel dashboard does nothing until you **redeploy**, and **no secret may ever
go in a `VITE_*` variable** — it ships to the browser in plain text.

## Testing

```bash
npm test
```

84 tests. They query by role and label, as a user would, so they survive markup
changes.

| Suite | Covers |
| --- | --- |
| `apiClient.test.ts` | Bearer token attached cross-origin, no header when signed out, credentials still sent for the cookie path, the 401 hook, network errors normalised, `VITE_API_URL` base resolution |
| `useAsync.test.ts` | First load vs background refresh — the property that stops a polling screen blanking |
| `usePolling.test.ts` | Interval ticking, ticks skipped while the tab is hidden, `maxAttempts` exhaustion, cleanup |
| `CustomerForm.test.tsx` | Validation rules, payload shaping, conditional vehicle fields |
| `CustomersPage.test.tsx` | Row actions, confirmation before delete, a 409 keeping the dialog open with its reason |
| `EditCustomerPage.test.tsx` | Returns to wherever the form was opened from; a crafted origin is ignored |
| `LoginPage.test.tsx` | Validation, sign-in, server errors mapped to fields |
| `ProductsPage.test.tsx` | DB-sourced rendering, category refetch, empty and error states |
| `PaymentReturnPage.test.tsx` | Does **not** claim success on redirect alone |
| `format.test.ts` | Minor/major round-trip, lakh/crore shorthand, UTC dates |

Strategy and rationale:
[testing-strategy.md](https://github.com/abnair715-png/Insurance-Agent-Platform-server/blob/main/docs/testing-strategy.md)
in the API repository.

## Deployment

Vercel, as a static build. Full guide with troubleshooting:
**[docs/deployment.md](docs/deployment.md)**.

| Setting | Value |
| --- | --- |
| Framework Preset | Vite |
| Root Directory | *(repository root)* |
| Install Command | `npm install --include=dev` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

`--include=dev` matters: if `NODE_ENV=production` is set, npm skips
devDependencies — and `vite` and `typescript` are devDependencies, so the build
fails with `sh: line 1: tsc: command not found`.

**Deploy the API first**, then set `VITE_API_URL` here, then set `CLIENT_URL` on
the API and redeploy it — otherwise CORS blocks every request.

## Tech stack

React 18 · TypeScript · React Router 6 · Tailwind CSS · Vite · Vitest · React
Testing Library
