"""Smart Clipboard v0.9.6: panel real HTML/JS + APIs mock (NO WhatsApp real)."""
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

try:
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
        page=browser.new_page(viewport={'width':650,'height':900})
        errors=[]
        page.on('pageerror',lambda x:errors.append(str(x)))
        html=(ROOT/'sidepanel.html').read_text()
        html=re.sub(r'<script type="module" src="app.js"></script>','',html)
        page.set_content(html,wait_until='load')
        page.add_style_tag(content=(ROOT/'styles.css').read_text())
        page.evaluate('''(() => {
            window.__clip='';window.__readCount=0;window.__writeCount=0;
            window.__perm=true;window.__permStored=false;window.__permRequests=0;window.__revoked=false;window.__notifications=[];window.__preparedSignals=[];
            const clip={readText:async()=>{window.__readCount++;return window.__clip;},writeText:async text=>{window.__writeCount++;window.__clip=text;}};
            Object.defineProperty(navigator,'clipboard',{configurable:true,value:clip});
            const extension={
              storage:{local:{get:async()=>({}),set:async data=>{if(data['codebridge.smartClipboardPreparedNotice'])window.__preparedSignals.push(data['codebridge.smartClipboardPreparedNotice']);} }},
              permissions:{contains:async()=>window.__permStored,request:async()=>{window.__permRequests++;if(window.__perm)window.__permStored=true;return window.__perm;},remove:async()=>{window.__revoked=true;window.__permStored=false;return true;}},
              scripting:{getRegisteredContentScripts:async()=>[]},
              tabs:{query:async()=>[{id:17}],sendMessage:async(id,payload)=>{window.__notifications.push({id,payload});return {ok:true};}}
            };
            Object.assign(window.chrome||{},extension);
        })();''')
        content=[]
        for name in ['core.js','visual.js','highlight.js','message.js','smart-clipboard.js','app.js']:
            code=(ROOT/name).read_text()
            code=re.sub(r'^import\s+.*?;\s*$', '', code,flags=re.M)
            code=re.sub(r'\bexport\s+', '', code)
            content.append(code)
        page.add_script_tag(content='\n'.join(content))
        page.locator('#smart-prepare').wait_for()
        page.evaluate('(text)=>{window.__clip=text;}',PRODUCT)
        page.get_by_role('button',name='Preparar portapapeles').click()
        page.wait_for_function("document.querySelector('#smart-status').textContent.includes('preparado en un clic')")
        clip=page.evaluate('window.__clip')
        page.locator('#smart-clipboard-section').screenshot(path=str(ROOT/'docs/smart_clipboard_v096.png'))
        assert clip=='```'+PRODUCT+'```',repr(clip)
        assert '__init__' in clip and '__str__' in clip
        assert page.evaluate('window.__readCount')==1
        assert page.evaluate('window.__writeCount')==1
        assert page.evaluate('window.__permRequests')==1
        assert 'preparado en un clic' in page.locator('#smart-status').inner_text()
        assert 'class Producto' not in page.locator('#smart-status').inner_text()
        # second click: no double protection / no further write
        page.get_by_role('button',name='Preparar portapapeles').click()
        page.wait_for_function("document.querySelector('#smart-status').textContent.includes('ya está protegido')")
        assert page.evaluate('window.__writeCount')==1
        assert page.evaluate('window.__permRequests')==1
        assert page.evaluate('window.__notifications.filter(({payload})=>payload.type==="codebridge:clipboard:prepared").length')==2
        assert page.evaluate('window.__notifications.filter(({payload})=>payload.type==="codebridge:clipboard:prepared").every(({id,payload})=>id===17 && Object.keys(payload).length===1)')
        assert page.evaluate('window.__preparedSignals.length')==2
        # Direct message may fail even while storage change events still work.
        page.evaluate('()=>{window.chrome.tabs.query=async()=>{throw new Error("no tab access")};}')
        page.get_by_role('button',name='Preparar portapapeles').click()
        page.wait_for_function("document.querySelector('#smart-status').textContent.includes('ya está protegido')")
        assert page.evaluate('window.__preparedSignals.length')==3
        assert page.evaluate('window.__writeCount')==1
        # normal text remains untouched
        page.evaluate('window.__clip="Buenas tardes, hablamos mañana"')
        page.get_by_role('button',name='Preparar portapapeles').click()
        page.wait_for_function("document.querySelector('#smart-status').textContent.includes('No pude reconocer')")
        assert page.evaluate('window.__clip')=='Buenas tardes, hablamos mañana'
        assert page.evaluate('window.__writeCount')==1
        # manual language: fragment not auto recognized
        page.evaluate('window.__clip="def __init__(self):\\n    pass"')
        page.locator('#smart-language').select_option('python')
        page.get_by_role('button',name='Preparar portapapeles').click()
        page.wait_for_function("document.querySelector('#smart-status').textContent.includes('Código PYTHON preparado en un clic')")
        assert page.evaluate('window.__clip')=='```def __init__(self):\n    pass```'
        # permission denied should not read or write
        page.evaluate('''() => {window.__permStored=false;window.__perm=false;window.__clip='class Secreto { }';window.__readCount=0;window.__writeCount=0;}''')
        page.get_by_role('button',name='Preparar portapapeles').click()
        page.wait_for_function("document.querySelector('#smart-status').textContent.includes('Permiso rechazado')")
        assert page.evaluate('window.__clip')=='class Secreto { }'
        assert page.evaluate('window.__readCount')==0
        assert page.evaluate('window.__writeCount')==0
        page.get_by_role('button',name='Revocar permiso de lectura').click()
        page.wait_for_function('window.__revoked===true')
        assert not errors,errors
        print('PASS: Smart Clipboard universal, no doble protección, permiso opcional, copiar exacto y revocación')
        browser.close()
finally:
    pass
