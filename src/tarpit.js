// ============================================================================
// WEB-TARPIT - Bot trap for any JavaScript server
//
// Uses the Web Standard Request/Response API. Works natively on:
// Cloudflare Workers, Deno, Bun, Node 18+, Next.js, Hono, SvelteKit
//
// For Express/Fastify, use the included adapter (see adapters.js).
//
// Usage:
//   import { tarpit } from 'web-tarpit';
//   const trap = tarpit(request);
//   if (trap) return trap;
// ============================================================================

const BOT_PATHS = [
  '/wp-login.php', '/wp-admin', '/wp-admin/', '/wp-includes/', '/wp-content/',
  '/wp-config.php', '/wp-config.bak', '/wp-json/', '/xmlrpc.php',
  '/.env', '/.env.bak', '/.env.local', '/.env.production',
  '/.git/config', '/.git/HEAD', '/.DS_Store',
  '/admin/', '/administrator/', '/admin.php', '/login', '/login.php',
  '/phpmyadmin/', '/pma/', '/myadmin/',
  '/config.php', '/configuration.php', '/settings.php',
  '/backup.sql', '/dump.sql', '/database.sql', '/db.sql',
  '/server-status', '/server-info', '/.htaccess', '/.htpasswd',
  '/cgi-bin/', '/shell.php', '/cmd.php', '/eval.php',
  '/vendor/phpunit/', '/solr/', '/actuator/', '/api/v1/debug',
];

function isBotPath(path) {
  const lower = path.toLowerCase();
  if (lower.startsWith('/wp-')) return true;
  return BOT_PATHS.some(p => lower === p.toLowerCase() || lower.startsWith(p.toLowerCase()));
}

// --- Fake pages ---

function wpLoginPage(host) {
  return `<!DOCTYPE html>
<html lang="en-US">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex,nofollow">
<title>Log In &lsaquo; ${host} &#8212; WordPress</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#f1f1f1;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif;font-size:13px;color:#3c434a}
.login{width:320px;margin:0 auto;padding:8% 0 0}
.login h1{text-align:center;margin-bottom:24px}
.login h1 a{font-size:0;display:inline-block;width:84px;height:84px;background:url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><circle cx="200" cy="200" r="180" fill="%232271b1"/><text x="200" y="240" font-family="sans-serif" font-size="200" fill="white" text-anchor="middle">W</text></svg>') no-repeat center;background-size:84px}
#loginform{background:#fff;border:1px solid #c3c4c7;border-radius:4px;padding:26px 24px;box-shadow:0 1px 3px rgba(0,0,0,.04)}
label{display:block;margin-bottom:3px;font-weight:600;font-size:14px}
input[type=text],input[type=password]{width:100%;padding:4px 8px;font-size:24px;border:1px solid #8c8f94;border-radius:4px;margin-bottom:16px;line-height:1.3}
input[type=text]:focus,input[type=password]:focus{border-color:#2271b1;box-shadow:0 0 0 1px #2271b1;outline:none}
.forgetmenot{margin-bottom:16px}
.forgetmenot label{font-weight:400;font-size:13px;display:flex;align-items:center;gap:6px}
#wp-submit{background:#2271b1;border:1px solid #2271b1;color:#fff;padding:0 12px;font-size:13px;line-height:2.15;min-height:36px;border-radius:3px;cursor:pointer;width:100%;font-weight:600}
#wp-submit:hover{background:#135e96}
.login #nav{margin:16px 0;text-align:center}
.login #nav a{color:#50575e;font-size:13px}
#login_error{background:#fcf0f1;border:1px solid #d63638;border-left-width:4px;border-radius:4px;padding:12px;margin-bottom:16px;color:#d63638}
.spinner{display:none;margin:12px auto;width:24px;height:24px;border:3px solid #c3c4c7;border-top-color:#2271b1;border-radius:50%;animation:spin .6s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
#login_error.show,.spinner.show{display:block}
</style>
</head>
<body class="login">
<div class="login">
<h1><a href="https://wordpress.org/" title="Powered by WordPress"></a></h1>
<div id="login_error"></div>
<form name="loginform" id="loginform" method="post">
<p><label for="user_login">Username or Email Address</label>
<input type="text" name="log" id="user_login" autocomplete="username" value="" size="20" autocapitalize="off" autofocus></p>
<p><label for="user_pass">Password</label>
<input type="password" name="pwd" id="user_pass" autocomplete="current-password" value="" size="20"></p>
<p class="forgetmenot"><label><input name="rememberme" type="checkbox" id="rememberme" value="forever"> Remember Me</label></p>
<div class="spinner" id="spinner"></div>
<p class="submit"><input type="submit" name="wp-submit" id="wp-submit" value="Log In"></p>
</form>
<p id="nav"><a href="/wp-login.php?action=lostpassword">Lost your password?</a></p>
</div>
<script>
document.getElementById('loginform').addEventListener('submit', function(e) {
  e.preventDefault();
  var s = document.getElementById('spinner');
  var err = document.getElementById('login_error');
  var btn = document.getElementById('wp-submit');
  s.className = 'spinner show';
  btn.disabled = true;
  btn.value = 'Verifying...';
  err.className = 'login_error';
  var data = new FormData(this);
  fetch('/wp-admin/admin-ajax.php', {
    method: 'POST',
    body: JSON.stringify({u: data.get('log'), p: data.get('pwd'), t: Date.now()}),
    headers: {'Content-Type': 'application/json'}
  }).catch(function(){});
  setTimeout(function() {
    s.className = 'spinner';
    btn.disabled = false;
    btn.value = 'Log In';
    err.className = 'login_error show';
    var msgs = [
      '<strong>Error:</strong> The password you entered for the username <strong>' + (data.get('log') || 'admin') + '</strong> is incorrect. <a href="/wp-login.php?action=lostpassword">Lost your password?</a>',
      '<strong>Error:</strong> Unknown username. Check again or try your email address.',
      '<strong>Error:</strong> The username <strong>' + (data.get('log') || '') + '</strong> is not registered on this site.',
    ];
    err.innerHTML = msgs[Math.floor(Math.random() * msgs.length)];
  }, 5000 + Math.random() * 10000);
});
</script>
</body>
</html>`;
}

