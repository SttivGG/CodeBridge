"""Recovery regression: mismatch after write, denied read, exact copy, dynamic version."""
from pathlib import Path
import re
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
PRODUCT='''class Producto:
    # Se ejecuta automáticamente al crear un objeto nuevo
    def __init__(self, nombre, precio):
        self.nombre = nombre
        self.precio = precio

    # Define cómo se muestra el objeto al usar print()
    def __str__(self):
        return f"{self.nombre} - ${self.precio}"

item = Producto("Teclado", 45)
print(item)  # Salida: Teclado - $45'''
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':720,'height':980})
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    html=(ROOT/'sidepanel.html').read_text()
    html=re.sub(r'<script type="module" src="app.js"></script>','',html)
    page.set_content(html,wait_until='load')
    page.add_style_tag(content=(ROOT/'styles.css').read_text())
    page.evaluate('''() => {
        window.__clip='';window.__mode='normal';window.__grant=true;window.__granted=false;window.__permissionRequests=0;
        window.__signals=[];window.__reads=0;window.__writes=0;
        Object.defineProperty(navigator,'clipboard',{configurable:true,value:{
          readText:async()=>{window.__reads++;
            if(window.__mode==='reject-read')throw Error('NotAllowedError');
            if(window.__mode==='stale'&&window.__reads>=2)return 'clipboard viejo';
            return window.__clip;
          },
          writeText:async text=>{window.__writes++;if(window.__mode==='reject-write')throw Error('NotAllowedError');window.__clip=text;}
        }});
        document.execCommand=(cmd)=>{
          if(cmd!=='copy')return false;
          const element=document.activeElement;
          window.__clip=element.value.substring(element.selectionStart,element.selectionEnd);
          return true;
        };
        window.chrome={
          runtime:{getManifest:()=>({version:'0.9.7'})},
          permissions:{contains:async()=>window.__granted,request:async()=>{window.__permissionRequests++;window.__granted=window.__grant;return window.__grant;},remove:async()=>true},
          storage:{local:{get:async()=>({}),set:async data=>{window.__signals.push(Object.keys(data));}}},
          scripting:{getRegisteredContentScripts:async()=>[]},
          tabs:{query:async()=>[{id:4}],sendMessage:async()=>({ok:true})}
        };
    }''')
    modules=[]
    for file in ['core.js','visual.js','highlight.js','message.js','smart-clipboard.js','app.js']:
        txt=(ROOT/file).read_text()
        txt=re.sub(r'^import\s+.*?;\s*$','',txt,flags=re.M)
        txt=re.sub(r'\bexport\s+','',txt)
        modules.append(txt)
    page.add_script_tag(content='\n'.join(modules))
    page.wait_for_function("document.querySelector('#codebridge-version').textContent==='v0.9.7'")
    assert page.title()=='CodeBridge · v0.9.7'
    # A stale read after successful write used to cause a false failure.
    # The first click now writes once, without a second read or a second click.
    page.evaluate('(code)=>{window.__clip=code;window.__reads=0;window.__mode="stale";}',PRODUCT)
    page.locator('#smart-prepare').click()
    page.wait_for_function("document.querySelector('#smart-status').textContent.includes('preparado en un clic')")
    assert page.evaluate('window.__reads')==1
    assert page.evaluate('window.__writes')==1
    assert page.evaluate('window.__permissionRequests')==1
    assert page.locator('#smart-copy-fallback').is_hidden()
    assert page.evaluate('window.__clip')=='```'+PRODUCT+'```'
    assert '__init__' in page.evaluate('window.__clip')
    assert '__str__' in page.evaluate('window.__clip')
    page.wait_for_function('window.__signals.length>0')
    # When permission is already granted, asking again is unnecessary.
    page.evaluate('window.__mode="normal"')
    page.locator('#smart-prepare').click()
    page.wait_for_function("document.querySelector('#smart-status').textContent.includes('ya está protegido')")
    assert page.evaluate('window.__permissionRequests')==1
    assert page.evaluate('window.__writes')==1
    # Real write failure must still expose the explicit copy fallback.
    page.evaluate('(code)=>{window.__clip=code;window.__mode="reject-write";}',PRODUCT)
    page.locator('#smart-prepare').click()
    page.wait_for_function("document.querySelector('#smart-status').textContent.includes('rechazó la escritura')")
    assert not page.locator('#smart-copy-fallback').is_hidden()
    assert page.locator('#smart-protected-text').input_value()=='```'+PRODUCT+'```'
    page.locator('#smart-retry-copy').click()
    page.wait_for_function('window.__signals.length>1')
    assert page.evaluate('window.__clip')=='```'+PRODUCT+'```'
    # Browsers that block read must fall back to an actual user paste.
    page.evaluate('window.__mode="reject-read";window.__reads=0;')
    page.locator('#smart-prepare').click()
    page.wait_for_function("document.querySelector('#smart-manual-section').hidden===false")
    page.locator('#smart-manual-input').fill(PRODUCT)
    page.locator('#smart-manual-prepare').click()
    assert page.evaluate('window.__clip')=='```'+PRODUCT+'```'
    assert page.locator('#smart-manual-input').input_value()==''
    # Never touch the OS clipboard for ordinary prose or invalid language.
    page.locator('#smart-manual-input').fill('Buenas tardes, hablamos luego.')
    page.locator('#smart-manual-prepare').click()
    assert page.evaluate('window.__clip')=='```'+PRODUCT+'```'
    assert page.locator('#smart-status').inner_text().startswith('No pude reconocer')
    page.locator('#smart-manual-clear').click()
    assert page.locator('#smart-protected-text').input_value()==''
    assert not errors,errors
    print('PASS v0.9.6.5: primer clic, permisos reutilizados, escritura fallida con fallback, exactitud de dunders')
    browser.close()
