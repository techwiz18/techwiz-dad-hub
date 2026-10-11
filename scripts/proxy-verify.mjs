// Post-cutover verification: exercises techwiz.dad/forum/* THROUGH the
// Cloudflare edge (Worker route) using direct-IP + SNI, so stale local DNS
// doesn't matter. Read-only except /skin/* (sets a client cookie, no server state).
// Run: node scripts/proxy-verify.mjs
import https from 'node:https';

const EDGE = '104.21.68.128';
let pass = 0;
let fail = 0;

function get(path) {
  return new Promise((resolve) => {
    const req = https.get(
      {
        host: EDGE,
        servername: 'techwiz.dad',
        path,
        headers: { Host: 'techwiz.dad', 'User-Agent': 'hub-proxy-verify' },
        timeout: 20000,
      },
      (res) => {
        let body = '';
        res.on('data', (c) => { body += c; });
        res.on('end', () => resolve({
          status: res.statusCode,
          headers: res.headers,
          body,
        }));
      },
    );
    req.on('timeout', () => { req.destroy(); resolve({ status: 'timeout', headers: {}, body: '' }); });
    req.on('error', (e) => resolve({ status: 'error:' + e.message, headers: {}, body: '' }));
  });
}

function check(name, cond, extra = '') {
  if (cond) { pass++; console.log('PASS', name); }
  else { fail++; console.log('FAIL', name, extra); }
}

// 1. Forum index through proxy
{
  const r = await get('/forum/');
  check('proxy /forum/ -> 200', r.status === 200, `got ${r.status}`);
  check('board index body', r.body.includes('Board Index'));
  const bare = (r.body.match(/(href|src|action)="\/(?!forum\/)/g) || []).length;
  check('no bare root-absolute URLs in HTML', bare === 0, `${bare} found`);
}

// 2. Login page + form action prefixed
{
  const r = await get('/forum/login');
  check('proxy /forum/login -> 200', r.status === 200, `got ${r.status}`);
  // No action attr = posts to current URL (correct under proxy); a bare
  // root-absolute action would be a missed hardcoded URL.
  check('no bare form action', !/action="\/[^f]/.test(r.body) && !/action="\/f(?!orum\/)/.test(r.body));
}

// 3. Real topic
{
  const r = await get('/forum/topic/community-forum-launched.t3');
  check('proxy topic -> 200', r.status === 200, `got ${r.status}`);
}

// 4. Skin switch: redirect + cookie path
{
  const r = await get('/forum/skin/classic');
  check('skin switch redirects', [301, 302, 303].includes(r.status), `got ${r.status}`);
  const loc = r.headers.location ?? '';
  check('redirect stays under /forum/', loc.startsWith('/forum/'), `got ${loc}`);
  const cookies = [].concat(r.headers['set-cookie'] ?? []);
  const scoped = cookies.every((c) => !/;\s*Path=\//.test(c) || /Path=\/forum\//.test(c));
  check('cookie paths scoped', scoped, JSON.stringify(cookies));
}

// 5. Hub passthrough intact (Pages content through the same edge)
{
  const r = await get('/');
  check('apex / still serves hub', r.status === 200 && r.body.includes('techwiz.dad — project hub'), `got ${r.status}`);
}
{
  const r = await get('/projects/');
  check('apex /projects/ intact', r.status === 200, `got ${r.status}`);
}

console.log(`FAILED: ${fail} / ${pass + fail}`);
process.exit(fail ? 1 : 0);
