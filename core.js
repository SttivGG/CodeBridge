/** CodeBridge protocol v1, no dependencies. All operations remain on device. */
export const LANGUAGES = Object.freeze(['java','javascript','typescript','python','json','sql','html','css','bash','go','rust','csharp','cpp','php','kotlin','asm','mongodb','text']);
export const THEMES = Object.freeze(['dark-plus','light-plus','github-dark','github-light','one-dark-pro','dracula']);
export const MAX_CODE_LENGTH = 12000;
export const MAX_FILENAME_LENGTH = 100;
const SUFFIXES = {java:'java',js:'javascript',jsx:'javascript',ts:'typescript',tsx:'typescript',py:'python',json:'json',sql:'sql',html:'html',htm:'html',css:'css',sh:'bash',bash:'bash',go:'go',rs:'rust',cs:'csharp',cpp:'cpp',cc:'cpp',cxx:'cpp',hpp:'cpp',php:'php',kt:'kotlin',kts:'kotlin',asm:'asm',nasm:'asm',s:'asm',mongo:'mongodb',mongodb:'mongodb'};
export function normalizeNewlines(text) { return String(text).replace(/\r\n?/g, '\n'); }
export function detectLanguage(code, filename = '') {
  const ext = filename.trim().split('.').at(-1)?.toLowerCase() || '';
  if (ext in SUFFIXES) return {language:SUFFIXES[ext],confidence:'alta',reason:'Extensión del archivo'};
  const s = code.trim();
  if (!s) return {language:'text',confidence:'baja',reason:'Sin código'};
  if (/^[\[{]/.test(s)) { try { JSON.parse(s); return {language:'json',confidence:'alta',reason:'JSON válido'}; } catch { /* other syntax */ } }
  // NASM / x86 assembly needs its own evidence, not Java-style braces.
  // Require either strong NASM section signatures or multiple instruction lines.
  const nasmSections = /^\s*section\s+\.(?:data|text|bss|rodata)\b/im;
  const nasmDirectives = /^\s*(?:global|extern|bits|default|%define|%include|\w+\s+(?:db|dw|dd|dq|equ|resb|resw|resd))\b/im;
  const instructionLines = (s.match(/^\s*(?:mov|lea|xor|add|sub|cmp|test|jmp|je|jne|jz|jnz|push|pop|call|ret|int|syscall|mul|imul|div|idiv|inc|dec|and|or|nop)\b/gim) || []).length;
  if ((nasmSections.test(s) && (nasmDirectives.test(s) || instructionLines >= 1)) ||
      (instructionLines >= 2 && /\b(?:rax|rbx|rcx|rdx|rsi|rdi|rsp|rbp|eax|ebx|ecx|edx|xmm\d+|0x[\da-f]+)\b/i.test(s))) {
    return {language:'asm',confidence:'alta',reason:'Directivas o instrucciones NASM/x86'};
  }
  // Mongo shell queries and aggregation pipelines are JavaScript-like, but
  // ordinary JavaScript heuristics miss db.collection.aggregate([ ... ]).
  const mongoShell = /^\s*db\.(?:[A-Za-z_$][\w$]*|getCollection\s*\(\s*['\"][^'\"]+['\"]\s*\))\s*\.\s*(?:aggregate|find|findOne|insertOne|insertMany|updateOne|updateMany|deleteOne|deleteMany|countDocuments|distinct|bulkWrite|createIndex|watch)\s*\(/m;
  const mongoOps = (s.match(/\$(?:match|project|group|sort|limit|unwind|lookup|and|or|gt|gte|lt|lte|in|set|sum|avg)\b/g) || []).length;
  if (mongoShell.test(s) || (mongoOps >= 2 && /[\[{]\s*\$[A-Za-z]+\s*:/.test(s))) {
    return {language:'mongodb',confidence:'alta',reason:'Consulta MongoDB / aggregation pipeline'};
  }
  // Java package/import snippets have no braces and may contain only imports.
  if (/^\s*(?:import\s+(?:static\s+)?[A-Za-z_$][\w$]*(?:\.[A-Za-z_$*][\w$*]*)+\s*;|package\s+[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*\s*;)\s*$/m.test(s)) {
    return {language:'java',confidence:'alta',reason:'Importación o paquete Java'};
  }
  // Python code often arrives as isolated imports or Flask/PyMongo/Redis setup.
  if (/^\s*(?:from\s+[A-Za-z_][\w.]*(?:\s+import\s+[\w*, ]+)|import\s+[A-Za-z_][\w.]*(?:\s+as\s+\w+)?(?:\s*,\s*[A-Za-z_][\w.]*)*)\s*$/m.test(s) ||
      /\b(?:Flask\s*\(\s*__name__|MongoClient\s*\(|redis\.Redis\s*\(|__name__\s*==\s*['\"]__main__['\"])/.test(s)) {
    return {language:'python',confidence:'alta',reason:'Importación o inicialización Python'};
  }
  const rules = [
    ['java', /\b(public\s+record|BigDecimal|List\.copyOf|System\.out|import\s+java\.|Instant\s+\w+|LocalDate\s+\w+|public\s+(static\s+)?class|@Override)\b/, 'alta','Constructos Java'],
    ['python', /(^\s*(?:def|from|import|class|async\s+def)\s+\w+|\b(?:self|elif|print)\s*\()/m,'alta','Sintaxis Python'],
    ['typescript', /\b(interface\s+\w+|type\s+\w+\s*=|:\s*(?:string|number|boolean|unknown|never)\b)/,'alta','Tipado TypeScript'],
    ['sql', /\b(?:SELECT\b[\s\S]*\bFROM\b|INSERT\s+INTO|CREATE\s+TABLE|ALTER\s+TABLE|UPDATE\s+\w+\s+SET)\b/i,'alta','Consultas SQL'],
    ['html', /<!doctype\s+html|<html\b|<\/\w+\s*>/i,'alta','Etiquetas HTML'],
    ['css', /[.#]?[\w-]+\s*\{\s*[\w-]+\s*:\s*[^;]+;/,'media','Reglas CSS'],
    ['javascript', /\b(?:const|let)\s+\w+|\bconsole\.log\s*\(|\bexport\s+default\b|=>/,'media','Sintaxis JavaScript'],
    ['bash', /^#!.*(?:bash|sh)|\b(?:echo|chmod|grep)\s+/m,'media','Comandos shell'],
    ['go', /\bfunc\s+main\s*\(|\bpackage\s+main\b/,'alta','Sintaxis Go'],
    ['rust', /\bfn\s+main\s*\(|\blet\s+mut\s+/,'alta','Sintaxis Rust'],
    ['kotlin', /\bfun\s+main\s*\(|\bdata\s+class\s+/,'alta','Sintaxis Kotlin'],
    ['php', /<\?php\b/,'alta','Etiqueta PHP']
  ];
  const found = rules.find(([,pattern]) => pattern.test(s));
  return found ? {language:found[0],confidence:found[2],reason:found[3]} : {language:'text',confidence:'baja',reason:'No hay evidencia suficiente; elige el lenguaje manualmente'};
}
export function makeSnippet({code,language,theme,filename=''}) {
  const src = normalizeNewlines(code);
  if (!src.trim()) throw new Error('Primero pega un fragmento de código.');
  if (src.length > MAX_CODE_LENGTH) throw new Error(`El fragmento supera ${MAX_CODE_LENGTH} caracteres.`);
  if (!LANGUAGES.includes(language)) throw new Error('Lenguaje no admitido.');
  if (!THEMES.includes(theme)) throw new Error('Tema no admitido.');
  const name = filename.trim();
  if (name.length > MAX_FILENAME_LENGTH || /[\r\n]/.test(name)) throw new Error('Nombre de archivo inválido.');
  return `[codebridge:v1;lang=${language};theme=${theme};file=${encodeURIComponent(name)}]\n${src}\n[/codebridge]`;
}
export function readSnippet(text) {
  const input = normalizeNewlines(text);
  const m = /^\[codebridge:v1;lang=([a-z]+);theme=([a-z-]+);file=([^\]\n]*)\]\n/.exec(input);
  if (!m) throw new Error('El mensaje no tiene encabezado CodeBridge v1.');
  const [,language,theme,encoded] = m;
  if (!LANGUAGES.includes(language) || !THEMES.includes(theme)) throw new Error('Lenguaje o tema no admitido.');
  let filename;
  try { filename = decodeURIComponent(encoded); } catch { throw new Error('Metadatos del archivo inválidos.'); }
  if (filename.length > MAX_FILENAME_LENGTH || /[\r\n]/.test(filename)) throw new Error('Nombre de archivo inválido.');
  const closer = '\n[/codebridge]';
  const pos = input.lastIndexOf(closer);
  if (pos < m[0].length || input.slice(pos + closer.length).trim()) throw new Error('Mensaje incompleto o con texto adicional.');
  const code = input.slice(m[0].length, pos);
  if (!code.trim() || code.length > MAX_CODE_LENGTH) throw new Error('Código vacío o demasiado extenso.');
  return {code,language,theme,filename};
}
export function makeMonospace(code) {
  const src = normalizeNewlines(code);
  if (!src.trim()) throw new Error('No hay código para compartir.');
  if (src.includes('```')) throw new Error('Tu código contiene ```; usa el mensaje CodeBridge o copia el código sin formato.');
  return '```' + src + '```';
}
