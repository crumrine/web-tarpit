// ============================================================================
// Tarpit Stats Dashboard
// Shows bot trap analytics across all domain-sites
// ============================================================================

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/stats') {
      return handleApiStats(env);
    }

    if (url.pathname === '/api/recent') {
      return handleApiRecent(env, url);
    }

    if (url.pathname === '/api/sites') {
      return handleApiSites(env);
    }

    return new Response(dashboard(), {
      headers: { 'Content-Type': 'text/html; charset=UTF-8' },
    });
  },
};

async function handleApiStats(env) {
  const queries = await Promise.all([
    env.TARPIT_DB.prepare("SELECT COUNT(*) as total FROM tarpit_log").first(),
    env.TARPIT_DB.prepare("SELECT COUNT(DISTINCT ip) as unique_ips FROM tarpit_log").first(),
    env.TARPIT_DB.prepare("SELECT COUNT(DISTINCT site) as sites FROM tarpit_log").first(),
    env.TARPIT_DB.prepare(`
      SELECT type, COUNT(*) as count FROM tarpit_log
      GROUP BY type ORDER BY count DESC
    `).all(),
    env.TARPIT_DB.prepare(`
      SELECT DATE(ts) as day, COUNT(*) as count FROM tarpit_log
      WHERE ts >= datetime('now', '-30 days')
      GROUP BY DATE(ts) ORDER BY day
    `).all(),
    env.TARPIT_DB.prepare(`
      SELECT site, COUNT(*) as count FROM tarpit_log
      GROUP BY site ORDER BY count DESC LIMIT 20
    `).all(),
    env.TARPIT_DB.prepare(`
      SELECT ip, COUNT(*) as count FROM tarpit_log
      GROUP BY ip ORDER BY count DESC LIMIT 20
    `).all(),
    env.TARPIT_DB.prepare(`
      SELECT path, COUNT(*) as count FROM tarpit_log
      GROUP BY path ORDER BY count DESC LIMIT 20
    `).all(),
    // Estimate wasted time: each slow-drip averages ~15s, login pages ~10s idle
    env.TARPIT_DB.prepare(`
      SELECT
        SUM(CASE WHEN type IN ('env','git','xmlrpc','wp-probe','probe') THEN 15
                  WHEN type = 'login' THEN 12
                  WHEN type = 'admin' THEN 5
                  ELSE 8 END) as wasted_seconds
      FROM tarpit_log
    `).first(),
    env.TARPIT_DB.prepare(`
      SELECT COUNT(*) as today FROM tarpit_log
      WHERE ts >= datetime('now', '-24 hours')
    `).first(),
    env.TARPIT_DB.prepare(`
      SELECT MIN(ts) as first_log FROM tarpit_log
    `).first(),
  ]);

  return Response.json({
    total: queries[0]?.total || 0,
    unique_ips: queries[1]?.unique_ips || 0,
    sites: queries[2]?.sites || 0,
    by_type: queries[3]?.results || [],
    by_day: queries[4]?.results || [],
    top_sites: queries[5]?.results || [],
    top_ips: queries[6]?.results || [],
    top_paths: queries[7]?.results || [],
    wasted_seconds: queries[8]?.wasted_seconds || 0,
    today: queries[9]?.today || 0,
    first_log: queries[10]?.first_log || null,
  });
}

async function handleApiRecent(env, url) {
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);
  const site = url.searchParams.get('site');

  let query, params;
  if (site) {
    query = "SELECT * FROM tarpit_log WHERE site = ? ORDER BY ts DESC LIMIT ?";
    params = [site, limit];
  } else {
    query = "SELECT * FROM tarpit_log ORDER BY ts DESC LIMIT ?";
    params = [limit];
  }

  const results = await env.TARPIT_DB.prepare(query).bind(...params).all();
  return Response.json(results?.results || []);
}

async function handleApiSites(env) {
  const results = await env.TARPIT_DB.prepare(`
    SELECT site, COUNT(*) as total,
           COUNT(DISTINCT ip) as unique_ips,
           MAX(ts) as last_hit
    FROM tarpit_log GROUP BY site ORDER BY total DESC
  `).all();
  return Response.json(results?.results || []);
}

