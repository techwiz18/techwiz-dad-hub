// Cutover check: proves whether apex /forum/ traffic reaches the Worker
// (via Cloudflare edge) or goes straight to GitHub Pages (worker bypassed).
// Run: node scripts/cutover-check.mjs
import https from 'node:https';

function getViaIp(ip, path) {
  return new Promise((resolve) => {
    const req = https.get(
      {
        host: ip,
        servername: 'techwiz.dad',
        path,
        headers: { Host: 'techwiz.dad', 'User-Agent': 'hub-cutover-check' },
        timeout: 15000,
      },
      (res) => {
        let n = 0;
        res.on('data', (c) => { n += c.length; });
        res.on('end', () => resolve({ status: res.statusCode, bytes: n }));
      },
    );
    req.on('timeout', () => { req.destroy(); resolve({ status: 'timeout', bytes: 0 }); });
    req.on('error', (e) => resolve({ status: 'error:' + e.message, bytes: 0 }));
  });
}

// Direct to Pages origin IP: if this 404s, traffic bypasses the Worker.
const pages = await getViaIp('185.199.108.153', '/forum/');
console.log('apex /forum/ straight to Pages origin ->', pages.status, `(${pages.bytes} bytes)`);

// Through Cloudflare edge (anycast): worker route should answer here.
const edge = await getViaIp('104.21.68.128', '/forum/');
console.log('apex /forum/ via Cloudflare edge ->', edge.status, `(${edge.bytes} bytes)`);

if (pages.status === 404) {
  console.log('DIAGNOSIS: worker bypassed — apex records are DNS-only. Flip them to proxied.');
} else if (edge.status === 200) {
  console.log('DIAGNOSIS: worker route live on the edge.');
} else {
  console.log('DIAGNOSIS: inconclusive, inspect statuses above.');
}
