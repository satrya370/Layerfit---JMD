from pathlib import Path
import asyncio,json,base64
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parent
async def main():
 html=(R/'index.html').read_text(); css=(R/'styles.css').read_text(); js=(R/'script.js').read_text(); data=json.loads((R/'creative.example.json').read_text()); uri='data:image/jpeg;base64,'+base64.b64encode((R/'assets/demo-product.jpg').read_bytes()).decode()
 # Inline CSS + JS to support sandboxed Chromium
 html=html.replace('<link rel="stylesheet" href="styles.css">',f'<style>{css}</style>').replace('<script defer src="script.js"></script>','').replace('src="assets/demo-product.jpg"',f'src="{uri}"').replace('</body>',f'<script>{js}</script></body>')
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  for fmt,(w,h) in {'square':(1080,1080),'portrait':(1080,1350),'story':(1080,1920)}.items():
   page=await browser.new_page(viewport={'width':w,'height':h},device_scale_factor=1)
   await page.set_content(html,wait_until='load')
   cfg={**data,'imageUrl':uri,'format':fmt}
   status=await page.evaluate('async d=>window.setCreative(d)',cfg)
   bounds=await page.evaluate('''()=>Object.fromEntries(['sale-copy','photo-zone','description','cta','bottomline'].map(c=>{const e=document.querySelector('.'+c),b=e.getBoundingClientRect();return[c,{x:Math.round(b.x),y:Math.round(b.y),w:Math.round(b.width),h:Math.round(b.height),visible:getComputedStyle(e).display!=='none'}]}))''')
   print(fmt,status,bounds)
   await page.screenshot(path=str(R/'previews'/f't22-{fmt}.png'))
   await page.close()
  await browser.close()
asyncio.run(main())