function formatDuration(seconds) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function dashboard() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex,nofollow">
<title>Tarpit Stats -- Bot Trap Analytics</title>
<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --bg: #09090b; --surface: #111114; --surface-2: #18181b;
  --border: #27272a; --text: #e4e4e7; --text-dim: #71717a; --text-bright: #fafafa;
  --accent: #6366f1; --accent-dim: rgba(99,102,241,0.12);
  --green: #34d399; --green-dim: rgba(52,211,153,0.12);
  --red: #f87171; --red-dim: rgba(248,113,113,0.12);
  --yellow: #fbbf24; --yellow-dim: rgba(251,191,36,0.12);
  --cyan: #22d3ee; --cyan-dim: rgba(34,211,238,0.12);
  --radius: 10px; --mono: "SF Mono","Cascadia Code","Fira Code",Consolas,monospace;
}
html { font-size: 15px; }
body { font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",Inter,sans-serif; background: var(--bg); color: var(--text); line-height: 1.6; padding: 24px; max-width: 1200px; margin: 0 auto; }
h1 { font-size: 1.8rem; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 4px; }
h1 span { color: var(--accent); }
.subtitle { color: var(--text-dim); margin-bottom: 28px; font-size: 0.9rem; }
.cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 28px; }
.card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; }
.card .value { font-size: 2rem; font-weight: 800; font-family: var(--mono); letter-spacing: -1px; }
.card .label { font-size: 0.8rem; color: var(--text-dim); margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
.card.accent .value { color: var(--accent); }
.card.green .value { color: var(--green); }
.card.red .value { color: var(--red); }
.card.yellow .value { color: var(--yellow); }
.card.cyan .value { color: var(--cyan); }
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 28px; }
@media (max-width: 768px) { .grid-2 { grid-template-columns: 1fr; } }
.panel { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; }
.panel h2 { font-size: 1rem; font-weight: 700; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
.panel h2 .icon { font-size: 1.1rem; }
table { width: 100%; border-collapse: collapse; }
th { text-align: left; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-dim); padding: 8px 10px; border-bottom: 1px solid var(--border); }
td { padding: 7px 10px; border-bottom: 1px solid var(--border); font-size: 0.85rem; font-family: var(--mono); }
tr:last-child td { border-bottom: none; }
.bar-wrap { display: flex; align-items: center; gap: 10px; }
.bar { height: 6px; background: var(--accent); border-radius: 3px; min-width: 4px; }
.bar.green { background: var(--green); }
.bar.red { background: var(--red); }
.bar.yellow { background: var(--yellow); }
.type-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; }
.type-login { background: var(--red-dim); color: var(--red); }
.type-env { background: var(--yellow-dim); color: var(--yellow); }
.type-admin { background: var(--accent-dim); color: var(--accent); }
.type-probe { background: var(--cyan-dim); color: var(--cyan); }
.type-git { background: var(--green-dim); color: var(--green); }
.type-xmlrpc { background: var(--red-dim); color: var(--red); }
.type-wp-probe { background: var(--yellow-dim); color: var(--yellow); }
.chart { height: 160px; display: flex; align-items: flex-end; gap: 2px; padding-top: 20px; }
.chart-bar { flex: 1; background: var(--accent); border-radius: 3px 3px 0 0; min-height: 2px; position: relative; transition: background 0.15s; cursor: default; }
.chart-bar:hover { background: #818cf8; }
.chart-bar .tip { display: none; position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); background: var(--surface-2); border: 1px solid var(--border); border-radius: 6px; padding: 4px 8px; font-size: 0.7rem; white-space: nowrap; font-family: var(--mono); color: var(--text-bright); z-index: 10; }
.chart-bar:hover .tip { display: block; }
.chart-labels { display: flex; gap: 2px; margin-top: 6px; }
.chart-labels span { flex: 1; text-align: center; font-size: 0.6rem; color: var(--text-dim); font-family: var(--mono); }
.recent-log { max-height: 400px; overflow-y: auto; }
.recent-log table { font-size: 0.8rem; }
.loading { text-align: center; padding: 60px; color: var(--text-dim); }
.footer { text-align: center; margin-top: 40px; padding: 20px; color: var(--text-dim); font-size: 0.8rem; border-top: 1px solid var(--border); }
</style>
</head>
<body>
<h1><span>Tarpit</span> Stats</h1>
<p class="subtitle">Bot trap analytics across all sites. Every hit below is a scanner wasting its time on fake WordPress pages, honeypot credentials, and slow-drip responses.</p>

<div id="app" class="loading">Loading stats...</div>

<div class="footer">
  Tarpit -- wasting bot time so they leave real targets alone.
</div>

<script>
const $ = s => document.querySelector(s);

function fmt(n) {
  if (n >= 1000000) return (n/1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n/1000).toFixed(1) + 'K';
  return n.toString();
}

function duration(secs) {
  if (!secs) return '0s';
  if (secs < 60) return secs + 's';
  if (secs < 3600) return Math.floor(secs/60) + 'm ' + (secs%60) + 's';
  const h = Math.floor(secs/3600);
  const m = Math.floor((secs%3600)/60);
  if (h < 24) return h + 'h ' + m + 'm';
  const d = Math.floor(h/24);
  return d + 'd ' + (h%24) + 'h';
}

function typeBadge(type) {
  const cls = 'type-' + type.replace('_','-');
  return '<span class="type-badge ' + cls + '">' + type + '</span>';
}

function barRow(label, count, max, color) {
  const pct = max > 0 ? (count / max * 100) : 0;
  return '<tr><td>' + label + '</td><td class="bar-wrap"><div class="bar ' + (color||'') + '" style="width:' + Math.max(pct,2) + '%"></div><span style="color:var(--text-dim);font-size:0.8rem">' + fmt(count) + '</span></td></tr>';
}

