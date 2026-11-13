/* Protección local de fragmentos al pegar: no se almacena código y no se envía nada. */
import {normalizeNewlines} from './core.js';
import {recognizeChatCode,MAX_CHAT_TEXT} from './message.js';

/** Los símbolos de formato de WhatsApp pueden transformar código fuente. */
export function hasMarkdownSensitiveCode(source) {
  const text=String(source??'');
  return /__\w+__/.test(text) || /(^|[^\w])_[^\s_][^\n]*?_(?=$|[^\w])/m.test(text) ||
    /(^|[^\w])\*[^\s*][^\n]*?\*(?=$|[^\w])/m.test(text) ||
    /(^|[^\w])~[^\s~][^\n]*?~(?=$|[^\w])/m.test(text) ||
    /^\s*(?:\* |\- |\d+\. |> )/m.test(text);
}

/** Solo protege código reconocido, nunca conversaciones normales ni bloques ya delimitados. */
export function prepareSafePaste(input) {
  if(typeof input!=='string'||input.length>MAX_CHAT_TEXT||input.length<12)return null;
  const code=normalizeNewlines(input);
  if(!code.trim()||code.includes('```')||!hasMarkdownSensitiveCode(code))return null;
  const recognized=recognizeChatCode(code);
  if(!recognized||recognized.source!=='native')return null;
  return '```'+code+'```';
}

function normalizeDraftValue(value){
  return normalizeNewlines(String(value??''))
    .replace(/[​-‍﻿]/g,'')
    .replace(/ /g,' ');
}

function extractFencePayload(value){
  const draft=normalizeDraftValue(value).trim();
  const match=draft.match(/^```([\s\S]*?)```$/);
  return match?match[1]:null;
}

/**
 * WhatsApp puede normalizar visualmente el editor antes de que podamos leerlo.
 * Consideramos válido el pegado si el borrador conserva el bloque completo o,
 * en entornos que ocultan los fences, si mantiene íntegro el código original
 * y todos los identificadores sensibles que motivaron la protección.
 */
export function verifySafePasteDraft(draftValue, original, protectedText){
  const draft=normalizeDraftValue(draftValue);
  const raw=normalizeDraftValue(original);
  const fenced=normalizeDraftValue(protectedText);
  if(!draft.trim()) return false;
  if(draft.includes(fenced)) return true;
  const payload=extractFencePayload(draft);
  if(payload!==null && payload===raw) return true;
  if(draft.includes(raw)){
    const sensitive=[...new Set(raw.match(/__\w+__/g)||[])];
    return sensitive.every(token=>draft.includes(token));
  }
  return false;
}
