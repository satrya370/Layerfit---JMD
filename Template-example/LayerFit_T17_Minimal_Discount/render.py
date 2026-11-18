"""Render T17 in all three static Meta placement formats using installed Chromium."""
from pathlib import Path
import base64, json, asyncio
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parent
FORMATS={'square': (1080,1080), 'portrait': (1080,1350), 'story': (1080,1920)}

def compose():
    html=(ROOT/'index.html').read_text()
    css=(ROOT/'styles.css').read_text()
    js=(ROOT/'script.js').read_text()
    asset='data:image/svg+xml;base64,'+base64.b64encode((ROOT/'assets/demo-tumbler.svg').read_bytes()).decode('ascii')
    js=js.replace("imageUrl:'assets/demo-tumbler.svg'",'imageUrl:'+json.dumps(asset))
    return (html.replace('<link rel="stylesheet" href="styles.css">','<style>'+css+'</style>')
     .replace('<script src="script.js" defer></script>','')
     .replace('src="assets/demo-tumbler.svg"','src="'+asset+'"')
     .replace('</body>','<script>'+js+'</script></body>')),asset

async def main():
    (ROOT/'previews').mkdir(exist_ok=True)
    html,asset=compose()
    cfg=json.loads((ROOT/'creative.example.json').read_text())
    async with async_playwright() as p:
        browser=await p.chromium.launch(headless=True, executable_path='/usr/bin/chromium',args=['--no-sandbox'])
        try:
            for key,(w,h) in FORMATS.items():
                page=await browser.new_page(viewport={'width':w,'height':h},device_scale_factor=1)
                try:
                    await page.set_content(html,wait_until='load')
                    data={**cfg,'format':key,'imageUrl':asset}
                    result=await page.evaluate('async (d) => await window.setCreative(d)',data)
                    health=await page.evaluate('''() => {
                       const ids=['discount','headline','description','productImage','finePrint','brand'];
                       return ids.map(id=>{let x=document.getElementById(id),b=x.getBoundingClientRect();return {id,top:b.top,bottom:b.bottom,left:b.left,right:b.right,scrollWidth:x.scrollWidth,clientWidth:x.clientWidth}})
                    }''')
                    if not result['ok']: raise RuntimeError(f'Image failed: {result}')
                    for obj in health:
                        if obj['left']<-1 or obj['right']>w+1 or obj['top']<-1 or obj['bottom']>h+1:
                            raise RuntimeError(f'Overflow {key}: {obj}')
                    dest=ROOT/'previews'/f't17-{key}.png'
                    await page.screenshot(path=str(dest),type='png')
                    print(f'{key}: {w}x{h}, saved {dest}')
                finally:
                    await page.close()
        finally:
            await browser.close()

if __name__=='__main__':asyncio.run(main())
