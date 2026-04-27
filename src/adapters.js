// Framework adapters for web-tarpit
//
// The core tarpit uses Web Standard Request/Response.
// These adapters bridge frameworks that use different APIs.

import { Readable } from 'node:stream';
import { tarpit, isBotPath } from './tarpit.js';

// Forward the Node request body into the Web Request the core consumes.
// Without this, downstream paths that read the body (xmlrpc honeypot,
// admin-ajax credential capture) see an empty string.
//
// Express middleware ordering: install expressTarpit BEFORE body parsers
// (express.json, express.urlencoded, etc.) so the raw stream is still
// readable. If a parser ran first and populated req.body, we re-serialize
// it as a fallback so the body still reaches the trap.
function attachBody(init, nodeReq) {
  const method = nodeReq.method;
  if (method === 'GET' || method === 'HEAD') return;
  if (nodeReq.body !== undefined && nodeReq.body !== null) {
    if (typeof nodeReq.body === 'string' || nodeReq.body instanceof Uint8Array) {
      init.body = nodeReq.body;
    } else {
      init.body = JSON.stringify(nodeReq.body);
    }
    return;
  }
  if (typeof nodeReq.pipe === 'function' && nodeReq.readable !== false) {
    init.body = Readable.toWeb(nodeReq);
    init.duplex = 'half';
  }
}

/**
 * Express/Connect middleware adapter.
 * Usage:
 *   import { expressTarpit } from 'web-tarpit/adapters';
 *   app.use(expressTarpit());
 *   app.use(expressTarpit({ onTrap: (type, path, ip) => console.log(type, path, ip) }));
 *
 * @param {object} [options]
 * @param {function} [options.onTrap] - Callback: (type, path, ip, req) => void
 * @returns {function} Express middleware (req, res, next)
 */
export function expressTarpit(options = {}) {
  return (req, res, next) => {
    // Quick check before converting to Request
    if (!isBotPath(req.path || req.url.split('?')[0])) {
      return next();
    }

    // Build a Web Standard Request from Express req
    const protocol = req.protocol || 'https';
    const host = req.get('host') || req.headers.host || 'localhost';
    const url = `${protocol}://${host}${req.originalUrl || req.url}`;
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value) headers.set(key, Array.isArray(value) ? value[0] : value);
    }

    const init = { method: req.method, headers };
    attachBody(init, req);
    const webRequest = new Request(url, init);

    const response = tarpit(webRequest, options);
    if (!response) return next();

    // Stream the Web Standard Response back through Express
    res.status(response.status || 200);
    for (const [key, value] of response.headers) {
      res.setHeader(key, value);
    }

    if (response.body) {
      const reader = response.body.getReader();
      const cancel = () => reader.cancel().catch(() => {});
      if (typeof res.on === 'function') res.on('close', cancel);
      (async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) { res.end(); break; }
            res.write(value);
          }
        } catch {
          try { res.end(); } catch {}
        }
      })();
    } else {
      response.text().then(text => res.end(text)).catch(() => { try { res.end(); } catch {} });
    }
  };
}

/**
 * Node.js http.createServer adapter.
 * Usage:
 *   import { createServer } from 'http';
 *   import { nodeTarpit } from 'web-tarpit/adapters';
 *   const trap = nodeTarpit();
 *   createServer((req, res) => {
 *     if (trap(req, res)) return;
 *     res.end('Hello');
 *   });
 *
 * @param {object} [options]
 * @param {function} [options.onTrap] - Callback: (type, path, ip, req) => void
 * @returns {function} (req, res) => boolean
 */
export function nodeTarpit(options = {}) {
  return (req, res) => {
    const path = req.url.split('?')[0];
    if (!isBotPath(path)) return false;

    const host = req.headers.host || 'localhost';
    const url = `https://${host}${req.url}`;
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value) headers.set(key, Array.isArray(value) ? value[0] : value);
    }

    const init = { method: req.method, headers };
    attachBody(init, req);
    const webRequest = new Request(url, init);
    const response = tarpit(webRequest, options);
    if (!response) return false;

    res.writeHead(response.status || 200, Object.fromEntries(response.headers));
    if (response.body) {
      const reader = response.body.getReader();
      const cancel = () => reader.cancel().catch(() => {});
      if (typeof res.on === 'function') res.on('close', cancel);
      (async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) { res.end(); break; }
            res.write(value);
          }
        } catch {
          try { res.end(); } catch {}
        }
      })();
    } else {
      response.text().then(text => res.end(text)).catch(() => { try { res.end(); } catch {} });
    }
    return true;
  };
}
