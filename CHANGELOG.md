# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-04-26

### Added
- Opt-in XML-RPC honeypot mode (`xmlrpcMode: 'honeypot'`) for `/xmlrpc.php` POSTs.
  Off by default to preserve 1.0 behavior.
  - `wp.getUsersBlogs`, `wp.getProfile`, `wp.getOptions`, `wp.getPosts`, `wp.getUsers`,
    `wp.getUser`, `wp.getPages`, `wp.getPage`, all `metaWeblog.*`, all `blogger.*` →
    fake `isAdmin: true` success. Intent: poison brute-force credential databases
    so every attempted password appears to "work."
  - `system.multicall` → wrapped success array sized to inner method count, capped 1..200.
  - `pingback.*` → always returns a fault. Critical: a success here would make the
    tarpit a tool in someone else's SSRF / DDoS reflection chain. Never returns success.
  - `system.listMethods` → fake list of ~80 WordPress XML-RPC methods (slow drip).
  - Anything else → existing fault behavior.
- New `onTrap` event types in honeypot mode: `xmlrpc-bruteforce`, `xmlrpc-multicall`,
  `xmlrpc-pingback`, `xmlrpc-listmethods`. The `xmlrpc-bruteforce` event includes
  captured plaintext credentials in the `data` argument — operators persisting these
  should consider hashing the password field. See README.
- `slowDripMs` option to override per-chunk drip delay. Intended for tests
  (`slowDripMs: 0` skips drip entirely); production callers should leave it unset.

### Fixed
- `expressTarpit()` and `nodeTarpit()` adapters now forward the request body
  into the Web `Request` they pass to the core. The 1.0 versions dropped the
  body, which silently broke the existing `/wp-admin/admin-ajax.php` credential
  capture path for anyone using the adapters (direct `tarpit(request)` callers
  were unaffected). Express callers should install `expressTarpit()` BEFORE
  body-parser middleware; if a parser ran first, the populated `req.body` is
  re-serialized as a fallback.

### Known limitations
- The slow-drip cadence (3-byte chunks at 100..500ms) is a fingerprint. Real
  WordPress XML-RPC responds in 100..300ms; sophisticated scanners that time
  responses can pattern-match the trap and skip. The tradeoff favors wasting
  unsophisticated bot time over evading detection.

[1.1.0]: https://github.com/crumrine/web-tarpit/releases/tag/v1.1.0

## [1.0.0] - 2026-04-13

### Added
- Initial public release.
- `tarpit(request, options)` — Web Standard handler that returns a `Response` for known bot paths or `null` for legitimate traffic.
- `isBotPath(path)` — fast path-only check for middleware.
- Express/Connect and Node.js `http` adapters via `web-tarpit/adapters`.
- Fake WordPress 6.7.2 login page with credential capture via `onTrap`.
- Fake `/wp-admin` dashboard maze with 20+ linkable pages.
- Slow-drip streaming (3-byte chunks, 100–500ms jitter) for `.env`, `.git`, `xmlrpc.php`, and generic probe responses.
- `onTrap` callback with `ctx.waitUntil` support for Cloudflare Workers.
- D1 schema (`schema.sql`) and companion analytics dashboard (`dashboard/`).
- 129-test suite covering path matching, response shape, adapters, and streaming behavior.

[1.0.0]: https://github.com/crumrine/web-tarpit/releases/tag/v1.0.0