async function load() {
  try {
    const [stats, recent] = await Promise.all([
      fetch('/api/stats').then(r => r.json()),
      fetch('/api/recent?limit=100').then(r => r.json()),
    ]);
    render(stats, recent);
  } catch(e) {
    $('#app').innerHTML = '<div class="panel"><h2>No data yet</h2><p style="color:var(--text-dim)">The tarpit is deployed but no bots have been caught yet. Check back once the TARPIT_DB binding is live on your sites.</p></div>';
  }
}

function render(s, recent) {
  const maxType = Math.max(...(s.by_type.map(t => t.count) || [1]));
  const maxSite = Math.max(...(s.top_sites.map(t => t.count) || [1]));
  const maxPath = Math.max(...(s.top_paths.map(t => t.count) || [1]));
  const maxDay = Math.max(...(s.by_day.map(d => d.count) || [1]));

  let html = '';

  // Summary cards
  html += '<div class="cards">';
  html += '<div class="card accent"><div class="value">' + fmt(s.total) + '</div><div class="label">Total Traps Sprung</div></div>';
  html += '<div class="card red"><div class="value">' + fmt(s.unique_ips) + '</div><div class="label">Unique Bot IPs</div></div>';
  html += '<div class="card green"><div class="value">' + duration(s.wasted_seconds) + '</div><div class="label">Bot Time Wasted</div></div>';
  html += '<div class="card yellow"><div class="value">' + fmt(s.today) + '</div><div class="label">Last 24 Hours</div></div>';
  html += '<div class="card cyan"><div class="value">' + s.sites + '</div><div class="label">Sites Reporting</div></div>';
  html += '</div>';

  // Chart - last 30 days
  if (s.by_day.length > 0) {
    html += '<div class="panel" style="margin-bottom:28px">';
    html += '<h2><span class="icon">&#x1F4C8;</span> Last 30 Days</h2>';
    html += '<div class="chart">';
    s.by_day.forEach(d => {
      const pct = maxDay > 0 ? (d.count / maxDay * 100) : 2;
      html += '<div class="chart-bar" style="height:' + Math.max(pct,2) + '%"><div class="tip">' + d.day + ': ' + d.count + '</div></div>';
    });
    html += '</div>';
    html += '<div class="chart-labels">';
    s.by_day.forEach((d,i) => {
      if (i === 0 || i === s.by_day.length-1 || i === Math.floor(s.by_day.length/2)) {
        html += '<span>' + d.day.substring(5) + '</span>';
      } else {
        html += '<span></span>';
      }
    });
    html += '</div></div>';
  }

  // Attack types + top sites
  html += '<div class="grid-2">';

  html += '<div class="panel"><h2><span class="icon">&#x1F3AF;</span> Attack Types</h2>';
  html += '<table>';
  s.by_type.forEach(t => {
    html += barRow(typeBadge(t.type), t.count, maxType);
  });
  html += '</table></div>';

  html += '<div class="panel"><h2><span class="icon">&#x1F310;</span> Top Targeted Sites</h2>';
  html += '<table>';
  s.top_sites.forEach(t => {
    html += barRow(t.site, t.count, maxSite, 'green');
  });
  html += '</table></div>';

  html += '</div>';

  // Top paths + top IPs
  html += '<div class="grid-2">';

  html += '<div class="panel"><h2><span class="icon">&#x1F4C2;</span> Top Probed Paths</h2>';
  html += '<table>';
  s.top_paths.forEach(t => {
    html += barRow(t.path, t.count, maxPath, 'yellow');
  });
  html += '</table></div>';

  html += '<div class="panel"><h2><span class="icon">&#x1F916;</span> Top Bot IPs</h2>';
  html += '<table>';
  s.top_ips.slice(0, 15).forEach(t => {
    html += barRow(t.ip, t.count, s.top_ips[0]?.count || 1, 'red');
  });
  html += '</table></div>';

  html += '</div>';

  // Recent log
  html += '<div class="panel" style="margin-top:28px"><h2><span class="icon">&#x1F4DC;</span> Recent Catches</h2>';
  html += '<div class="recent-log"><table>';
  html += '<tr><th>Time</th><th>Site</th><th>Type</th><th>Path</th><th>IP</th></tr>';
  recent.forEach(r => {
    const time = r.ts ? new Date(r.ts + 'Z').toLocaleString() : '--';
    html += '<tr>';
    html += '<td style="font-size:0.75rem;white-space:nowrap">' + time + '</td>';
    html += '<td>' + (r.site || '--') + '</td>';
    html += '<td>' + typeBadge(r.type || '--') + '</td>';
    html += '<td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + (r.path || '') + '">' + (r.path || '--') + '</td>';
    html += '<td>' + (r.ip || '--') + '</td>';
    html += '</tr>';
  });
  html += '</table></div></div>';

  if (s.first_log) {
    html += '<p style="text-align:center;margin-top:16px;color:var(--text-dim);font-size:0.8rem">Collecting data since ' + s.first_log + '</p>';
  }

  $('#app').innerHTML = html;
}

load();
// Refresh every 60s
setInterval(load, 60000);
</script>
</body>
</html>`;
}
