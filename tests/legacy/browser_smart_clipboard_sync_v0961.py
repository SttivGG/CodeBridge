"""Simulación del estado de Smart Clipboard entre panel y chat: NO WhatsApp real."""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
CODE='''class CuentaBancaria:
    def __init__(self, titular, saldo):
        self.__saldo = saldo
    def __str__(self):
        return f"Cuenta de {self.titular}"'''

with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    page=browser.new_page()
    failures=[]
    page.on('pageerror',lambda e:failures.append(str(e)))
    page.set_content('''<!doctype html><html><head><style>#composer{white-space:pre-wrap}</style></head><body><main id="app"><footer><div id="composer" contenteditable="true"></div></footer></main></body></html>''')
    page.evaluate('''() => {
      window.__receiver=null; window.__pasted=[];
      window.chrome={
        runtime:{id:'test-extension',onMessage:{addListener:fn=>window.__receiver=fn,removeListener:()=>{}}},
        storage:{local:{get:async()=>({safePaste:true,uiMode:'dark',performanceProfile:'balanced',glassCards:false})},onChanged:{addListener:()=>{},removeListener:()=>{}}}
      };
      const editor=document.getElementById('composer');
      editor.addEventListener('paste',e=>{if(!e.defaultPrevented){editor.textContent=e.clipboardData.getData('text/plain');window.__pasted.push(editor.textContent);}});
      window.__paste=(value)=>{editor.focus();const data=new DataTransfer();data.setData('text/plain',value);const e=new ClipboardEvent('paste',{bubbles:true,cancelable:true,clipboardData:data});editor.dispatchEvent(e);return {prevented:e.defaultPrevented,content:editor.textContent};};
      window.__prepared=()=>{let response=null;window.__receiver({type:'codebridge:clipboard:prepared'},{id:'test-extension'},value=>response=value);return response;};
    }''')
    page.add_script_tag(path=str(ROOT/'whatsapp.js'))
    page.wait_for_timeout(200)
    # Unprotected paste -> should warn with manual recovery action.
    first=page.evaluate('(value)=>window.__paste(value)',CODE)
    assert not first['prevented'] and first['content']==CODE
    page.wait_for_selector('[data-codebridge-safe-paste-copy]')
    # Preparing in the panel after the paste -> remove redundant 'Copiar protegido'.
    assert page.evaluate('window.__prepared()')=={'ok':True}
    assert page.locator('[data-codebridge-safe-paste-tip]').count()==0
    # Protected paste directly into WhatsApp -> no prompt; exact text survives.
    next_paste=page.evaluate('(value)=>window.__paste(value)','```'+CODE+'```')
    assert not next_paste['prevented'] and next_paste['content']=='```'+CODE+'```'
    page.wait_for_timeout(160)
    assert page.locator('[data-codebridge-safe-paste-tip]').count()==0
    # A completely new unprotected snippet must STILL be warned, even after panel preparation.
    other=CODE.replace('CuentaBancaria','OtraCuenta')
    last=page.evaluate('(value)=>window.__paste(value)',other)
    assert not last['prevented'] and last['content']==other
    page.wait_for_selector('[data-codebridge-safe-paste-copy]')
    # Panel prepare signal arriving while the paste hint is pending cancels that hint.
    page.evaluate('(value)=>window.__paste(value)',other)
    assert page.evaluate('window.__prepared()')=={'ok':True}
    page.wait_for_timeout(180)
    assert page.locator('[data-codebridge-safe-paste-tip]').count()==0
    assert not failures,failures
    print('PASS v0.9.6.1: sin doble aviso, actualiza sugerencia antigua, preserva advertencia para código nuevo')
    browser.close()
