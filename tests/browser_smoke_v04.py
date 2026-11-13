"""CodeBridge v0.4: real Chromium DOM on simulated WhatsApp-style chat, NOT WhatsApp real."""
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
java="""public record Factura(Long id, String numeroFactura, UUID clienteId, UUID vendedorId,
        String clienteNombre, String clienteDocumento, Instant fechaEmision, LocalDate fechaVencimiento,
        ModalidadVenta modalidad, BigDecimal subtotal, BigDecimal impuestos, BigDecimal total,
        BigDecimal totalPagado, BigDecimal saldoPendiente, EstadoFactura estado,
        List<DetalleFactura> detalles, List<Pago> pagos) {
    public Factura {
        detalles = List.copyOf(detalles);
        pagos = List.copyOf(pagos);
    }
}"""
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page(viewport={"width":1280,"height":780})
    errors=[]
    page.on('pageerror',lambda e: errors.append(str(e)))
    page.add_init_script("""window.chrome={storage:{local:{get:async()=>({theme:'dark-plus',lineNumbers:true,wrap:false})},onChanged:{addListener:()=>{},removeListener:()=>{}}}};""")
    page.set_content('''<!doctype html><meta charset="UTF-8"><style>body{margin:0;background:#101b21;font:14px system-ui;color:#eef}#app{height:100vh;display:flex;justify-content:center}#main{width:850px;background:#1b2428;padding:20px}.message-out,.message-in{max-width:710px;margin:14px 10px 14px 90px;background:#005c4b;padding:11px;border-radius:8px}.message-in{background:#273641;margin-left:10px;margin-right:90px}.selectable-text{white-space:pre-wrap}</style><div id="app"><div id="main"><div class="message-out" id="first"><span class="selectable-text" id="firsttext"></span></div><div class="message-in" id="second"><span class="selectable-text" id="secondtext">Hola parce, nos vemos mañana</span></div></div></div>''')
    page.evaluate('(src)=>document.querySelector("#firsttext").textContent=src',java)
    page.add_script_tag(path=str(root/'whatsapp.js'))
    page.wait_for_timeout(400)
    first=page.locator('#first .codebridge-host')
    assert first.count()==1, 'Java not rendered inside chat'
    assert page.locator('#firsttext').evaluate('(el)=>el.style.display')=='none'
    assert page.locator('#second .codebridge-host').count()==0, 'Ordinary message incorrectly rendered'
    info=page.evaluate('''()=>{const r=document.querySelector('#first .codebridge-host').shadowRoot;return {code:r.querySelector('.cb-code').textContent,lines:r.querySelectorAll('.cb-line').length,buttons:[...r.querySelectorAll('button')].map(x=>x.textContent)} }''')
    assert info['code'].replace('\n','')==java.replace('\n',''),repr(info['code'])
    assert info['lines']==len(java.split('\n'))
    assert 'Copiar código' in info['buttons'] and 'Ver original' in info['buttons']
    # Copy button returns the exact code as exposed by WhatsApp, not an image.
    page.evaluate('''()=>{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.__copiedCode=text}}})}''')
    page.evaluate('''()=>document.querySelector('#first .codebridge-host').shadowRoot.querySelectorAll('button')[0].click()''')
    page.wait_for_timeout(60)
    assert page.evaluate('window.__copiedCode')==java, 'Copy button changed the original code'
    # A new chat message arriving *after* script initialization gets a card.
    page.evaluate('''(src)=>{const bubble=document.createElement('div');bubble.className='message-in';bubble.id='new';const code=document.createElement('span');code.className='selectable-text';code.textContent=src;bubble.append(code);document.querySelector('#main').append(bubble)}''',java)
    page.wait_for_timeout(450)
    assert page.locator('#new .codebridge-host').count()==1, 'Incoming code not auto-detected'
    # Original can be exposed then hidden without leaving the conversation.
    page.evaluate('''()=>document.querySelector('#first .codebridge-host').shadowRoot.querySelectorAll('button')[1].click()''')
    assert page.locator('#firsttext').evaluate('(el)=>el.style.display') != 'none'
    # Virtualized message reused for ordinary prose: old rendering must go away.
    page.evaluate('''()=>document.querySelector('#firsttext').textContent='Hola parce, ahora es texto normal' ''')
    page.wait_for_timeout(420)
    assert page.locator('#first .codebridge-host').count()==0, 'Stale code card remained after message change'
    assert page.locator('#firsttext').evaluate('(el)=>el.style.display') != 'none'
    # Code pasted into composer remains unmodified: CodeBridge registers no paste handler.
    paste=page.evaluate('''()=>{const editor=document.createElement('div');editor.contentEditable='true';document.body.append(editor);const dt=new DataTransfer();dt.setData('text/plain','const total = 3;\\nconsole.log(total);');const e=new ClipboardEvent('paste',{bubbles:true,cancelable:true,clipboardData:dt});editor.dispatchEvent(e);return e.defaultPrevented}''')
    assert paste is False, 'CodeBridge should not intercept normal WhatsApp paste'
    assert not errors,errors
    (root/'docs').mkdir(exist_ok=True)
    page.screenshot(path=str(root/'docs/simulacion_v04.png'),full_page=True)
    print('OK: new/outgoing messages, no regular chat hijack, original toggle, DOM reuse, native paste untouched')
    browser.close()
