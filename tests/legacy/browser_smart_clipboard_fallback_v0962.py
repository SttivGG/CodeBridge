"""Regression: local storage event closes stale tip even if tabs.sendMessage fails.
Simulated DOM and browser APIs, NOT a claim about real WhatsApp availability.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
CODE='''class Producto:
    def __init__(self, nombre, precio):
        self.nombre = nombre
        self.precio = precio

    def __str__(self):
        return f"{self.nombre} - ${self.precio}"

item = Producto("Teclado", 45)
print(item)  # Salida: Teclado - $45'''
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1100,'height':720})
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content('<html><head><style>footer [contenteditable]{white-space:pre-wrap}</style></head><body><div id="app"><footer><div id="compose" contenteditable="true"></div></footer></div></body></html>')
    page.evaluate('''()=>{
      window.__storageEvents=[];
      window.__storeListener=null;
      window.chrome={runtime:{id:'test-ext',onMessage:{addListener:()=>{},removeListener:()=>{}}},storage:{local:{get:async()=>({safePaste:true})},onChanged:{addListener:f=>window.__storeListener=f,removeListener:()=>{}}}};
      const ed=document.querySelector('#compose');
      ed.addEventListener('paste',e=>{ed.textContent=e.clipboardData.getData('text/plain')});
      window.__paste=value=>{ed.focus();const d=new DataTransfer();d.setData('text/plain',value);ed.dispatchEvent(new ClipboardEvent('paste',{bubbles:true,cancelable:true,clipboardData:d}));};
      window.__notifyPrepared=()=>window.__storeListener({'codebridge.smartClipboardPreparedNotice':{oldValue:'old',newValue:'new'}},'local');
    }''')
    page.add_script_tag(path=str(R/'whatsapp.js'))
    page.wait_for_timeout(250)
    page.evaluate('(v)=>window.__paste(v)',CODE)
    page.wait_for_selector('[data-codebridge-safe-paste-copy]')
    # Direct messages are unavailable; only the storage.onChanged notification arrives.
    page.evaluate('()=>window.__notifyPrepared()')
    assert page.locator('[data-codebridge-safe-paste-tip]').count()==0
    page.evaluate('(v)=>window.__paste(v)','```'+CODE+'```')
    page.wait_for_timeout(180)
    assert page.locator('[data-codebridge-safe-paste-tip]').count()==0
    # Only actual new raw text can restore the fallback warning.
    page.evaluate('(v)=>window.__paste(v)',CODE.replace('Producto','Cuenta'))
    page.wait_for_selector('[data-codebridge-safe-paste-copy]')
    # storage signal between paste and delayed popup suppresses popup.
    page.evaluate('(v)=>window.__paste(v)',CODE)
    page.evaluate('()=>window.__notifyPrepared()')
    page.wait_for_timeout(180)
    assert page.locator('[data-codebridge-safe-paste-tip]').count()==0
    assert errors==[],errors
    print('PASS fallback v0.9.6.2: storage signal removes stale tip and pending notice; new raw paste still warns')
    browser.close()
