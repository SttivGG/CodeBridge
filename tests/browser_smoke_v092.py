"""v0.9.2: manual conversion of unrecognized text and language picker inside cards."""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
PYTHON='''from flask import Flask
app = Flask(__name__)
if __name__ == '__main__':
    app.run(debug=True)'''
UNRECOGNIZED='someMethod(a, b)'
JAVA='import org.springframework.stereotype.Component;'
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1300,'height':900})
    errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.set_content('<!doctype html><html><style>.selectable-text{white-space:pre-wrap}</style><main id="app"></main></html>')
    page.evaluate('''() => {
      window.__copied='';window.__receiver=null;window.__parentClicks=0;
      window.chrome={runtime:{id:'test-extension',onMessage:{addListener:f=>window.__receiver=f,removeListener:()=>{}}},
        storage:{local:{get:async keys=>({performanceProfile:'balanced',uiMode:'dark',theme:'dark-plus',lineNumbers:true,wrap:false,fontSize:13,maxHeight:420,glassCards:false})},onChanged:{addListener:()=>{},removeListener:()=>{}}}};
      Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>window.__copied=text}});
      document.querySelector('#app').addEventListener('click',()=>window.__parentClicks++);
      window.__add=(id,code)=>{const bubble=document.createElement('article');bubble.id=id;bubble.className='message-in';
        const span=document.createElement('span');span.className='selectable-text';span.textContent=code;
        bubble.appendChild(span);document.querySelector('#app').appendChild(bubble);};
    }''')
    page.evaluate('''a=>{window.__add('unknown',a[0]);window.__add('java',a[1]);window.__add('normal',a[2]);}''',[UNRECOGNIZED,JAVA,'Mañana revisamos el informe.'])
    page.add_script_tag(path=str(ROOT/'whatsapp.js'))
    page.wait_for_function('document.querySelectorAll(".codebridge-host").length===1',timeout=6000)
    assert page.locator('#unknown .codebridge-host').count()==0
    page.locator('#unknown .selectable-text').hover()
    picker=page.locator('#unknown .codebridge-manual-picker')
    picker.wait_for(state='visible',timeout=2000)
    # Native control exists only for currently-hovered bubble.
    assert page.locator('.codebridge-manual-picker').count()==1
    picker.select_option('javascript')
    page.wait_for_function('document.querySelector("#unknown .codebridge-host")!==null',timeout=4000)
    lang=page.evaluate('''() => document.querySelector('#unknown .codebridge-host').shadowRoot.querySelector('.lang').textContent''')
    assert lang=='JAVASCRIPT',lang
    # User can recategorize existing automatically rendered Java card in-place.
    page.evaluate('''() => document.querySelector('#java .codebridge-host').shadowRoot.querySelector('select.language-select').value='python' ''')
    page.evaluate('''() => {const sel=document.querySelector('#java .codebridge-host').shadowRoot.querySelector('select.language-select');sel.dispatchEvent(new Event('change',{bubbles:true}));}''')
    lang=page.evaluate('''() => document.querySelector('#java .codebridge-host').shadowRoot.querySelector('.lang').textContent''')
    assert lang=='PYTHON',lang
    # Exact copy even though the manual language differs from the heuristically detected one.
    page.evaluate('''() => document.querySelector('#java .codebridge-host').shadowRoot.querySelector('.primary').click()''')
    page.wait_for_function('expected=>window.__copied===expected',arg=JAVA)
    page.evaluate('''() => document.querySelector('#unknown .codebridge-host').shadowRoot.querySelector('.primary').click()''')
    page.wait_for_function('expected=>window.__copied===expected',arg=UNRECOGNIZED)
    # Restore an unrecognized message by selecting automatic detection.
    page.evaluate('''() => {const sel=document.querySelector('#unknown .codebridge-host').shadowRoot.querySelector('select.language-select');sel.value='auto';sel.dispatchEvent(new Event('change',{bubbles:true}));}''')
    page.wait_for_function('document.querySelector("#unknown .codebridge-host")===null',timeout=4000)
    assert page.locator('#unknown .selectable-text').inner_text()==UNRECOGNIZED
    assert page.locator('#normal .codebridge-host').count()==0
    report=page.evaluate('''() => {let r;window.__receiver({type:'codebridge:diagnostics:get'},{id:'test-extension'},x=>r=x);return r.diagnostics;}''')
    assert report['counters']['renderFailure']==0,report
    assert not errors,errors
    print('PASS v0.9.2: conversion manual, recategorización en tarjeta, copias exactas y sin errores')
    browser.close()
