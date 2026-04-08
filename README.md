# web-tarpit

Bot trap for any JavaScript server. Wastes vulnerability scanners' time with fake WordPress pages, honeypot credentials, and slow-drip responses.

Zero dependencies. One import. Works everywhere the Web Standard `Request`/`Response` API works.

## Install

```bash
npm install web-tarpit
```

## Usage

### Cloudflare Workers

```js
import { tarpit } from 'web-tarpit';

export default {
  async fetch(request, env, ctx) {
    const trap = tarpit(request, { ctx });
    if (trap) return trap;
    return new Response('Hello world');
  }
};
```

### Hono

```js
import { Hono } from 'hono';
import { tarpit } from 'web-tarpit';

const app = new Hono();

app.use('*', async (c, next) => {
  const trap = tarpit(c.req.raw);
  if (trap) return trap;
  await next();
});

app.get('/', (c) => c.text('Hello'));
export default app;
```

### Next.js Middleware

```js
// middleware.js
import { tarpit } from 'web-tarpit';

export function middleware(request) {
  const trap = tarpit(request);
  if (trap) return trap;
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
```

### Deno / Bun

```js
import { tarpit } from 'web-tarpit';

Deno.serve((request) => {
  const trap = tarpit(request);
  if (trap) return trap;
  return new Response('Hello');
});
```

### Express

```js
import express from 'express';
import { expressTarpit } from 'web-tarpit/adapters';

const app = express();
app.use(expressTarpit());
app.get('/', (req, res) => res.send('Hello'));
app.listen(3000);
```

### Node.js HTTP

```js
import { createServer } from 'http';
import { nodeTarpit } from 'web-tarpit/adapters';

const trap = nodeTarpit();
createServer((req, res) => {
  if (trap(req, res)) return; // bot trapped
  res.end('Hello');
}).listen(3000);
```

## What it does

Every web server gets hit by bots scanning for WordPress vulnerabilities, exposed `.env` files, and admin panels. Normally you return a 404 and they move on in milliseconds. This module makes them regret scanning you.

| Path | What the bot gets |
|---|---|
| `/wp-login.php` | Pixel-perfect WordPress 6.7.2 login. Captures creds, waits 5-15s per attempt. |
| `/wp-admin/*` | Infinite admin dashboard maze. 20+ linkable pages. |
| `/.env*` | Slow-drip fake AWS keys, Stripe secrets, database passwords. ~80s per download. |
| `/.git/*` | Slow-drip fake git config. |
| `/xmlrpc.php` | Slow-drip XML-RPC fault. |
| `/phpmyadmin/`, `/admin/`, `/login` | Slow-drip "access denied" with IP warning. |
| `/shell.php`, `*.sql`, `*.bak` | Slow-drip "incident logged" message. |

Legitimate requests pass through untouched -- the check adds zero overhead for normal traffic.

## Logging

Pass an `onTrap` callback to log every trapped request:

```js
tarpit(request, {
  onTrap: (type, path, ip, request, data) => {
    console.log(`[tarpit] ${type} ${path} from ${ip}`);
    // type: 'login-page', 'login', 'admin', 'env', 'git', 'xmlrpc', 'wp-probe', 'probe'
    // data: submitted form data (only for 'login' type)
  }
});
```

For Cloudflare Workers with D1, pass `ctx` and log to the database:

```js
tarpit(request, {
  ctx,
  onTrap: (type, path, ip, request) => {
    return env.TARPIT_DB.prepare(
      "INSERT INTO tarpit_log (site, type, path, ip, ua, ts) VALUES (?, ?, ?, ?, ?, datetime('now'))"
    ).bind(
      new URL(request.url).hostname, type, path, ip,
      request.headers.get('user-agent') || ''
    ).run();
  }
});
```

The D1 schema is in `schema.sql`. A companion analytics dashboard is in `dashboard/`.

## API

### `tarpit(request, options?)`

| Param | Type | Description |
|---|---|---|
| `request` | `Request` | Web Standard Request object |
| `options.onTrap` | `function` | Callback: `(type, path, ip, request, data?) => void\|Promise` |
| `options.ctx` | `object` | Execution context with `waitUntil()` (Cloudflare Workers) |

Returns `Response` if the path is a bot probe, or `null` if legitimate.

### `isBotPath(path)`

Check if a URL pathname would trigger the tarpit. Returns `boolean`.

```js
import { isBotPath } from 'web-tarpit';
if (isBotPath('/wp-login.php')) { /* ... */ }
```

### `expressTarpit(options?)` (from `web-tarpit/adapters`)

Express/Connect middleware. Same options as `tarpit()`.

### `nodeTarpit(options?)` (from `web-tarpit/adapters`)

Returns `(req, res) => boolean` for Node.js `http.createServer`.

## How the slow-drip works

Responses are streamed in 3-byte chunks with 100-500ms random delays. A scanner expecting a quick response holds the connection open while data trickles in.

For a 1KB fake `.env` file: ~330 chunks at ~250ms average = **~80 seconds** per scan.

Response headers include `X-Powered-By: PHP/8.2.13` and `Server: Apache/2.4.57` to convince the bot it found a real PHP application.

## Dashboard (optional)

The `dashboard/` directory contains a standalone Cloudflare Worker that reads from D1 and serves an analytics dashboard showing trap stats, attack types, top bot IPs, and a 30-day activity chart.

## License

MIT
