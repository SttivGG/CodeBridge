/** Release-gate checks for packaging. Complements, not replaces, a security audit. */
import {readFileSync, existsSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const file=name=>readFileSync(resolve(root,name),'utf8');
const manifest=JSON.parse(file('manifest.json'));
const pkg=JSON.parse(file('package.json'));
const files=['manifest.json','background.js','sidepanel.html','styles.css','app.js','core.js','visual.js','highlight.js','message.js','expansion.js','security.js','diagnostics.js','manual.js','smart-clipboard.js','transport.js','whatsapp.js','icons/icon16.png','icons/icon48.png','icons/icon128.png'];
for(const f of files)assert.ok(existsSync(resolve(root,f)),`Falta archivo de producción: ${f}`);
assert.equal(manifest.manifest_version,3);
assert.equal(manifest.version,'0.9.7');
assert.equal(manifest.version_name,'1.0 RC1');
assert.equal(pkg.version,'1.0.0-rc.1');
assert.deepEqual(manifest.optional_host_permissions,['https://web.whatsapp.com/*']);
assert.deepEqual(manifest.optional_permissions,['clipboardRead']);
assert.deepEqual([...manifest.permissions].sort(),['sidePanel','storage','clipboardWrite','scripting'].sort());
assert.equal(manifest.content_security_policy.extension_pages,"script-src 'self'; object-src 'self'");
assert.ok(file('sidepanel.html').includes('id="access-disclosure"'),'Falta la explicación visible de acceso');
assert.ok(!/v0\.9\.5/.test(file('sidepanel.html')),'Etiqueta de versión antigua');
for(const [size,path] of [[16,'icons/icon16.png'],[48,'icons/icon48.png'],[128,'icons/icon128.png']]){
 const data=readFileSync(resolve(root,path));
 assert.equal(data.subarray(0,8).toString('hex'),'89504e470d0a1a0a','PNG inválido');
 assert.equal(data.readUInt32BE(16),size,`Ancho de ${path}`);
 assert.equal(data.readUInt32BE(20),size,`Alto de ${path}`);
}
for(const name of files.filter(x=>x.endsWith('.js'))){
 const source=file(name);
 assert.ok(!/\beval\s*\(|new\s+Function\s*\(/.test(source),`Ejecución dinámica en ${name}`);
 assert.ok(!/\bfetch\s*\(|XMLHttpRequest\s*\(|sendBeacon\s*\(|WebSocket\s*\(/.test(source),`Revisar solicitudes de red en ${name}`);
 assert.ok(!/\.innerHTML\s*=/.test(source),`Inserción HTML dinámica en ${name}`);
 assert.ok(!/execCommand\s*\(\s*['"]insertHTML/.test(source),`Inserción HTML en ${name}`);
}
console.log(`AUDIT PASS: versión coherente, ${files.length} archivos de producción, alcance/permiso mínimos, íconos y controles estáticos`);
console.log('PENDIENTE: revisión legal de WhatsApp, pruebas en Chrome/Edge reales, privacidad publicada y soporte.');
