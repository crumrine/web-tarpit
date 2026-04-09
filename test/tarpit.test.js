import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { tarpit, isBotPath } from '../src/tarpit.js';
import { expressTarpit, nodeTarpit } from '../src/adapters.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(path, { method = 'GET', headers = {} } = {}) {
  return new Request(`https://example.com${path}`, { method, headers: new Headers(headers) });
}

// ---------------------------------------------------------------------------
// 1. isBotPath detection
// ---------------------------------------------------------------------------

describe('isBotPath', () => {
  // wp-* prefix catch-all
  it('detects /wp-login.php', () => assert.ok(isBotPath('/wp-login.php')));
  it('detects /wp-admin', () => assert.ok(isBotPath('/wp-admin')));
  it('detects /wp-admin/', () => assert.ok(isBotPath('/wp-admin/')));
  it('detects /wp-admin/plugins.php (deep wp-admin path)', () => assert.ok(isBotPath('/wp-admin/plugins.php')));
  it('detects /wp-includes/', () => assert.ok(isBotPath('/wp-includes/')));
  it('detects /wp-content/', () => assert.ok(isBotPath('/wp-content/')));
  it('detects /wp-config.php', () => assert.ok(isBotPath('/wp-config.php')));
  it('detects /wp-config.bak', () => assert.ok(isBotPath('/wp-config.bak')));
  it('detects /wp-json/', () => assert.ok(isBotPath('/wp-json/')));
  it('detects /xmlrpc.php', () => assert.ok(isBotPath('/xmlrpc.php')));
  it('detects arbitrary /wp-anything path', () => assert.ok(isBotPath('/wp-cron.php')));

  // .env variants
  it('detects /.env', () => assert.ok(isBotPath('/.env')));
  it('detects /.env.bak', () => assert.ok(isBotPath('/.env.bak')));
  it('detects /.env.local', () => assert.ok(isBotPath('/.env.local')));
  it('detects /.env.production', () => assert.ok(isBotPath('/.env.production')));

  // .git paths
  it('detects /.git/config', () => assert.ok(isBotPath('/.git/config')));
  it('detects /.git/HEAD', () => assert.ok(isBotPath('/.git/HEAD')));

  // Admin
  it('detects /admin/', () => assert.ok(isBotPath('/admin/')));
  it('detects /administrator/', () => assert.ok(isBotPath('/administrator/')));
  it('detects /admin.php', () => assert.ok(isBotPath('/admin.php')));
  it('detects /login', () => assert.ok(isBotPath('/login')));
  it('detects /login.php', () => assert.ok(isBotPath('/login.php')));

  // phpMyAdmin
  it('detects /phpmyadmin/', () => assert.ok(isBotPath('/phpmyadmin/')));
  it('detects /pma/', () => assert.ok(isBotPath('/pma/')));
  it('detects /myadmin/', () => assert.ok(isBotPath('/myadmin/')));

  // Shell / eval
  it('detects /shell.php', () => assert.ok(isBotPath('/shell.php')));
  it('detects /cmd.php', () => assert.ok(isBotPath('/cmd.php')));
  it('detects /eval.php', () => assert.ok(isBotPath('/eval.php')));
  it('detects /cgi-bin/', () => assert.ok(isBotPath('/cgi-bin/')));

  // SQL / database dumps
  it('detects /backup.sql', () => assert.ok(isBotPath('/backup.sql')));
  it('detects /dump.sql', () => assert.ok(isBotPath('/dump.sql')));
  it('detects /database.sql', () => assert.ok(isBotPath('/database.sql')));
  it('detects /db.sql', () => assert.ok(isBotPath('/db.sql')));

  // Config files
  it('detects /config.php', () => assert.ok(isBotPath('/config.php')));
  it('detects /configuration.php', () => assert.ok(isBotPath('/configuration.php')));
  it('detects /settings.php', () => assert.ok(isBotPath('/settings.php')));

  // Server status / misc
  it('detects /server-status', () => assert.ok(isBotPath('/server-status')));
  it('detects /server-info', () => assert.ok(isBotPath('/server-info')));
  it('detects /.htaccess', () => assert.ok(isBotPath('/.htaccess')));
  it('detects /.htpasswd', () => assert.ok(isBotPath('/.htpasswd')));
  it('detects /.DS_Store', () => assert.ok(isBotPath('/.DS_Store')));

  // Misc probes
  it('detects /vendor/phpunit/', () => assert.ok(isBotPath('/vendor/phpunit/')));
  it('detects /solr/', () => assert.ok(isBotPath('/solr/')));
  it('detects /actuator/', () => assert.ok(isBotPath('/actuator/')));
  it('detects /api/v1/debug', () => assert.ok(isBotPath('/api/v1/debug')));

  // Case-insensitive
  it('detects /WP-LOGIN.PHP (uppercase)', () => assert.ok(isBotPath('/WP-LOGIN.PHP')));
  it('detects /.ENV (uppercase)', () => assert.ok(isBotPath('/.ENV')));

  // Legitimate paths must return falsy
  it('returns falsy for /', () => assert.ok(!isBotPath('/')));
  it('returns falsy for /about', () => assert.ok(!isBotPath('/about')));
  it('returns falsy for /api/users', () => assert.ok(!isBotPath('/api/users')));
  it('returns falsy for /blog', () => assert.ok(!isBotPath('/blog')));
  it('returns falsy for /contact', () => assert.ok(!isBotPath('/contact')));
  it('returns falsy for /products/widget', () => assert.ok(!isBotPath('/products/widget')));
  it('returns falsy for /images/logo.png', () => assert.ok(!isBotPath('/images/logo.png')));
  it('returns falsy for /sitemap.xml', () => assert.ok(!isBotPath('/sitemap.xml')));
  it('returns falsy for /robots.txt', () => assert.ok(!isBotPath('/robots.txt')));
});