function wpAdminPage(path, host) {
  const pages = [
    'edit.php', 'post-new.php', 'upload.php', 'edit-comments.php',
    'themes.php', 'plugins.php', 'users.php', 'tools.php',
    'options-general.php', 'update-core.php', 'profile.php',
    'edit-tags.php?taxonomy=category', 'edit-tags.php?taxonomy=post_tag',
    'widgets.php', 'nav-menus.php', 'customize.php', 'export.php',
    'import.php', 'site-health.php', 'privacy.php',
  ];
  const current = path.replace('/wp-admin/', '').replace('/wp-admin', '') || 'index.php';
  const menu = pages.map(p =>
    `<li><a href="/wp-admin/${p}" style="color:#f0f0f1;text-decoration:none;display:block;padding:5px 12px;${current===p?'background:#0073aa;':''}font-size:13px">${p.replace('.php','').replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</a></li>`
  ).join('');

  return `<!DOCTYPE html>
<html lang="en-US">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Dashboard &lsaquo; ${host} &#8212; WordPress</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,sans-serif;font-size:13px;color:#3c434a;background:#f0f0f1}
#adminmenu{background:#1d2327;width:160px;position:fixed;left:0;top:0;bottom:0;overflow-y:auto}
#adminmenu ul{list-style:none}#adminmenu h2{color:#fff;padding:14px 12px;font-size:14px;border-bottom:1px solid #2c3338}
#wpcontent{margin-left:160px;padding:20px}
.wrap h1{font-size:23px;font-weight:400;margin-bottom:15px;color:#1d2327}
.notice{background:#fff;border:1px solid #c3c4c7;border-left:4px solid #2271b1;padding:12px;margin-bottom:20px;border-radius:2px}
.card{background:#fff;border:1px solid #c3c4c7;border-radius:4px;padding:20px;margin-bottom:20px}
.card h2{font-size:14px;margin-bottom:10px}.card p{color:#646970;line-height:1.6}.card a{color:#2271b1}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:15px;margin-bottom:20px}
.stat{background:#fff;border:1px solid #c3c4c7;border-radius:4px;padding:15px;text-align:center}
.stat .num{font-size:28px;font-weight:600;color:#2271b1}.stat .label{font-size:12px;color:#646970;margin-top:4px}
table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #c3c4c7;border-radius:4px}
th{background:#f6f7f7;text-align:left;padding:8px 10px;font-size:12px;border-bottom:1px solid #c3c4c7}
td{padding:8px 10px;border-bottom:1px solid #f0f0f1;font-size:13px}td a{color:#2271b1;text-decoration:none}
</style></head>
<body>
<div id="adminmenu"><h2>Dashboard</h2><ul>${menu}</ul></div>
<div id="wpcontent"><div class="wrap">
<h1>Dashboard</h1>
<div class="notice"><p>WordPress 6.7.2 is available! <a href="/wp-admin/update-core.php">Please update now</a>.</p></div>
<div class="stats">
<div class="stat"><div class="num">${47 + Math.floor(Math.random()*200)}</div><div class="label">Posts</div></div>
<div class="stat"><div class="num">${12 + Math.floor(Math.random()*50)}</div><div class="label">Pages</div></div>
<div class="stat"><div class="num">${Math.floor(Math.random()*500)}</div><div class="label">Comments</div></div>
<div class="stat"><div class="num">${3 + Math.floor(Math.random()*10)}</div><div class="label">Plugins</div></div>
</div>
<div class="card"><h2>Recent Activity</h2>
<table><tr><th>Action</th><th>User</th><th>Date</th></tr>
<tr><td>Published "<a href="/wp-admin/post.php?post=142&action=edit">Getting Started Guide</a>"</td><td>admin</td><td>${new Date().toLocaleDateString()}</td></tr>
<tr><td>Updated plugin <a href="/wp-admin/plugins.php">WooCommerce</a></td><td>admin</td><td>${new Date(Date.now()-86400000).toLocaleDateString()}</td></tr>
</table></div>
</div></div>
</body></html>`;
}

