/* Serves the forum from techwiz.dad/forum/* via a Cloudflare Worker reverse
 * proxy in front of the LiteSpeed/PHP origin (forum.techwiz.dad).
 *
 * Contract with RetroBB (base_path=/forum, dual-serves both path forms):
 *  - Worker strips ONE /forum prefix, forwards remainder + query to the
 *    origin with Host preserved (fetch URL stays forum.techwiz.dad).
 *  - RetroBB emits /forum/-prefixed URLs itself and scopes cookie paths, so
 *    this worker does NO HTML or cookie rewriting — pass-through only, plus
 *    one defensive Location guard for any missed hardcoded redirect.
 *
 * Deploy (needs the Cloudflare account token):
 *   1. npm i -g wrangler && wrangler login   (or CLOUDFLARE_API_TOKEN env)
 *   2. wrangler deploy workers/forum-proxy.js --name hub-forum-proxy \
 *        --route 'techwiz.dad/forum/*'
 *   3. Verify: techwiz.dad/forum/ -> 200 board index, login/logout, post,
 *      skin switch. Then tell RetroBB session to flip board_url and run R10.
 *
 * Local test (no wrangler needed, hits live origin read-only):
 *   node scripts/worker-test.mjs
 */

const ORIGIN = 'https://forum.techwiz.dad';
const PREFIX = '/forum';

// Pure path mapping, exported for unit tests.
export function mapPath(pathname) {
  if (pathname === PREFIX) return '/';
  if (pathname.startsWith(PREFIX + '/')) return pathname.slice(PREFIX.length);
  return null; // not ours
}

export default {
  async fetch(req) {
    const url = new URL(req.url);
    const rest = mapPath(url.pathname);
    if (rest === null) return fetch(req); // shouldn't happen given the route

    const target = new URL(ORIGIN + rest + url.search);
    // Marker header: origin .htaccess exempts tagged requests from the
    // forum.techwiz.dad -> techwiz.dad/forum redirect (else proxied requests
    // would bounce back here and loop). See snippet below.
    const fwdHeaders = new Headers(req.headers);
    fwdHeaders.set('X-Hub-Worker', '1');
    const upstream = await fetch(
      new Request(target.toString(), {
        method: req.method,
        headers: fwdHeaders,
        body: req.body,
        redirect: 'manual',
      }),
    );

    const headers = new Headers(upstream.headers);

    // Safety net only: origin should already emit /forum/-prefixed URLs.
    // Any bare root-absolute Location is a missed hardcoded redirect.
    const loc = headers.get('Location');
    if (loc && loc.startsWith('/') && !loc.startsWith(PREFIX + '/') && loc !== PREFIX) {
      headers.set('Location', PREFIX + loc);
    }

    return new Response(upstream.body, { status: upstream.status, headers });
  },
};