// ---------------------------------------------------------------------------
// 2. tarpit() response generation
// ---------------------------------------------------------------------------

describe('tarpit() response generation', () => {
  // Returns null for legit paths
  it('returns null for /about', () => {
    assert.equal(tarpit(makeRequest('/about')), null);
  });
  it('returns null for /api/users', () => {
    assert.equal(tarpit(makeRequest('/api/users')), null);
  });
  it('returns null for /blog', () => {
    assert.equal(tarpit(makeRequest('/blog')), null);
  });

  // wp-login GET -- full HTML page
  describe('wp-login GET', () => {
    let response;
    before(() => { response = tarpit(makeRequest('/wp-login.php')); });

    it('returns a Response (not null)', () => {
      assert.ok(response instanceof Response);
    });
    it('has text/html Content-Type', () => {
      assert.match(response.headers.get('content-type'), /text\/html/);
    });
    it('has X-Powered-By: PHP header', () => {
      assert.match(response.headers.get('x-powered-by'), /PHP/);
    });
    it('has Server: Apache header', () => {
      assert.match(response.headers.get('server'), /Apache/);
    });
    it('body contains login form element', async () => {
      const text = await response.text();
      assert.match(text, /<form[^>]+id="loginform"/);
    });
    it('body contains username input', async () => {
      const response2 = tarpit(makeRequest('/wp-login.php'));
      const text = await response2.text();
      assert.match(text, /input[^>]+name="log"/);
    });
    it('body contains password input', async () => {
      const response3 = tarpit(makeRequest('/wp-login.php'));
      const text = await response3.text();
      assert.match(text, /input[^>]+type="password"/);
    });
    it('body contains wp-submit button', async () => {
      const response4 = tarpit(makeRequest('/wp-login.php'));
      const text = await response4.text();
      assert.match(text, /id="wp-submit"/);
    });
    it('body contains WordPress branding', async () => {
      const response5 = tarpit(makeRequest('/wp-login.php'));
      const text = await response5.text();
      assert.match(text, /WordPress/);
    });
  });

  // wp-login POST is NOT handled by the login-page branch (falls through to wp-probe or null)
  it('wp-login.php POST returns a Response (bot path is still caught)', () => {
    const r = tarpit(makeRequest('/wp-login.php', { method: 'POST' }));
    // /wp-login.php starts with /wp- so it IS a bot path, but the GET branch
    // only fires on GET -- the wp- catch-all still fires for POST.
    assert.ok(r instanceof Response);
  });

  // wp-admin
  describe('wp-admin path', () => {
    let response;
    before(() => { response = tarpit(makeRequest('/wp-admin')); });

    it('returns a Response', () => {
      assert.ok(response instanceof Response);
    });
    it('has text/html Content-Type', () => {
      assert.match(response.headers.get('content-type'), /text\/html/);
    });
    it('has X-Powered-By header', () => {
      assert.ok(response.headers.get('x-powered-by'));
    });
    it('has Server header', () => {
      assert.ok(response.headers.get('server'));
    });
    it('body contains Dashboard heading', async () => {
      const text = await response.text();
      assert.match(text, /Dashboard/);
    });
    it('body contains adminmenu element', async () => {
      const r2 = tarpit(makeRequest('/wp-admin'));
      const text = await r2.text();
      assert.match(text, /adminmenu/);
    });
    it('deep wp-admin path also returns Response', () => {
      assert.ok(tarpit(makeRequest('/wp-admin/plugins.php')) instanceof Response);
    });
  });

  // admin-ajax.php POST (credential capture endpoint)
  describe('wp-admin/admin-ajax.php POST', () => {
    let response;
    before(() => {
      response = tarpit(makeRequest('/wp-admin/admin-ajax.php', { method: 'POST' }));
    });

    it('returns a Response', () => {
      assert.ok(response instanceof Response);
    });
    it('has application/json Content-Type', () => {
      assert.match(response.headers.get('content-type'), /application\/json/);
    });
  });

  // .env path
  describe('.env path', () => {
    let response;
    before(() => { response = tarpit(makeRequest('/.env')); });

    it('returns a Response', () => {
      assert.ok(response instanceof Response);
    });
    it('has text/plain Content-Type', () => {
      assert.match(response.headers.get('content-type'), /text\/plain/);
    });
    it('has X-Powered-By header (slow drip adds it)', () => {
      assert.ok(response.headers.get('x-powered-by'));
    });
  });

  // .git path
  describe('.git path', () => {
    let response;
    before(() => { response = tarpit(makeRequest('/.git/config')); });

    it('returns a Response', () => {
      assert.ok(response instanceof Response);
    });
    it('has text/plain Content-Type', () => {
      assert.match(response.headers.get('content-type'), /text\/plain/);
    });
  });

  // xmlrpc.php
  describe('xmlrpc.php', () => {
    let response;
    before(() => { response = tarpit(makeRequest('/xmlrpc.php')); });

    it('returns a Response', () => {
      assert.ok(response instanceof Response);
    });
    it('has text/xml Content-Type', () => {
      assert.match(response.headers.get('content-type'), /text\/xml/);
    });
  });

  // wp-probe (other /wp-* paths)
  describe('wp-probe catch-all', () => {
    it('returns a Response for /wp-cron.php', () => {
      assert.ok(tarpit(makeRequest('/wp-cron.php')) instanceof Response);
    });
    it('returns a Response for /wp-includes/js/jquery.js', () => {
      assert.ok(tarpit(makeRequest('/wp-includes/js/jquery.js')) instanceof Response);
    });
  });

  // SQL probe
  describe('SQL probe', () => {
    let response;
    before(() => { response = tarpit(makeRequest('/backup.sql')); });

    it('returns a Response', () => {
      assert.ok(response instanceof Response);
    });
    it('has text/plain Content-Type', () => {
      assert.match(response.headers.get('content-type'), /text\/plain/);
    });
  });

  // phpmyadmin
  describe('phpmyadmin probe', () => {
    it('returns a Response for /phpmyadmin/', () => {
      assert.ok(tarpit(makeRequest('/phpmyadmin/')) instanceof Response);
    });
  });

  // shell.php
  describe('shell probe', () => {
    it('returns a Response for /shell.php', () => {
      assert.ok(tarpit(makeRequest('/shell.php')) instanceof Response);
    });
  });

  // config probe
  describe('config probe', () => {
    it('returns a Response for /config.php', () => {
      assert.ok(tarpit(makeRequest('/config.php')) instanceof Response);
    });
  });
});

