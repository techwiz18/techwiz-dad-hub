// Confirms the X-Hub-Worker exemption live: a direct origin hit must 301
// (once the .htaccess rule lands) while the same path through the Worker
// returns 200 — proving the header is sent AND honored. If the rule isn't
// in place yet, both return 200 and only code+deploy evidence applies.
// Run: node scripts/header-proof.mjs
import https from 'node:https';

function get(host, ip, path) {
  return new Promise((resolve) => {
    const req = https.get(
      { host: ip, servername: host, path, headers: { Host: host, 'User-Agent': 'hub-header-proof' }, timeout: 20000 },
      (res) => {
        let n = 0;
        res.on('data', (c) => { n += c.length; });
        res.on('end', () => resolve({ status: res.statusCode, location: res.headers.location ?? '(none)' }));
      },
    );
    req.on('timeout', () => { req.destroy(); resolve({ status: 'timeout', location: '' }); });
    req.on('error', (e) => resolve({ status: 'error:' + e.message, location: '' }));
  });
}

// Direct to subdomain (no worker involved) vs through the Worker route.
// Both execute origin .htaccess; the ONLY difference is the X-Hub-Worker
// header the worker adds. So 301-direct + 200-proxied isolates and proves
// the exemption end to end.
const direct = await get('forum.techwiz.dad', '104.21.68.128', '/members');
console.log('direct forum.techwiz.dad/members ->', direct.status, direct.location);

// Through the Worker route on the apex.
const proxied = await get('techwiz.dad', '104.21.68.128', '/forum/members');
console.log('proxied techwiz.dad/forum/members ->', proxied.status, proxied.location);

if (direct.status === 301 && proxied.status === 200) {
  console.log('PROVEN: redirect live on origin AND worker exempt (header sent + honored).');
} else if (direct.status === 200 && proxied.status === 200) {
  console.log('RULE NOT IN PLACE YET: origin serves 200s; header code deployed (see commit), exemption unverifiable until rule lands.');
} else {
  console.log('UNEXPECTED: inspect statuses above.');
}
