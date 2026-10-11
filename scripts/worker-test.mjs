// Tests workers/forum-proxy.js against the LIVE origin (read-only GETs).
// Run: node scripts/worker-test.mjs
import worker, { mapPath } from '../workers/forum-proxy.js';

let pass = 0;
let fail = 0;
function check(name, cond, extra = '') {
  if (cond) { pass++; console.log('PASS', name); }
  else { fail++; console.log('FAIL', name, extra); }
}

// 1. Pure path mapping
check('map /forum -> /', mapPath('/forum') === '/');
check('map /forum/ -> /', mapPath('/forum/') === '/');
check('map /forum/topic/x -> /topic/x', mapPath('/forum/topic/x') === '/topic/x');
check('map /forum/forum/x strips one', mapPath('/forum/forum/x') === '/forum/x');
check('map /other -> null', mapPath('/other') === null);
check('map / -> null', mapPath('/') === null);

// 2. Live proxied fetches (origin dual-serves; these prove the forward path)
async function proxied(path) {
  const res = await worker.fetch(new Request(`https://techwiz.dad${path}`));
  const text = res.status === 200 ? await res.text() : '';
  return { res, text };
}

{
  const { res, text } = await proxied('/forum/');
  check('GET /forum/ -> 200', res.status === 200, `got ${res.status}`);
  check('board index body', text.includes('Board Index'));
}
{
  const { res, text } = await proxied('/forum/members');
  check('GET /forum/members -> 200', res.status === 200, `got ${res.status}`);
  check('members body', /member/i.test(text));
}
{
  // redirect path exercises the Location guard (skin switch redirects back)
  const res = await worker.fetch(new Request('https://techwiz.dad/forum/skin/classic'));
  const loc = res.headers.get('Location');
  check('skin switch redirect preserved', [301, 302, 303, 307, 308].includes(res.status), `got ${res.status}`);
  check('no double prefix in Location', !loc || !loc.startsWith('/forum/forum'), `got ${loc}`);
}
{
  const { res } = await proxied('/forum/sitemap.xml');
  check('GET /forum/sitemap.xml -> 200', res.status === 200, `got ${res.status}`);
}

console.log(`FAILED: ${fail} / ${pass + fail}`);
process.exit(fail ? 1 : 0);
