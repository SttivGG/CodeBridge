import {THEMES} from './core.js';
import {renderHighlighted} from './highlight.js';
import {normalizePreferences, DEFAULT_PREFERENCES, resolveUiMode} from './visual.js';
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
async function main(){
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
