/**
 * CodeBridge v0.9.6 experimental: preparación del portapapeles universal.
 * Esta función es pura; NO lee el portapapeles ni envía datos.
 * El permiso y la lectura ocurren exclusivamente al pulsar el botón del panel.
 */
import {normalizeNewlines,LANGUAGES} from './core.js';
import {MAX_CHAT_TEXT,recognizeChatCode} from './message.js';

export const SMART_LANGUAGE_CHOICES=Object.freeze([
  ['auto','Detectar automáticamente'],
  ['java','Java'],['python','Python'],['javascript','JavaScript'],
  ['typescript','TypeScript'],['mongodb','MongoDB'],['json','JSON'],
  ['sql','SQL'],['asm','ASM / NASM'],['bash','Bash'],
  ['html','HTML'],['css','CSS'],['cpp','C++'],['csharp','C#'],
  ['go','Go'],['rust','Rust'],['kotlin','Kotlin'],['php','PHP'],
  ['text','Texto monoespaciado']
].filter(([key])=>key==='auto'||LANGUAGES.includes(key)));

/** Devuelve exclusivamente una propuesta o un motivo; nunca guarda el texto. */
export function planSmartClipboard(value,preferredLanguage='auto'){
  if(typeof value!=='string'||!value.trim())return {status:'empty'};
  const code=normalizeNewlines(value);
  if(code.length+6>MAX_CHAT_TEXT)return {status:'oversized'};
  const allowed=SMART_LANGUAGE_CHOICES.some(([id])=>id===preferredLanguage);
  if(!allowed)return {status:'invalid-language'};
  const input=code.trim();
  // Ya protegido: no duplicar triples acentos ni tocar el portapapeles.
  if(/^```(?:[\s\S]*?)```$/.test(input)){
    const recognized=recognizeChatCode(code);
    return recognized?.source==='fenced'?{status:'already-protected',language:recognized.language}:{status:'ambiguous'};
  }
  // Los fences literales internos pueden cerrar prematuramente el bloque.
  if(code.includes('```'))return {status:'ambiguous'};
  const recognized=recognizeChatCode(code);
  if(preferredLanguage==='auto'&&(!recognized||recognized.source!=='native'))return {status:'unrecognized'};
  const language=preferredLanguage==='auto'?recognized.language:preferredLanguage;
  const protectedText='```'+code+'```';
  const roundtrip=recognizeChatCode(protectedText);
  if(!roundtrip||roundtrip.code!==code)return {status:'integrity-failed'};
  return {status:'ready',language,protectedText};
}
