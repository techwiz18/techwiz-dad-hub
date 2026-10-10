from playwright.sync_api import sync_playwright

URL = 'http://localhost:4321/projects/retrobb/'
results = []

def src(page):
    return page.get_attribute('.gallery img', 'src')

def check(name, actual, want):
    ok = want in actual
    results.append((name, ok, actual))
    print(('PASS' if ok else 'FAIL'), name, '->', actual)

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 1280, 'height': 900})
    page.goto(URL, wait_until='networkidle')
    page.wait_for_timeout(300)

    check('initial classic + hub theme', src(page), 'retrobb-classic-')

    page.click('[data-theme-btn="dark"]')
    page.wait_for_timeout(200)
    check('hub dark -> classic-dark', src(page), 'retrobb-classic-dark')

    page.click('[data-gskin="midnight"]')
    page.wait_for_timeout(200)
    check('gallery midnight, theme follows hub -> midnight-dark', src(page), 'retrobb-midnight-dark')

    page.click('[data-theme-btn="light"]')
    page.wait_for_timeout(200)
    check('hub light, gallery skin locked -> midnight-light', src(page), 'retrobb-midnight-light')

    page.click('[data-gtheme="dark"]')
    page.wait_for_timeout(200)
    page.click('[data-theme-btn="dark"]')
    page.wait_for_timeout(200)
    check('gallery theme locked dark, hub dark -> midnight-dark', src(page), 'retrobb-midnight-dark')

    page.click('[data-theme-btn="light"]')
    page.wait_for_timeout(200)
    check('gallery theme locked dark, hub light -> stays midnight-dark', src(page), 'retrobb-midnight-dark')

    page.click('[data-gtheme="hub"]')
    page.wait_for_timeout(200)
    check('gallery theme back to hub (light) -> midnight-light', src(page), 'retrobb-midnight-light')

    page.click('[data-gskin="hub"]')
    page.click('[data-skin-btn="silver"]')
    page.wait_for_timeout(200)
    check('gallery skin hub, hub silver -> silver-light', src(page), 'retrobb-silver-light')

    browser.close()

failed = [r for r in results if not r[1]]
print('FAILED:', len(failed), '/', len(results))
raise SystemExit(1 if failed else 0)
