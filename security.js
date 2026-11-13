/** Passive warning only: never changes or evaluates pasted source text. */
export function codeSafetyWarning(code){
  if(typeof code!=='string')return '';
  // Trojan Source-style controls can visually reorder code without changing bytes.
  if(/[\u202a-\u202e\u2066-\u2069]/u.test(code))return 'Precaución: hay controles bidireccionales que pueden alterar la apariencia del código. Revisa el original.';
  if(/[\u200b-\u200f\ufeff]/u.test(code))return 'Precaución: hay caracteres invisibles en el código. Revisa el original.';
  if(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(code))return 'Precaución: hay caracteres de control no imprimibles. Revisa el original.';
  return '';
}
