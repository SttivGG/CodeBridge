import test from 'node:test';
import assert from 'node:assert/strict';
import {isMoreLabel,likelyCodePrefix} from '../expansion.js';

test('detects real read-more labels in common WhatsApp locales',()=>{
  for (const label of ['Leer más','Ver más','Read more','See more','Afficher plus','Ver mais','Mostrar más','Leer más…',' LEER MÁS ']){
    assert.equal(isMoreLabel(label),true,label);
  }
});
test('avoids treating arbitrary code or text as the read-more control',()=>{
  for(const value of ['me dijeron leer más','Leer más documentos','Leer más()','Leer más en example.com','const x = "Leer más"']) assert.equal(isMoreLabel(value),false,value);
});
test('detects visible prefixes of Java, Python, JS and legacy snippets',()=>{
  for(const sample of [
    'public record Factura(Long id, String numeroFactura, UUID clienteId,',
    'public static Factura emitir(Persona cliente, UUID vendedorId,',
    'def sumar(a, b):\n    return a+b',
    'const total = factura.items.reduce((a,b) => a+b);',
    '[codebridge:v1;lang=java;theme=dracula;file=]public record Factura',
    '```java\npublic record Factura('
  ]) assert.equal(likelyCodePrefix(sample),true,sample);
});
test('normal prose and quoted code words do not trigger automatic expansion',()=>{
  for(const value of ['Hola, te envío el informe mañana', 'El profesor explicó public record y cómo usarlo', 'Este texto es extenso pero no es código', '¿Sabes cómo usar Java en clase?']) assert.equal(likelyCodePrefix(value),false,value);
});
