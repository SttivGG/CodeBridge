/**
 * CodeBridge local diagnostics. Only aggregate counts and timing samples.
 * No message text, code, filenames, chat names, contact IDs or URLs are captured.
 * Data stays in the content script's memory until the tab is closed/reloaded.
 */
export const DIAGNOSTIC_EVENTS = Object.freeze([
  'inspected', 'rendered', 'restored', 'detached', 'expansion',
  'oversized', 'copySuccess', 'copyFailure', 'renderFailure', 'safePaste', 'safePasteFailure'
]);
const EVENT_SET = new Set(DIAGNOSTIC_EVENTS);
const MAX_SAMPLES = 128;
const round = value => Math.round(value * 100) / 100;
export function createDiagnosticStore(clock = () => performance.now()) {
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
