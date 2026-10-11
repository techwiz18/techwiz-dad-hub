# Captures all 6 RetroBB skin x theme combos of the live board index
# into the hub gallery slots. Shoots via the techwiz.dad/forum subpath
# (Path=/forum cookies only match there) with the hub-style custom header
# hidden. Run: python3 scripts/forum-shots.py
import os
from playwright.sync_api import sync_playwright

# Local DNS is stale for the apex; pin it to a Cloudflare edge IP.
RESOLVER_RULE = 'MAP techwiz.dad 104.21.68.128'
BASE = os.environ.get('FORUM_URL', 'https://techwiz.dad/forum').rstrip('/')
OUT = 'public/screenshots'
WIDTH, HEIGHT = 1020, 600
HIDE_CSS = '.site-header{display:none!important}'

combos = [
    ('classic', 'light'),
    ('classic', 'dark'),
    ('midnight', 'light'),
    ('midnight', 'dark'),
    ('silver', 'light'),
    ('silver', 'dark'),
]

with sync_playwright() as p:
    browser = p.chromium.launch(args=[f'--host-resolver-rules={RESOLVER_RULE}'])
    for skin, theme in combos:
        # Fresh profile per combo + seed cookies directly: avoids the
        # /skin/* + /theme/* route quirks AND the header sync script
        # reverting server state from stale localStorage mid-sequence.
        ctx = browser.new_context(viewport={'width': WIDTH, 'height': HEIGHT})
        ctx.add_cookies([
            {'name': 'retrobb_skin', 'value': skin, 'domain': 'techwiz.dad', 'path': '/forum'},
            {'name': 'retrobb_theme', 'value': theme, 'domain': 'techwiz.dad', 'path': '/forum'},
        ])
        page = ctx.new_page()
        page.goto(f'{BASE}/', wait_until='networkidle')
        page.wait_for_timeout(500)
        page.add_style_tag(content=HIDE_CSS)
        page.wait_for_timeout(200)
        dest = f'{OUT}/retrobb-{skin}-{theme}.png'
        page.screenshot(path=dest)
        print('saved', dest, '|', page.get_attribute('body', 'class'))
        ctx.close()
    browser.close()