// ---------------------------------------------------------------------------
// 3. onTrap callback
// ---------------------------------------------------------------------------

describe('onTrap callback', () => {
  it('is invoked with (type, path, ip, request) for wp-login GET', () => {
    let called = null;
    tarpit(makeRequest('/wp-login.php'), {
      onTrap: (type, path, ip, req) => { called = { type, path, ip, req }; },
    });
    assert.ok(called, 'onTrap was not called');
    assert.equal(called.type, 'login-page');
    assert.equal(called.path, '/wp-login.php');
    assert.ok(called.req instanceof Request);
  });

  it('receives ip from cf-connecting-ip header', () => {
    let capturedIp = null;
    tarpit(makeRequest('/wp-login.php', { headers: { 'cf-connecting-ip': '1.2.3.4' } }), {
      onTrap: (type, path, ip) => { capturedIp = ip; },
    });
    assert.equal(capturedIp, '1.2.3.4');
  });

  it('is invoked with type=admin for /wp-admin', () => {
    let capturedType = null;
    tarpit(makeRequest('/wp-admin'), {
      onTrap: (type) => { capturedType = type; },
    });
    assert.equal(capturedType, 'admin');
  });

  it('is invoked with type=env for /.env', () => {
    let capturedType = null;
    tarpit(makeRequest('/.env'), {
      onTrap: (type) => { capturedType = type; },
    });
    assert.equal(capturedType, 'env');
  });

  it('is invoked with type=git for /.git/config', () => {
    let capturedType = null;
    tarpit(makeRequest('/.git/config'), {
      onTrap: (type) => { capturedType = type; },
    });
    assert.equal(capturedType, 'git');
  });

  it('is invoked with type=xmlrpc for /xmlrpc.php', () => {
    let capturedType = null;
    tarpit(makeRequest('/xmlrpc.php'), {
      onTrap: (type) => { capturedType = type; },
    });
    assert.equal(capturedType, 'xmlrpc');
  });

  it('is invoked with type=wp-probe for /wp-cron.php', () => {
    let capturedType = null;
    tarpit(makeRequest('/wp-cron.php'), {
      onTrap: (type) => { capturedType = type; },
    });
    assert.equal(capturedType, 'wp-probe');
  });

  it('is invoked with type=probe for /backup.sql', () => {
    let capturedType = null;
    tarpit(makeRequest('/backup.sql'), {
      onTrap: (type) => { capturedType = type; },
    });
    assert.equal(capturedType, 'probe');
  });

  it('is invoked with type=probe for /shell.php', () => {
    let capturedType = null;
    tarpit(makeRequest('/shell.php'), {
      onTrap: (type) => { capturedType = type; },
    });
    assert.equal(capturedType, 'probe');
  });

  it('is invoked with type=probe for /phpmyadmin/', () => {
    let capturedType = null;
    tarpit(makeRequest('/phpmyadmin/'), {
      onTrap: (type) => { capturedType = type; },
    });
    assert.equal(capturedType, 'probe');
  });

  it('receives correct path argument', () => {
    let capturedPath = null;
    tarpit(makeRequest('/.env.local'), {
      onTrap: (type, path) => { capturedPath = path; },
    });
    assert.equal(capturedPath, '/.env.local');
  });

  it('is NOT invoked for legitimate paths', () => {
    let called = false;
    tarpit(makeRequest('/about'), { onTrap: () => { called = true; } });
    assert.equal(called, false);
  });
});

