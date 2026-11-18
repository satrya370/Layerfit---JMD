"""Render T20 with Playwright + Chromium. No network access required.

Usage: python render.py
Requires: pip install playwright
Adjust CHROMIUM_PATH if Chromium is elsewhere.
"""
from pathlib import Path
import asyncio
import base64
import json
import os
import shutil
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent
SIZES = {'square': (1080,1080), 'portrait':(1080,1350), 'story':(1080,1920)}
CHROMIUM_PATH = (os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or shutil.which('google-chrome') or shutil.which('msedge'))


def local_document():
    html = (ROOT / 'index.html').read_text()
    css = (ROOT / 'styles.css').read_text()
    js = (ROOT / 'script.js').read_text()
    png = ROOT / 'assets' / 'waxli-demo-cutout.png'
    data_url = 'data:image/png;base64,' + base64.b64encode(png.read_bytes()).decode()
    # Only the known demo asset is inlined. Production pipelines can pass arbitrary asset URLs as input.
    js = js.replace("imageUrl: 'assets/waxli-demo-cutout.png'", 'imageUrl: ' + json.dumps(data_url))
    html = html.replace('<link rel="stylesheet" href="styles.css">', f'<style>{css}</style>')
    html = html.replace('<script src="script.js" defer></script>', '')
    html = html.replace('src="assets/waxli-demo-cutout.png"', 'src="' + data_url + '"')
    html = html.replace('</body>', '<script>' + js + '</script></body>')
    return html, data_url


async def main():
    html, data_url = local_document()
    cfg = json.loads((ROOT/'creative.example.json').read_text())
    output = ROOT/'previews'; output.mkdir(exist_ok=True)
    async with async_playwright() as pw:
        launch_args = {'headless': True, 'args':['--no-sandbox']}
        if CHROMIUM_PATH: launch_args['executable_path'] = CHROMIUM_PATH
        browser = await pw.chromium.launch(**launch_args)
        try:
            for name,(width,height) in SIZES.items():
                page = await browser.new_page(viewport={'width':width,'height':height}, device_scale_factor=1)
                try:
                    await page.set_content(html,wait_until='load')
                    data = {**cfg, 'imageUrl':data_url, 'format':name}
                    result = await page.evaluate('async d => await window.setCreative(d)',data)
                    if not result['ok']:
                        raise RuntimeError(f'Cannot render {name}: {result}')
                    checks = await page.evaluate('''() => {
                      const rect = x => ({x:x.getBoundingClientRect().x,y:x.getBoundingClientRect().y,
                           width:x.getBoundingClientRect().width,height:x.getBoundingClientRect().height});
                      return {image:rect(document.querySelector('.product-image')),
                        labels:[...document.querySelectorAll('.benefit')].map(el => ({slot:el.className, ...rect(el)}))};
                    }''')
                    filename = output / f't20-{name}.png'
                    await page.screenshot(path=str(filename))
                    print(f'{name}: {width}×{height} -> {filename.name} ({result["benefitCount"]} benefits)')
                    (output/f't20-{name}-bounds.json').write_text(json.dumps(checks,indent=2))
                finally:
                    await page.close()
        finally:
            await browser.close()

if __name__ == '__main__':
    asyncio.run(main())
