import test from 'node:test';
import assert from 'node:assert/strict';
import {createDiagnosticStore,DIAGNOSTIC_EVENTS} from '../diagnostics.js';

test('diagnostic snapshot has only whitelisted aggregate metrics',()=>{
  let tick=100;
  const m=createDiagnosticStore(()=>tick);
  m.add('inspected');m.add('rendered');m.add('malicious payload: secret');
  m.sample('render',11);m.sample('render',19);m.sample('batch',7);
  tick=5100;
  const report=m.snapshot({activeCards:2,pending:1,profile:'low'});
  assert.equal(report.sessionSeconds,5);
  assert.equal(report.counters.rendered,1);
  assert.equal(report.render.meanMs,15);
  assert.equal(report.render.p95Ms,19);
  assert.equal(report.profile,'low');
  assert.equal(report.activeCards,2);
  assert.equal(report.pending,1);
  assert.equal(Object.keys(report.counters).length,DIAGNOSTIC_EVENTS.length);
  assert.ok(!JSON.stringify(report).includes('secret'));
  assert.ok(!JSON.stringify(report).includes('malicious'));
});

test('duration samples are bounded, invalid values rejected, and reset clears everything',()=>{
  const m=createDiagnosticStore(()=>3000);
  for(let i=0;i<800;i++)m.sample('render',i);
  m.sample('batch',Infinity);m.sample('render',-5);m.sample('clipboard','secret');
  m.add('renderFailure');
  assert.equal(m.snapshot().render.samples,128);
  assert.equal(m.snapshot().batch.samples,0);
  assert.equal(m.snapshot().render.p95Ms,793);
  assert.equal(m.snapshot().counters.renderFailure,1);
  m.reset();
  assert.equal(m.snapshot().render.samples,0);
  assert.equal(m.snapshot().counters.renderFailure,0);
  assert.equal(m.snapshot().activeCards,0);
});

test('diagnostics never stores error text or source code',()=>{
  const m=createDiagnosticStore(()=>0);
  const code='API_TOKEN=super-secret-123';
  m.add(code);m.sample(code,100);
  const report=m.snapshot({activeCards:9999,pending:-10,profile:code});
  assert.equal(report.profile,'balanced');
  assert.equal(report.pending,0);
  assert.ok(!JSON.stringify(report).includes(code));
});
