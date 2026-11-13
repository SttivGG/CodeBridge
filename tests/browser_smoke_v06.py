"""CodeBridge 0.6: actual Chromium; UI and incremental DOM simulations (not a live WhatsApp session)."""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
JAVA='''public record Factura(Long id, String numeroFactura, UUID clienteId) {
    public Factura {
        detalles = List.copyOf(detalles);
        pagos = List.copyOf(pagos);
    }
}'''
LONG='public record Factura(Long id, String numeroFactura) {\n'+('  public Factura { detalles = List.copyOf(detalles); }\n'*700)+'}'
try:
  with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--allow-file-access-from-files'])
    panel=browser.new_page(viewport={'width':450,'height':920},device_scale_factor=1)
    errors=[]
    panel.on('pageerror',lambda e: errors.append('panel:'+str(e)))
    panel.add_init_script('''
      window.__settings={uiMode:'light',theme:'dark-plus',fontSize:13,maxHeight:420,lineNumbers:true,wrap:false};
      window.chrome={storage:{local:{get:async keys=>Object.fromEntries(keys.map(k=>[k,window.__settings[k]])),set:async data=>Object.assign(window.__settings,data)}},
        scripting:{getRegisteredContentScripts:async()=>[]},tabs:{query:async()=>[]}};
    ''')
    panel.set_content((ROOT/'sidepanel.html').read_text(encoding='utf-8'))
    panel.add_style_tag(content=(ROOT/'styles.css').read_text(encoding='utf-8'))
    panel.evaluate("""() => { window.__settings={uiMode:'light',theme:'dark-plus',fontSize:13,maxHeight:420,lineNumbers:true,wrap:false};window.chrome={storage:{local:{get:async keys=>Object.fromEntries(keys.map(k=>[k,window.__settings[k]])),set:async data=>Object.assign(window.__settings,data)}},scripting:{getRegisteredContentScripts:async()=>[]},tabs:{query:async()=>[]}};}""")
    import re
    panel_code='\n'.join(re.sub(r'^export\s+', '',re.sub(r'^import\s+.*?;\s*$', '',(ROOT/file).read_text(encoding='utf-8'),flags=re.MULTILINE), flags=re.MULTILINE) for file in ['core.js','visual.js','highlight.js','app.js'])
    panel.add_script_tag(content=panel_code)
    panel.locator('#preview .cb-code').wait_for(timeout=8000)
    assert panel.locator('#appearance-title').inner_text().startswith('A tu manera')
    assert panel.locator('html').get_attribute('data-ui')=='light'
    panel.locator('input[name="ui-mode"][value="dark"]').check()
    panel.wait_for_function('document.documentElement.dataset.ui === "dark"')
    panel.locator('#font-size').fill('16')
    panel.wait_for_function('window.__settings.fontSize === 16')
    assert panel.locator('#preview .cb-code').evaluate('(e)=>getComputedStyle(e).fontSize')=='16px'
    panel.locator('#theme').select_option('dracula')
    panel.wait_for_function('window.__settings.theme === "dracula"')
    assert panel.locator('#preview .cb-code').evaluate('(e)=>getComputedStyle(e).backgroundColor')=='rgb(40, 42, 54)'
    panel.screenshot(path=str(ROOT/'docs/panel_nexo_v06.png'),full_page=True)
    panel.locator('#reset-settings').click()
    panel.wait_for_function('window.__settings.fontSize === 13 && window.__settings.theme === "dark-plus"')
    assert panel.locator('#font-size').input_value()=='13'

    page=browser.new_page(viewport={'width':1200,'height':760})
    page.on('pageerror',lambda e: errors.append('chat:'+str(e)))
    page.add_init_script('''window.chrome={storage:{local:{get:async()=>({uiMode:'dark',theme:'dracula',lineNumbers:true,wrap:false,fontSize:15,maxHeight:360})},onChanged:{addListener:()=>{},removeListener:()=>{}}}};''')
    page.set_content('''<!doctype html><meta charset="utf-8"><style>
      body{margin:0;background:#101b21;font:14px system-ui;color:#eee}
      #app{height:100vh;overflow:auto;display:flex;justify-content:center}
      #main{width:860px;background:#172924;padding:22px}
      .message-out,.message-in{max-width:750px;margin:12px 18px 12px 75px;padding:10px;border-radius:11px;background:#005c4b}
      .message-in{background:#273641;margin-left:18px;margin-right:75px}.selectable-text{white-space:pre-wrap}
      </style><div id="app"><div id="main"><div class="message-out" id="first"><span class="selectable-text" id="first-text"></span></div><div class="message-in" id="normal"><span class="selectable-text">Hola parce, excelente trabajo</span></div></div></div>''')
    page.evaluate('(x)=>document.querySelector("#first-text").textContent=x',JAVA)
    page.evaluate("""() => {window.chrome={storage:{local:{get:async()=>({uiMode:'dark',theme:'dracula',lineNumbers:true,wrap:false,fontSize:15,maxHeight:360})},onChanged:{addListener:()=>{},removeListener:()=>{}}}};}""")
    page.add_script_tag(path=str(ROOT/'whatsapp.js'))
    page.wait_for_function('document.querySelector("#first .codebridge-host")')
    def card_info(ident):
      return page.evaluate('''id=>{const h=document.querySelector('#'+id+' .codebridge-host');if(!h)return null;
        const r=h.shadowRoot,v=r.querySelector('.codeview'),code=r.querySelector('.cb-code');
        return {ui:h.dataset.ui,font:getComputedStyle(code).fontSize,max:getComputedStyle(v).maxHeight,compact:code.dataset.compact||'',text:code.textContent};
      }''',ident)
    a=card_info('first')
    assert a['ui']=='dark' and a['font']=='15px' and a['max']=='360px',a
    assert a['compact']==''
    assert page.locator('#normal .codebridge-host').count()==0
    # Large snippet must remain complete but render in low-DOM-cost fallback.
    page.evaluate('''(txt)=>{const bubble=document.createElement('div');bubble.className='message-in';bubble.id='large';const s=document.createElement('span');s.className='selectable-text';s.textContent=txt;bubble.append(s);document.querySelector('#main').append(bubble)}''',LONG)
    page.wait_for_function('document.querySelector("#large .codebridge-host")',timeout=10000)
    big=card_info('large')
    assert big['compact']=='true' and big['text']==LONG,big
    page.evaluate('''()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async txt=>window.__copied=txt}})''')
    page.evaluate('''()=>document.querySelector('#large .codebridge-host').shadowRoot.querySelector('button.primary').click()''')
    page.wait_for_function('window.__copied !== undefined')
    assert page.evaluate('window.__copied')==LONG
    # A large chat remains responsive: 180 ordinary messages and one new code message.
    page.evaluate('''()=>{const frag=document.createDocumentFragment();for(let i=0;i<180;i++){
       const b=document.createElement('div');b.className='message-in';const s=document.createElement('span');s.className='selectable-text';s.textContent='Mensaje '+i;b.append(s);frag.append(b);
    }document.querySelector('#main').append(frag)}''')
    page.evaluate('''(src)=>{const b=document.createElement('div');b.className='message-out';b.id='late';const s=document.createElement('span');s.className='selectable-text';s.textContent=src;b.append(s);document.querySelector('#main').append(b)}''',JAVA)
    page.wait_for_function('document.querySelector("#late .codebridge-host")',timeout=10000)
    assert page.locator('.codebridge-host').count()==3
    # No duplicate cards after mutations and reinjection request.
    page.evaluate('''()=>document.dispatchEvent(new Event('codebridge:rescan'))''')
    page.wait_for_timeout(350)
    assert page.locator('.codebridge-host').count()==3
    page.screenshot(path=str(ROOT/'docs/chat_nexo_v06.png'),full_page=False)
    assert not errors,errors
    print('PASS: panel Nexo light/dark, settings persistence, 15px code/360px viewport, fallback >600 lines intact, copying, incremental chat, no duplicate cards')
    browser.close()
finally:
  pass
