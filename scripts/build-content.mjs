// Dependency-free bundler: content script is a classic MV3 script. Share exact core + renderer logic.
import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const code=['core.js','visual.js','highlight.js','message.js','expansion.js','security.js','diagnostics.js','manual.js','transport.js'].map(file=>readFileSync(resolve(root,file),'utf8').replace(/^import\s+.*?;\s*$/gm,'').replaceAll(/\bexport\s+/g,'')).join('\n');
const content=readFileSync(resolve(root,'src/content-feature.js'),'utf8');
writeFileSync(resolve(root,'whatsapp.js'),`/* Generated with npm run bundle:content. Local-only. */\n(()=>{\n${code}\n${content}\n})();\n`);
console.log('whatsapp.js actualizado');
