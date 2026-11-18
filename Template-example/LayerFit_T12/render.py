"""Optional Playwright renderer, tested with system Chromium.
Usage: python -m pip install playwright && python render.py
If Playwright reports missing browsers, run: playwright install chromium
"""
import asyncio, json, base64, shutil
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent
SIZES = {'square': (1080,1080), 'portrait': (1080,1350), 'story': (1080,1920)}

async def main():
    cfg=json.loads((ROOT/'creative.example.json').read_text(encoding='utf-8'))
    html=(ROOT/'index.html').read_text(encoding='utf-8')
    css=(ROOT/'styles.css').read_text(encoding='utf-8')
    js=(ROOT/'script.js').read_text(encoding='utf-8')
    hero='data:image/jpeg;base64,'+base64.b64encode((ROOT/'assets/reference-hero.jpg').read_bytes()).decode()
    html=(html.replace('<link rel="stylesheet" href="styles.css">',f'<style>{css}</style>')
              .replace('<script src="script.js" defer></script>','')
              .replace('src="assets/reference-hero.jpg"',f'src="{hero}"')
              .replace('</body>',f'<script>{js}</script></body>'))
    (ROOT/'previews').mkdir(exist_ok=True)
    async with async_playwright() as playwright:
        args={'headless': True, 'args':['--no-sandbox']}
        path=shutil.which('chromium') or shutil.which('google-chrome')
        if path: args['executable_path']=path
        browser=await playwright.chromium.launch(**args)
        try:
            for fmt,(w,h) in SIZES.items():
                page=await browser.new_page(viewport={'width':w,'height':h},device_scale_factor=1)
                try:
                    await page.set_content(html,wait_until='load')
                    result=await page.evaluate('(data) => window.setCreative(data)',{**cfg,'format':fmt,'heroImageUrl':hero})
                    if not result['ok']: raise RuntimeError(f'Asset not loaded: {fmt}')
                    await page.screenshot(path=str(ROOT/'previews'/f't12-{fmt}.png'))
                    print(f'Rendered {fmt}: {w}x{h}')
                finally: await page.close()
        finally: await browser.close()

if __name__=='__main__': asyncio.run(main())
