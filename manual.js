/** On-demand per-message language override. No message content is persisted. */
import { LANGUAGES, normalizeNewlines } from './core.js';
import { MAX_CHAT_TEXT, recognizeChatCode } from './message.js';

export const MANUAL_LANGUAGES = Object.freeze([
  ['java','Java'], ['python','Python'], ['javascript','JavaScript'],
  ['typescript','TypeScript'], ['mongodb','MongoDB'], ['json','JSON'],
  ['sql','SQL'], ['asm','Assembly / NASM'], ['bash','Bash'],
  ['html','HTML'], ['css','CSS'], ['cpp','C++'], ['csharp','C#'],
  ['go','Go'], ['rust','Rust'], ['kotlin','Kotlin'], ['php','PHP'],
  ['text','Texto monoespaciado']
].filter(([value])=>LANGUAGES.includes(value)));
export const isManualLanguage = value => LANGUAGES.includes(value);

/** Explicit user choice wins over heuristics. Never bypass limits. */
export function resolveCardContent(raw, forcedLanguage = null) {
  if(typeof raw!=='string') return null;
  const code=normalizeNewlines(raw);
  if(!code.trim() || code.length>MAX_CHAT_TEXT) return null;
  const detected=recognizeChatCode(code);
  if(!isManualLanguage(forcedLanguage)) return detected;
  return {...(detected||{code, filename:'', source:'manual'}), language:forcedLanguage, source:'manual'};
}
