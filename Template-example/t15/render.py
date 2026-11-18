# Tested with Python Playwright and system Chromium.
# python render.py (run inside each template folder)
from pathlib import Path
from shutil import which
import os
from playwright.sync_api import sync_playwright
import base64,json,mimetypes
root=Path(__file__).resolve().parent
html=(root/'index.html').read_text()
css=(root/'styles.css').read_text()
js=(root/'script.js').read_text()
demo=json.loads((root/'creative.example.json').read_text())
p=root/demo['imageUrl']
mime=mimetypes.guess_type(str(p))[0] or 'image/png'
data_url=f"data:{mime};base64,"+base64.b64encode(p.read_bytes()).decode()
html=html.replace('<link rel="stylesheet" href="styles.css">',f'<style>{css}</style>').replace('<script defer src="script.js"></script>','')
html=html.replace('src="'+demo['imageUrl']+'"','src="'+data_url+'"')
js=js.replace(demo['imageUrl'],data_url)
html=html.replace('</body>','<script>'+js+'</script></body>')
sizes={'square':(1080,1080),'portrait':(1080,1350),'story':(1080,1920)}
(root/'previews').mkdir(exist_ok=True)
with sync_playwright() as pw:
 browser_path=os.getenv('CHROMIUM_PATH') or which('chromium') or which('google-chrome') or which('chrome')
 launch_args={'headless':True}
 if browser_path: launch_args['executable_path']=browser_path
 browser=pw.chromium.launch(**launch_args)
 for fmt,(w,h) in sizes.items():
  page=browser.new_page(viewport={'width':w,'height':h},device_scale_factor=1)
  page.set_content(html,wait_until='domcontentloaded',timeout=15000)
  data={**demo,'imageUrl':data_url,'format':fmt}
  result=page.evaluate('(d)=>window.setCreative(d)',data)
  if not result.get('ok'): raise RuntimeError('Image missing: '+fmt)
  page.screenshot(path=str(root/'previews'/f'{root.name.lower()}-{fmt}.png'))
  page.close()
 browser.close()
