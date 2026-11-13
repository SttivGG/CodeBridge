import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {detectLanguage,makeSnippet,readSnippet} from '../core.js';
import {recognizeChatCode} from '../message.js';
import {likelyCodePrefix} from '../expansion.js';
import {tokenize,tokensToLines} from '../highlight.js';
const asm=readFileSync(new URL('./fixtures/hola_mundo.asm',import.meta.url),'utf8');

test('detects the exact NASM x86-64 example pasted by the user',()=>{
 const result=detectLanguage(asm);
 assert.equal(result.language,'asm');assert.equal(result.confidence,'alta');
});
test('native WhatsApp message is an ASM card, preserving code byte by byte',()=>{
 const result=recognizeChatCode(asm);
 assert.equal(result?.language,'asm');assert.equal(result?.source,'native');
 assert.equal(result?.code,asm);
});
test('NASM sections are recognized in collapsed read-more previews',()=>{
 assert.equal(likelyCodePrefix(asm.slice(0,150)),true);
 assert.equal(likelyCodePrefix('section .data\nmensaje db "Hola"'),true);
});
test('NASM syntax coloring recognizes labels, mnemonics, registers, numbers, comments and strings',()=>{
 const tokens=tokenize(asm,'asm');
 assert.equal(tokens.map(x=>x.value).join(''),asm);
 for(const [word,kind] of [['section','keyword'],['mov','func'],['rax','type'],['_start:','tag'],['"Hola mundo!"','string'],['60','number']]) {
   assert.ok(tokens.some(t=>t.value===word&&t.kind===kind),`${word} should be ${kind}`);
 }
 assert.ok(tokens.some(t=>t.kind==='comment'&&t.value.includes('ASCII')));
 assert.equal(tokensToLines(asm,'asm').map(line=>line.map(x=>x.value).join('')).join('\n'),asm);
});
test('assembly survives CodeBridge legacy envelope roundtrip',()=>{
 const msg=makeSnippet({code:asm,language:'asm',theme:'dracula',filename:'hola_mundo.asm'});
 assert.equal(readSnippet(msg).code,asm);
 assert.equal(readSnippet(msg).language,'asm');
});
test('short shell snippets and messages about asm are not falsely treated as NASM',()=>{
 for(const message of ['Te envío un código ensamblador cuando termine.', 'Voy a estudiar section .data y luego almorzar.', 'Hola mundo!']){
   assert.equal(recognizeChatCode(message),null);
 }
 assert.equal(detectLanguage('mov rax, 1\nsyscall').language,'asm');
 assert.equal(recognizeChatCode('mov rax, 1\nsyscall')?.language,'asm');
});
