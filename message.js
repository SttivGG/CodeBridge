/* CodeBridge v0.5: recognize code as ordinary, editable WhatsApp message text.
   No metadata is required for new snippets. The legacy v1 envelope is supported. */
import {detectLanguage,normalizeNewlines,readSnippet,MAX_CODE_LENGTH} from './core.js';

export const MAX_CHAT_TEXT = 65536; // Maximum CodeBridge native message length; not a claim about WhatsApp limits.

function supportedCodeStructure(s, language) {
  const shared = /[{};=<>()[\]]/;
  switch (language) {
    case 'python': return /^\s*(def |class |from |import |async def |for |if )/m.test(s) && /[:=(]/.test(s);
    case 'sql': return /\b(SELECT|INSERT|CREATE|UPDATE|DELETE|ALTER)\b/i.test(s) && /\b(FROM|INTO|TABLE|SET|WHERE|VALUES)\b/i.test(s);
    case 'html': return /<\/?[a-z][\s\S]*?>/i.test(s);
    case 'css': return /\{[^{}]*:[^{}]*[;}]/.test(s);
    case 'asm': {
      // A pair of plausible NASM lines is enough; do not require {}, semicolons or ().
      const directive = /^\s*(?:section\s+\.(?:data|text|bss|rodata)|global\s+\w+|extern\s+\w+|\w+\s+(?:db|dw|dd|dq|equ|resb|resw|resd)\b)/im.test(s);
      const instructions = (s.match(/^\s*(?:mov|lea|xor|add|sub|cmp|test|jmp|je|jne|jz|jnz|push|pop|call|ret|int|syscall|mul|imul|div|idiv|inc|dec|and|or|nop)\b/gim)||[]).length;
      return directive && instructions >= 1 || instructions >= 2;
    }
    case 'json': return true; // JSON validity already checked by detectLanguage
    default: return shared.test(s) && (/[;{}()]/.test(s) || /=>/.test(s));
  }
}

function legacyFlattened(input) {
  // WhatsApp can flatten line breaks when a script inserts text into its editor.
  // This is only a best-effort migration of old messages; lost whitespace is not recoverable.
  const pattern = /^\[codebridge:v1;lang=([a-z]+);theme=([a-z-]+);file=([^\]]*)\]([\s\S]*?)\[\/codebridge\]$/;
  const m = input.match(pattern);
  if (!m || !m[4].trim()) return null;
  const data = detectLanguage(m[4]);
  return {code:m[4].replace(/^\s+|\s+$/g,''),language:m[1] || data.language,theme:m[2],filename:'',source:'legacy-flat',warning:'Mensaje antiguo: WhatsApp pudo haber perdido saltos de línea.'};
}

export function recognizeChatCode(message) {
  if (typeof message !== 'string') return null;
  const original = normalizeNewlines(message);
  const input = original.trim();
  if (input.length < 12 || input.length > MAX_CHAT_TEXT) return null;

  if (input.startsWith('[codebridge:v1;')) {
    try {return {...readSnippet(input),source:'legacy-v1'};}
    catch {return legacyFlattened(input);}
  }

  // Copyable code in a WhatsApp monospace fence. WhatsApp's formatter may remove
  // the fence in the visual DOM; in that case detection continues as plain text.
  const fence = input.match(/^```(?:([a-zA-Z+#.0-9]+)\n)?([\s\S]*?)```$/);
  if (fence && fence[2].trim()) {
    const code = fence[2].replace(/^\n|\n$/g,'');
    const guess = detectLanguage(code);
    return {code,language:guess.language,filename:'',source:'fenced'};
  }

  const guess = detectLanguage(input);
  if (guess.language === 'text' || guess.confidence === 'baja' || !supportedCodeStructure(input,guess.language)) return null;
  const lineCount = input.split('\n').length;
  const structuralLines = input.split('\n').filter(line => /[{};=():<>]/.test(line)).length;
  // Protect normal prose: prefer two real lines. Single-line code needs multiple
  // unmistakable tokens and no sentence-like punctuation pattern.
  const strongSingleLine = lineCount === 1 && input.length >= 70 && (
    /\bpublic\s+record\s+\w+\s*\(/.test(input) && /[{};]/.test(input) ||
    /\bpublic\s+(?:static\s+)?class\s+\w+/.test(input) && /\{/.test(input) && /;/.test(input) ||
    /\b(?:SELECT|INSERT|UPDATE|CREATE)\b/i.test(input) && /\b(?:FROM|INTO|SET|TABLE)\b/i.test(input) ||
    /^\s*<\w+\b/.test(input) && /<\/\w+>/.test(input)
  );
  if (!strongSingleLine && (lineCount < 2 || (guess.language !== 'asm' && structuralLines < 1))) return null;
  return {code:original,language:guess.language,filename:'',source:'native'};
}
