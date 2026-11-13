import test from 'node:test';
import assert from 'node:assert/strict';
import {recognizeChatCode} from '../message.js';
import {makeSnippet} from '../core.js';
const java=`public record Factura(Long id, String numeroFactura, UUID clienteId) {
    public Factura {
        numeroFactura = numeroFactura.trim();
        detalles = List.copyOf(detalles);
    }
}`;
test('recognizes Java message directly, preserving indentation',()=>{
 const result=recognizeChatCode(java);assert.equal(result?.language,'java');assert.equal(result?.source,'native');assert.equal(result.code,java);
});
test('reconstructs intact legacy v1 snippet',()=>{
 const payload=makeSnippet({code:java,language:'java',theme:'dark-plus'});
 const result=recognizeChatCode(payload);assert.equal(result?.source,'legacy-v1');assert.equal(result?.code,java);
});
test('detects collapsed v1 envelope but warns integrity is unknown',()=>{
 const payload=makeSnippet({code:java,language:'java',theme:'dark-plus'}).replaceAll('\n',' ');
 const result=recognizeChatCode(payload);assert.equal(result?.source,'legacy-flat');assert.ok(result?.warning);
});
test('ordinary chat messages remain untouched',()=>{
 for (const s of ['Hola, ¿cómo estás?','Te comparto un record de la factura','Voy a estudiar Java y SQL mañana','El resultado fue public record en Java','SELECT es un comando de SQL']) assert.equal(recognizeChatCode(s),null,s);
});
test('detects SQL, Python, JSON and JavaScript in multi-line messages',()=>{
 const samples={
 sql:'SELECT nombre, total\nFROM facturas\nWHERE total > 500;',
 python:'def saludar(nombre):\n    print(nombre)\n    return nombre',
 json:'{\n  "ok": true,\n  "items": [1, 2]\n}',
 javascript:'const total = 12;\nconsole.log(total);'
 };
 for(const [lang,code] of Object.entries(samples))assert.equal(recognizeChatCode(code)?.language,lang,lang);
});
test('supports standard triple-backtick code',()=>{
 const result=recognizeChatCode('```\n'+java+'\n```');assert.equal(result?.source,'fenced');assert.equal(result?.code,java);
});
test('supports long WhatsApp messages without truncating code',()=>{
 const long = java.repeat(180);
 const result=recognizeChatCode(long);assert.equal(result?.code,long);assert.equal(result?.language,'java');
});
test('rejects messages beyond supported WhatsApp text size',()=>assert.equal(recognizeChatCode(java.repeat(400)),null));

test('native code keeps initial spaces and trailing newline intact',()=>{
 const sample='    '+java+'\n';
 const actual=recognizeChatCode(sample);
 assert.equal(actual?.code,sample);
});