// --- Random credential generators ---

function randomString(len, charset) {
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => charset[b % charset.length]).join('');
}

const HEX = '0123456789abcdef';
const ALNUM = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const B64 = ALNUM + '+/';
const PRINTABLE = Array.from({ length: 94 }, (_, i) => String.fromCharCode(33 + i)).join('');
const AWS_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function fakeEnvContent() {
  return `# Application Configuration
APP_NAME=MyApplication
APP_ENV=production
APP_KEY=base64:${randomString(44, B64)}
APP_DEBUG=false
APP_URL=https://localhost

# Database
DB_CONNECTION=mysql
DB_HOST=db-prod-${Math.floor(Math.random()*999)}.internal.example.com
DB_PORT=3306
DB_DATABASE=app_production
DB_USERNAME=app_user_${Math.floor(Math.random()*9999)}
DB_PASSWORD=${randomString(20, PRINTABLE)}

# Redis
REDIS_HOST=redis-${Math.floor(Math.random()*99)}.cache.internal
REDIS_PASSWORD=${randomString(16, PRINTABLE)}
REDIS_PORT=6379

# AWS
AWS_ACCESS_KEY_ID=AKIA${randomString(16, AWS_CHARS)}
AWS_SECRET_ACCESS_KEY=${randomString(40, B64)}
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=app-uploads-prod

# Mail
MAIL_HOST=smtp.mailgun.org
MAIL_PORT=587
MAIL_USERNAME=postmaster@mg.example.com
MAIL_PASSWORD=${randomString(12, PRINTABLE)}

# Stripe
STRIPE_KEY=pk_live_${randomString(24, ALNUM)}
STRIPE_SECRET=sk_live_${randomString(24, ALNUM)}

# JWT
JWT_SECRET=${randomString(32, ALNUM)}
JWT_TTL=3600

# Pusher
PUSHER_APP_ID=${Math.floor(Math.random()*999999)}
PUSHER_APP_KEY=${randomString(20, HEX)}
PUSHER_APP_SECRET=${randomString(20, HEX)}
`;
}

