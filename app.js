import {THEMES} from './core.js';
import {renderHighlighted} from './highlight.js';
import {normalizePreferences, DEFAULT_PREFERENCES, resolveUiMode} from './visual.js';
import {planSmartClipboard, SMART_LANGUAGE_CHOICES} from './smart-clipboard.js';
const $=id=>document.getElementById(id);
const SCRIPT_ID='codebridge-whatsapp-v09';
const EXAMPLE=`public record Factura(Long id, String numeroFactura, UUID clienteId) {
    public Factura {
        numeroFactura = numeroFactura.trim();
    }
}`;
const ASM_EXAMPLE=`section .data
    mensaje db "Hola mundo!", 10
    len equ $ - mensaje
section .text
    global _start
_start:
    mov rax, 1
    mov rdi, 1
    mov rsi, mensaje
    mov rdx, len
    syscall`;
const modeQuery=window.matchMedia('(prefers-color-scheme: dark)');
function status(message,error=false){$('status').textContent=message;$('status').classList.toggle('error',error);}
function currentPrefs(){return normalizePreferences({
  uiMode:document.querySelector('[name="ui-mode"]:checked')?.value,
  performanceProfile:document.querySelector('[name="performance-profile"]:checked')?.value,
  theme:$('theme').value,wrap:$('wrap').checked,lineNumbers:$('line-numbers').checked,
  fontSize:Number($('font-size').value),maxHeight:Number($('max-height').value),
  glassBlur:Number($('glass-blur').value),glassOpacity:Number($('glass-opacity').value),glassCards:$('glass-cards').checked
});}
function setForm(p){
  const profile=document.querySelector(`[name="performance-profile"][value="${p.performanceProfile}"]`);if(profile)profile.checked=true;
  const r=document.querySelector(`[name="ui-mode"][value="${p.uiMode}"]`);if(r)r.checked=true;
  $('theme').value=THEMES.includes(p.theme)?p.theme:DEFAULT_PREFERENCES.theme;
  $('wrap').checked=p.wrap;$('line-numbers').checked=p.lineNumbers;
  $('font-size').value=String(p.fontSize);$('max-height').value=String(p.maxHeight);
  $('glass-blur').value=String(p.glassBlur);$('glass-opacity').value=String(p.glassOpacity);$('glass-cards').checked=p.glassCards;
}
function updateUI(){
  const p=currentPrefs();document.documentElement.dataset.ui=resolveUiMode(p.uiMode,modeQuery.matches);
  document.documentElement.dataset.performance=p.performanceProfile;
  const low=p.performanceProfile==='low';
  for(const id of ['glass-blur','glass-opacity','glass-cards','line-numbers'])$(id).disabled=low;
  $('font-value').textContent=p.fontSize+' px';$('height-value').textContent=p.maxHeight+' px';
  $('blur-value').textContent=p.glassBlur+' px';$('opacity-value').textContent=p.glassOpacity+' %';
  document.documentElement.style.setProperty('--blur',p.glassBlur+'px');document.documentElement.style.setProperty('--opacity',String(p.glassOpacity/100));
  const frame=$('preview-frame');
  const asm=$('preview-language').value==='asm',lang=asm?'asm':'java',filename=asm?'hola_mundo.asm':'Factura.java';
  $('preview-filename').textContent=filename;$('preview-title').textContent=filename;
  $('preview-badge').textContent=asm?'A':'J';$('preview-chip').textContent=asm?'NASM':'JAVA';
  renderHighlighted($('preview'),{code:asm?ASM_EXAMPLE:EXAMPLE,language:lang,theme:p.theme,lineNumbers:p.performanceProfile!=='low'&&p.lineNumbers,wrap:p.wrap,fontSize:p.fontSize,performanceProfile:p.performanceProfile});
  $('preview').style.maxHeight=Math.min(280,p.maxHeight)+'px';frame.dataset.mode=p.uiMode;
}
async function save(){const p=currentPrefs();await chrome.storage.local.set(p);updateUI();status('Apariencia guardada.');}
async function inject(){const tabs=await chrome.tabs.query({url:['https://web.whatsapp.com/*']});let count=0;
  for(const tab of tabs){if(!tab.id)continue;try{await chrome.scripting.executeScript({target:{tabId:tab.id},files:['whatsapp.js']});count++;}catch(e){console.warn('CodeBridge: pestaña no accesible',e);}}return count;
}
async function integrationState(){
  try{const scripts=await chrome.scripting.getRegisteredContentScripts({ids:[SCRIPT_ID]});const enabled=scripts.some(s=>s.id===SCRIPT_ID);
    $('integration-state').textContent=enabled?'● CodeBridge activo. El código se resalta automáticamente en WhatsApp Web.':'○ Integración desactivada. Actívala una sola vez para comenzar.';
    $('activate-wa').disabled=enabled;$('deactivate-wa').disabled=!enabled;
  }catch(e){status('No se pudo consultar la integración: '+e.message,true);}
}
async function stopOldScripts(){
  const scripts=await chrome.scripting.getRegisteredContentScripts();
  const oldIds=scripts.filter(s=>/^codebridge-whatsapp-v0[2-8]$/.test(s.id)).map(s=>s.id);
  if(oldIds.length)await chrome.scripting.unregisterContentScripts({ids:oldIds});
  const tabs=await chrome.tabs.query({url:['https://web.whatsapp.com/*']});
  for(const tab of tabs){if(!tab.id)continue;try{await chrome.scripting.executeScript({target:{tabId:tab.id},func:()=>document.dispatchEvent(new Event('codebridge:disable'))});}catch{}}
}
async function activate(){
  try{
    const granted=await chrome.permissions.request({origins:['https://web.whatsapp.com/*']});
    if(!granted){status('Permiso no concedido; no se modificó WhatsApp Web.',true);return;}
    await stopOldScripts();
    const registered=await chrome.scripting.getRegisteredContentScripts({ids:[SCRIPT_ID]});
    if(!registered.length)await chrome.scripting.registerContentScripts([{id:SCRIPT_ID,matches:['https://web.whatsapp.com/*'],js:['whatsapp.js'],runAt:'document_idle',persistAcrossSessions:true}]);
    const count=await inject();status(`Integración activada · ${count} pestaña(s) conectada(s).`);await integrationState();
  }catch(e){status('No se pudo activar: '+e.message,true);}
}
async function deactivate(){
  try{const s=await chrome.scripting.getRegisteredContentScripts({ids:[SCRIPT_ID]});if(s.length)await chrome.scripting.unregisterContentScripts({ids:[SCRIPT_ID]});await stopOldScripts();status('Integración desactivada.');await integrationState();}
  catch(e){status('No se pudo desactivar: '+e.message,true);}
}
let lastDiagnostics=null;
const metric=(id,value)=>{$(id).textContent=value;};
function showDiagnostics(report){
  const c=report.counters;
  metric('diag-cards',report.activeCards);
  metric('diag-inspected',c.inspected);
  metric('diag-render',report.render.samples?report.render.meanMs.toFixed(2)+' ms':'—');
  metric('diag-p95',report.render.samples?report.render.p95Ms.toFixed(2)+' ms':'—');
  metric('diag-pending',report.pending);
  metric('diag-errors',c.renderFailure);
  $('diagnostic-state').textContent=`${report.profile==='low'?'Low Mode':'Equilibrado'} · ${report.sessionSeconds} s de sesión · ${c.rendered} tarjeta(s) creadas`;
  $('diag-reset').disabled=false;
  $('diag-copy').disabled=false;
}
async function messageDiagnostics(type){
  let tabs=await chrome.tabs.query({active:true,currentWindow:true,url:['https://web.whatsapp.com/*']});
  if(!tabs.length||!tabs[0].id)throw new Error('Abre WhatsApp Web en una pestaña y activa CodeBridge.');
  const response=await chrome.tabs.sendMessage(tabs[0].id,{type});
  if(!response?.ok||!response.diagnostics)throw new Error('No se detectó el visor. Recarga WhatsApp Web.');
  return response.diagnostics;
}
async function refreshDiagnostics(reset=false){
  $('diag-refresh').disabled=true;
  try{
    const report=await messageDiagnostics(reset?'codebridge:diagnostics:reset':'codebridge:diagnostics:get');
    lastDiagnostics=report;showDiagnostics(report);
  }catch(error){
    $('diagnostic-state').textContent=error.message;
    lastDiagnostics=null;
    $('diag-reset').disabled=true;$('diag-copy').disabled=true;
  }finally{$('diag-refresh').disabled=false;}
}
async function copyDiagnostics(){
  if(!lastDiagnostics)return;
  // The remote API contract only returns aggregate numeric fields; never source content.
  const report={version:lastDiagnostics.version,profile:lastDiagnostics.profile,sessionSeconds:lastDiagnostics.sessionSeconds,
    activeCards:lastDiagnostics.activeCards,pending:lastDiagnostics.pending,
    counters:lastDiagnostics.counters,render:lastDiagnostics.render,batch:lastDiagnostics.batch};
  try{await navigator.clipboard.writeText(JSON.stringify(report,null,2));$('diagnostic-state').textContent='Informe numérico copiado. No contiene conversaciones.';}
  catch{$('diagnostic-state').textContent='No se pudo copiar. Revisa los permisos del portapapeles.';}
}
/**
 * Aviso sin datos: sincroniza la preparación con los avisos temporales de
 * WhatsApp Web. No se transmite código, texto del portapapeles ni hashes.
 * Si una pestaña no tiene CodeBridge activo, su error no bloquea el pegado.
 */
