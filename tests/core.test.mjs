import test from 'node:test';
import assert from 'node:assert/strict';
import {detectLanguage,makeSnippet,readSnippet,makeMonospace,LANGUAGES,THEMES} from '../core.js';
import {tokenize,tokensToLines,THEME_COLORS} from '../highlight.js';

test('Java record Factura se identifica correctamente',()=>{
 const snippet=`public record Factura(Long id, String numeroFactura, UUID clienteId, BigDecimal subtotal) {\n public Factura { detalles = List.copyOf(detalles); }\n}`;
 assert.equal(detectLanguage(snippet).language,'java');
});
test('El nombre del archivo tiene prioridad sobre la heurística',()=>{
 assert.equal(detectLanguage('const x = 3', 'Factura.java').language,'java');
});
test('Detección de JSON y texto ambiguo',()=>{
 assert.equal(detectLanguage('{"ok":true}').language,'json');
 assert.equal(detectLanguage('hola mundo').language,'text');
});
test('El protocolo conserva indentación, tabulaciones, unicode y líneas vacías',()=>{
 const content='public record Factura(Long id) {\n\tString nombre = "ñandú";\n\n}\n';
 const sample={code:content,language:'java',theme:'dark-plus',filename:'Factura.java'};
 assert.deepEqual(readSnippet(makeSnippet(sample)),sample);
});
test('CRLF se normaliza a LF',()=>{
 const msg=makeSnippet({code:'uno\r\ndos',language:'text',theme:'github-dark'});
 assert.equal(readSnippet(msg).code,'uno\ndos');
});
test('Un cierre literal dentro del código no rompe el protocolo',()=>{
 const code='const x = "[/codebridge]";';
 assert.equal(readSnippet(makeSnippet({code,language:'javascript',theme:'dracula'})).code,code);
});
test('Nombres de archivo Unicode y caracteres especiales sobreviven',()=>{
 const filename='código; 1].java';
 assert.equal(readSnippet(makeSnippet({code:'x',language:'java',theme:'light-plus',filename})).filename,filename);
});
test('Mensaje truncado o metadatos inválidos se rechazan',()=>{
 assert.throws(()=>readSnippet('[codebridge:v1;lang=java;theme=dark-plus;file=x]\nx'),/incompleto/);
 assert.throws(()=>readSnippet('[codebridge:v1;lang=evil;theme=dark-plus;file=x]\nx\n[\/codebridge]'),/no admitido/);
 assert.throws(()=>makeSnippet({code:'x',language:'java',theme:'dark-plus',filename:'a\nb'}),/inválido/);
});
test('Límite de longitud y vacíos',()=>{
 assert.throws(()=>makeSnippet({code:'x'.repeat(12001),language:'java',theme:'dark-plus'}),/supera/);
 assert.throws(()=>makeSnippet({code:'  ',language:'java',theme:'dark-plus'}),/Primero/);
});
test('Monoespaciado WhatsApp no crea delimitador ambiguo',()=>{
 assert.equal(makeMonospace('x=1'),'```x=1```');
 assert.throws(()=>makeMonospace('```'),/contiene/);
});
test('Todos los temas presentan paletas',()=>{
 THEMES.forEach(theme=>assert.ok(THEME_COLORS[theme]));
 assert.equal(LANGUAGES.length,17);
});
test('Tokenizador conserva absolutamente todos los caracteres',()=>{
 const code='public record Factura(String nombre) {\n // comentario\n String v = "Hola \\"Mundo\\"";\n /* comentario \n multilinea */\n}\n';
 assert.equal(tokenize(code,'java').map(x=>x.value).join(''),code);
 assert.equal(tokensToLines(code,'java').map(line=>line.map(x=>x.value).join('')).join('\n'),code);
});
test('Texto plano no es marcado como código',()=>{
 assert.deepEqual(tokenize('a "b"','text'),[{value:'a "b"',kind:'fg'}]);
});