// --- XML-RPC dispatch ---
//
// Most /xmlrpc.php traffic is brute-force credential checking via
// wp.getUsersBlogs (often bundled in system.multicall to dodge per-request rate
// limits) and pingback.ping abuse (SSRF reflection used for DDoS). For the
// auth-checking methods we always return a fake admin success, poisoning the
// attacker's credential database. For pingback we always return a fault so we
// never become a tool in someone else's DDoS chain.

const XMLRPC_FAULT = `<?xml version="1.0" encoding="UTF-8"?>
<methodResponse>
  <fault>
    <value>
      <struct>
        <member><name>faultCode</name><value><int>403</int></value></member>
        <member><name>faultString</name><value><string>XML-RPC services are disabled on this site.</string></value></member>
      </struct>
    </value>
  </fault>
</methodResponse>`;

const XMLRPC_FAULT_PINGBACK = `<?xml version="1.0" encoding="UTF-8"?>
<methodResponse>
  <fault>
    <value>
      <struct>
        <member><name>faultCode</name><value><int>33</int></value></member>
        <member><name>faultString</name><value><string>Pingback is not enabled on this site.</string></value></member>
      </struct>
    </value>
  </fault>
</methodResponse>`;

const FAKE_XMLRPC_METHODS = [
  'system.multicall', 'system.listMethods', 'system.getCapabilities',
  'demo.addTwoNumbers', 'demo.sayHello',
  'pingback.ping', 'pingback.extensions.getPingbacks',
  'mt.publishPost', 'mt.getCategoryList', 'mt.getRecentPostTitles',
  'mt.getPostCategories', 'mt.setPostCategories', 'mt.supportedMethods',
  'mt.supportedTextFilters', 'mt.getTrackbackPings',
  'metaWeblog.newPost', 'metaWeblog.editPost', 'metaWeblog.getPost',
  'metaWeblog.getRecentPosts', 'metaWeblog.getCategories',
  'metaWeblog.newMediaObject', 'metaWeblog.deletePost',
  'metaWeblog.getTemplate', 'metaWeblog.setTemplate', 'metaWeblog.getUsersBlogs',
  'blogger.getUsersBlogs', 'blogger.getUserInfo', 'blogger.getPost',
  'blogger.getRecentPosts', 'blogger.newPost', 'blogger.editPost', 'blogger.deletePost',
  'wp.getUsersBlogs', 'wp.newPost', 'wp.editPost', 'wp.deletePost', 'wp.getPost',
  'wp.getPosts', 'wp.newTerm', 'wp.editTerm', 'wp.deleteTerm', 'wp.getTerm',
  'wp.getTerms', 'wp.getTaxonomy', 'wp.getTaxonomies', 'wp.getUser', 'wp.getUsers',
  'wp.getProfile', 'wp.editProfile', 'wp.getPage', 'wp.getPages', 'wp.newPage',
  'wp.deletePage', 'wp.editPage', 'wp.getPageList', 'wp.getAuthors',
  'wp.getCategories', 'wp.getTags', 'wp.newCategory', 'wp.deleteCategory',
  'wp.suggestCategories', 'wp.uploadFile', 'wp.deleteFile', 'wp.getCommentCount',
  'wp.getPostStatusList', 'wp.getPageStatusList', 'wp.getPageTemplates',
  'wp.getOptions', 'wp.setOptions', 'wp.getComment', 'wp.getComments',
  'wp.deleteComment', 'wp.editComment', 'wp.newComment', 'wp.getCommentStatusList',
  'wp.getMediaItem', 'wp.getMediaLibrary', 'wp.getPostFormats',
  'wp.getPostType', 'wp.getPostTypes', 'wp.getRevisions', 'wp.restoreRevision',
];

// Auth-bearing methods we want to "succeed" for: returning isAdmin=true
// poisons the attacker's credential database.
const AUTH_METHOD_RE = /^(wp\.(getUsersBlogs|getProfile|getOptions|getPosts|getUsers|getUser|getPages|getPage)|metaWeblog\.|blogger\.)/;