const CLIPBOARD_NOTICE_KEY='codebridge.smartClipboardPreparedNotice';
/**
 * Aviso de control, sin código fuente: un cambio de chrome.storage.local llega a
 * los content scripts activos incluso cuando tabs.query/sendMessage no funciona.
 * El valor es un nonce efímero (NO identifica el mensaje ni su contenido).
 * El aviso no modifica el portapapeles ni el editor de WhatsApp.
 */
async function notifyPreparedInWhatsapp(){
  try{
    await chrome.storage.local.set({[CLIPBOARD_NOTICE_KEY]:`${Date.now()}:${Math.random()}`});
  }catch{/* El portapapeles queda protegido aunque no se pueda avisar al chat. */}
  // Mantener una notificación directa como optimización, sin depender de ella.
  try{
    const tabs=await chrome.tabs.query({url:['https://web.whatsapp.com/*']});
    await Promise.allSettled(tabs.filter(tab=>Number.isInteger(tab.id)).map(tab=>
      chrome.tabs.sendMessage(tab.id,{type:'codebridge:clipboard:prepared'})
    ));
  }catch{/* Posible ausencia de permiso/recarga; storage.onChanged es el respaldo. */}
}
/**
 * Smart Clipboard no toca el editor de WhatsApp. Si Brave/Chrome/Edge no permiten
 * verificar una lectura, muestra un control local de copia explícita.
 */