// ---------------------------------------------------------------------------
// 4. IP extraction
// ---------------------------------------------------------------------------

describe('IP extraction', () => {
  function captureIp(path, headers) {
    let ip = null;
    tarpit(makeRequest(path, { headers }), {
      onTrap: (type, p, capturedIp) => { ip = capturedIp; },
    });
    return ip;
  }

  it('uses cf-connecting-ip when present', () => {
    assert.equal(captureIp('/wp-login.php', { 'cf-connecting-ip': '10.0.0.1' }), '10.0.0.1');
  });

  it('uses x-forwarded-for when cf-connecting-ip absent', () => {
    assert.equal(captureIp('/wp-login.php', { 'x-forwarded-for': '203.0.113.5, 10.0.0.1' }), '203.0.113.5');
  });

  it('x-forwarded-for with single IP (no comma)', () => {
    assert.equal(captureIp('/wp-login.php', { 'x-forwarded-for': '203.0.113.9' }), '203.0.113.9');
  });

  it('uses x-real-ip when cf-connecting-ip and x-forwarded-for absent', () => {
    assert.equal(captureIp('/wp-login.php', { 'x-real-ip': '198.51.100.7' }), '198.51.100.7');
  });

  it('falls back to "unknown" when no IP headers present', () => {
    assert.equal(captureIp('/wp-login.php', {}), 'unknown');
  });

  it('cf-connecting-ip takes priority over x-forwarded-for', () => {
    assert.equal(
      captureIp('/wp-login.php', {
        'cf-connecting-ip': '1.1.1.1',
        'x-forwarded-for': '2.2.2.2',
      }),
      '1.1.1.1'
    );
  });

  it('x-forwarded-for takes priority over x-real-ip', () => {
    assert.equal(
      captureIp('/wp-login.php', {
        'x-forwarded-for': '3.3.3.3',
        'x-real-ip': '4.4.4.4',
      }),
      '3.3.3.3'
    );
  });
});

