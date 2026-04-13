# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
