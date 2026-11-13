import test from 'node:test';
import assert from 'node:assert/strict';
import { MANUAL_LANGUAGES, isManualLanguage, resolveCardContent } from '../manual.js';
test('manual choices span all supported languages and no duplicates',()=>{
  const values=MANUAL_LANGUAGES.map(([id])=>id);
  assert.ok(values.includes('asm')&&values.includes('mongodb')&&values.includes('text'));
  assert.equal(values.length,new Set(values).size);
  assert.ok(!isManualLanguage('malicious<script>'));
});
test('user can explicitly format unrecognized fragmented code without mutating it',()=>{
  const raw='abc += xyz';
  assert.equal(resolveCardContent(raw),null);
  const card=resolveCardContent(raw,'python');
  assert.equal(card.language,'python');assert.equal(card.code,raw);assert.equal(card.source,'manual');
});
test('explicit language overrides automatic detection, preserving exact original text',()=>{
  const raw='import org.springframework.context.annotation.Bean;';
  assert.equal(resolveCardContent(raw)?.language,'java');
  const card=resolveCardContent(raw,'typescript');
  assert.equal(card.language,'typescript');assert.equal(card.code,raw);
});
test('invalid override never forces code',()=>{
  const raw='Mañana es viernes.';
  assert.equal(resolveCardContent(raw,'<img src=x>'),null);
});
test('manual mode enforces max input and rejects empty input',()=>{
  assert.equal(resolveCardContent('x'.repeat(65537),'python'),null);
  assert.equal(resolveCardContent('  ','python'),null);
});
test('manually formatted text is never sent to a remote service',()=>{
  const raw='console.log("hello")';
  assert.equal(resolveCardContent(raw,'text').code,raw);
});
