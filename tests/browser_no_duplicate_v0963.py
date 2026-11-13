"""Regression v0.9.6.4: Smart Clipboard is the only protection workflow.
Simulated WhatsApp DOM in Chromium, not a live WhatsApp integration test.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
CODE='''class Producto:
    # Método constructor
    def __init__(self, nombre, precio):
        self.nombre = nombre
        self.precio = precio

    def __str__(self):
        return f"{self.nombre} - ${self.precio}"

item = Producto("Teclado", 45)
print(item)  # Salida: Teclado - $45'''
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1024,'height':768})
    failures=[]
    page.on('pageerror',lambda error: failures.append(str(error)))
    page.set_content('''<!doctype html><html><body>
      <style>.selectable-text{white-space:pre-wrap}</style><main id="app"><footer><div id="composer" contenteditable="true" role="textbox" style="white-space:pre-wrap"></div></footer></main>
      <div data-codebridge-safe-paste-tip="">Antiguo aviso</div>
    </body></html>''')
    page.evaluate('''() => {
      window.__events=[];
      window.__storageListener=null;
      window.__clipboard='';
      window.__disabledOld=false;
      window.__CODEBRIDGE_ON__=true;
      document.addEventListener('codebridge:disable',()=>{window.__disabledOld=true;window.__CODEBRIDGE_ON__=false;},{once:true});
      window.chrome={
        runtime:{id:'test-extension',onMessage:{addListener(fn){window.__receiver=fn;},removeListener(){}}},
        storage:{local:{get:async()=>({safePaste:true,performanceProfile:'balanced'})},
          onChanged:{addListener(fn){window.__storageListener=fn;},removeListener(){}}}
      };
      Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>window.__clipboard=text}});
      const editor=document.getElementById('composer');
      editor.addEventListener('paste',event=>{
        window.__events.push(event.defaultPrevented);
        if(!event.defaultPrevented)editor.textContent=event.clipboardData.getData('text/plain');
      });
      window.__paste=value=>{
        editor.focus();
        const data=new DataTransfer(); data.setData('text/plain',value);
        const event=new ClipboardEvent('paste',{bubbles:true,cancelable:true,clipboardData:data});
        editor.dispatchEvent(event);
        return {prevented:event.defaultPrevented,content:editor.textContent};
      };
      window.__newMessage=(id,text)=>{
        const bubble=document.createElement('article');bubble.id=id;bubble.className='message-out';
        const span=document.createElement('span');span.className='selectable-text';span.textContent=text;
        bubble.append(span);document.querySelector('#app').append(bubble);
      };
    }''')
    page.add_script_tag(path=str(ROOT/'whatsapp.js'))
    page.wait_for_timeout(300)
    assert page.evaluate('window.__disabledOld') is True, 'previous content script not asked to disable'
    assert page.evaluate('window.__CODEBRIDGE_CONTENT_VERSION')=='0.9.6.4'
    assert page.locator('[data-codebridge-safe-paste-tip]').count()==0, 'legacy tip still on page'
    for value in [CODE,'```'+CODE+'```','Hola, buenos días',CODE.replace('Producto','Cuenta')]:
        result=page.evaluate('(code)=>window.__paste(code)',value)
        assert result=={'prevented':False,'content':value},result
        page.wait_for_timeout(220)
        assert page.locator('[data-codebridge-safe-paste-tip]').count()==0,'duplicate legacy tip regenerated'
        assert page.get_by_text('Copiar protegido').count()==0,'obsolete action still exists'
    # Legacy notification may be injected externally: the prepared event should clear it.
    page.evaluate('''() => {
      const obsolete=document.createElement('div');
      obsolete.setAttribute('data-codebridge-safe-paste-tip','');
      obsolete.textContent='Copiar protegido';document.body.append(obsolete);
      window.__storageListener({'codebridge.smartClipboardPreparedNotice':{newValue:'signal'}},'local');
    }''')
    assert page.locator('[data-codebridge-safe-paste-tip]').count()==0
    page.evaluate('(code)=>window.__newMessage("python",code)','```'+CODE+'```')
    page.wait_for_function('document.querySelector("#python .codebridge-host")!==null',timeout=6000)
    page.evaluate('''() => document.querySelector('#python .codebridge-host').shadowRoot.querySelector('button.primary').click()''')
    page.wait_for_function('(code)=>window.__clipboard===code',arg=CODE,timeout=3000)
    assert not failures,failures
    print('PASS v0.9.6.4: no legacy warnings in raw/protected paste, old tip cleanup, native paste and exact copy')
    browser.close()
