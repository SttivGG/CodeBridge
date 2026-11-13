"""CodeBridge v0.9: local diagnostics and regression in a simulated WhatsApp DOM.
Not a live WhatsApp/Edge test. The metrics are numeric, tab-local, and resettable.
"""
from pathlib import Path
import json
import re
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
ASM=(ROOT/'tests/fixtures/hola_mundo.asm').read_text(encoding='utf-8')
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    errors=[]
    page=browser.new_page(viewport={'width':1190,'height':810})
    page.on('pageerror',lambda error:errors.append('chat: '+str(error)))
    page.set_content('''<!doctype html><html lang="es"><style>
        body{background:#121e20;color:#fff;font:14px sans-serif}#app{max-width:950px;margin:auto}
        .message-in{background:#22503e;border-radius:12px;margin:10px 0;padding:14px}
        .selectable-text{white-space:pre-wrap}
    </style><main id="app"></main></html>''')
    page.evaluate('''() => {
      window.__prefs={performanceProfile:'balanced',uiMode:'dark',theme:'dracula',lineNumbers:true,wrap:false,fontSize:13,maxHeight:420,glassBlur:20,glassOpacity:80,glassCards:false};
      window.__storeEvents=[];window.__receiver=null;window.__copied='';
      window.chrome={runtime:{id:'codebridge-test',onMessage:{addListener:fn=>window.__receiver=fn,removeListener:fn=>{if(window.__receiver===fn)window.__receiver=null;}}},
        storage:{local:{get:async keys=>Object.fromEntries(keys.map(k=>[k,window.__prefs[k]]))},onChanged:{addListener:fn=>window.__storeEvents.push(fn),removeListener:()=>{}}}};
      Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>window.__copied=text}});
      window.__add=(id,code)=>{const bubble=document.createElement('article');bubble.id=id;bubble.className='message-in';
        const msg=document.createElement('span');msg.className='selectable-text';msg.textContent=code;bubble.append(msg);document.querySelector('#app').append(bubble);};
      window.__ask=(type)=>{let response;window.__receiver({type},{id:'codebridge-test'},v=>response=v);return response;};
    }''')
    source='public class Perf {\n private String secret="API_TOKEN=super-secret-123";\n}\n'
    page.evaluate('''([code,asm])=>{window.__add('source',code);window.__add('asm',asm);}''',[source,ASM])
    page.add_script_tag(path=str(ROOT/'whatsapp.js'))
    page.wait_for_function('document.querySelectorAll(".codebridge-host").length===2')
    report=page.evaluate('window.__ask("codebridge:diagnostics:get").diagnostics')
    assert report['activeCards']==2,report
    assert report['counters']['rendered']==2,report
    assert report['render']['samples']==2,report
    assert report['counters']['inspected']>=2,report
    page.wait_for_function('window.__ask("codebridge:diagnostics:get").diagnostics.pending===0')
    for forbidden in ['super-secret-123','API_TOKEN','Perf','mensaje','_start','section .data']:
        assert forbidden not in json.dumps(report),forbidden
    page.evaluate('document.querySelector("#asm .codebridge-host").shadowRoot.querySelector("button.primary").click()')
    page.wait_for_function('window.__copied.length>0')
    assert page.evaluate('window.__copied')==ASM
    assert page.evaluate('window.__ask("codebridge:diagnostics:get").diagnostics.counters.copySuccess')==1
    # Overlarge code is not transformed or sent to diagnostics.
    huge='public class Big {\n'+('int value=0;\n'*6000)+'}'
    page.evaluate('''s=>window.__add('huge',s)''',huge)
    page.wait_for_function('window.__ask("codebridge:diagnostics:get").diagnostics.counters.oversized>0')
    assert page.locator('#huge .codebridge-host').count()==0
    assert 'Big' not in json.dumps(page.evaluate('window.__ask("codebridge:diagnostics:get").diagnostics'))
    # Removing messages releases the map and reports zero active cards.
    page.evaluate('document.querySelector("#app").replaceChildren()')
    page.wait_for_function('window.__ask("codebridge:diagnostics:get").diagnostics.activeCards===0')
    assert page.evaluate('window.__ask("codebridge:diagnostics:get").diagnostics.counters.detached')>=2
    # Reset clears metrics without touching the original chat.
    reset=page.evaluate('window.__ask("codebridge:diagnostics:reset").diagnostics')
    assert reset['activeCards']==0 and reset['render']['samples']==0 and reset['counters']['rendered']==0,reset
    # Panel test: a sanitized response is rendered and safely copied.
    panel=browser.new_page(viewport={'width':520,'height':920})
    panel.on('pageerror',lambda error:errors.append('panel: '+str(error)))
    panel.set_content((ROOT/'sidepanel.html').read_text(encoding='utf-8'))
    panel.add_style_tag(content=(ROOT/'styles.css').read_text(encoding='utf-8'))
    panel.evaluate('''() => {
      window.__clipboard='';window.__prefs={};
      window.chrome={storage:{local:{get:async()=>({}),set:async data=>Object.assign(window.__prefs,data)}},
        scripting:{getRegisteredContentScripts:async()=>[]},
        tabs:{query:async()=>[{id:1}],sendMessage:async(id,request)=>({ok:true,diagnostics:{version:1,profile:'low',sessionSeconds:45,activeCards:5,pending:0,counters:{inspected:120,rendered:20,restored:2,detached:0,expansion:3,oversized:1,copySuccess:1,copyFailure:0,renderFailure:0},render:{samples:20,meanMs:3.25,p95Ms:4.88,maxMs:6.5},batch:{samples:8,meanMs:6.2,p95Ms:9.2,maxMs:11}}})},
        permissions:{request:async()=>true}};
      Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async x=>window.__clipboard=x}});
    }''')
    js='\n'.join(re.sub(r'^export\s+', '',re.sub(r'^import\s+.*?;\s*$', '',(ROOT/name).read_text(encoding='utf-8'),flags=re.MULTILINE),flags=re.MULTILINE) for name in ['core.js','visual.js','highlight.js','message.js','smart-clipboard.js','app.js'])
    panel.add_script_tag(content=js)
    panel.wait_for_function('document.querySelector("#diag-cards").textContent==="5"')
    assert panel.locator('#diag-render').inner_text()=='3.25 ms'
    assert panel.locator('#diag-p95').inner_text()=='4.88 ms'
    panel.locator('#diag-copy').click()
    panel.wait_for_function('window.__clipboard.includes("renderFailure")')
    assert 'secret' not in panel.evaluate('window.__clipboard')
    panel.screenshot(path=str(ROOT/'docs/panel_diagnostico_v09.png'),full_page=True)
    assert not errors,errors
    print('PASS v0.9: numerical diagnostics, no code leakage, render timings, copy counts, oversize fallback, detach cleanup, reset, panel UI, local report')
    browser.close()