// ---------------------------------------------------------------------------
// 5. isBotPath export -- standalone usage
// ---------------------------------------------------------------------------

describe('isBotPath standalone export', () => {
  it('is a function', () => {
    assert.equal(typeof isBotPath, 'function');
  });

  it('returns truthy for bot path without calling tarpit', () => {
    assert.ok(isBotPath('/wp-login.php'));
  });

  it('returns falsy for legit path without calling tarpit', () => {
    assert.ok(!isBotPath('/home'));
  });

  it('accepts paths with query strings stripped already', () => {
    // isBotPath takes a pathname, callers strip the query string
    assert.ok(isBotPath('/wp-admin'));
  });
});

// ---------------------------------------------------------------------------
// 6. Express adapter
// ---------------------------------------------------------------------------

describe('expressTarpit()', () => {
  it('returns a function (middleware signature)', () => {
    const mw = expressTarpit();
    assert.equal(typeof mw, 'function');
  });

  it('calls next() for legitimate paths', (_, done) => {
    const mw = expressTarpit();
    const req = {
      path: '/about',
      url: '/about',
      originalUrl: '/about',
      method: 'GET',
      protocol: 'https',
      headers: { host: 'example.com' },
      get: (key) => ({ host: 'example.com' })[key.toLowerCase()] || null,
    };
    mw(req, {}, done); // done is called as next()
  });

  it('does NOT call next() for bot paths', (_, done) => {
    const mw = expressTarpit();
    const writtenChunks = [];
    const res = {
      status(code) { this._status = code; return this; },
      setHeader() {},
      write(chunk) { writtenChunks.push(chunk); },
      end() { done(); },
    };
    const req = {
      path: '/wp-login.php',
      url: '/wp-login.php',
      originalUrl: '/wp-login.php',
      method: 'GET',
      protocol: 'https',
      headers: { host: 'example.com' },
      get: (key) => ({ host: 'example.com' })[key.toLowerCase()] || null,
    };
    mw(req, res, () => {
      done(new Error('next() should NOT have been called for a bot path'));
    });
  });

  it('traps /wp-admin and writes a response', (_, done) => {
    const mw = expressTarpit();
    let headerSet = false;
    const res = {
      status(code) { return this; },
      setHeader(k, v) {
        if (k.toLowerCase() === 'content-type') headerSet = true;
      },
      write() {},
      end() {
        assert.ok(headerSet, 'Content-Type header was never set');
        done();
      },
    };
    const req = {
      path: '/wp-admin',
      url: '/wp-admin',
      originalUrl: '/wp-admin',
      method: 'GET',
      protocol: 'https',
      headers: { host: 'example.com' },
      get: (key) => ({ host: 'example.com' })[key.toLowerCase()] || null,
    };
    mw(req, res, () => {
      done(new Error('next() should NOT have been called'));
    });
  });

  it('invokes onTrap callback for bot paths', (_, done) => {
    let trappedType = null;
    const mw = expressTarpit({
      onTrap: (type) => { trappedType = type; },
    });
    const res = {
      status() { return this; },
      setHeader() {},
      write() {},
      end() {
        assert.ok(trappedType, 'onTrap was not invoked');
        done();
      },
    };
    const req = {
      path: '/wp-login.php',
      url: '/wp-login.php',
      originalUrl: '/wp-login.php',
      method: 'GET',
      protocol: 'https',
      headers: { host: 'example.com' },
      get: (key) => ({ host: 'example.com' })[key.toLowerCase()] || null,
    };
    mw(req, res, () => done(new Error('next() should not be called')));
  });
});

