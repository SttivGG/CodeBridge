"""v0.9.5: native Ctrl+V must not be blocked, even in a Lexical-like simulated editor."""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parents[1]
CODE = '''class Producto:
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
    browser = p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    page = browser.new_page(viewport={'width':1050,'height':820})
    failures=[]
    page.on('pageerror',lambda e:failures.append(str(e)))
    page.set_content('''<!doctype html><html><head><style>.selectable-text{white-space:pre-wrap}</style></head><body><main id="app"><footer><div id="composer" role="textbox" contenteditable="true" style="white-space:pre-wrap"></div></footer><input id="search"><article class="message-out" id="plain"><span class="selectable-text">Buenas tardes</span></article></main></body></html>''')
    page.evaluate('''() => {
      window.__copied='';window.__pastes=0;window.__receiver=null;
      window.chrome={runtime:{id:'mock-extension',onMessage:{addListener:f=>window.__receiver=f,removeListener:()=>{}}},storage:{local:{get:async()=>({safePaste:true,uiMode:'dark',performanceProfile:'balanced',glassCards:false})},onChanged:{addListener:()=>{},removeListener:()=>{}}}};
      Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.__copied=text}}});
      const editor=document.getElementById('composer');
      editor.addEventListener('paste',event=>{if(!event.defaultPrevented){editor.textContent=event.clipboardData.getData('text/plain');window.__pastes++;}});
      window.__fakePaste=(id,text)=>{const el=document.getElementById(id);el.focus();const data=new DataTransfer();data.setData('text/plain',text);const event=new ClipboardEvent('paste',{bubbles:true,cancelable:true,clipboardData:data});el.dispatchEvent(event);return {defaultPrevented:event.defaultPrevented,content:el.textContent,pastes:window.__pastes};};
      window.__addBubble=(id,text)=>{const b=document.createElement('article');b.id=id;b.className='message-out';const span=document.createElement('span');span.className='selectable-text';span.textContent=text;b.append(span);document.querySelector('#app').append(b);};
    }''')
    page.add_script_tag(path=str(ROOT/'whatsapp.js'))
    page.wait_for_timeout(250)
    result=page.evaluate('(v)=>window.__fakePaste("composer",v)',CODE)
    assert not result['defaultPrevented'],result
    assert result['content']==CODE,result
    assert result['pastes']==1,result
    page.wait_for_selector('[data-codebridge-safe-paste-tip]',timeout=4000)
    assert 'no pudo verificar' not in page.locator('body').inner_text().lower()
    page.get_by_role('button',name='Copiar protegido').click()
    page.wait_for_function('window.__copied.startsWith("```") && window.__copied.includes("__init__")')
    assert page.evaluate('window.__copied')=='```'+CODE+'```'
    selection=page.evaluate('()=>window.getSelection()?.toString()')
    assert selection==CODE,(selection,CODE)
    second=page.evaluate('()=>window.__fakePaste("composer",window.__copied)')
    assert second['pastes']==2 and not second['defaultPrevented'],second
    assert second['content']=='```'+CODE+'```',second
    page.wait_for_timeout(150)
    assert page.locator('[data-codebridge-safe-paste-tip]').count()==0
    page.evaluate('(x)=>window.__addBubble("python",x)',second['content'])
    page.wait_for_function('document.querySelector("#python .codebridge-host")!==null',timeout=6000)
    page.evaluate('''() => document.querySelector('#python .codebridge-host').shadowRoot.querySelector('button.primary').click()''')
    page.wait_for_function('(v)=>window.__copied===v',arg=CODE,timeout=3000)
    # Normal messages and unrelated inputs are untouched
    normal=page.evaluate('()=>window.__fakePaste("composer","Hola parce, nos vemos mañana")')
    assert normal['pastes']==3 and not normal['defaultPrevented']
    page.wait_for_timeout(130)
    assert page.locator('[data-codebridge-safe-paste-tip]').count()==0
    search=page.evaluate('(v)=>window.__fakePaste("search",v)',CODE)
    assert not search['defaultPrevented']
    assert not failures,failures
    print('PASS v0.9.5: native paste preserved; opt-in protected copy and native second paste; exact recipient copy')
    browser.close()
