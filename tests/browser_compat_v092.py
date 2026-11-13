"""Chrome/Edge/Chromium compatibility smoke for CodeBridge v0.9.2.

Run locally:
    python tests/browser_compat_v092.py
    CB_BROWSER_CHANNELS=chrome,msedge python tests/browser_compat_v092.py

The script records unavailable browsers as SKIP, not PASS.
"""
import os
import shutil
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
SAMPLE='''section .data
    mensaje db "Hola mundo!", 10
section .text
    global _start
_start:
    mov rax, 1
    syscall'''


def test_browser(browser, channel):
    for width, height in [(1280, 820), (760, 700)]:
        page=browser.new_page(viewport={'width':width,'height':height})
        errors=[]
        page.on('pageerror',lambda err:errors.append(str(err)))
        page.set_content('<!doctype html><html><style>.selectable-text{white-space:pre-wrap}</style><main id="app"></main></html>')
        page.evaluate('''text=>{
          window.__copied='';window.__prefs={performanceProfile:'balanced',uiMode:'dark',theme:'dark-plus',lineNumbers:true,wrap:false,fontSize:13,maxHeight:420,glassCards:false};
          window.__storageHandler=null;
          window.chrome={runtime:{id:'codebridge-test',onMessage:{addListener:()=>{},removeListener:()=>{}}},
            storage:{local:{get:async()=>window.__prefs},onChanged:{addListener:fn=>window.__storageHandler=fn,removeListener:()=>{}}}};
          Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>window.__copied=value}});
          const bubble=document.createElement('article');bubble.className='message-in';bubble.id='code';
          const span=document.createElement('span');span.className='selectable-text';span.textContent=text;
          bubble.appendChild(span);document.querySelector('#app').appendChild(bubble);
        }''',SAMPLE)
        page.add_script_tag(path=str(ROOT/'whatsapp.js'))
        page.wait_for_function('document.querySelector("#code .codebridge-host")!==null',timeout=6000)
        page.evaluate('''() => document.querySelector('#code .codebridge-host').shadowRoot.querySelector('button.primary').click()''')
        page.wait_for_function('sample=>window.__copied===sample',arg=SAMPLE)
        # The Low Mode profile is loaded before rescanning and renders as one text node.
        page.evaluate('''() => {window.__prefs.performanceProfile='low';window.__storageHandler?.({performanceProfile:{newValue:'low'}},'local');}''')
        page.wait_for_function('document.querySelector("#code .codebridge-host")?.dataset.performance==="low"',timeout=6000)
        data=page.evaluate('''() => {
          const root=document.querySelector('#code .codebridge-host').shadowRoot;
          return {code:root.querySelector('.cb-code')?.textContent,compact:root.querySelector('.cb-code')?.dataset.compact};
        }''')
        assert data['code']==SAMPLE and data['compact']=='low',(channel,width,data)
        assert not errors,(channel,width,errors)
        page.close()
    print(f'PASS {channel}: dos tamaños de pantalla, ASM, copia exacta y Low Mode')


def main():
    channels=[c.strip() for c in os.getenv('CB_BROWSER_CHANNELS','chromium,chrome,msedge').split(',') if c.strip()]
    passed=[];skipped=[];failed=[]
    with sync_playwright() as p:
        for channel in channels:
            if channel not in {'chromium','chrome','msedge'}:
                failed.append((channel,'Canal desconocido'));continue
            try:
                options={'headless':True,'args':['--no-sandbox']}
                if channel=='chromium':
                    binary=os.getenv('CB_CHROMIUM_PATH') or shutil.which('chromium') or shutil.which('chromium-browser')
                    if binary: options['executable_path']=binary
                    else: options['channel']='chromium'
                else: options['channel']=channel
                browser=p.chromium.launch(**options)
            except Exception as e:
                skipped.append(channel)
                print(f'SKIP {channel}: navegador no instalado o no ejecutable')
                continue
            try:
                test_browser(browser,channel);passed.append(channel)
            except Exception as e:
                failed.append((channel,str(e)));print(f'FAIL {channel}: {e}')
            finally:
                browser.close()
    print(f'Resumen: {len(passed)} aprobados; {len(skipped)} omitidos; {len(failed)} fallidos')
    if not passed or failed:sys.exit(1)

if __name__=='__main__':main()
