"""Synthetic comparative benchmark. Timings are environment-dependent; not CPU/RAM measurements.
Run: python tests/benchmark_modes.py
"""
from pathlib import Path
from time import monotonic
import json
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
ASM=(ROOT/'tests/fixtures/hola_mundo.asm').read_text(encoding='utf-8')

def run(browser,profile,count=250):
    page=browser.new_page()
    page.set_content('<style>.selectable-text{white-space:pre-wrap}</style><main id="app"></main>')
    page.evaluate('''profile=>{
        window.chrome={runtime:{id:'test',onMessage:{addListener:f=>window.__get=f,removeListener:()=>{}}},storage:{local:{get:async()=>({performanceProfile:profile,glassCards:false}),},onChanged:{addListener:()=>{},removeListener:()=>{}}}};
        window.__ask=()=>{let r;window.__get({type:'codebridge:diagnostics:get'},{id:'test'},v=>r=v);return r.diagnostics};
    }''',profile)
    page.add_script_tag(path=str(ROOT/'whatsapp.js'))
    start=monotonic()
    page.evaluate('''({asm,count})=>{
      const root=document.querySelector('#app'),frag=document.createDocumentFragment();
      for(let i=0;i<count;i++){const outer=document.createElement('article');outer.className='message-in';
         const inner=document.createElement('span');inner.className='selectable-text';inner.textContent=asm;
         outer.append(inner);frag.append(outer);}
      root.append(frag);
    }''',{'asm':ASM,'count':count})
    page.wait_for_function('(count)=>document.querySelectorAll(".codebridge-host").length===count',arg=count,timeout=45000)
    page.wait_for_function('window.__ask().pending===0',timeout=10000)
    elapsed=round((monotonic()-start)*1000,2)
    report=page.evaluate('window.__ask()')
    assert report['activeCards']==count
    page.close()
    return {'profile':profile,'messages':count,'wallMs':elapsed,'renderMeanMs':report['render']['meanMs'],'renderP95Ms':report['render']['p95Ms'],'failures':report['counters']['renderFailure']}

with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    rows=[run(browser,'balanced'),run(browser,'low')]
    print(json.dumps(rows,indent=2,ensure_ascii=False))
    browser.close()
