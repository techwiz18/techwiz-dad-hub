/* Phase 2 (not deployed): serve the forum from techwiz.dad/forum/* via a
 * Cloudflare Worker reverse proxy in front of the LiteSpeed/PHP origin.
 *
 * Deploy (needs a Cloudflare API token — ask the hub maintainer):
 *   1. npm i -g wrangler && wrangler login
 *   2. wrangler deploy workers/forum-proxy.js --name hub-forum-proxy \
 *        --route 'techwiz.dad/forum/*'
 *
 * How it works: strips the /forum prefix before talking to the origin, then
 * rewrites root-absolute URLs back under /forum on the way out (HTML via
 * HTMLRewriter, plus Location and Set-Cookie headers).
 *
 * KNOWN FRAGILITY (why this is phase 2, not phase 1): RetroBB hardcodes
 * root-absolute URLs in templates (see views/layout.php: /assets/*, /login,
 * /skin/*, form actions) and root-absolute redirects (Location: /install.php,
 * redirect('/') in controllers). The rewriter below covers the common cases,
 * but every new absolute URL, JS fetch(), canonical link, and the
 * Referer-based skin/theme switchback needs auditing. The durable fix is
 * RetroBB-native base-path support instead:
 *   - RETROBB_BASE_PATH config (e.g. '/forum')
 *   - Router::currentPath() strips the prefix before dispatch
 *   - a url() helper used by all templates/redirects/cookies (Path=/forum)
 * Until that lands, this worker is a trial balloon, not a foundation.
 */

const ORIGIN = 'https://forum.techwiz.dad';
const PREFIX = '/forum';

class PrefixAttribute {
  constructor(attr) {
    this.attr = attr;
  }
  element(el) {
    const v = el.getAttribute(this.attr);
    if (v && v.startsWith('/')) el.setAttribute(this.attr, PREFIX + v);
  }
}

export default {
  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname !== PREFIX && !url.pathname.startsWith(PREFIX + '/')) {
      return fetch(req); // not ours — shouldn't happen given the route
    }

    // Strip prefix for the origin: /forum/topic/x -> /topic/x
    const rest = url.pathname === PREFIX ? '/' : url.pathname.slice(PREFIX.length);
    const target = new URL(ORIGIN + rest + url.search);
    const upstream = await fetch(
      new Request(target.toString(), {
        method: req.method,
        headers: req.headers,
        body: req.body,
        redirect: 'manual',
      }),
    );

    const headers = new Headers(upstream.headers);

    // Redirects: /login -> /forum/login (leave absolute forum.techwiz.dad URLs; same trip)
    const loc = headers.get('Location');
    if (loc && loc.startsWith('/')) headers.set('Location', PREFIX + loc);

    // Session cookies are Path=/ — scope them under the proxy prefix.
    // (Same-domain bonus: hub JS can read non-HttpOnly forum prefs later.)
    const cookies = headers.getSetCookie?.() ?? [];
    if (cookies.length) {
      headers.delete('Set-Cookie');
      for (const c of cookies) {
        headers.append('Set-Cookie', c.replace(/;\s*Path=\//i, `; Path=${PREFIX}/`));
      }
    }

    const type = headers.get('Content-Type') ?? '';
    if (!type.includes('text/html')) return new Response(upstream.body, { status: upstream.status, headers });

    return new HTMLRewriter()
      .on('a[href^="/"], link[href^="/"], area[href^="/"]', new PrefixAttribute('href'))
      .on('img[src^="/"], script[src^="/"], source[src^="/"], video[poster^="/"]', new PrefixAttribute('src'))
      .on('form[action^="/"]', new PrefixAttribute('action'))
      .transform(new Response(upstream.body, { status: upstream.status, headers }));
  },
};
