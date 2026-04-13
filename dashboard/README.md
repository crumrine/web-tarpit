# Tarpit Dashboard

Standalone Cloudflare Worker that reads from D1 and serves an analytics dashboard
for `web-tarpit` traffic: total traps, unique IPs, attack types, top bot IPs,
top targeted paths, a 30-day activity chart, and estimated bot time wasted.

## Prerequisites

- A Cloudflare account
- [`wrangler`](https://developers.cloudflare.com/workers/wrangler/install-and-update/) installed and authenticated (`wrangler login`)
- Node.js 18+

## Deploy

### 1. Create the D1 database

From the repo root:

```bash
wrangler d1 create tarpit-logs
```

Wrangler prints a `database_id`. Copy it.

### 2. Apply the schema

```bash
wrangler d1 execute tarpit-logs --remote --file=schema.sql
```

### 3. Configure the dashboard worker

Edit `dashboard/wrangler.toml` and replace `<your-database-id>` with the ID from step 1:

```toml
[[d1_databases]]
binding = "TARPIT_DB"
database_name = "tarpit-logs"
database_id = "abc123..."   # paste here
```

### 4. Deploy the dashboard

```bash
cd dashboard
wrangler deploy
```

Wrangler prints the deployed URL (e.g. `https://tarpit-dashboard.<subdomain>.workers.dev`).

## Wiring your sites to log into the same D1

Any Worker (or other service with a D1 binding) that calls `tarpit()` should
bind the same `tarpit-logs` database and pass an `onTrap` callback that writes
to it. Example Worker `wrangler.toml`:

```toml
[[d1_databases]]
binding = "TARPIT_DB"
database_name = "tarpit-logs"
database_id = "abc123..."   # same ID as the dashboard
```

Example handler:

```js
import { tarpit } from 'web-tarpit';

export default {
  async fetch(request, env, ctx) {
    const trap = tarpit(request, {
      ctx,
      onTrap: (type, path, ip, request, data) =>
        env.TARPIT_DB.prepare(
          "INSERT INTO tarpit_log (site, type, path, ip, ua, data, ts) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))"
        ).bind(
          new URL(request.url).hostname,
          type,
          path,
          ip,
          request.headers.get('user-agent') || '',
          data ? JSON.stringify(data) : ''
        ).run(),
    });
    if (trap) return trap;
    return new Response('Hello');
  },
};
```

Multiple sites can write to the same database — the dashboard groups by `site`
(the request hostname) automatically.

## Endpoints

The dashboard worker exposes:

- `GET /` — HTML dashboard
- `GET /api/stats` — aggregate stats JSON
- `GET /api/recent?limit=50&site=example.com` — recent trap events
- `GET /api/sites` — per-site totals

## Restricting access

The dashboard is public by default. To lock it down, put it behind
[Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/policies/access/)
or add a bearer-token check at the top of `fetch()`.

## Schema reference

See [`schema.sql`](../schema.sql) in the repo root.
