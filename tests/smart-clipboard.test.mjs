import test from 'node:test';
import assert from 'node:assert/strict';
import {planSmartClipboard,SMART_LANGUAGE_CHOICES} from '../smart-clipboard.js';
import {recognizeChatCode} from '../message.js';

const python=`class Producto:
    # Se ejecuta automáticamente al crear un objeto nuevo
    def __init__(self, nombre, precio):
        self.nombre = nombre
        self.precio = precio

    # Define cómo se muestra el objeto al usar print()
    def __str__(self):
        return f"${'${self.nombre}'} - $${'${self.precio}'}"

item = Producto("Teclado", 45)
print(item)  # Salida: Teclado - $45`;
const java=`import org.springframework.stereotype.Component;
import org.springframework.scheduling.annotation.Async;`;
const mongo=`db.pedidos.aggregate([
  {$match: {region: 'Andina'}},
  {$project: {region: 1}}
]);`;
const nasm=`section .text
 global _start
_start:
 mov rax, 60
 xor rdi, rdi
 syscall`;

for(const [name,code,expected] of [
  ['Python desde cualquier editor',python,'python'],
  ['Java imports',java,'java'],
  ['MongoDB',mongo,'mongodb'],
  ['NASM',nasm,'asm']
]){
  test(`${name}: el transporte conserva cada carácter`,()=>{
    const plan=planSmartClipboard(code);
    assert.equal(plan.status,'ready',JSON.stringify(plan));
    assert.equal(plan.language,expected);
    assert.equal(plan.protectedText,'```'+code+'```');
    assert.equal(recognizeChatCode(plan.protectedText).code,code);
  });
}
test('protección con saltos CRLF: normalización explícita y sin alterar tokens',()=>{
  const code=python.replaceAll('\n','\r\n');
  const plan=planSmartClipboard(code);
  assert.equal(plan.status,'ready');
  assert.equal(recognizeChatCode(plan.protectedText).code,python);
  assert.ok(plan.protectedText.includes('def __init__'));
  assert.ok(plan.protectedText.includes('def __str__'));
});
test('texto no reconocido no se toca y selección manual permite fragmentos parciales',()=>{
  assert.equal(planSmartClipboard('Hola, mañana nos vemos').status,'unrecognized');
  const fragment='def __init__(self):\n    pass';
  const forced=planSmartClipboard(fragment,'python');
  assert.equal(forced.status,'ready');
  assert.equal(recognizeChatCode(forced.protectedText).code,fragment);
});
test('sin doble protección ni falsificación de delimitadores',()=>{
  const prepared=planSmartClipboard(python);
  assert.equal(planSmartClipboard(prepared.protectedText).status,'already-protected');
  assert.equal(planSmartClipboard(python+'\n```fragmento```').status,'ambiguous');
  assert.equal(planSmartClipboard('  ').status,'empty');
  assert.equal(planSmartClipboard(python,'language-unknown').status,'invalid-language');
  assert.equal(planSmartClipboard(python.repeat(700)).status,'oversized');
});
test('lista de lenguajes es completa, sin duplicados ni datos persistentes',()=>{
  const langs=SMART_LANGUAGE_CHOICES.map(([code])=>code);
  assert.equal(new Set(langs).size,langs.length);
  assert.equal(langs[0],'auto');
  assert.ok(langs.includes('text')&&langs.includes('asm'));
});
