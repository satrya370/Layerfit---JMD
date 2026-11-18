from pathlib import Path
import asyncio, base64, json
from playwright.async_api import async_playwright
ROOT=Path(__file__).parent
SIZES={'square':(1080,1080),'portrait':(1080,1350),'story':(1080,1920)}
async def main():
    html=(ROOT/'index.html').read_text();css=(ROOT/'styles.css').read_text();js=(ROOT/'script.js').read_text()
    img='data:image/jpeg;base64,'+base64.b64encode((ROOT/'assets/food-demo.jpg').read_bytes()).decode()
    js=js.replace("imageUrl:'assets/food-demo.jpg'",f"imageUrl:{json.dumps(img)}")
    html=html.replace('<link rel="stylesheet" href="styles.css">',f'<style>{css}</style>').replace('<script src="script.js" defer></script>','').replace('src="assets/food-demo.jpg"',f'src="{img}"').replace('</body>',f'<script>{js}</script></body>')
    config=json.loads((ROOT/'creative.example.json').read_text())
    async with async_playwright() as p:
        browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
        for fmt,(w,h) in SIZES.items():
            page=await browser.new_page(viewport={'width':w,'height':h},device_scale_factor=1)
            await page.set_content(html,wait_until='load')
            config['format']=fmt;config['imageUrl']=img
            await page.evaluate('(d)=>window.setCreative(d)',config)
            await page.screenshot(path=str(ROOT/'previews'/f't19-{fmt}.png'))
            await page.close()
        await browser.close()
if __name__=='__main__':asyncio.run(main())
