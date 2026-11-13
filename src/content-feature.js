/* CodeBridge v0.9.6.4 — Smart Clipboard is the sole protection workflow.
   Incremental DOM queue prevents rescanning every chat bubble on every message mutation. */
// The old content script may still be running after an extension update.
// A synchronous disable event asks it to release its observers and overlays.
// This cannot stop other separately installed extension IDs: remove those in chrome://extensions.
if (window.__CODEBRIDGE_ON__ && window.__CODEBRIDGE_CONTENT_VERSION !== '0.9.6.4') {
  document.dispatchEvent(new CustomEvent('codebridge:disable'));
}
if (window.__CODEBRIDGE_ON__) {
  document.dispatchEvent(new CustomEvent('codebridge:rescan'));
} else {
  window.__CODEBRIDGE_ON__ = true;
  window.__CODEBRIDGE_CONTENT_VERSION = '0.9.6.4';
  const BUBBLES = '.message-in, .message-out, [data-testid="msg-container"]';
  const observerRoot = document.querySelector('#app') || document.body;
  const states = new Map();
  const expansion = new WeakMap();
  // Only the chosen language is held per DOM node, never an additional copy
  // of a conversation or snippet. Entries disappear when the DOM is collected.
  const manualOverrides = new WeakMap();
  let manualBubble=null, manualPicker=null, manualPreviousPosition='';
  const pendingBubbles = new Set();
  const diagnostics=createDiagnosticStore();
  let active=true, timer=null;
  const retryTimers=new Set();
  let pruneNeeded=false;
  let lastGlassSetting=null;
  let preferences=normalizePreferences();
  const mediaQuery=window.matchMedia?.('(prefers-color-scheme: dark)');
  // Smart Clipboard is the only preparation workflow in this experimental build.
  // The legacy paste-warning overlay has been removed, not merely suppressed.
  // Ctrl+V belongs entirely to WhatsApp. An unprepared paste is NOT protected.
  const CLIPBOARD_NOTICE_KEY='codebridge.smartClipboardPreparedNotice';
  function clearLegacyPasteNotice(){
    // Clean up overlays left behind by older versions in the current document.
    for(const element of document.querySelectorAll('[data-codebridge-safe-paste-tip],[data-codebridge-paste-warning]')){
      element.remove();
    }
  }
  clearLegacyPasteNotice();
  function onClipboardPrepared(){ clearLegacyPasteNotice(); }

  const cardCss = `
    :host{display:block;min-width:0;max-width:100%;margin:5px 0;--accent:#f58136;--accent-hover:#ff954f;font:13px/1.5 Urbanist,'Segoe UI',system-ui,sans-serif;color:var(--cb-text)}
    :host([data-ui="dark"]){--cb-text:#f1efed;--cb-muted:#c4bfba;--cb-panel:rgba(41,39,37,var(--cb-opacity,.75));--cb-solid:#292725;--cb-raised:rgba(53,49,46,.80);--cb-border:rgba(255,246,238,.18);--cb-input:rgba(49,46,43,.82);--cb-accent-text:#ffae78;--cb-shadow:0 12px 25px -18px #000b}
    :host([data-ui="light"]){--cb-text:#202020;--cb-muted:#625e5c;--cb-panel:rgba(246,246,245,var(--cb-opacity,.75));--cb-solid:#f6f6f5;--cb-raised:rgba(234,232,229,.80);--cb-border:rgba(66,48,37,.17);--cb-input:rgba(255,255,255,.8);--cb-accent-text:#9c4312;--cb-shadow:0 12px 26px -18px #30271d91}
    *{box-sizing:border-box}
    .card{max-width:100%;min-width:0;overflow:hidden;border:1px solid var(--cb-border);border-radius:17px;background:var(--cb-panel);box-shadow:var(--cb-shadow);position:relative;isolation:isolate}
    :host([data-glass="on"]) .card{backdrop-filter:blur(var(--cb-glass-blur,12px)) saturate(1.17);-webkit-backdrop-filter:blur(var(--cb-glass-blur,12px)) saturate(1.17)}
    :host([data-glass="off"]) .card{background:var(--cb-solid)}
    .card:before{content:"";position:absolute;inset:0 0 auto;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.36),transparent);pointer-events:none;z-index:1}
    .header{display:flex;align-items:center;gap:9px;min-height:43px;padding:7px 11px;background:linear-gradient(112deg,rgba(245,129,54,.12),transparent 58%),var(--cb-raised);color:var(--cb-text);border-bottom:1px solid var(--cb-border)}
    .file-icon{display:grid;place-items:center;width:25px;height:25px;flex:none;border-radius:8px;background:var(--accent);color:#202020;font:800 11px Consolas,monospace}
    .file{font-size:12px;font-weight:700;letter-spacing:-.1px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .language-select{appearance:auto;max-width:125px;min-width:78px;border:1px solid var(--cb-border);border-radius:8px;padding:4px 5px;font:600 10px Urbanist,'Segoe UI',sans-serif;color:var(--cb-text);background:var(--cb-input);cursor:pointer}
    .language-select:focus-visible{outline:2px solid var(--cb-accent-text);outline-offset:2px}
    .lang{font-size:10px;font-weight:750;letter-spacing:.4px;color:var(--cb-accent-text);background:var(--cb-input);border:1px solid var(--cb-border);border-radius:8px;padding:4px 7px;white-space:nowrap}
    .codeview{max-height:var(--cb-max-height,420px);overflow:auto;overscroll-behavior:contain;user-select:text;-webkit-user-select:text;background:#1e1e1e}
    .cb-code{margin:0;padding:14px;line-height:1.65;font-family:Consolas,'Cascadia Code','JetBrains Mono',monospace;tab-size:4;user-select:text;-webkit-user-select:text}
    .cb-line{display:inline;min-height:1.65em}.cb-line-numbered{padding-left:40px;position:relative}
    .cb-line-numbered::before{content:attr(data-line);position:absolute;left:0;width:29px;text-align:right;color:var(--cb-ln);user-select:none;-webkit-user-select:none}
    .tools{display:flex;align-items:center;gap:7px;padding:9px 11px;border-top:1px solid var(--cb-border);background:var(--cb-panel);flex-wrap:wrap}
    .status{font-size:10px;color:var(--cb-muted);flex:1;min-width:90px}
    button{border:1px solid var(--cb-border);background:var(--cb-input);color:var(--cb-text);border-radius:10px;padding:7px 10px;cursor:pointer;font:700 11px Urbanist,'Segoe UI',system-ui,sans-serif;transition:background-color .2s,color .2s}
    button.primary{background:var(--accent);color:#202020;border-color:transparent}
    button:hover{background:var(--cb-raised)}button.primary:hover{background:var(--accent-hover)}button:focus-visible{outline:2px solid var(--cb-accent-text);outline-offset:2px}
    .warn{padding:7px 11px;color:var(--cb-accent-text);background:var(--cb-raised);font-size:10px}
    :host([data-performance="low"]) .card{box-shadow:none;border-radius:10px;background:var(--cb-solid)}
    :host([data-performance="low"]) .card:before{display:none}
    :host([data-performance="low"]) .header,:host([data-performance="low"]) .tools{background:var(--cb-solid)}
    :host([data-performance="low"]) button{transition:none}
    :host([data-performance="low"]) .cb-code{line-height:1.45}
    @media(prefers-reduced-transparency:reduce){.card{backdrop-filter:none!important;-webkit-backdrop-filter:none!important;background:var(--cb-solid)}}
    @supports not ((backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px))){.card{background:var(--cb-solid)}}
    @media (prefers-reduced-motion:reduce){button{transition:none}}
  `;
  // Construct once: reusing a stylesheet across ShadowRoots avoids parsing many
  // identical 4–6 KB CSS blocks in a long conversation.
  let sharedCardStyle=null;
  try{if(typeof CSSStyleSheet==='function'){
    sharedCardStyle=new CSSStyleSheet();sharedCardStyle.replaceSync(cardCss);
  }}catch{sharedCardStyle=null;}
  const currentUi=()=>resolveUiMode(preferences.uiMode,Boolean(mediaQuery?.matches));
  function scheduleRetry(bubble,delay){
    const id=setTimeout(()=>{retryTimers.delete(id);queueBubble(bubble);},delay);
    retryTimers.add(id);
  }
  function signatureFor(value){
    // No second copy of message bodies retained in states. Hash is only a
    // DOM-change hint, NOT a cryptographic integrity check.
    let a=2166136261,b=5381;
    for(let i=0;i<value.length;i++){
      const n=value.charCodeAt(i);
      a=Math.imul(a^n,16777619);b=(Math.imul(b,33)^n)>>>0;
    }
    return value.length+':'+(a>>>0)+':'+(b>>>0);
  }

  async function loadPrefs(){
    try{
      const values=await chrome.storage.local.get(Object.keys(DEFAULT_PREFERENCES));
      const next=normalizePreferences(values);
      const changed=Object.keys(DEFAULT_PREFERENCES).some(key=>next[key]!==preferences[key]);
      const previous=preferences;
      preferences=next;
      if(changed){
        if(needsRerender(previous,next)){resetCards();queueInitialScan();}
        else refreshAppearance();
      }
    }catch{/* Local simulator without Chrome APIs */}
  }
  function originalNode(bubble){
    return bubble.querySelector('div.copyable-text span.selectable-text, span.selectable-text.copyable-text, span.selectable-text, div.selectable-text, [data-testid="msg-text"]');
  }
  function readText(original){
    const visible=original.innerText;
    if(typeof visible==='string'&&visible.trim())return visible.replace(/\r\n?/g,'\n');
    function walk(node){
      if(node.nodeType===Node.TEXT_NODE)return node.nodeValue||'';
      if(node.nodeType!==Node.ELEMENT_NODE)return '';
      if(node.tagName==='BR')return '\n';
      let result='';for(const child of node.childNodes)result+=walk(child);
      if(node!==original&&/^(DIV|P)$/.test(node.tagName))result+='\n';
      return result;
    }
    return walk(original);
  }
  function clipboardFallback(code){
    const textarea=document.createElement('textarea');textarea.value=code;
    textarea.setAttribute('aria-hidden','true');textarea.style.cssText='position:fixed;left:-10000px;top:-10000px;opacity:0';
    document.body.appendChild(textarea);textarea.select();
    try{return document.execCommand('copy');}finally{textarea.remove();}
  }
  async function copyCode(code,status){
    try{await navigator.clipboard.writeText(code);status.textContent='Código copiado ✓';diagnostics.add('copySuccess');}
    catch{const copied=clipboardFallback(code);status.textContent=copied?'Código copiado ✓':'Selecciona y copia manualmente';diagnostics.add(copied?'copySuccess':'copyFailure');}
  }
  function restore(original,entry){
    if(original.isConnected){original.style.display=entry.prevDisplay;delete original.dataset.codebridgeEnhanced;}
    entry.host.remove();states.delete(original);diagnostics.add('restored');
  }
  function resetCards(){for(const [original,entry] of Array.from(states))restore(original,entry);}
  function waitForFullMessage(bubble,original){
    const more=findReadMoreControl(bubble);
    if(more){
      const current=states.get(original);if(current)restore(original,current);
      const prefix=readText(original);
      if(!manualOverrides.has(original)&&!likelyCodePrefix(prefix)&&!recognizeChatCode(prefix))return true;
      let pending=expansion.get(bubble);
      if(!pending||!prefix.startsWith(pending.prefix)){
        pending={prefix:prefix.slice(0,80),beforeLength:prefix.length,lastLength:prefix.length,tries:0,clickedAt:0};expansion.set(bubble,pending);
      }
      if(pending.tries<2&&Date.now()-pending.clickedAt>450){
        pending.tries++;pending.clickedAt=Date.now();pending.beforeLength=Math.max(pending.beforeLength,prefix.length);
        more.click();diagnostics.add('expansion');scheduleRetry(bubble,550);
      }
      return true;
    }
    const pending=expansion.get(bubble);
    if(pending){
      const full=readText(original);
      if(full.length<=pending.beforeLength&&full.startsWith(pending.prefix)){
        if(Date.now()-pending.clickedAt<1700)scheduleRetry(bubble,300);
        return true;
      }
      expansion.delete(bubble);
    }
    return false;
  }
  function decorate(bubble){
    const original=originalNode(bubble);
    if(!original||original.closest('.codebridge-host'))return;
    if(waitForFullMessage(bubble,original))return;
    const current=states.get(original);
    const text=original.textContent||'';
    // Fail closed rather than deeply processing hostile/oversized messages.
    // CodeBridge leaves the original WhatsApp bubble untouched in that case.
    if(text.length>MAX_CHAT_TEXT){diagnostics.add('oversized');if(current)restore(original,current);return;}
    const signature=signatureFor(text);
    if(current&&current.signature===signature)return;
    if(current)restore(original,current);
    const raw=readText(original);
    if(raw.length>MAX_CHAT_TEXT){diagnostics.add('oversized');return;}
    const data=resolveCardContent(raw,manualOverrides.get(original));if(!data)return;
    const renderStarted=performance.now();
    const host=document.createElement('div');host.className='codebridge-host';host.dataset.codebridge='render';
    host.dataset.ui=currentUi();
    host.dataset.performance=preferences.performanceProfile;
    host.style.setProperty('--cb-glass-blur',preferences.glassBlur+'px');
    host.style.setProperty('--cb-opacity',String(preferences.glassOpacity/100));
    const root=host.attachShadow({mode:'open'});
    if(sharedCardStyle){
      try{root.adoptedStyleSheets=[sharedCardStyle];}catch{sharedCardStyle=null;}
    }
    if(!sharedCardStyle){const style=document.createElement('style');style.textContent=cardCss;root.appendChild(style);}
    const card=document.createElement('section');card.className='card';card.setAttribute('aria-label','Código CodeBridge');
    const head=document.createElement('div');head.className='header';
    const fileIcon=document.createElement('span');fileIcon.className='file-icon';fileIcon.textContent='{ }';
    const label=document.createElement('span');label.className='file';label.textContent=data.filename||'Fragmento de código';
    const language=document.createElement('span');language.className='lang';language.textContent=data.language.toUpperCase();
    const picker=document.createElement('select');picker.className='language-select';
    picker.setAttribute('aria-label','Cambiar lenguaje de este fragmento');
    const autoOption=document.createElement('option');autoOption.value='auto';autoOption.textContent='Detección automática';picker.appendChild(autoOption);
    for(const [id,name] of MANUAL_LANGUAGES){
      const option=document.createElement('option');option.value=id;option.textContent=name;
      picker.appendChild(option);
    }
    picker.value=manualOverrides.has(original)?data.language:'auto';
    picker.addEventListener('click',event=>event.stopPropagation());
    picker.addEventListener('change',event=>{
      event.stopPropagation();
      const chosen=picker.value;
      if(chosen==='auto'){
        manualOverrides.delete(original);
        const current=states.get(original);
        if(current)restore(original,current);
        queueBubble(bubble);
        return;
      }
      if(!isManualLanguage(chosen))return;
      manualOverrides.set(original,chosen);
      language.textContent=chosen.toUpperCase();
      renderHighlighted(view,{...effectiveCardSettings(preferences),...data,language:chosen,
        theme:THEMES.includes(data.theme)?data.theme:preferences.theme});
      status.textContent=isLowMode(preferences)?'Low Mode · Texto íntegro':'Lenguaje elegido manualmente · Copiable';
    });
    head.append(fileIcon,label,language,picker);
    const view=document.createElement('div');view.className='codeview';view.style.setProperty('--cb-max-height',preferences.maxHeight+'px');
    renderHighlighted(view,{...effectiveCardSettings(preferences),...data,theme:THEMES.includes(data.theme)?data.theme:preferences.theme});
    const tools=document.createElement('div');tools.className='tools';
    const status=document.createElement('span');status.className='status';
    status.textContent=isLowMode(preferences)?'Low Mode · Texto íntegro':compactRenderRequired(data.code)?'Modo ligero · Código completo':'Seleccionable · Copiable';
    const copy=document.createElement('button');copy.type='button';copy.className='primary';copy.textContent='Copiar código';
    copy.addEventListener('click',event=>{event.stopPropagation();void copyCode(data.code,status);});
    const show=document.createElement('button');show.type='button';show.textContent='Ver original';
    const prevDisplay=original.style.display;let showOriginal=false;
    show.addEventListener('click',event=>{
      event.stopPropagation();showOriginal=!showOriginal;
      original.style.display=showOriginal?prevDisplay:'none';
      show.textContent=showOriginal?'Ocultar original':'Ver original';
    });
    tools.append(status,copy,show);card.append(head,view);
    const safetyNotice=codeSafetyWarning(data.code);
    if(data.warning||safetyNotice){
      const note=document.createElement('div');note.className='warn';
      note.textContent=[data.warning,safetyNotice].filter(Boolean).join(' · ');
      card.append(note);
    }
    card.append(tools);root.appendChild(card);
    if(!original.parentElement)return;
    original.parentElement.appendChild(host);
    original.style.display='none';original.dataset.codebridgeEnhanced='yes';
    states.set(original,{host,prevDisplay,signature,view});
    host.dataset.glass=glassEnabled()?'on':'off';
    updateGlassModes();
    diagnostics.add('rendered');
    diagnostics.sample('render',performance.now()-renderStarted);
  }

  function glassEnabled(){
    return !isLowMode(preferences)&&preferences.glassCards&&states.size<=35&&preferences.glassBlur>0;
  }
  function updateGlassModes(force=false){
    // Only revisit every card when the global glass state changes, not on
    // each message: otherwise a chat of N snippets causes O(N²) DOM writes.
    const enabled=glassEnabled();
    if(!force&&lastGlassSetting===enabled)return;
    lastGlassSetting=enabled;
    for(const entry of states.values()){
      const next=enabled?'on':'off';
      if(entry.host.dataset.glass!==next)entry.host.dataset.glass=next;
    }
  }
  function refreshAppearance(){
    const ui=currentUi();
    for(const entry of states.values()){
      entry.host.dataset.ui=ui;
      entry.host.dataset.performance=preferences.performanceProfile;
      entry.host.style.setProperty('--cb-glass-blur',preferences.glassBlur+'px');
      entry.host.style.setProperty('--cb-opacity',String(preferences.glassOpacity/100));
      entry.view.style.setProperty('--cb-max-height',preferences.maxHeight+'px');
      const pre=entry.view.querySelector('.cb-code');
      if(pre)pre.style.fontSize=preferences.fontSize+'px';
    }
    updateGlassModes();
  }
  // One transient, delegated control for unsupported fragments, not a button
  // added to every message in a chat. User-initiated conversion is always local.
  function clearManualPicker(){
    if(manualPicker)manualPicker.remove();
    if(manualBubble && manualBubble.isConnected)manualBubble.style.position=manualPreviousPosition;
    manualPicker=null;manualBubble=null;manualPreviousPosition='';
  }
  function exposeManualPicker(bubble){
    if(!active||!bubble||!bubble.isConnected)return;
    if(manualBubble===bubble)return;
    const original=originalNode(bubble);
    if(!original || states.has(original) || original.textContent.trim().length<8 || original.textContent.length>MAX_CHAT_TEXT) {
      clearManualPicker();return;
    }
    clearManualPicker();
    const picker=document.createElement('select');picker.className='codebridge-manual-picker';
    picker.setAttribute('aria-label','CodeBridge: convertir este mensaje en código');
    picker.style.cssText='position:absolute;right:4px;top:3px;z-index:10;max-width:175px;background:#292725;color:#fff;border:1px solid #f58136;border-radius:9px;padding:5px;font:600 11px system-ui;box-shadow:0 2px 10px #0006;cursor:pointer';
    const hint=document.createElement('option');hint.value='';hint.textContent='</> Ver como código…';picker.appendChild(hint);
    for(const [id,name] of MANUAL_LANGUAGES){const option=document.createElement('option');option.value=id;option.textContent=name;picker.appendChild(option);}
    picker.addEventListener('pointerdown',event=>event.stopPropagation());
    picker.addEventListener('click',event=>event.stopPropagation());
    picker.addEventListener('change',event=>{
      event.stopPropagation();const chosen=picker.value;
      if(!isManualLanguage(chosen))return;
      manualOverrides.set(original,chosen);clearManualPicker();queueBubble(bubble);
    });
    manualBubble=bubble;manualPicker=picker;manualPreviousPosition=bubble.style.position;
    if(getComputedStyle(bubble).position==='static')bubble.style.position='relative';
    bubble.appendChild(picker);
  }
  function onBubblePointer(event){
    if(event.target?.closest?.('.codebridge-host, .codebridge-manual-picker'))return;
    const bubble=bubbleOf(event.target);
    if(bubble)exposeManualPicker(bubble);
  }
  function onBubbleLeave(event){
    if(!manualBubble)return;
    const from=bubbleOf(event.target);
    if(from!==manualBubble)return;
    const to=event.relatedTarget;
    if(to instanceof Node && manualBubble.contains(to))return;
    clearManualPicker();
  }
  observerRoot.addEventListener('pointerover',onBubblePointer);
  observerRoot.addEventListener('pointerout',onBubbleLeave);
  // Incremental observation: schedule only bubbles touched by DOM changes.
  // The initial scan and explicit reload still inspect all currently mounted messages.
  function bubbleOf(node){
    const element=node.nodeType===Node.ELEMENT_NODE?node:node.parentElement;
    if(!element||element.closest('.codebridge-host, .codebridge-manual-picker'))return null;
    return element.closest(BUBBLES);
  }
  function queueBubble(bubble){
    if(!active||!bubble||!bubble.isConnected)return;
    pendingBubbles.add(bubble);if(timer!==null)return;
    timer=setTimeout(flush,isLowMode(preferences)?120:95);
  }
  function queueInitialScan(){
    if(!active)return;
    for(const bubble of observerRoot.querySelectorAll(BUBBLES))pendingBubbles.add(bubble);
    if(timer===null)timer=setTimeout(flush,0);
  }
  function flush(){
    timer=null;if(!active)return;
    const started=performance.now();
    let done=0;
    const budget=processingBudget(preferences);
    for(const bubble of pendingBubbles){
      pendingBubbles.delete(bubble);
      if(bubble.isConnected){
        diagnostics.add('inspected');
        try{decorate(bubble);}catch{
          // Fail open: never block WhatsApp or expose source text in error logs.
          diagnostics.add('renderFailure');
          const original=originalNode(bubble);
          const current=original&&states.get(original);
          if(current)restore(original,current);
          if(original?.dataset.codebridgeEnhanced==='yes'){original.style.removeProperty('display');delete original.dataset.codebridgeEnhanced;}
        }
      }
      if(++done>=budget.batch)break;
    }
    if(pruneNeeded||states.size){
      for(const [original,entry] of states){
        if(!original.isConnected||!entry.host.isConnected){entry.host.remove();states.delete(original);diagnostics.add('detached');}
      }
      pruneNeeded=false;
    }
    updateGlassModes();
    diagnostics.sample('batch',performance.now()-started);
    if(pendingBubbles.size)timer=setTimeout(flush,budget.delay);
  }
  function onMutations(records){
    if(!active)return;
    for(const record of records){
      const targetBubble=bubbleOf(record.target);
      if(targetBubble)queueBubble(targetBubble);
      if(record.type!=='childList')continue;
      if(record.removedNodes.length){
        pruneNeeded=true;
        // Handle chat navigation even when the removed message is no longer
        // attached to an active bubble; otherwise the Map retains old nodes.
        if(timer===null)timer=setTimeout(flush,150);
      }
      for(const node of record.addedNodes){
        if(node.nodeType!==Node.ELEMENT_NODE)continue;
        if(node.closest('.codebridge-host'))continue;
        const own=node.matches?.(BUBBLES)?node:null;
        if(own)queueBubble(own);
        for(const bubble of node.querySelectorAll?.(BUBBLES)||[])queueBubble(bubble);
      }
    }
  }
  // Extension-origin messages only. Report strictly numeric, bounded metrics.
  const diagnosticSnapshot=()=>diagnostics.snapshot({
    activeCards:states.size,pending:pendingBubbles.size,
    profile:preferences.performanceProfile,active
  });
  const onDiagnosticMessage=(request,sender,sendResponse)=>{
    if(!request||!['codebridge:diagnostics:get','codebridge:diagnostics:reset','codebridge:clipboard:prepared'].includes(request.type))return false;
    if(sender?.id&&sender.id!==chrome.runtime?.id)return false;
    if(request.type==='codebridge:clipboard:prepared'){
      onClipboardPrepared();
      sendResponse({ok:true});
      return false;
    }
    if(request.type==='codebridge:diagnostics:reset')diagnostics.reset();
    sendResponse({ok:true,diagnostics:diagnosticSnapshot()});
    return false;
  };
  chrome.runtime?.onMessage?.addListener(onDiagnosticMessage);
  const observer=new MutationObserver(onMutations);
  observer.observe(observerRoot,{childList:true,characterData:true,subtree:true});
  const onStorage=(changes,area)=>{
    if(area!=='local')return;
    if(changes[CLIPBOARD_NOTICE_KEY]?.newValue){
      onClipboardPrepared();
    }
    if(Object.keys(DEFAULT_PREFERENCES).some(k=>changes[k]))void loadPrefs();
  };
  const onSystemTheme=()=>{
    if(preferences.uiMode!=='auto')return;
    for(const entry of states.values())entry.host.dataset.ui=currentUi();
  };
  const onRescan=()=>queueInitialScan();
  chrome.storage?.onChanged?.addListener(onStorage);
  mediaQuery?.addEventListener?.('change',onSystemTheme);
  function disable(){
    if(!active)return;active=false;observer.disconnect();clearTimeout(timer);
    for(const id of retryTimers)clearTimeout(id);retryTimers.clear();
    pendingBubbles.clear();clearManualPicker();
    clearLegacyPasteNotice();
    observerRoot.removeEventListener('pointerover',onBubblePointer);
    observerRoot.removeEventListener('pointerout',onBubbleLeave);
    document.removeEventListener('codebridge:rescan',onRescan);
    document.removeEventListener('codebridge:disable',disable);
    chrome.storage?.onChanged?.removeListener(onStorage);
    chrome.runtime?.onMessage?.removeListener(onDiagnosticMessage);
    mediaQuery?.removeEventListener?.('change',onSystemTheme);
    resetCards();window.__CODEBRIDGE_ON__=false;delete window.__CODEBRIDGE_CONTENT_VERSION;
  }
  document.addEventListener('codebridge:rescan',onRescan);
  document.addEventListener('codebridge:disable',disable);
  // Read persisted profile before first scan. A low-resource computer must not
  // tokenize an entire old chat in Balanced mode before Low Mode loads.
  void loadPrefs().finally(queueInitialScan);
}
