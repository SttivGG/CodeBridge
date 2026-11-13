"""v0.8: profiles, DOM safety, controls, load, cleanup and UI.
Chromium simulated chat, NOT a live WhatsApp integration test.
"""
from pathlib import Path
import re
from time import monotonic
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
ASM=(ROOT/'tests/fixtures/hola_mundo.asm').read_text(encoding='utf-8')
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--allow-file-access-from-files'])
    errors=[]
    panel=browser.new_page(viewport={'width':520,'height':840})
    panel.on('pageerror',lambda e:errors.append('panel: '+str(e)))
    panel.set_content((ROOT/'sidepanel.html').read_text(encoding='utf-8'))
    panel.add_style_tag(content=(ROOT/'styles.css').read_text(encoding='utf-8'))
    panel.evaluate('''() => {
      window.__prefs={performanceProfile:'balanced',uiMode:'dark',theme:'dracula',lineNumbers:true,wrap:false,fontSize:13,maxHeight:420,glassBlur:20,glassOpacity:80,glassCards:true};
      window.chrome={storage:{local:{get:async keys=>Object.fromEntries(keys.map(k=>[k,window.__prefs[k]])),set:async data=>Object.assign(window.__prefs,data)}},scripting:{getRegisteredContentScripts:async()=>[]},tabs:{query:async()=>[]}};
    }''')
    source='\n'.join(re.sub(r'^export\s+', '',re.sub(r'^import\s+.*?;\s*$', '',(ROOT/file).read_text(encoding='utf-8'),flags=re.MULTILINE), flags=re.MULTILINE) for file in ['core.js','visual.js','highlight.js','message.js','smart-clipboard.js','app.js'])
    panel.add_script_tag(content=source)
    panel.locator('#preview .cb-code').wait_for()
    assert panel.locator('html').get_attribute('data-performance')=='balanced'
    panel.get_by_text('Low Mode',exact=True).click()
    panel.wait_for_function('window.__prefs.performanceProfile==="low"')
    assert panel.locator('html').get_attribute('data-performance')=='low'
    assert panel.locator('#preview .cb-code').get_attribute('data-compact')=='low'
    assert panel.evaluate('getComputedStyle(document.querySelector(".hero")).backdropFilter')=='none'
    panel.screenshot(path=str(ROOT/'docs/panel_low_v08.png'),full_page=True)

    page=browser.new_page(viewport={'width':1240,'height':880})
    page.on('pageerror',lambda e:errors.append('chat: '+str(e)))
    page.set_content('''<!doctype html><html lang="es"><head><meta charset="utf-8"><style>
        body{background:#101d21;color:#e7e7e7;font:13px system-ui}
        #app{margin:0 auto;width:920px}.message-in,.message-out{background:#21463a;border-radius:14px;padding:13px;margin:13px auto;max-width:800px}
        .selectable-text{white-space:pre-wrap}
    </style></head><body><main id="app"></main></body></html>''')
    page.evaluate('''() => {
      window.__prefs={performanceProfile:'balanced',uiMode:'dark',theme:'dracula',lineNumbers:true,wrap:false,fontSize:13,maxHeight:420,glassBlur:18,glassOpacity:75,glassCards:true};
      window.__listeners=[];window.__clipboard='';window.__EXECUTED=false;
      Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>window.__clipboard=text}});
      window.chrome={storage:{local:{get:async keys=>Object.fromEntries(keys.map(k=>[k,window.__prefs[k]]))},onChanged:{addListener:f=>window.__listeners.push(f),removeListener:f=>window.__listeners=window.__listeners.filter(x=>x!==f)}}};
      window.__setPrefs=(patch)=>{Object.assign(window.__prefs,patch);for(const f of window.__listeners)f(Object.fromEntries(Object.entries(patch).map(([key,newValue])=>[key,{newValue}])), 'local');};
      window.__add=(id,code)=>{let node=document.createElement('article');node.className='message-in';node.id=id;let msg=document.createElement('span');msg.className='selectable-text';msg.textContent=code;node.append(msg);document.querySelector('#app').append(node);};
    }''')
    page.evaluate('''(s)=>window.__add('first',s)''',ASM)
    page.add_script_tag(path=str(ROOT/'whatsapp.js'))
    page.wait_for_function('document.querySelector("#first .codebridge-host")')
    before=page.evaluate('''()=>{
      let h=document.querySelector('#first .codebridge-host');return {h:h,htmlNodes:h.shadowRoot.querySelectorAll('*').length,mode:h.dataset.performance};
    }''')
    assert before['mode']=='balanced' and before['htmlNodes']>100,before
    # Appearance tweaks should NOT replace the root card or regenerate tokens.
    page.evaluate('window.__setPrefs({glassBlur:24,maxHeight:600,fontSize:15})')
    page.wait_for_function('document.querySelector("#first .codebridge-host").style.getPropertyValue("--cb-glass-blur")==="24px"')
    assert page.evaluate('document.querySelector("#first .codebridge-host").shadowRoot.querySelector(".cb-code").style.fontSize')=='15px'
    # Switch to genuine low resource mode.
    page.evaluate('window.__setPrefs({performanceProfile:"low"})')
    page.wait_for_function('document.querySelector("#first .codebridge-host")?.shadowRoot.querySelector(".cb-code")?.dataset.compact==="low"')
    after=page.evaluate('''()=>{
      let h=document.querySelector('#first .codebridge-host');let r=h.shadowRoot;
      return {htmlNodes:r.querySelectorAll('*').length,glass:h.dataset.glass,code:r.querySelector('.cb-code').innerText,styleSheets:r.adoptedStyleSheets.length};
    }''')
    assert after['glass']=='off' and after['code']==ASM,after
    assert after['htmlNodes']<before['htmlNodes']/4,(before,after)
    assert after['styleSheets']==1,after
    page.evaluate('document.querySelector("#first .codebridge-host").shadowRoot.querySelector("button.primary").click()')
    page.wait_for_function('window.__clipboard.length>0')
    assert page.evaluate('window.__clipboard')==ASM
    # Dangerous HTML source should be displayed as literal text, never executed.
    evil='<!doctype html>\n<html>\n<script>window.__EXECUTED=true</script>\n<img src=x onerror="window.__EXECUTED=true">\n</html>'
    page.evaluate('''(s)=>window.__add('evil',s)''',evil)
    page.wait_for_function('document.querySelector("#evil .codebridge-host")')
    assert not page.evaluate('window.__EXECUTED')
    assert page.evaluate('document.querySelector("#evil .codebridge-host").shadowRoot.querySelector(".cb-code").innerText')==evil
    assert page.evaluate('document.querySelector("#evil .codebridge-host").shadowRoot.querySelectorAll("script,img").length')==0
    # The oversized payload must never create a partial card.
    huge='public class Large {\n'+('  public void test(){ System.out.println("x"); }\n'*1700)+'}'
    assert len(huge)>65536
    page.evaluate('''(s)=>window.__add('huge',s)''',huge)
    page.wait_for_timeout(350)
    assert page.locator('#huge .codebridge-host').count()==0
    assert page.locator('#huge .selectable-text').is_visible()
    # Ordinary messages are not changed.
    page.evaluate('''()=>window.__add('normal','Hola parce, mañana nos vemos en clase')''')
    page.wait_for_timeout(250)
    assert page.locator('#normal .codebridge-host').count()==0
    # Load 500 valid code messages in a batch to test bounded processing.
    t0=monotonic()
    page.evaluate('''({code,count})=>{
      const frag=document.createDocumentFragment();
      for(let i=0;i<count;i++){
        let b=document.createElement('article');b.className='message-in';
        let m=document.createElement('span');m.className='selectable-text';m.textContent=code;
        b.append(m);frag.append(b);
      }
      document.querySelector('#app').append(frag);
    }''',{'code':ASM,'count':500})
    page.wait_for_function('document.querySelectorAll(".codebridge-host").length===502',timeout=45000)
    elapsed=monotonic()-t0
    assert page.evaluate('document.querySelectorAll(".codebridge-host .cb-line").length')==0
    page.screenshot(path=str(ROOT/'docs/chat_low_v08.png'),full_page=False)
    # Navigate away; orphaned cards must be disposed and no message leaked into storage.
    page.evaluate('document.querySelector("#app").replaceChildren()')
    page.wait_for_function('document.querySelectorAll(".codebridge-host").length===0')
    page.evaluate('document.dispatchEvent(new Event("codebridge:disable"))')
    page.wait_for_function('window.__CODEBRIDGE_ON__===false')
    assert not errors,errors
    print(f'PASS v0.8: balanced nodes={before["htmlNodes"]}, Low Mode nodes={after["htmlNodes"]}; panel Low Mode, exact copy, safe HTML, oversized fallback, appearance-only updates, shared style, 500 messages in {elapsed:.2f}s, detach+disable')
    browser.close()
