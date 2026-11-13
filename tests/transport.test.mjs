import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareSafePaste,hasMarkdownSensitiveCode,verifySafePasteDraft} from '../transport.js';
import {recognizeChatCode} from '../message.js';
const sample=`class Producto:
    # Método constructor: se ejecuta al crear el objeto
    def __init__(self, nombre, precio):
        self.nombre = nombre
        self.precio = precio

    # Método de representación: define qué mostrar al usar print()
    def __str__(self):
        return f"{self.nombre} - ${'${self.precio}'}"

# Uso del código
item = Producto("Teclado", 50)
print(item)  # Imprime: Teclado - $50`;
test('proteger pegado Python __init__ y __str__ sin perder caracteres',()=>{
 const safe=prepareSafePaste(sample);
 assert.ok(safe?.startsWith('```'));
 assert.equal(safe,'```'+sample+'```');
 const parsed=recognizeChatCode(safe);
 assert.equal(parsed?.language,'python');
 assert.equal(parsed?.code,sample);
 assert.ok(parsed.code.includes('def __init__('));
 assert.ok(parsed.code.includes('def __str__('));
});
test('no transformar mensajes normales ni imports sin riesgo',()=>{
 for(const value of ['Hola, hablamos mañana','Me dijeron __hola__ ayer','import org.springframework.stereotype.Component;','def saludo():\n    return 1']){
   assert.equal(prepareSafePaste(value),null,value);
 }
});
test('no anidar formatos preexistentes ni código con delimitadores ambiguos',()=>{
 assert.equal(prepareSafePaste('```'+sample+'```'),null);
 assert.equal(prepareSafePaste(sample+'\n```x```'),null);
});
test('los caracteres sensibles se detectan sin mutarlos y los mensajes extensos no se interceptan',()=>{
 assert.equal(hasMarkdownSensitiveCode('def __name__(self):'),true);
 assert.equal(hasMarkdownSensitiveCode('public class Hola {}'),false);
 assert.equal(prepareSafePaste(sample.repeat(600)),null);
});
test('fence preserva saltos y blancos iniciales/finales del código',()=>{
 const code='\n'+sample+'\n';
 const protectedCode=prepareSafePaste(code);
 assert.equal(recognizeChatCode(protectedCode)?.code,code);
});

test('verificación del pegado protegido tolera editores que ocultan los fences pero conservan el código',()=>{
 const protectedCode=prepareSafePaste(sample);
 assert.equal(verifySafePasteDraft(protectedCode,sample,protectedCode),true);
 assert.equal(verifySafePasteDraft(sample,sample,protectedCode),true);
 assert.equal(verifySafePasteDraft(sample.replace('__init__','_init_'),sample,protectedCode),false);
});
