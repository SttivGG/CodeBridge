import test from 'node:test';
import assert from 'node:assert/strict';
import {detectLanguage,makeSnippet,readSnippet} from '../core.js';
import {recognizeChatCode} from '../message.js';
import {likelyCodePrefix} from '../expansion.js';
import {tokenize,tokensToLines} from '../highlight.js';

const mongo = `db.pedidos.aggregate([
  {
    $match:{
      $and:[
        {"segmento_cliente":"premium"},
        {"region":"Andina"},
        {$or:[{"categoria":"deporte"},{"categoria":"hogar"}]},
        {"costo_envio":{$gt:11000}}
      ]
    }
  },
  {
    $project:{
      "_id":0,
      "segmento_cliente":1,
      "region":1,
      "categoria":1,
      "costo_envio":1
    }
  }
]);`;
const importsJava = `import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;`;
const importsJavaShort = `import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;`;
const importsPython = `from flask import Flask
from pymongo import MongoClient
import redis`;
const flask = `app = Flask(__name__)

if __name__ == "__main__":
    app.run(debug=True)`;
const dbPython = `# CONEXION A MONGO
mongo_client = MongoClient("mongodb://localhost:27017")
db_mongo = mongo_client['mi_bd']
usuarios_col = db_mongo['usuarios']

# CONEXION A REDIS
cache = redis.Redis(host="localhost", port=6379, db=2, decode_responses=True)`;

test('MongoDB aggregation pasted into WhatsApp is recognized without modifying source',()=>{
  assert.equal(detectLanguage(mongo).language,'mongodb');
  const result=recognizeChatCode(mongo);
  assert.equal(result?.language,'mongodb');
  assert.equal(result?.source,'native');
  assert.equal(result?.code,mongo);
});
test('standalone MongoDB shell calls and pipelines are recognized',()=>{
  for(const code of ['db.usuarios.find({activo:true})', 'db.pedidos.aggregate([{ $match: { total: { $gt: 100 } } }])', '[{ $match: { estado: "pagado" } }, { $project: { total: 1 } }]']) {
    assert.equal(detectLanguage(code).language,'mongodb',code);
    assert.equal(recognizeChatCode(code)?.language,'mongodb',code);
  }
});
test('Java Spring import blocks and one-liners are recognized',()=>{
  for(const code of [importsJava,importsJavaShort,'import org.springframework.stereotype.Component;']) {
    assert.equal(detectLanguage(code).language,'java',code);
    assert.equal(recognizeChatCode(code)?.language,'java',code);
    assert.equal(recognizeChatCode(code)?.code,code);
  }
});
test('Python imports, Flask bootstrap and DB configuration are recognized',()=>{
  for(const code of [importsPython,flask,dbPython,'from flask import Flask','import redis']) {
    assert.equal(detectLanguage(code).language,'python',code);
    assert.equal(recognizeChatCode(code)?.language,'python',code);
    assert.equal(recognizeChatCode(code)?.code,code);
  }
});
test('recognizes prefixes before WhatsApp Leer más, including imports and MongoDB',()=>{
  for(const code of [mongo.slice(0,140),importsJavaShort,importsPython,flask]){
    assert.equal(likelyCodePrefix(code),true,code);
  }
});
test('syntax tokens keep every character and highlight MongoDB operators',()=>{
  const tokens=tokenize(mongo,'mongodb');
  assert.equal(tokens.map(t=>t.value).join(''),mongo);
  assert.equal(tokensToLines(mongo,'mongodb').map(line=>line.map(t=>t.value).join('')).join('\n'),mongo);
  assert.ok(tokens.some(t=>t.value==='$match'&&t.kind==='keyword'));
  assert.ok(tokens.some(t=>t.value==='$project'&&t.kind==='keyword'));
  assert.ok(tokens.some(t=>t.value==='aggregate'&&t.kind==='keyword'));
});
test('new MongoDB language works through existing message envelope',()=>{
  const packed=makeSnippet({code:mongo,language:'mongodb',theme:'dracula',filename:'reporte.mongo'});
  assert.equal(readSnippet(packed).code,mongo);
  assert.equal(readSnippet(packed).language,'mongodb');
});
test('normal conversational references remain unchanged',()=>{
  const prose=[
    'Vamos a revisar db.pedidos.aggregate mañana por la tarde.',
    '¿Puedes explicarme qué hace $match y $project en MongoDB?',
    'Necesito importar org.springframework.scheduling.annotation.Async;',
    'Recuerda que Flask y MongoClient deben configurarse por separado.',
    'Mi compañero escribió import redis durante la explicación.',
    'importante: esta sección debe revisarse.'
  ];
  for(const message of prose)assert.equal(recognizeChatCode(message),null,message);
});