function extractMethodName(body) {
  const m = body.match(/<methodName>\s*([^\s<]+)\s*<\/methodName>/);
  return m ? m[1] : '';
}

function extractStringValues(body) {
  const re = /<string>([\s\S]*?)<\/string>/g;
  const out = [];
  let m;
  while ((m = re.exec(body))) out.push(m[1]);
  return out;
}

const XML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' };
function xmlEscape(s) { return String(s).replace(/[&<>"']/g, c => XML_ESCAPES[c]); }

// Multicall inner-call count, used identically by classifier (telemetry) and
// reply builder (response size). Source of truth so the two can't drift.
//
// In real XML-RPC, system.multicall takes an array of structs. Each entry's
// method name is encoded as <member><name>methodName</name>...</member>, NOT
// as a literal <methodName> tag (that form is reserved for the outer call).
// Counting <name>methodName</name> matches actual attacker traffic.
function multicallInnerCount(body) {
  return (body.match(/<name>\s*methodName\s*<\/name>/g) || []).length;
}

function fakeUsersBlogsSuccess(host) {
  const h = xmlEscape(host);
  return `<?xml version="1.0" encoding="UTF-8"?>
<methodResponse>
  <params>
    <param>
      <value>
        <array>
          <data>
            <value>
              <struct>
                <member><name>isAdmin</name><value><boolean>1</boolean></value></member>
                <member><name>url</name><value><string>https://${h}/</string></value></member>
                <member><name>blogid</name><value><string>1</string></value></member>
                <member><name>blogName</name><value><string>${h}</string></value></member>
                <member><name>xmlrpc</name><value><string>https://${h}/xmlrpc.php</string></value></member>
              </struct>
            </value>
          </data>
        </array>
      </value>
    </param>
  </params>
</methodResponse>`;
}

function fakeMulticallSuccess(n, host) {
  const h = xmlEscape(host);
  const entry = `        <value><array><data><value>
          <struct>
            <member><name>isAdmin</name><value><boolean>1</boolean></value></member>
            <member><name>url</name><value><string>https://${h}/</string></value></member>
            <member><name>blogid</name><value><string>1</string></value></member>
            <member><name>blogName</name><value><string>${h}</string></value></member>
            <member><name>xmlrpc</name><value><string>https://${h}/xmlrpc.php</string></value></member>
          </struct>
        </value></data></array></value>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<methodResponse>
  <params>
    <param>
      <value>
        <array>
          <data>
${Array(n).fill(entry).join('\n')}
          </data>
        </array>
      </value>
    </param>
  </params>
</methodResponse>`;
}

function fakeListMethodsResponse() {
  const items = FAKE_XMLRPC_METHODS.map(m => `      <value><string>${xmlEscape(m)}</string></value>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<methodResponse>
  <params>
    <param>
      <value>
        <array>
          <data>
${items}
          </data>
        </array>
      </value>
    </param>
  </params>
</methodResponse>`;
}

function classifyXmlrpc(method, body) {
  if (method === 'system.multicall') {
    return { type: 'xmlrpc-multicall', data: { method, innerCount: multicallInnerCount(body) } };
  }
  if (AUTH_METHOD_RE.test(method)) {
    const strings = extractStringValues(body);
    const creds = strings.length >= 2
      ? { username: strings[strings.length - 2], password: strings[strings.length - 1] }
      : {};
    return { type: 'xmlrpc-bruteforce', data: { method, ...creds } };
  }
  if (method.startsWith('pingback.')) {
    const strings = extractStringValues(body);
    return { type: 'xmlrpc-pingback', data: { method, source: strings[0] || '', target: strings[1] || '' } };
  }
  if (method === 'system.listMethods') {
    return { type: 'xmlrpc-listmethods', data: {} };
  }
  return { type: 'xmlrpc', data: { method } };
}

function buildXmlrpcReply(method, body, host) {
  // Always-success on auth methods is intentional: it floods the attacker's
  // credential database with garbage rather than leaking which passwords
  // failed. A more realistic 1-3% sample-success would be harder for time-
  // based scanners to flag, but at the cost of less poison signal.
  if (method === 'system.multicall') {
    // Telemetry logs the real count; response size is clamped 1..200 so a
    // pathological multicall can't balloon the in-memory string.
    return fakeMulticallSuccess(Math.max(1, Math.min(multicallInnerCount(body), 200)), host);
  }
  if (AUTH_METHOD_RE.test(method)) return fakeUsersBlogsSuccess(host);
  if (method.startsWith('pingback.')) return XMLRPC_FAULT_PINGBACK;
  if (method === 'system.listMethods') return fakeListMethodsResponse();
  return XMLRPC_FAULT;
}

// --- Slow-drip streaming ---
//
// dripMs controls the per-chunk delay:
//   undefined → 100..500ms random (production default)
//   number    → fixed delay; 0 short-circuits to a single write (tests)

async function dripWrite(writer, content, dripMs) {
  const encoder = new TextEncoder();
  if (dripMs === 0) {
    await writer.write(encoder.encode(content));
    return;
  }
  for (let i = 0; i < content.length; i += 3) {
    await writer.write(encoder.encode(content.substring(i, i + 3)));
    const delay = dripMs !== undefined ? dripMs : 100 + Math.random() * 400;
    if (delay > 0) await new Promise(r => setTimeout(r, delay));
  }
}

const DRIP_HEADERS = {
  'Transfer-Encoding': 'chunked',
  'Cache-Control': 'no-store',
  'X-Powered-By': 'PHP/8.2.13',
  'Server': 'Apache/2.4.57',
};

function slowDrip(content, contentType = 'text/plain', dripMs) {
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  (async () => {
    try {
      await dripWrite(writer, content, dripMs);
      await writer.close();
    } catch {
      try { await writer.abort(); } catch {}
    }
  })();
  return new Response(readable, {
    headers: { 'Content-Type': contentType, ...DRIP_HEADERS },
  });
}

function xmlrpcDynamicResponse(request, host, onTrap, ip, ctx, path, dripMs) {
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  (async () => {
    let body = '';
    try { body = await request.text(); } catch {}

    const method = extractMethodName(body);
    const xml = buildXmlrpcReply(method, body, host);

    if (onTrap) {
      try {
        const event = classifyXmlrpc(method, body);
        const p = onTrap(event.type, path, ip, request, event.data);
        if (p && ctx?.waitUntil) ctx.waitUntil(p);
      } catch {}
    }

    try {
      await dripWrite(writer, xml, dripMs);
      await writer.close();
    } catch {
      try { await writer.abort(); } catch {}
    }
  })();

  return new Response(readable, {
    headers: { 'Content-Type': 'text/xml', ...DRIP_HEADERS },
  });
}

// --- Main handler ---

/**
 * Bot trap handler. Returns a Response for known bot paths, or null
 * for legitimate requests. Uses the Web Standard Request/Response API.
 *
 * onTrap event types in 'fault' (default) mode: 'login-page', 'login',
 * 'admin', 'env', 'git', 'wp-probe', 'probe', 'xmlrpc'.
 *
 * 'honeypot' mode adds method-specific xmlrpc events:
 * 'xmlrpc-bruteforce', 'xmlrpc-multicall', 'xmlrpc-pingback',
 * 'xmlrpc-listmethods'.
 *
 * NOTE: 'login' and 'xmlrpc-bruteforce' events include captured plaintext
 * credentials in the data argument. If you persist these (D1, KV, logs),
 * your store becomes a credential database — consider hashing the password
 * field before storage if that's not intentional.
 *
 * @param {Request} request - Web Standard Request object
 * @param {object} [options] - Optional configuration
 * @param {function} [options.onTrap] - Callback: (type, path, ip, request, data?) => void
 * @param {object} [options.ctx] - Execution context with waitUntil (Cloudflare Workers)
 * @param {'fault'|'honeypot'} [options.xmlrpcMode='fault'] - 'fault' returns a slow-dripped
 *   XML-RPC fault for every request (1.0 behavior). 'honeypot' parses POST bodies and returns
 *   method-specific replies: fake admin success for credential-checking methods (poisons
 *   brute-force attempts), wrapped success arrays for system.multicall, fault for pingback.*
 *   (never helps SSRF reflection), method list for system.listMethods. Honeypot mode emits
 *   the 'xmlrpc-*' event types listed above.
 * @param {number} [options.slowDripMs] - Per-chunk delay override for slow-drip responses.
 *   Omit for the default 100..500ms random jitter. 0 disables drip delays entirely; intended
 *   for tests, not production (defeats the trap's purpose).
 * @returns {Response|null}
 */
export function tarpit(request, options = {}) {
  const { onTrap, ctx, xmlrpcMode = 'fault', slowDripMs } = options;
  const url = new URL(request.url);
  const path = url.pathname;
  const host = url.hostname;
  const ip = request.headers.get('cf-connecting-ip')
    || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';

  if (!isBotPath(path)) return null;

  function log(type) {
    if (!onTrap) return;
    const p = onTrap(type, path, ip, request);
    if (p && ctx?.waitUntil) ctx.waitUntil(p);
  }

  const PHP_HEADERS = {
    'Content-Type': 'text/html; charset=UTF-8',
    'X-Powered-By': 'PHP/8.2.13',
    'Server': 'Apache/2.4.57',
  };

  // WordPress login page
  if (path === '/wp-login.php' || path === '/wp-login.php/') {
    if (request.method === 'GET') {
      log('login-page');
      return new Response(wpLoginPage(host), { headers: PHP_HEADERS });
    }
  }

  // Login form submissions
  if (path === '/wp-admin/admin-ajax.php' && request.method === 'POST') {
    // Capture submitted credentials via onTrap
    if (onTrap) {
      const logPromise = request.clone().json().then(data => {
        return onTrap('login', path, ip, request, data);
      }).catch(() => {});
      if (ctx?.waitUntil) ctx.waitUntil(logPromise);
    }
    return slowDrip('{"success":false,"data":{"message":"Invalid username or password."}}', 'application/json', slowDripMs);
  }

  // WordPress admin maze
  if (path.startsWith('/wp-admin')) {
    log('admin');
    return new Response(wpAdminPage(path, host), { headers: PHP_HEADERS });
  }

  // .env file
  if (path.startsWith('/.env')) {
    log('env');
    return slowDrip(fakeEnvContent(), 'text/plain', slowDripMs);
  }

  // .git paths
  if (path.startsWith('/.git')) {
    log('git');
    return slowDrip('[core]\n\trepositoryformatversion = 0\n\tfilemode = true\n\tbare = false\n[remote "origin"]\n\turl = git@github.com:internal/production-app.git\n\tfetch = +refs/heads/*:refs/remotes/origin/*\n[branch "main"]\n\tremote = origin\n\tmerge = refs/heads/main\n', 'text/plain', slowDripMs);
  }

  // xmlrpc.php — opt-in honeypot mode parses POST bodies and returns method-
  // specific replies (fake admin success on auth methods, fault on pingback.*
  // to refuse SSRF reflection). Default 'fault' mode preserves 1.0 behavior.
  if (path === '/xmlrpc.php') {
    if (request.method === 'POST' && xmlrpcMode === 'honeypot') {
      return xmlrpcDynamicResponse(request, host, onTrap, ip, ctx, path, slowDripMs);
    }
    log('xmlrpc');
    return slowDrip(XMLRPC_FAULT, 'text/xml', slowDripMs);
  }

  // WordPress probes
  if (path.startsWith('/wp-')) {
    log('wp-probe');
    return slowDrip('<!DOCTYPE html><html><head><title>Loading...</title></head><body><p>Please wait...</p></body></html>', 'text/html', slowDripMs);
  }

  // Database/config/admin probes
  if (path.endsWith('.sql') || path.endsWith('.bak') || path.includes('config') || path.includes('admin') || path.includes('phpmyadmin') || path.includes('shell') || path.includes('eval')) {
    log('probe');
    return slowDrip('Access denied.\n\nThis incident has been logged and reported.\nYour IP: ' + ip + '\n', 'text/plain', slowDripMs);
  }

  return null;
}

export { isBotPath };
