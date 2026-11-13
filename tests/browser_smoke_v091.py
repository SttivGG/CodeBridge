"""v0.9.1: MongoDB, Java imports and Python snippets in simulated WhatsApp Web."""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
MONGO='''db.pedidos.aggregate([
  { $match: { $and: [
    {"segmento_cliente":"premium"},
    {"region":"Andina"},
    {$or:[{"categoria":"deporte"},{"categoria":"hogar"}]},
    {"costo_envio":{$gt:11000}}
  ]}},
  { $project: {"_id":0,"segmento_cliente":1,"region":1,"categoria":1,"costo_envio":1}}
]);'''
JAVA='''import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;'''
PYTHON='''from flask import Flask
from pymongo import MongoClient
import redis
app = Flask(__name__)
mongo_client = MongoClient("mongodb://localhost:27017")
cache = redis.Redis(host="localhost", port=6379)'''
PROSE='Por favor, explíquenme db.pedidos.aggregate cuando podamos.'
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    page=browser.new_page()
    errors=[]
    page.on('pageerror',lambda e: errors.append(str(e)))
    page.set_content('<!doctype html><html><style>.selectable-text{white-space:pre-wrap}</style><main id="app"></main></html>')
    page.evaluate('''() => {
      window.__copied='';window.__receiver=null;
      window.chrome={runtime:{id:'test-extension',onMessage:{addListener:f=>window.__receiver=f,removeListener:()=>{}}},
        storage:{local:{get:async keys=>({performanceProfile:'balanced',uiMode:'dark',theme:'dark-plus',lineNumbers:true,wrap:false,fontSize:13,maxHeight:420,glassCards:false})},onChanged:{addListener:()=>{},removeListener:()=>{}}}};
      Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>window.__copied=text}});
      window.__add=(id,code)=>{const parent=document.createElement('article');parent.id=id;parent.className='message-in';
        const text=document.createElement('span');text.className='selectable-text';text.textContent=code;parent.appendChild(text);document.querySelector('#app').appendChild(parent);};
    }''')
    page.evaluate('''a=>{window.__add('mongo',a[0]);window.__add('java',a[1]);window.__add('python',a[2]);window.__add('prose',a[3]);}''',[MONGO,JAVA,PYTHON,PROSE])
    page.add_script_tag(path=str(ROOT/'whatsapp.js'))
    try:
        page.wait_for_function('document.querySelectorAll(".codebridge-host").length===3',timeout=4500)
    except Exception:
        print('DEBUG',page.evaluate('''() => ({count:document.querySelectorAll('.codebridge-host').length,bubbles:[...document.querySelectorAll('.message-in')].map(el=>({id:el.id,card:!!el.querySelector('.codebridge-host')})),active:window.__CODEBRIDGE_ON__})'''),errors)
        raise
    for ident,language,expected in [('mongo','MONGODB',MONGO),('java','JAVA',JAVA),('python','PYTHON',PYTHON)]:
      assert page.locator(f'#{ident} .codebridge-host').count()==1,ident
      actual_lang=page.evaluate('''id=>document.querySelector(`#${id} .codebridge-host`).shadowRoot.querySelector('.lang').textContent''',ident)
      assert actual_lang==language,(ident,actual_lang)
      page.evaluate('''id=>document.querySelector(`#${id} .codebridge-host`).shadowRoot.querySelector('button.primary').click()''',ident)
      page.wait_for_function('(expected)=>window.__copied===expected',arg=expected)
    assert page.locator('#prose .codebridge-host').count()==0
    report=page.evaluate('''() => {let v;window.__receiver({type:'codebridge:diagnostics:get'},{id:'test-extension'},x=>v=x);return v.diagnostics;}''')
    assert report['counters']['renderFailure']==0,report
    assert report['activeCards']==3,report
    assert not errors,errors
    print('PASS v0.9.1: MongoDB, Java imports, Python code in cards; exact copy; prose untouched; zero render errors')
    browser.close()