const smartStatus=()=>$('smart-status');
const smartCopyBox=()=>$('smart-copy-fallback');
const smartManualBox=()=>$('smart-manual-section');
function openManualEditor(message){
  smartManualBox().hidden=false;
  if(message)smartStatus().textContent=message;
}
function presentProtectedText(value){
  smartCopyBox().hidden=false;
  $('smart-protected-text').value=value;
}
function clearTemporaryCode(){
  $('smart-manual-input').value='';
  $('smart-protected-text').value='';
  smartCopyBox().hidden=true;
}
function planErrorMessage(code){
  return ({
    empty:'El portapapeles o el campo de código está vacío.',
    oversized:'El fragmento supera el límite admitido. No se modificó el portapapeles.',
    ambiguous:'El texto contiene delimitadores de código ambiguos. No se modificó.',
    unrecognized:'No pude reconocer el fragmento. Selecciona su lenguaje y vuelve a intentarlo.',
    'integrity-failed':'Falló la comparación exacta antes de copiar. No se modificó.',
    'invalid-language':'El lenguaje elegido no está admitido.'
  })[code]||'No se pudo preparar este código.';
}
function preparedPlanFor(source){
  const plan=planSmartClipboard(source,$('smart-language').value);
  if(plan.status==='ready')return {ok:true,plan};
  if(plan.status==='already-protected')return {ok:true,plan:{...plan,protectedText:source}};
  smartStatus().textContent=planErrorMessage(plan.status);
  return {ok:false};
}
/** Copia originada en un clic REAL, sin esperar permisos o lectura antes de copiar. */
function copyProtectedSelection(){
  const field=$('smart-protected-text');
  if(!field.value){smartStatus().textContent='Primero prepara un fragmento.';return false;}
  field.focus();field.select();
  let copied=false;
  try{copied=Boolean(document.execCommand?.('copy'));}catch{/* browser may block legacy copy */}
  if(copied){
    smartStatus().textContent='Copia protegida solicitada mediante el botón. Regresa a WhatsApp y pega con Ctrl+V; comprueba los guiones bajos antes de enviar.';
    void notifyPreparedInWhatsapp();
  }else{
    // Keep the protected text selected: the user can press Ctrl+C manually.
    smartStatus().textContent='El navegador bloqueó la copia automática. El texto protegido está seleccionado: pulsa Ctrl+C y luego Ctrl+V en WhatsApp.';
  }
  return copied;
}
/** If clipboard APIs are unavailable, a genuine paste event in this field is sufficient. */
function prepareManualCode(){
  const source=$('smart-manual-input').value;
  const result=preparedPlanFor(source);
  if(!result.ok)return;
  const protectedText=result.plan.protectedText;
  presentProtectedText(protectedText);
  $('smart-manual-input').value='';
  copyProtectedSelection();
}
/** Lectura exclusivamente por clic, sin observación continua del portapapeles. */
/**
 * Una pulsación prepara el portapapeles cuando el navegador permite lectura y
 * escritura. Importante: un readText() INMEDIATO tras writeText() no es una
 * confirmación fiable en todos los navegadores: puede devolver datos antiguos
 * o lanzar NotAllowedError pese a que la escritura finalizó correctamente.
 * Solo se anuncia éxito si writeText() se resuelve; nunca se llama "verificado".
 */
