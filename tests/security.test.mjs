import test from 'node:test';
import assert from 'node:assert/strict';
import {codeSafetyWarning} from '../security.js';
import {recognizeChatCode} from '../message.js';
import {MAX_CHAT_TEXT} from '../message.js';
import {tokenize} from '../highlight.js';

test('bidi, zero-width and controls generate warnings without modifying content',()=>{
  assert.match(codeSafetyWarning('public class A { // \u202e hidden\n}'),/bidireccionales/);
  assert.match(codeSafetyWarning('public class A\u200b {}'),/invisibles/);
  assert.match(codeSafetyWarning('public class A\u0001 {}'),/control/);
  assert.equal(codeSafetyWarning('public class A {}'), '');
});
test('untrusted source is never interpreted as executable HTML',()=>{
  const code='<!doctype html>\n<html>\n<script>globalThis.bad = 1;</script>\n</html>';
  const result=recognizeChatCode(code);
  assert.equal(result?.code,code);
  assert.equal(result?.language,'html');
  assert.equal(tokenize(code,'html').map(t=>t.value).join(''),code);
});
test('oversized hostile code is rejected without truncating and invisible characters preserved',()=>{
  const huge='public record A(Long id) {\n'+' System.out.println("x");\n'.repeat(3000)+'}';
  assert.ok(huge.length>MAX_CHAT_TEXT);
  assert.equal(recognizeChatCode(huge),null);
  const tricky='public class A {\n  String s="\u202e";\n}';
  assert.equal(recognizeChatCode(tricky)?.code,tricky);
});
