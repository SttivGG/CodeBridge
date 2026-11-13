/* Generated with npm run bundle:content. Local-only. */
(()=>{
/** CodeBridge protocol v1, no dependencies. All operations remain on device. */
const LANGUAGES = Object.freeze(['java','javascript','typescript','python','json','sql','html','css','bash','go','rust','csharp','cpp','php','kotlin','asm','text']);
const THEMES = Object.freeze(['dark-plus','light-plus','github-dark','github-light','one-dark-pro','dracula']);
const MAX_CODE_LENGTH = 12000;
const MAX_FILENAME_LENGTH = 100;
const SUFFIXES = {java:'java',js:'javascript',jsx:'javascript',ts:'typescript',tsx:'typescript',py:'python',json:'json',sql:'sql',html:'html',htm:'html',css:'css',sh:'bash',bash:'bash',go:'go',rs:'rust',cs:'csharp',cpp:'cpp',cc:'cpp',cxx:'cpp',hpp:'cpp',php:'php',kt:'kotlin',kts:'kotlin',asm:'asm',nasm:'asm',s:'asm'};
function normalizeNewlines(text) { return String(text).replace(/\r\n?/g, '\n'); }
function detectLanguage(code, filename = '') {
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
function makeSnippet({code,language,theme,filename=''}) {
  const src = normalizeNewlines(code);
  if (!src.trim()) throw new Error('Primero pega un fragmento de código.');
  if (src.length > MAX_CODE_LENGTH) throw new Error(`El fragmento supera ${MAX_CODE_LENGTH} caracteres.`);
  if (!LANGUAGES.includes(language)) throw new Error('Lenguaje no admitido.');
  if (!THEMES.includes(theme)) throw new Error('Tema no admitido.');
  const name = filename.trim();
  if (name.length > MAX_FILENAME_LENGTH || /[\r\n]/.test(name)) throw new Error('Nombre de archivo inválido.');
  return `[codebridge:v1;lang=${language};theme=${theme};file=${encodeURIComponent(name)}]\n${src}\n[/codebridge]`;
}
function readSnippet(text) {
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
function makeMonospace(code) {
  const src = normalizeNewlines(code);
  if (!src.trim()) throw new Error('No hay código para compartir.');
  if (src.includes('```')) throw new Error('Tu código contiene ```; usa el mensaje CodeBridge o copia el código sin formato.');
  return '```' + src + '```';
}

// Pure appearance validation. Shared by the panel and isolated chat content script.
const DEFAULT_PREFERENCES=Object.freeze({
  uiMode:'auto',performanceProfile:'balanced',theme:'dark-plus',lineNumbers:true,wrap:false,fontSize:13,maxHeight:420,glassBlur:18,glassOpacity:75,glassCards:true
});
const VISUAL_THEMES=new Set(['dark-plus','light-plus','github-dark','github-light','one-dark-pro','dracula']);
function resolveUiMode(mode,systemDark=false){return mode==='light'||mode==='dark'?mode:systemDark?'dark':'light';}
function normalizePreferences(raw={}){
  const v=raw||{};
  const bounded=(value,min,max,step,fallback)=>typeof value==='number'&&Number.isFinite(value)?Math.round(Math.max(min,Math.min(max,value))/step)*step:fallback;
  return {
    uiMode:['auto','light','dark'].includes(v.uiMode)?v.uiMode:DEFAULT_PREFERENCES.uiMode,
    performanceProfile:['balanced','low'].includes(v.performanceProfile)?v.performanceProfile:DEFAULT_PREFERENCES.performanceProfile,
    theme:VISUAL_THEMES.has(v.theme)?v.theme:DEFAULT_PREFERENCES.theme,
    lineNumbers:typeof v.lineNumbers==='boolean'?v.lineNumbers:DEFAULT_PREFERENCES.lineNumbers,
    wrap:typeof v.wrap==='boolean'?v.wrap:DEFAULT_PREFERENCES.wrap,
    fontSize:bounded(v.fontSize,11,17,1,DEFAULT_PREFERENCES.fontSize),
    maxHeight:bounded(v.maxHeight,260,700,20,DEFAULT_PREFERENCES.maxHeight),
    glassBlur:bounded(v.glassBlur,0,30,2,DEFAULT_PREFERENCES.glassBlur),
    glassOpacity:bounded(v.glassOpacity,55,95,5,DEFAULT_PREFERENCES.glassOpacity),
    glassCards:typeof v.glassCards==='boolean'?v.glassCards:DEFAULT_PREFERENCES.glassCards
  };
}
function compactRenderRequired(code){
  const src=String(code??'');return src.length>24000||src.split('\n').length>600;
}

/** No stored message data: these predicates operate only on preference values. */
function isLowMode(p){return p?.performanceProfile==='low';}
function needsRerender(previous,next){
  return ['theme','lineNumbers','wrap','performanceProfile'].some(key=>previous[key]!==next[key]);
}
function effectiveCardSettings(p){
  const low=isLowMode(p);
  return {theme:p.theme,lineNumbers:!low&&p.lineNumbers,wrap:p.wrap,fontSize:p.fontSize,performanceProfile:low?'low':'balanced'};
}
function processingBudget(p){return isLowMode(p)?{batch:10,delay:40}:{batch:30,delay:12};}


/** Offline, dependency-free syntax colors. Not a replacement for Shiki/TextMate yet. */
const THEME_COLORS = {
 'dark-plus':{bg:'#1e1e1e',fg:'#d4d4d4',keyword:'#c586c0',type:'#4ec9b0',name:'#9cdcfe',func:'#dcdcaa',string:'#ce9178',number:'#b5cea8',comment:'#6a9955',operator:'#d4d4d4',tag:'#569cd6',line:'#858585',border:'#343434'},
 'light-plus':{bg:'#ffffff',fg:'#1f1f1f',keyword:'#0000ff',type:'#267f99',name:'#001080',func:'#795e26',string:'#a31515',number:'#098658',comment:'#008000',operator:'#262626',tag:'#800000',line:'#6e7681',border:'#dddddd'},
 'github-dark':{bg:'#0d1117',fg:'#e6edf3',keyword:'#ff7b72',type:'#79c0ff',name:'#e6edf3',func:'#d2a8ff',string:'#a5d6ff',number:'#79c0ff',comment:'#8b949e',operator:'#e6edf3',tag:'#7ee787',line:'#6e7681',border:'#30363d'},
 'github-light':{bg:'#ffffff',fg:'#24292f',keyword:'#cf222e',type:'#0550ae',name:'#24292f',func:'#8250df',string:'#0a3069',number:'#0550ae',comment:'#6e7781',operator:'#24292f',tag:'#116329',line:'#8c959f',border:'#d0d7de'},
 'one-dark-pro':{bg:'#282c34',fg:'#abb2bf',keyword:'#c678dd',type:'#e5c07b',name:'#e06c75',func:'#61afef',string:'#98c379',number:'#d19a66',comment:'#5c6370',operator:'#abb2bf',tag:'#56b6c2',line:'#737984',border:'#3e4452'},
 'dracula':{bg:'#282a36',fg:'#f8f8f2',keyword:'#ff79c6',type:'#8be9fd',name:'#f8f8f2',func:'#50fa7b',string:'#f1fa8c',number:'#bd93f9',comment:'#6272a4',operator:'#ff79c6',tag:'#8be9fd',line:'#6272a4',border:'#44475a'}
};
const COMMON = 'abstract as assert async await break case catch class const continue default delete do else enum extends false final finally for from function if implements import in instanceof interface let new null override package private protected public readonly record return sealed static super switch synchronized this throw throws true try type typeof var void while with yield'.split(' ');
const JAVA = 'BigDecimal Boolean Byte Character Double Enum Float Integer Long Math Object Short String System UUID Instant LocalDate LocalDateTime List Map Set Optional ArrayList HashMap'.split(' ');
const PY = 'and as assert async await class def del elif else except False finally for from global if import in is lambda None nonlocal not or pass raise return self True try while with yield'.split(' ');
const SQL = 'SELECT FROM WHERE JOIN INNER LEFT RIGHT OUTER ON ORDER BY GROUP HAVING INSERT INTO VALUES UPDATE SET DELETE CREATE TABLE ALTER DROP NULL PRIMARY KEY NOT AND OR AS DISTINCT LIMIT COUNT SUM AVG'.split(' ');
const langs = {java:[...COMMON,...JAVA],python:PY,sql:SQL,javascript:COMMON,typescript:[...COMMON,'string','number','boolean','unknown','never'],csharp:[...COMMON,'namespace','using','string','int','bool','decimal'],cpp:[...COMMON,'include','cout','cin','std','int','bool'],kotlin:[...COMMON,'fun','val','var','data'],rust:[...COMMON,'fn','mut','impl','pub','struct','trait','use'],go:[...COMMON,'func','package','defer','chan','go'],php:[...COMMON,'echo','namespace','use'],bash:['if','then','fi','for','do','done','in','case','esac'],json:[],html:[],css:[],text:[]};
const typeWords = new Set(JAVA.concat(['string','number','boolean','unknown','int','bool','decimal','float','double','void','var','val','fn','func']));
const ASM_MNEMONICS = new Set('mov movzx movsx lea xor add sub inc dec cmp test and or not neg push pop call ret jmp je jne jz jnz ja jb jge jle loop syscall sysenter int nop shl shr sar sal rol ror mul imul div idiv cdq cqo cld std rep repe repne stosb lodsb cmpsb'.split(' '));
const ASM_DIRECTIVES = new Set('section segment global extern bits default db dw dd dq dt equ resb resw resd resq times align org cpu use16 use32 use64'.split(' '));
const ASM_REGISTERS = /^(?:r(?:ax|bx|cx|dx|si|di|sp|bp|ip|[89]|1[0-5])(?:d|w|b)?|e(?:ax|bx|cx|dx|si|di|sp|bp|ip)|(?:ax|bx|cx|dx|si|di|sp|bp|ip)|[abcd][lh]|[sd]il|[sb]pl|r[89][bwd]|r1[0-5][bwd]|xmm\d+|ymm\d+|zmm\d+|cr\d+|cs|ds|es|fs|gs|ss)$/i;
function tokenizeAssembly(code){
  const src=String(code); const out=[];
  const pattern=/\s+|;[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|0x[\da-f]+\b|\b\d+\b|[A-Za-z_.$?][\w.$?]*:?|./gims;
  for(const match of src.matchAll(pattern)){
    const value=match[0];const lower=value.toLowerCase();let kind='fg';
    if(value[0]===';')kind='comment';
    else if(value[0]==='"'||value[0]==="'")kind='string';
    else if(/^\d|^0x/i.test(value))kind='number';
    else if(value.endsWith(':'))kind='tag';
    else if(ASM_DIRECTIVES.has(lower)||lower.startsWith('%')||['.text','.data','.bss','.rodata','byte','word','dword','qword','ptr'].includes(lower))kind='keyword';
    else if(ASM_REGISTERS.test(lower))kind='type';
    else if(ASM_MNEMONICS.has(lower))kind='func';
    else if(/[+*\/\-=$:[\],]/.test(value)&&value.length===1)kind='operator';
    out.push({value,kind});
  }
  return out;
}
const isWordStart = char => /[A-Za-z_$À-ÿ]/.test(char || '');
const isWord = char => /[\w$À-ÿ]/.test(char || '');
/** Tokenizer with state across line breaks so multiline strings/comments remain colored. */
function tokenize(code, language) {
  if(language==='asm') return tokenizeAssembly(code);
  if(language==='text') return [{value:String(code),kind:'fg'}];
  const tokens=[]; let pos=0;
  const kw = new Set(langs[language] || COMMON);
  const add=(value,kind='fg')=>{if(value) tokens.push({value,kind});};
  let blockComment = false; let quote = '';
  const src = String(code);
  while(pos<src.length){
    const cur=src[pos], next=src[pos+1], start=pos;
    if(blockComment){const end=src.indexOf('*/',pos);pos=end<0?src.length:end+2;add(src.slice(start,pos),'comment');if(end>=0)blockComment=false;continue;}
    if(quote){let escaped=false;while(pos<src.length){const ch=src[pos++];if(ch===quote&&!escaped){quote='';break;}if(ch==='\\'&&!escaped)escaped=true;else escaped=false;} add(src.slice(start,pos),'string');continue;}
    if((cur==='/'&&next==='*')&&language!=='text'){blockComment=true;continue;}
    if((cur==='/'&&next==='/')||((cur==='#')&&['python','bash'].includes(language))||((cur==='-'&&next==='-')&&language==='sql')){const e=src.indexOf('\n',pos);pos=e<0?src.length:e;add(src.slice(start,pos),'comment');continue;}
    if(cur==='"'||cur==="'"||(cur==='`'&&['javascript','typescript'].includes(language))){quote=cur;continue;}
    if(/[0-9]/.test(cur)&&!isWord(src[pos-1])){pos++;while(pos<src.length&&/[\d._]/.test(src[pos]))pos++;add(src.slice(start,pos),'number');continue;}
    if(isWordStart(cur)){pos++;while(pos<src.length&&isWord(src[pos]))pos++;const word=src.slice(start,pos);let kind='fg';
      if(kw.has(word)||kw.has(word.toUpperCase()))kind='keyword';
      else if(typeWords.has(word)||(/^[A-Z]/.test(word)&&language!=='text'&&language!=='json'))kind='type';
      else if(src.slice(pos).match(/^\s*\(/))kind='func';
      else if(src.slice(0,start).match(/\.\s*$/))kind='name';
      add(word,kind);continue;}
    if(/[{}()[\]<>+\-*/%=!&|?:;,]/.test(cur)) {pos++;add(cur,'operator');continue;}
    pos++;add(cur,'fg');
  }
  return tokens;
}
function tokensToLines(code,language){
  const lines=[[]];
  for(const token of tokenize(code,language)){
    const parts=token.value.split('\n');
    parts.forEach((part,i)=>{if(i)lines.push([]);if(part)lines.at(-1).push({value:part,kind:token.kind});});
  }
  return lines;
}
/** No user-controlled HTML: always render with text nodes. */
function renderHighlighted(container, {code,language,theme,filename='',lineNumbers=true,wrap=false,fontSize=13,performanceProfile='balanced'}){
  const palette=THEME_COLORS[theme] || THEME_COLORS['dark-plus'];
  container.replaceChildren();
  const pre=document.createElement('pre');pre.className='cb-code';
  pre.style.setProperty('--cb-fg',palette.fg);pre.style.setProperty('--cb-bg',palette.bg);pre.style.setProperty('--cb-ln',palette.line);
  pre.style.background=palette.bg;pre.style.color=palette.fg;pre.style.whiteSpace=wrap?'pre-wrap':'pre';
  pre.setAttribute('aria-label',`Código ${language}${filename?' de '+filename:''}, seleccionable`);
  pre.style.fontSize=`${Math.max(11,Math.min(17,Number(fontSize)||13))}px`;
  // Very long snippets preserve the complete original as a single text node.
  // This avoids tens of thousands of syntax token nodes in a busy chat.
  if(performanceProfile==='low'||compactRenderRequired(code)){pre.textContent=code;pre.dataset.compact=performanceProfile==='low'?'low':'true';container.appendChild(pre);return;}
  const fragment=document.createDocumentFragment();
  const logicalLines=tokensToLines(code,language);
  for(const [i,line] of logicalLines.entries()){
    const row=document.createElement('span');row.className='cb-line';
    if(lineNumbers){row.dataset.line=String(i+1);row.classList.add('cb-line-numbered');}
    for(const token of line){const span=document.createElement('span');span.textContent=token.value;span.style.color=palette[token.kind] || palette.fg;row.appendChild(span);}
    fragment.appendChild(row);
    // Literal LF nodes make selecting/copying in the browser preserve empty lines.
    if(i<logicalLines.length-1)fragment.appendChild(document.createTextNode('\n'));
  }
  pre.appendChild(fragment);container.appendChild(pre);
}

/* CodeBridge v0.5: recognize code as ordinary, editable WhatsApp message text.
   No metadata is required for new snippets. The legacy v1 envelope is supported. */

const MAX_CHAT_TEXT = 65536; // Maximum CodeBridge native message length; not a claim about WhatsApp limits.

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

function recognizeChatCode(message) {
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

/* CodeBridge v0.5: recognize native WhatsApp "read more" controls conservatively.
   Never bypasses WhatsApp internals: expansion uses the same DOM button a user can click. */

const LABELS = /^(?:leer\s+m[aá]s|ver\s+m[aá]s|mostrar\s+m[aá]s|read\s+more|see\s+more|show\s+more|ver\s+mais|mostrar\s+mais|afficher\s+plus|voir\s+plus|mehr\s+anzeigen|weiterlesen)(?:\s*[.…·])?$/iu;
const TEST_ID_MORE = /(?:read[-_]?more|see[-_]?more|show[-_]?more|expand[-_]?message)/i;

function isMoreLabel(value) {
  return typeof value === 'string' && LABELS.test(value.trim().replace(/\u00a0/g,' '));
}

/** Does the *visible prefix* give strong evidence that this is code (not prose)? */
function likelyCodePrefix(value) {
  if (typeof value !== 'string') return false;
  const s = value.replace(/^\s*(?:\[codebridge:[^\]]+\]\s*)?/, '').slice(0, 1400);
  if (/^\s*\[codebridge:v1;/i.test(value)) return true;
  if (/^\s*```(?:\w+)?/m.test(s)) return true;
  return /(?:^|\n)\s*(?:public\s+(?:(?:static|final|abstract)\s+)*(?:record|class|interface|enum|\w+\s+\w+\s*\()|private\s+(?:static\s+)?\w+|protected\s+\w+|package\s+[\w.]+\s*;|import\s+(?:java|javax)\.|@Override\b|def\s+\w+\s*\(|async\s+def\s+\w+|class\s+\w+\s*[:{(]|(?:const|let|var)\s+\w+\s*=|(?:export\s+)?(?:async\s+)?function\s+\w+\s*\(|(?:export\s+)?(?:interface|type)\s+\w+|(?:SELECT|INSERT\s+INTO|CREATE\s+TABLE|UPDATE\s+\w+\s+SET)\b|(?:<html\b|<!doctype\s+html)|(?:section\s+\.(?:data|text|bss|rodata)\b|global\s+_start\b|_start\s*:|mov\s+(?:r(?:ax|di|si|dx|bx)|e(?:ax|bx|cx|dx))\s*,)|\{\s*"[^"]+"\s*:)/im.test(s);
}

/** Returns the actual native control. Works when the label is inside its own SPAN. */
function findReadMoreControl(bubble) {
  if (!bubble?.querySelectorAll) return null;
  const candidates = bubble.querySelectorAll('button,[role="button"],[data-testid],[aria-label],[tabindex],a,span,div');
  for (const node of candidates) {
    if (node.closest('.codebridge-host')) continue;
    const testId = node.getAttribute('data-testid') || '';
    const label = node.getAttribute('aria-label') || '';
    const apparentLabel = node.textContent || '';
    const hasExplicitMark = TEST_ID_MORE.test(testId);
    if (!hasExplicitMark && !isMoreLabel(label) && !isMoreLabel(apparentLabel)) continue;
    // Avoid a parent with a long subtree that happens to contain a "read more" child.
    if (!hasExplicitMark && !isMoreLabel(label) && node.children.length > 0 && !isMoreLabel(apparentLabel)) continue;
    const target = node.closest('button,[role="button"],a[href],[tabindex="0"]') || node;
    if (target.closest('.codebridge-host')) continue;
    if (typeof target.getClientRects === 'function' && target.getClientRects().length === 0) continue;
    return target;
  }
  return null;
}

/** Passive warning only: never changes or evaluates pasted source text. */
function codeSafetyWarning(code){
  if(typeof code!=='string')return '';
  // Trojan Source-style controls can visually reorder code without changing bytes.
  if(/[\u202a-\u202e\u2066-\u2069]/u.test(code))return 'Precaución: hay controles bidireccionales que pueden alterar la apariencia del código. Revisa el original.';
  if(/[\u200b-\u200f\ufeff]/u.test(code))return 'Precaución: hay caracteres invisibles en el código. Revisa el original.';
  if(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(code))return 'Precaución: hay caracteres de control no imprimibles. Revisa el original.';
  return '';
}

/**
 * CodeBridge local diagnostics. Only aggregate counts and timing samples.
 * No message text, code, filenames, chat names, contact IDs or URLs are captured.
 * Data stays in the content script's memory until the tab is closed/reloaded.
 */
const DIAGNOSTIC_EVENTS = Object.freeze([
  'inspected', 'rendered', 'restored', 'detached', 'expansion',
  'oversized', 'copySuccess', 'copyFailure', 'renderFailure'
]);
const EVENT_SET = new Set(DIAGNOSTIC_EVENTS);
const MAX_SAMPLES = 128;
const round = value => Math.round(value * 100) / 100;
function createDiagnosticStore(clock = () => performance.now()) {
  let started = clock();
  let counts = Object.fromEntries(DIAGNOSTIC_EVENTS.map(k => [k, 0]));
  let durations = [];
  let batches = [];
  function add(event) {
    if (EVENT_SET.has(event)) counts[event] += 1;
  }
  function sample(kind, milliseconds) {
    if (kind !== 'render' && kind !== 'batch') return;
    if (!Number.isFinite(milliseconds) || milliseconds < 0) return;
    const values = kind === 'render' ? durations : batches;
    values.push(Math.min(milliseconds, 60_000));
    if (values.length > MAX_SAMPLES) values.shift();
  }
  function stat(values) {
    if (!values.length) return {samples: 0, meanMs: 0, p95Ms: 0, maxMs: 0};
    const sorted = [...values].sort((a,b)=>a-b);
    return {
      samples: values.length,
      meanMs: round(values.reduce((sum,v)=>sum+v,0)/values.length),
      p95Ms: round(sorted[Math.ceil(sorted.length*.95)-1]),
      maxMs: round(sorted[sorted.length-1])
    };
  }
  function snapshot({activeCards=0,pending=0,profile='balanced',active=true}={}) {
    return {
      version: 1,
      sessionSeconds: Math.max(0,Math.floor((clock()-started)/1000)),
      profile: profile === 'low' ? 'low' : 'balanced',
      active: Boolean(active),
      activeCards: Math.max(0, Math.floor(Number(activeCards)||0)),
      pending: Math.max(0,Math.floor(Number(pending)||0)),
      counters: {...counts},
      render: stat(durations),
      batch: stat(batches)
    };
  }
  function reset() {
    started = clock();
    counts = Object.fromEntries(DIAGNOSTIC_EVENTS.map(k=>[k,0]));
    durations = [];
    batches = [];
  }
  return {add, sample, snapshot, reset};
}

/* CodeBridge v0.9 — incremental WhatsApp Web enhancement, without sending or intercepting messages.
   Incremental DOM queue prevents rescanning every chat bubble on every message mutation. */
if (window.__CODEBRIDGE_ON__) {
  document.dispatchEvent(new CustomEvent('codebridge:rescan'));
} else {
  window.__CODEBRIDGE_ON__ = true;
  const BUBBLES = '.message-in, .message-out, [data-testid="msg-container"]';
  const observerRoot = document.querySelector('#app') || document.body;
  const states = new Map();
  const expansion = new WeakMap();
  const pendingBubbles = new Set();
  const diagnostics=createDiagnosticStore();
  let active=true, timer=null;
  const retryTimers=new Set();
  let pruneNeeded=false;
  let lastGlassSetting=null;
  let preferences=normalizePreferences();
  const mediaQuery=window.matchMedia?.('(prefers-color-scheme: dark)');
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
      if(!likelyCodePrefix(prefix)&&!recognizeChatCode(prefix))return true;
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
    const data=recognizeChatCode(raw);if(!data)return;
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
    head.append(fileIcon,label,language);
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
  // Incremental observation: schedule only bubbles touched by DOM changes.
  // The initial scan and explicit reload still inspect all currently mounted messages.
  function bubbleOf(node){
    const element=node.nodeType===Node.ELEMENT_NODE?node:node.parentElement;
    if(!element||element.closest('.codebridge-host'))return null;
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
    if(!request||!['codebridge:diagnostics:get','codebridge:diagnostics:reset'].includes(request.type))return false;
    if(sender?.id&&sender.id!==chrome.runtime?.id)return false;
    if(request.type==='codebridge:diagnostics:reset')diagnostics.reset();
    sendResponse({ok:true,diagnostics:diagnosticSnapshot()});
    return false;
  };
  chrome.runtime?.onMessage?.addListener(onDiagnosticMessage);
  const observer=new MutationObserver(onMutations);
  observer.observe(observerRoot,{childList:true,characterData:true,subtree:true});
  const onStorage=(changes,area)=>{
    if(area!=='local'||!Object.keys(DEFAULT_PREFERENCES).some(k=>changes[k]))return;
    void loadPrefs();
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
    pendingBubbles.clear();document.removeEventListener('codebridge:rescan',onRescan);
    document.removeEventListener('codebridge:disable',disable);
    chrome.storage?.onChanged?.removeListener(onStorage);
    chrome.runtime?.onMessage?.removeListener(onDiagnosticMessage);
    mediaQuery?.removeEventListener?.('change',onSystemTheme);
    resetCards();window.__CODEBRIDGE_ON__=false;
  }
  document.addEventListener('codebridge:rescan',onRescan);
  document.addEventListener('codebridge:disable',disable);
  // Read persisted profile before first scan. A low-resource computer must not
  // tokenize an entire old chat in Balanced mode before Low Mode loads.
  void loadPrefs().finally(queueInitialScan);
}

})();