async function prepareClipboard(){
  const button=$('smart-prepare');
  const message=smartStatus();
  if(button.disabled)return;
  button.disabled=true;
  message.textContent='Preparando código del portapapeles…';
  try{
    // No volver a abrir el diálogo de permisos cuando ya está autorizado.
    let granted=false;
    try{granted=await chrome.permissions.contains({permissions:['clipboardRead']});}
    catch{/* En navegadores sin contains, usamos el diálogo convencional. */}
    if(!granted){
      try{granted=await chrome.permissions.request({permissions:['clipboardRead']});}
      catch{granted=false;}
    }
    if(!granted||!navigator.clipboard?.readText){
      openManualEditor('Permiso rechazado o lectura no disponible. Pega el código en el campo local y pulsa «Proteger y copiar».');
      return;
    }
    let source;
    try{source=await navigator.clipboard.readText();}
    catch{
      openManualEditor('El navegador bloqueó la lectura del portapapeles. Usa el campo local de copia protegida.');
      return;
    }
    const result=preparedPlanFor(source);
    if(!result.ok)return;
    const plan=result.plan;
    if(plan.status==='already-protected'){
      clearTemporaryCode();
      message.textContent='El portapapeles ya está protegido. Pégalo con Ctrl+V.';
      void notifyPreparedInWhatsapp();
      return;
    }
    // Si el navegador rechaza la escritura, ofrecer copia explícita. No se
    // modifica el editor de WhatsApp ni se declara éxito sobre una excepción.
    try{
      await navigator.clipboard.writeText(plan.protectedText);
    }catch{
      presentProtectedText(plan.protectedText);
      message.textContent='El navegador rechazó la escritura. Pulsa «Copiar código protegido» o selecciona el texto y usa Ctrl+C.';
      return;
    }
    // El resolved Promise confirma que el navegador aceptó la escritura; NO
    // garantiza que un gestor de portapapeles externo no la modifique luego.
    // No se hace una segunda lectura, que provocaba el falso fallo del primer clic.
    clearTemporaryCode();
    message.textContent=`Código ${plan.language.toUpperCase()} preparado en un clic. Pégalo con Ctrl+V y comprueba el resultado antes de enviarlo.`;
    void notifyPreparedInWhatsapp();
  }catch{
    openManualEditor('No fue posible acceder al portapapeles automáticamente. Pega el código en el campo local.');
  }finally{button.disabled=false;}
}
async function revokeClipboard(){
  try{
    const removed=await chrome.permissions.remove({permissions:['clipboardRead']});
    $('smart-status').textContent=removed?'Permiso de lectura revocado. Smart Clipboard no volverá a leer sin tu autorización.':'El permiso de lectura ya estaba desactivado.';
  }catch{$('smart-status').textContent='No se pudo revocar aquí. Puedes gestionarlo en la configuración de la extensión.';}
}
async function main(){
  const langSelect=$('smart-language');
  for(const [value,label] of SMART_LANGUAGE_CHOICES){
    if(value==='auto')continue;
    const option=document.createElement('option');option.value=value;option.textContent=label;langSelect.append(option);
  }
  $('smart-prepare').addEventListener('click',()=>{void prepareClipboard();});
  $('smart-manual-toggle').addEventListener('click',()=>{openManualEditor('Pega aquí el código y pulsa «Proteger y copiar».');$('smart-manual-input').focus();});
  $('smart-manual-prepare').addEventListener('click',prepareManualCode);
  $('smart-manual-clear').addEventListener('click',()=>{clearTemporaryCode();smartStatus().textContent='Texto temporal borrado del panel.';});
  $('smart-retry-copy').addEventListener('click',copyProtectedSelection);
  $('smart-select-copy').addEventListener('click',()=>{$('smart-protected-text').focus();$('smart-protected-text').select();smartStatus().textContent='Texto protegido seleccionado. Pulsa Ctrl+C y pégalo en WhatsApp con Ctrl+V.';});
  const installedVersion=chrome.runtime?.getManifest?.()?.version||'desconocida';
  $('codebridge-version').textContent='v'+installedVersion;
  document.title='CodeBridge · v'+installedVersion;
  $('smart-revoke').addEventListener('click',()=>{void revokeClipboard();});
  $('activate-wa').addEventListener('click',activate);
  $('diag-refresh').addEventListener('click',()=>{void refreshDiagnostics();});
  $('diag-reset').addEventListener('click',()=>{void refreshDiagnostics(true);});
  $('diag-copy').addEventListener('click',()=>{void copyDiagnostics();});$('deactivate-wa').addEventListener('click',deactivate);
  for(const id of ['theme','wrap','line-numbers','glass-cards']) $(id).addEventListener('change',()=>{void save();});
  // Continuous sliders only update the local preview; persist once on release.
  for(const id of ['font-size','max-height','glass-blur','glass-opacity']){
    $(id).addEventListener('input',updateUI);
    $(id).addEventListener('change',()=>{void save();});
  }
  $('preview-language').addEventListener('change',updateUI);
  document.querySelectorAll('[name="performance-profile"]').forEach(r=>r.addEventListener('change',()=>{void save();}));
  document.querySelectorAll('[name="ui-mode"]').forEach(r=>r.addEventListener('change',()=>{void save();}));
  modeQuery.addEventListener?.('change',()=>updateUI());
  $('reset-settings').addEventListener('click',async()=>{setForm(DEFAULT_PREFERENCES);await save();status('Se restauró la apariencia.');});
  try{setForm(normalizePreferences(await chrome.storage.local.get(Object.keys(DEFAULT_PREFERENCES))));}catch{setForm(DEFAULT_PREFERENCES);}
  updateUI();await integrationState();await refreshDiagnostics();
}
void main();
