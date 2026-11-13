import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizePreferences,resolveUiMode,compactRenderRequired,DEFAULT_PREFERENCES,isLowMode,needsRerender,effectiveCardSettings,processingBudget} from '../visual.js';

test('Nexo panel defaults remain safe and reproducible',()=>{
  assert.deepEqual(normalizePreferences(),DEFAULT_PREFERENCES);
  assert.equal(resolveUiMode('light',true),'light');
  assert.equal(resolveUiMode('dark',false),'dark');
  assert.equal(resolveUiMode('auto',true),'dark');
  assert.equal(resolveUiMode('auto',false),'light');
});
test('preferences reject malformed storage values',()=>{
  assert.deepEqual(normalizePreferences({uiMode:'rainbow',theme:'unsafe',wrap:'yes',fontSize:'999',maxHeight:Infinity}),DEFAULT_PREFERENCES);
  const configured=normalizePreferences({uiMode:'dark',theme:'dracula',wrap:true,lineNumbers:false,fontSize:22,maxHeight:165});
  assert.deepEqual(configured,{uiMode:'dark',performanceProfile:'balanced',theme:'dracula',wrap:true,lineNumbers:false,fontSize:17,maxHeight:260,glassBlur:18,glassOpacity:75,glassCards:true});
});
test('large code falls back to compact mode without truncation',()=>{
  assert.equal(compactRenderRequired('public class Hola {}'),false);
  assert.equal(compactRenderRequired('public class Hola {}\n'.repeat(601)),true);
  assert.equal(compactRenderRequired('x'.repeat(24001)),true);
});

test('glassmorphism preferences clamp, validate and persist deterministically',()=>{
  const p=normalizePreferences({glassBlur:99,glassOpacity:54,glassCards:false});
  assert.equal(p.glassBlur,30);assert.equal(p.glassOpacity,55);assert.equal(p.glassCards,false);
  const v=normalizePreferences({glassBlur:22,glassOpacity:85,glassCards:true});
  assert.equal(v.glassBlur,22);assert.equal(v.glassOpacity,85);
  assert.equal(normalizePreferences({glassCards:'false',glassBlur:'18'}).glassCards,true);
});

test('Low Mode is explicit, local and validated',()=>{
  assert.equal(isLowMode(normalizePreferences({performanceProfile:'low'})),true);
  assert.equal(normalizePreferences({performanceProfile:'invalid'}).performanceProfile,'balanced');
  const p=normalizePreferences({performanceProfile:'low',glassCards:true,lineNumbers:true,theme:'dracula'});
  assert.deepEqual(effectiveCardSettings(p),{theme:'dracula',lineNumbers:false,wrap:false,fontSize:13,performanceProfile:'low'});
  assert.ok(processingBudget(p).batch<processingBudget(DEFAULT_PREFERENCES).batch);
  assert.ok(processingBudget(p).delay>processingBudget(DEFAULT_PREFERENCES).delay);
});
test('appearance changes avoid costly code rerender',()=>{
  const before=DEFAULT_PREFERENCES;
  assert.equal(needsRerender(before,normalizePreferences({glassBlur:28,glassOpacity:90,maxHeight:680,fontSize:15,uiMode:'dark'})),false);
  assert.equal(needsRerender(before,normalizePreferences({theme:'dracula'})),true);
  assert.equal(needsRerender(before,normalizePreferences({performanceProfile:'low'})),true);
  assert.equal(needsRerender(before,normalizePreferences({wrap:true})),true);
});
