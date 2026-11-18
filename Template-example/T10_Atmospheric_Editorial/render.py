"""Export T10 as three static PNGs. pip install playwright; ensure Chromium is installed.
Run: python render.py
You may edit creative.example.json before running. Paths are confined to this project folder.
"""
import asyncio, base64, json, mimetypes, shutil
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parent
SIZES={'square':(1080,1080),'portrait':(1080,1350),'story':(1080,1920)}
CONFIG=json.loads((ROOT/'creative.example.json').read_text())

def data_url(filename):
    path=(ROOT/filename).resolve()
    if not path.is_relative_to(ROOT):
        raise ValueError('Asset path outside template folder')
    if path.suffix.lower() not in ('.png','.jpg','.jpeg','.webp'):
        raise ValueError('Unsupported image extension')
    mime=mimetypes.guess_type(path.name)[0]
    return 'data:'+mime+';base64,'+base64.b64encode(path.read_bytes()).decode()

def inline_html():
    html=(ROOT/'index.html').read_text()
    css=(ROOT/'styles.css').read_text()
    js=(ROOT/'script.js').read_text()
    default_data=data_url('assets/demo-spa-photo.png')
    js=js.replace("imageUrl:'assets/demo-spa-photo.png'",'imageUrl:'+json.dumps(default_data))
    html=html.replace('<link rel="stylesheet" href="styles.css" />','<style>'+css+'</style>')
    html=html.replace('<script src="script.js" defer></script>','')
    html=html.replace('src="assets/demo-spa-photo.png"','src="'+default_data+'"')
    return html.replace('</body>','<script>'+js+'</script></body>')

async def main():
    async with async_playwright() as p:
        executable=next((shutil.which(name) for name in ('chromium','chromium-browser','google-chrome','chrome','msedge') if shutil.which(name)),None)
        options={'headless':True,'args':['--no-sandbox']}
        if executable: options['executable_path']=executable
        browser=await p.chromium.launch(**options)
        for fmt,(width,height) in SIZES.items():
            page=await browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
            try:
                await page.set_content(inline_html(),wait_until='load')
                cfg={**CONFIG,'format':fmt}
                if cfg.get('imageUrl') and not str(cfg['imageUrl']).startswith(('https://','http://','data:')):
                    cfg['imageUrl']=data_url(cfg['imageUrl'])
                status=await page.evaluate('(d)=>window.setCreative(d)',cfg)
                if not status['imageLoaded']:
                    raise ValueError('Product image failed to load')
                await page.screenshot(path=str(ROOT/'previews'/('t10-'+fmt+'.png')))
                print(fmt,width,height,status)
            finally:
                await page.close()
        await browser.close()

if __name__=='__main__':asyncio.run(main())
