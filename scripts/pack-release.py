"""Genera ZIP de distribución mínimo y ZIP completo de fuentes sin dependencias extras."""
from pathlib import Path
import hashlib, json, zipfile
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT.parent
EXACT=[
 'manifest.json','background.js','sidepanel.html','styles.css','app.js',
 'core.js','visual.js','highlight.js','message.js','expansion.js',
 'security.js','diagnostics.js','manual.js','smart-clipboard.js',
 'transport.js','whatsapp.js','icons/icon16.png','icons/icon48.png','icons/icon128.png'
]

def normalized_write(zipper,relative_name,content):
    item=zipfile.ZipInfo(relative_name,date_time=(2020,1,1,0,0,0))
    item.compress_type=zipfile.ZIP_DEFLATED
    item.external_attr=(0o100644<<16)
    zipper.writestr(item,content,compress_type=zipfile.ZIP_DEFLATED,compresslevel=9)

def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

manifest=json.loads((ROOT/'manifest.json').read_text())
assert manifest['version']=='0.9.7', 'Version RC inesperada'
assert len(set(EXACT))==len(EXACT)
for relative in EXACT: assert (ROOT/relative).is_file(),relative
extension_zip=OUT/'CodeBridge_1.0_RC1_EXTENSION.zip'
with zipfile.ZipFile(extension_zip,'w') as z:
    for rel in sorted(EXACT): normalized_write(z,rel,(ROOT/rel).read_bytes())
# Incluye código fuente, pruebas y documentos; excluye archivos temporales o binarios de distribución.
all_source=sorted(p for p in ROOT.rglob('*') if p.is_file() and not any(part in {'.git','__pycache__','node_modules','.pytest_cache'} for part in p.parts) and p.suffix!='.pyc')
source_zip=OUT/'CodeBridge_1.0_RC1_FUENTES.zip'
with zipfile.ZipFile(source_zip,'w') as z:
    for p in all_source:
        rel=p.relative_to(ROOT)
        normalized_write(z,'CodeBridge_1.0_RC1/'+rel.as_posix(),p.read_bytes())
lines=['# Hashes SHA-256 — CodeBridge RC1','',f'`{extension_zip.name}`: `{sha256(extension_zip)}`',f'`{source_zip.name}`: `{sha256(source_zip)}`','']
(OUT/'CodeBridge_1.0_RC1_SHA256.txt').write_text('\n'.join(lines))
for p in (extension_zip,source_zip):
    with zipfile.ZipFile(p) as z:
        assert z.testzip() is None
    print(f'{p.name} | {p.stat().st_size:,} bytes | SHA256 {sha256(p)}')
print('ZIPs verificados; la auditoría del código se ejecuta con npm run verify:release.')
