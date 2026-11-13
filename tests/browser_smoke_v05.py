"""CodeBridge 0.5: real Chromium, simulated WhatsApp DOM. Not a real WhatsApp login."""
from pathlib import Path
from playwright.sync_api import sync_playwright

root=Path(__file__).resolve().parents[1]
java_base = '''public record Factura(Long id, String numeroFactura, UUID clienteId) {
    public Factura {
        detalles = List.copyOf(detalles);
        pagos = List.copyOf(pagos);
    }
}'''
java_long = 'public record Factura(Long id, String numeroFactura, UUID clienteId) {\n' + ('    public Factura {\n        detalles = List.copyOf(detalles);\n    }\n' * 24) + '}'
assert len(java_long) > 1000

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page(viewport={"width":1200,"height":760})
    errors=[]
    page.on('pageerror',lambda e: errors.append(str(e)))
    page.add_init_script("""window.chrome={storage:{local:{get:async()=>({theme:'dark-plus',lineNumbers:true,wrap:false})},onChanged:{addListener:()=>{},removeListener:()=>{}}}};""")
    page.set_content('''<!doctype html><meta charset="utf-8"><style>
       body{margin:0;background:#101b21;font:14px system-ui;color:#fff}
       #app{height:100vh;overflow:auto;display:flex;justify-content:center}
       #main{width:880px;padding:20px;background:#162b25}
       .message-out,.message-in{max-width:740px;margin:12px 10px 12px 85px;background:#005c4b;padding:10px;border-radius:8px}
       .message-in{background:#273641;margin-left:10px;margin-right:85px}
       .selectable-text{white-space:pre-wrap}
       button.expand{color:#a0d1ad;cursor:pointer;border:none;background:transparent}
       </style><div id="app"><div id="main">
       <div class="message-out" id="long"><div class="copyable-text"><span class="selectable-text" id="longtext"></span><button class="expand" data-testid="read-more" id="longmore">Leer más</button></div></div>
       <div class="message-in" id="normal"><span class="selectable-text">El informe de hoy es muy largo, pero es texto normal. Sigue siendo texto...</span><button class="expand" id="normalmore">Leer más</button></div>
       <div class="message-in" id="legacy"><span class="selectable-text" id="legacytext"></span></div>
       <div class="message-out" id="slow"><span class="selectable-text" id="slowtext"></span><button class="expand" id="slowmore" role="button">Ver más</button></div>
       <div class="message-out" id="blocked"><span class="selectable-text" id="blockedtext"></span><button class="expand" id="blockedmore">Leer más</button></div>
       </div></div>''')
    page.evaluate('''({longCode,shortCode})=>{
      window.__longCode=longCode;
      document.querySelector('#longtext').textContent=longCode.slice(0,180);
      document.querySelector('#legacytext').textContent=shortCode;
      document.querySelector('#slowtext').textContent=longCode.slice(0,130);
      document.querySelector('#blockedtext').textContent=longCode.slice(0,190);
      document.querySelector('#longmore').addEventListener('click',()=>{
        window.__longClicks=(window.__longClicks||0)+1;
        setTimeout(()=>{
          document.querySelector('#longtext').textContent=longCode;
          document.querySelector('#longmore').remove();
        },400);
      });
      document.querySelector('#normalmore').addEventListener('click',()=>{window.__normalClicks=(window.__normalClicks||0)+1;});
      // "Ver más" disappears first; content arrives later in another React update.
      document.querySelector('#slowmore').addEventListener('click',()=>{
        window.__slowClicks=(window.__slowClicks||0)+1;
        setTimeout(()=>document.querySelector('#slowmore').remove(),60);
        setTimeout(()=>document.querySelector('#slowtext').textContent=longCode,650);
      });
      // If native expansion fails, CodeBridge must not produce a partial card.
      document.querySelector('#blockedmore').addEventListener('click',()=>{window.__blockedClicks=(window.__blockedClicks||0)+1;});
    }''',{'longCode':java_long,'shortCode':java_base})
    page.add_script_tag(path=str(root/'whatsapp.js'))

    page.wait_for_timeout(180)
    assert page.locator('#long .codebridge-host').count()==0, 'Partial code card appeared before expansion'
    assert page.locator('#slow .codebridge-host').count()==0, 'Partial code card appeared while React is still updating'
    assert page.locator('#normal .codebridge-host').count()==0, 'Ordinary long text incorrectly rendered'
    assert page.evaluate('window.__normalClicks || 0')==0, 'Ordinary prose auto-expanded'
    assert page.locator('#legacy .codebridge-host').count()==1, 'Existing small snippet regressed'
    page.wait_for_function('''()=>document.querySelector('#long .codebridge-host') && document.querySelector('#slow .codebridge-host')''',timeout=5000)
    assert page.evaluate('window.__longClicks')==1
    assert page.evaluate('window.__slowClicks')==1
    assert page.evaluate('window.__normalClicks || 0')==0
    for ident in ['long','slow']:
        card=page.locator('#'+ident+' .codebridge-host')
        assert card.count()==1, f'Duplicate card {ident}'
        info=page.evaluate('''id=>{
          const root=document.querySelector('#'+id+' .codebridge-host').shadowRoot;
          return {lines:root.querySelectorAll('.cb-line').length, source:root.querySelector('.cb-code').textContent,buttons:[...root.querySelectorAll('button')].map(b=>b.textContent)}
        }''',ident)
        assert info['lines']==len(java_long.split('\n')),f'Incomplete lines: {ident}'
        assert info['source']==java_long,f'Incomplete source: {ident}'
    assert page.locator('#blocked .codebridge-host').count()==0, 'Auto-rendered code without actually expanding'
    assert page.locator('#blockedmore').count()==1, 'Removed native Read more button when expansion failed'
    assert page.evaluate('window.__blockedClicks')<=2, 'Unbounded expansion retries'
    # Late manual native click must still allow CodeBridge to render correctly.
    page.evaluate('''(full)=>{document.querySelector('#blockedtext').textContent=full;document.querySelector('#blockedmore').remove()}''',java_long)
    page.wait_for_function('''()=>!!document.querySelector('#blocked .codebridge-host')''',timeout=5000)
    # Copy precise original, not the visual representation.
    page.evaluate('''()=>{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async x=>(window.__copied=x)}})}''')
    page.evaluate('''()=>document.querySelector('#long .codebridge-host').shadowRoot.querySelector('button').click()''')
    page.wait_for_timeout(70)
    assert page.evaluate('window.__copied')==java_long, 'Copied snippet differs from full expanded text'
    # Live edit / virtualization: rerender long -> short, original toggle still works.
    page.evaluate('''(src)=>{document.querySelector('#longtext').textContent=src}''',java_base)
    page.wait_for_timeout(350)
    assert page.locator('#long .codebridge-host').count()==1
    assert page.evaluate("document.querySelector('#long .codebridge-host').shadowRoot.querySelectorAll('.cb-line').length")==len(java_base.split('\n'))
    assert not errors,errors
    (root/'docs').mkdir(exist_ok=True)
    page.screenshot(path=str(root/'docs/simulacion_v05.png'),full_page=True)
    print('PASS: long code auto-expands, delayed WhatsApp update, no incomplete cards, prose untouched, copy exact, manual recovery, DOM reuse')
    browser.close()
