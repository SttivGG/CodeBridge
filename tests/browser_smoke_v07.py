"""Real Chromium checks: NASM sample, read-more expansion, exact copy and Nexo glass controls.
This is a DOM simulation, not a verified live WhatsApp session.
"""
from pathlib import Path
import re
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
ASM=(ROOT/'tests/fixtures/hola_mundo.asm').read_text(encoding='utf-8')
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--allow-file-access-from-files'])
    errors=[]
    panel=browser.new_page(viewport={'width':480,'height':820},device_scale_factor=1)
    panel.on('pageerror',lambda e:errors.append('panel: '+str(e)))
    panel.set_content((ROOT/'sidepanel.html').read_text(encoding='utf-8'))
    panel.add_style_tag(content=(ROOT/'styles.css').read_text(encoding='utf-8'))
    panel.evaluate('''() => {
      window.__settings={uiMode:'dark',theme:'dark-plus',lineNumbers:true,wrap:false,fontSize:13,maxHeight:420,glassBlur:18,glassOpacity:75,glassCards:true};
      window.chrome={storage:{local:{get:async keys=>Object.fromEntries(keys.map(k=>[k,window.__settings[k]])),set:async data=>Object.assign(window.__settings,data)}},scripting:{getRegisteredContentScripts:async()=>[]},tabs:{query:async()=>[]}};
    }''')
    panel_code='\n'.join(re.sub(r'^export\s+', '',re.sub(r'^import\s+.*?;\s*$', '',(ROOT/file).read_text(encoding='utf-8'),flags=re.MULTILINE), flags=re.MULTILINE) for file in ['core.js','visual.js','highlight.js','app.js'])
    panel.add_script_tag(content=panel_code)
    panel.locator('#preview .cb-code').wait_for()
    assert panel.locator('html').get_attribute('data-ui')=='dark'
    panel.locator('#preview-language').select_option('asm')
    assert panel.locator('#preview-title').inner_text()=='hola_mundo.asm'
    assert 'syscall' in panel.locator('#preview').inner_text()
    panel.locator('#glass-blur').fill('24')
    panel.locator('#glass-opacity').fill('85')
    panel.wait_for_function('window.__settings.glassBlur === 24 && window.__settings.glassOpacity === 85')
    assert panel.evaluate('getComputedStyle(document.documentElement).getPropertyValue("--blur").trim()')=='24px'
    panel.screenshot(path=str(ROOT/'docs/panel_cristal_v07.png'),full_page=True)

    page=browser.new_page(viewport={'width':1250,'height':840},device_scale_factor=1)
    page.on('pageerror',lambda e:errors.append('chat: '+str(e)))
    page.set_content('''<!doctype html><html lang="es"><head><meta charset="utf-8"><style>
      body{margin:0;background:radial-gradient(ellipse at 20% 10%,#254f4b 0%,transparent 60%),#0c171b;color:#e4edf0;font:14px system-ui}
      #app{min-height:100vh;display:flex;justify-content:center}#main{width:900px;padding:24px 40px;background:#17272280}
      .message-out,.message-in{max-width:790px;margin:14px 18px 14px 65px;padding:9px 11px;border-radius:13px;background:#155c4e}
      .message-in{background:#2a3b40;margin-left:18px;margin-right:65px}.selectable-text{white-space:pre-wrap}
      button.expand{border:0;background:transparent;color:#f4b17f;cursor:pointer}
      </style></head><body><div id="app"><div id="main">
      <div class="message-in" id="asm"><span class="selectable-text" id="asm-text"></span><button type="button" class="expand" id="more">Leer más</button></div>
      <div class="message-out" id="normal"><span class="selectable-text">Voy a probar ensamblador en CodeBridge, parce</span></div>
      </div></div></body></html>''')
    prefix=ASM[:180]
    page.evaluate('''({prefix,whole})=>{
      const node=document.querySelector('#asm-text');node.textContent=prefix;
      document.querySelector('#more').addEventListener('click',()=>{node.textContent=whole;document.querySelector('#more').remove()});
      window.__userClipboard='';
      Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>window.__userClipboard=text}});
      window.chrome={storage:{local:{get:async()=>({uiMode:'dark',theme:'dracula',lineNumbers:true,wrap:false,fontSize:14,maxHeight:420,glassBlur:20,glassOpacity:80,glassCards:true})},onChanged:{addListener:()=>{},removeListener:()=>{}}}};
    }''',{'prefix':prefix,'whole':ASM})
    page.add_script_tag(path=str(ROOT/'whatsapp.js'))
    page.wait_for_function('document.querySelector("#asm .codebridge-host") && !document.querySelector("#more")',timeout=9000)
    result=page.evaluate('''()=>{
      const host=document.querySelector('#asm .codebridge-host');const root=host.shadowRoot;
      const spans=[...root.querySelectorAll('.cb-code span span')].map(x=>({text:x.textContent,color:x.style.color}));
      return {language:root.querySelector('.lang').textContent,glass:host.dataset.glass,
      text:root.querySelector('.cb-code').innerText,spans:spans.filter(x=>['mov','rax','syscall','_start:'].includes(x.text)).slice(0,8)};
    }''')
    assert result['language']=='ASM',result
    assert result['glass']=='on',result
    if result['text'] != ASM:
        import difflib; print('INNER TEXT DIFFERENCE:',repr(result['text'][-120:]),'expected',repr(ASM[-120:]));print('\n'.join(difflib.ndiff(ASM.splitlines(keepends=True),result['text'].splitlines(keepends=True))))
    assert result['text']==ASM,(len(result['text']),len(ASM))
    assert any(item['text']=='rax' for item in result['spans']),result
    assert page.locator('#normal .codebridge-host').count()==0
    page.evaluate('''()=>document.querySelector('#asm .codebridge-host').shadowRoot.querySelector('button.primary').click()''')
    page.wait_for_function('window.__userClipboard.length > 0')
    assert page.evaluate('window.__userClipboard')==ASM
    page.screenshot(path=str(ROOT/'docs/chat_asm_cristal_v07.png'),full_page=False)

    # The transparent backdrop becomes solid when the chat grows to many code cards.
    page.evaluate('''(code)=>{
      const frag=document.createDocumentFragment();
      for(let i=0;i<37;i++){let b=document.createElement('div');b.className='message-in';
        let t=document.createElement('span');t.className='selectable-text';t.textContent=code;
        b.append(t);frag.append(b)}document.querySelector('#main').append(frag);
    }''',ASM)
    page.wait_for_function('document.querySelectorAll(".codebridge-host").length>=38',timeout=15000)
    page.wait_for_function('[...document.querySelectorAll(".codebridge-host")].every(h=>h.dataset.glass === "off")',timeout=4000)
    assert not errors,errors
    print('PASS v0.7: glass sliders and NASM panel, collapsed WhatsApp-like ASM expanded and syntax-colored, exact copy, ordinary text untouched, adaptive glass for dense chats')
    browser.close()
