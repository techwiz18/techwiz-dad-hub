import sys
from playwright.sync_api import sync_playwright

url = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:4321/'
out = sys.argv[2] if len(sys.argv) > 2 else 'hub-shot.png'
width = int(sys.argv[3]) if len(sys.argv) > 3 else 1280
setup = sys.argv[4] if len(sys.argv) > 4 else ''

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': width, 'height': 900})
    page.goto(url, wait_until='networkidle')
    if setup:
        page.evaluate(setup)
        page.wait_for_timeout(400)
    page.screenshot(path=out, full_page=True)
    browser.close()
print('saved', out)