// ---------------------------------------------------------------------------
// 7. Node HTTP adapter
// ---------------------------------------------------------------------------

describe('nodeTarpit()', () => {
  it('returns a function', () => {
    const trap = nodeTarpit();
    assert.equal(typeof trap, 'function');
  });

  it('returns false for legitimate paths', () => {
    const trap = nodeTarpit();
    const req = {
      url: '/about',
      method: 'GET',
      headers: { host: 'example.com' },
    };
    const result = trap(req, {});
    assert.equal(result, false);
  });

  // For bot paths, the adapter returns true synchronously before the slow-drip
  // stream has completed. We verify the boolean return value and that writeHead
  // was called; we do NOT wait for res.end() because slow-drip takes seconds.

  it('returns true for bot paths', () => {
    const trap = nodeTarpit();
    const req = {
      url: '/wp-login.php',
      method: 'GET',
      headers: { host: 'example.com' },
    };
    let headWritten = false;
    const res = {
      writeHead() { headWritten = true; },
      write() {},
      end() {},
    };
    const result = trap(req, res);
    assert.equal(result, true);
    // wp-login returns a non-streaming Response so writeHead fires synchronously
    assert.ok(headWritten, 'writeHead was not called');
  });

  it('returns false for /api/users (legit API route)', () => {
    const trap = nodeTarpit();
    const req = {
      url: '/api/users',
      method: 'GET',
      headers: { host: 'example.com' },
    };
    assert.equal(trap(req, {}), false);
  });

  it('returns true for /.env', () => {
    const trap = nodeTarpit();
    const req = {
      url: '/.env',
      method: 'GET',
      headers: { host: 'example.com' },
    };
    let headWritten = false;
    const res = {
      writeHead() { headWritten = true; },
      write() {},
      end() {},
    };
    const result = trap(req, res);
    assert.equal(result, true);
    assert.ok(headWritten);
  });

  it('returns true for /phpmyadmin/', () => {
    const trap = nodeTarpit();
    const req = {
      url: '/phpmyadmin/',
      method: 'GET',
      headers: { host: 'example.com' },
    };
    let headWritten = false;
    const res = {
      writeHead() { headWritten = true; },
      write() {},
      end() {},
    };
    const result = trap(req, res);
    assert.equal(result, true);
    assert.ok(headWritten);
  });

  it('invokes onTrap callback synchronously for trapped paths', () => {
    let capturedType = null;
    const trap = nodeTarpit({
      onTrap: (type) => { capturedType = type; },
    });
    const req = {
      url: '/.git/HEAD',
      method: 'GET',
      headers: { host: 'example.com' },
    };
    const res = {
      writeHead() {},
      write() {},
      end() {},
    };
    trap(req, res);
    // onTrap is called synchronously inside tarpit() before returning
    assert.equal(capturedType, 'git');
  });

  it('strips query string when evaluating path', () => {
    const trap = nodeTarpit();
    const req = {
      url: '/about?foo=bar',
      method: 'GET',
      headers: { host: 'example.com' },
    };
    assert.equal(trap(req, {}), false);
  });

  it('handles bot path with query string', () => {
    const trap = nodeTarpit();
    const req = {
      url: '/wp-admin?page=plugins',
      method: 'GET',
      headers: { host: 'example.com' },
    };
    let headWritten = false;
    const res = {
      writeHead() { headWritten = true; },
      write() {},
      end() {},
    };
    const result = trap(req, res);
    assert.equal(result, true);
    assert.ok(headWritten);
  });
});
