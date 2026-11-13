import {compactRenderRequired} from './visual.js';
/** Offline, dependency-free syntax colors. Not a replacement for Shiki/TextMate yet. */
export const THEME_COLORS = {
 'dark-plus':{bg:'#1e1e1e',fg:'#d4d4d4',keyword:'#c586c0',type:'#4ec9b0',name:'#9cdcfe',func:'#dcdcaa',string:'#ce9178',number:'#b5cea8',comment:'#6a9955',operator:'#d4d4d4',tag:'#569cd6',line:'#858585',border:'#343434'},
 'light-plus':{bg:'#ffffff',fg:'#1f1f1f',keyword:'#0000ff',type:'#267f99',name:'#001080',func:'#795e26',string:'#a31515',number:'#098658',comment:'#008000',operator:'#262626',tag:'#800000',line:'#6e7681',border:'#dddddd'},
 'github-dark':{bg:'#0d1117',fg:'#e6edf3',keyword:'#ff7b72',type:'#79c0ff',name:'#e6edf3',func:'#d2a8ff',string:'#a5d6ff',number:'#79c0ff',comment:'#8b949e',operator:'#e6edf3',tag:'#7ee787',line:'#6e7681',border:'#30363d'},
 'github-light':{bg:'#ffffff',fg:'#24292f',keyword:'#cf222e',type:'#0550ae',name:'#24292f',func:'#8250df',string:'#0a3069',number:'#0550ae',comment:'#6e7781',operator:'#24292f',tag:'#116329',line:'#8c959f',border:'#d0d7de'},
 'one-dark-pro':{bg:'#282c34',fg:'#abb2bf',keyword:'#c678dd',type:'#e5c07b',name:'#e06c75',func:'#61afef',string:'#98c379',number:'#d19a66',comment:'#5c6370',operator:'#abb2bf',tag:'#56b6c2',line:'#737984',border:'#3e4452'},
 'dracula':{bg:'#282a36',fg:'#f8f8f2',keyword:'#ff79c6',type:'#8be9fd',name:'#f8f8f2',func:'#50fa7b',string:'#f1fa8c',number:'#bd93f9',comment:'#6272a4',operator:'#ff79c6',tag:'#8be9fd',line:'#6272a4',border:'#44475a'}
};
const COMMON = 'abstract as assert async await break case catch class const continue default delete do else enum export extends false final finally for from function if implements import in instanceof interface let new null override package private protected public readonly record return sealed static super switch synchronized this throw throws true try type typeof var void while with yield'.split(' ');
const JAVA = 'BigDecimal Boolean Byte Character Double Enum Float Integer Long Math Object Short String System UUID Instant LocalDate LocalDateTime List Map Set Optional ArrayList HashMap'.split(' ');
const PY = 'and as assert async await class def del elif else except False finally for from global if import in is lambda None nonlocal not or pass raise return self True try while with yield'.split(' ');
const SQL = 'SELECT FROM WHERE JOIN INNER LEFT RIGHT OUTER ON ORDER BY GROUP HAVING INSERT INTO VALUES UPDATE SET DELETE CREATE TABLE ALTER DROP NULL PRIMARY KEY NOT AND OR AS DISTINCT LIMIT COUNT SUM AVG'.split(' ');
const MONGO = 'aggregate find findOne insertOne insertMany updateOne updateMany deleteOne deleteMany countDocuments distinct bulkWrite createIndex watch $match $project $group $sort $limit $unwind $lookup $and $or $gt $gte $lt $lte $in $set $sum $avg'.split(' ');
const langs = {mongodb:[...COMMON,...MONGO],java:[...COMMON,...JAVA],python:PY,sql:SQL,javascript:COMMON,typescript:[...COMMON,'string','number','boolean','unknown','never'],csharp:[...COMMON,'namespace','using','string','int','bool','decimal'],cpp:[...COMMON,'include','cout','cin','std','int','bool'],kotlin:[...COMMON,'fun','val','var','data'],rust:[...COMMON,'fn','mut','impl','pub','struct','trait','use'],go:[...COMMON,'func','package','defer','chan','go'],php:[...COMMON,'echo','namespace','use'],bash:['if','then','fi','for','do','done','in','case','esac'],json:[],html:[],css:[],text:[]};
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
export function tokenize(code, language) {
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
export function tokensToLines(code,language){
  const lines=[[]];
  for(const token of tokenize(code,language)){
    const parts=token.value.split('\n');
    parts.forEach((part,i)=>{if(i)lines.push([]);if(part)lines.at(-1).push({value:part,kind:token.kind});});
  }
  return lines;
}
/** No user-controlled HTML: always render with text nodes. */
export function renderHighlighted(container, {code,language,theme,filename='',lineNumbers=true,wrap=false,fontSize=13,performanceProfile='balanced'}){
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
