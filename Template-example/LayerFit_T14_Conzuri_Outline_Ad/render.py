"""Render T14 with Playwright and locally installed Chromium.
Install: pip install playwright ; playwright install chromium (or set CHROME_EXECUTABLE).
"""
import asyncio
import os
from pathlib import Path
from PIL import Image
import base64
from html import escape
import shutil
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parent
SIZES={'story':(540,960),'portrait':(540,675),'square':(540,540)}

def creative_document():
    html=(ROOT/'index.html').read_text()
    css=(ROOT/'styles.css').read_text()
    js=(ROOT/'script.js').read_text()
    data='data:image/png;base64,'+base64.b64encode((ROOT/'assets'/'boot-scene.png').read_bytes()).decode()
    js=js.replace("imageUrl:'assets/boot-scene.png'", f"imageUrl:{repr(data)}")
    html=html.replace('<link rel="stylesheet" href="styles.css" />', f'<style>{css}</style>')
    html=html.replace('<script src="script.js" defer></script>','')
    html=html.replace('src="assets/boot-scene.png"',f'src="{data}"')
    html=html.replace('</body>',f'<script>{js}</script></body>')
    return html

async def main():
    async with async_playwright() as p:
        exe=os.environ.get('CHROME_EXECUTABLE') or shutil.which('chromium') or shutil.which('google-chrome')
        launch_options={'headless':True,'args':['--no-sandbox']}
        if exe:launch_options['executable_path']=exe
        browser=await p.chromium.launch(**launch_options)
        try:
            document=creative_document()
            for fmt,(width,height) in SIZES.items():
                page=await browser.new_page(viewport={'width':width,'height':height},device_scale_factor=2)
                await page.set_content(document,wait_until='load')
                await page.evaluate('async f => await window.setCreative({format:f})', fmt)
                state=await page.evaluate('async () => await window.__creativeReady')
                if not state['imageLoaded']:
                    raise RuntimeError(f'{fmt}: image not loaded')
                target=ROOT/'previews'/f't14-{fmt}.png'
                await page.screenshot(path=str(target),full_page=False)
                img=Image.open(target)
                assert img.size==(width*2,height*2), (fmt,img.size)
                print(f'{fmt}: {img.size} {target}')
                await page.close()
            page=await browser.new_page(viewport={'width':714,'height':1458},device_scale_factor=1)
            feed=(ROOT/'feed-preview.html').read_text().replace('<link rel="stylesheet" href="feed-preview.css"/>','<style>'+ (ROOT/'feed-preview.css').read_text()+'</style>')
            feed=feed.replace('src="index.html?format=story"', 'srcdoc="'+escape(document,quote=True)+'"')
            await page.set_content(feed,wait_until='load')
            await page.frame_locator('iframe').locator('#productImage').wait_for(state='visible')
            await page.screenshot(path=str(ROOT/'previews'/'t14-meta-feed.png'))
            await page.close()
        finally:
            await browser.close()

if __name__=='__main__':
    asyncio.run(main())
