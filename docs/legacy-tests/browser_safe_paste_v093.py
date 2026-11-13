"""Pruebas de pegado seguro en DOM de chat simulado (NO WhatsApp real)."""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parents[1]
CODE = '''class Producto:
    # Método constructor: se ejecuta al crear el objeto
    def __init__(self, nombre, precio):
        self.nombre = nombre
        self.precio = precio

    # Método de representación: define qué mostrar al usar print()
    def __str__(self):
        return f"{self.nombre} - ${self.precio}"

# Uso del código
item = Producto("Teclado", 50)
print(item)  # Imprime: Teclado - $50'''
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1100,'height':800})
    errors=[]
    page.on('pageerror',lambda e: errors.append(str(e)))
    page.set_content('''<!doctype html><html><head><style>.selectable-text{white-space:pre-wrap} [contenteditable]{white-space:pre-wrap}</style></head><body><main id="app"><footer><div id="composer" contenteditable="true" role="textbox"></div></footer><input id="search"><article class="message-out" id="ordinary"><span class="selectable-text">Hola, seguimos mañana</span></article></main></body></html>''')
    page.evaluate('''() => {
      window.__copied='';window.__receiver=null;
      window.chrome={runtime:{id:'test-extension',onMessage:{addListener:f=>window.__receiver=f,removeListener:()=>{}}},storage:{local:{get:async()=>({safePaste:true,uiMode:'dark',performanceProfile:'balanced',glassCards:false})},onChanged:{addListener:()=>{},removeListener:()=>{}}}};
      Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async x=>window.__copied=x}});
      window.__fakePaste=(id,text)=>{const editor=document.getElementById(id);editor.focus();const selection=getSelection();selection.selectAllChildren(editor);selection.collapseToEnd();const dt=new DataTransfer();dt.setData('text/plain',text);const e=new ClipboardEvent('paste',{bubbles:true,cancelable:true,clipboardData:dt});editor.dispatchEvent(e);return {prevented:e.defaultPrevented,inside:editor.innerText};};
      window.__addBubble=(id,text)=>{const b=document.createElement('article');b.id=id;b.className='message-out';const s=document.createElement('span');s.className='selectable-text';s.textContent=text;b.append(s);document.querySelector('#app').append(b);};
    }''')
    page.add_script_tag(path=str(ROOT/'whatsapp.js'))
    page.wait_for_timeout(300)
    result=page.evaluate('(text)=>window.__fakePaste("composer",text)',CODE)
    assert result['prevented'] is True,result
    assert '__init__' in result['inside'] and '__str__' in result['inside'],result
    assert '```' in result['inside'],result
    # Simulated transport path: recipient with CodeBridge sees message content (before WhatsApp formatting)
    page.evaluate('(text)=>window.__addBubble("python",text)',result['inside'])
    page.wait_for_function('document.querySelector("#python .codebridge-host")!==null',timeout=6000)
    page.evaluate('''() => document.querySelector('#python .codebridge-host').shadowRoot.querySelector('button.primary').click()''')
    page.wait_for_function('(text)=>window.__copied===text',arg=CODE,timeout=2500)
    # WhatsApp sometimes removes fence formatting in the DOM; copying still preserves the content.
    page.evaluate('(text)=>window.__addBubble("no-fence",text)',CODE)
    page.wait_for_function('document.querySelector("#no-fence .codebridge-host")!==null',timeout=6000)
    page.evaluate('''() => document.querySelector('#no-fence .codebridge-host').shadowRoot.querySelector('button.primary').click()''')
    page.wait_for_function('(text)=>window.__copied===text',arg=CODE,timeout=2500)
    # Code is escaped before HTML insertion: no malicious element appears in DOM.
    malicious=CODE+'\nprint("<img src=x onerror=window.__evil=1>")'
    page.evaluate('''() => {document.querySelector('#composer').innerHTML='';window.__evil=0;}''')
    m=page.evaluate('(text)=>window.__fakePaste("composer",text)',malicious)
    assert m['prevented'] and '<img src=' in m['inside'],m
    assert page.locator('#composer img').count()==0
    assert page.evaluate('window.__evil')==0
    normal=page.evaluate('()=>window.__fakePaste("composer","Hola parce, nos vemos mañana")')
    assert not normal['prevented'],normal
    search=page.evaluate('(text)=>window.__fakePaste("search",text)',CODE)
    assert not search['prevented'],search
    report=page.evaluate('''() => {let data;window.__receiver({type:'codebridge:diagnostics:get'},{id:'test-extension'},res=>data=res.diagnostics);return data;}''')
    assert report['counters']['safePaste']==2,report
    assert report['counters']['safePasteFailure']==0,report
    assert not errors,errors
    print('PASS v0.9.3: proteger pegado Python, copia íntegra en tarjeta y no intervenir mensajes normales/búsquedas')
    browser.close()
