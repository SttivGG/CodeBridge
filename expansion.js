/* CodeBridge v0.5: recognize native WhatsApp "read more" controls conservatively.
   Never bypasses WhatsApp internals: expansion uses the same DOM button a user can click. */

const LABELS = /^(?:leer\s+m[aá]s|ver\s+m[aá]s|mostrar\s+m[aá]s|read\s+more|see\s+more|show\s+more|ver\s+mais|mostrar\s+mais|afficher\s+plus|voir\s+plus|mehr\s+anzeigen|weiterlesen)(?:\s*[.…·])?$/iu;
const TEST_ID_MORE = /(?:read[-_]?more|see[-_]?more|show[-_]?more|expand[-_]?message)/i;

export function isMoreLabel(value) {
  return typeof value === 'string' && LABELS.test(value.trim().replace(/\u00a0/g,' '));
}

/** Does the *visible prefix* give strong evidence that this is code (not prose)? */
export function likelyCodePrefix(value) {
  if (typeof value !== 'string') return false;
  const s = value.replace(/^\s*(?:\[codebridge:[^\]]+\]\s*)?/, '').slice(0, 1400);
  if (/^\s*\[codebridge:v1;/i.test(value)) return true;
  if (/^\s*```(?:\w+)?/m.test(s)) return true;
  return /(?:^|\n)\s*(?:public\s+(?:(?:static|final|abstract)\s+)*(?:record|class|interface|enum|\w+\s+\w+\s*\()|private\s+(?:static\s+)?\w+|protected\s+\w+|package\s+[\w.]+\s*;|import\s+(?:(?:static\s+)?[\w$]+\.)+[\w$*]+\s*;|from\s+[\w.]+\s+import\s+\w+|import\s+(?:flask|pymongo|redis)\b|(?:app\s*=\s*Flask\s*\(|\w+\s*=\s*MongoClient\s*\(|\w+\s*=\s*redis\.Redis\s*\()|db\.[\w$]+\.(?:aggregate|find|findOne|updateOne|updateMany|insertOne|insertMany)\s*\(|\{\s*\$(?:match|project|group|sort)\s*:|@Override\b|def\s+\w+\s*\(|async\s+def\s+\w+|class\s+\w+\s*[:{(]|(?:const|let|var)\s+\w+\s*=|(?:export\s+)?(?:async\s+)?function\s+\w+\s*\(|(?:export\s+)?(?:interface|type)\s+\w+|(?:SELECT|INSERT\s+INTO|CREATE\s+TABLE|UPDATE\s+\w+\s+SET)\b|(?:<html\b|<!doctype\s+html)|(?:section\s+\.(?:data|text|bss|rodata)\b|global\s+_start\b|_start\s*:|mov\s+(?:r(?:ax|di|si|dx|bx)|e(?:ax|bx|cx|dx))\s*,)|\{\s*"[^"]+"\s*:)/im.test(s);
}

/** Returns the actual native control. Works when the label is inside its own SPAN. */
export function findReadMoreControl(bubble) {
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
