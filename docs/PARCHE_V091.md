# CodeBridge v0.9.1 — Parche de reconocimiento

## Alcance

Corrección incremental sobre v0.9 para detectar consultas MongoDB Shell / aggregation y fragmentos aislados de Java y Python. Mantiene el tratamiento local, los permisos, los indicadores de diagnóstico y el perfil Low Mode.

## Archivos modificados

- `core.js`: idioma `mongodb`, firmas MongoDB, imports Java, Flask, PyMongo y Redis.
- `message.js`: umbral estructural para imports y consultas MongoDB de una sola línea.
- `expansion.js`: reconocimiento temprano de prefijos largos antes de «Leer más».
- `highlight.js`: clasificación de operadores MongoDB para el resaltador local.
- `whatsapp.js`: bundle reconstruido desde los módulos anteriores.
- `manifest.json` y `package.json`: versión 0.9.1.
- `tests/core.test.mjs`, `tests/mongodb-imports.test.mjs`, `tests/browser_smoke_v091.py`: regresiones.

## Instalación en el repositorio

1. Haz respaldo o crea una rama desde el `main` actual.
2. Copia los archivos de esta carpeta en el repositorio local, **sin borrar** el contenido existente. Se ha partido de los mismos archivos del commit `7511c40c`.
3. Ejecuta `npm run verify`.
4. Ejecuta `python tests/browser_smoke_v091.py` y las pruebas de navegador anteriores si tienes Playwright y Chromium.
5. Prueba el mismo MongoDB y los imports en WhatsApp Web. Si todo funciona, crea un commit y sube el cambio.

### Comandos PowerShell (desde la carpeta local de tu repositorio)

```powershell
git pull --ff-only origin main
git switch -c fix/mongodb-imports-v091
# Copia aquí los archivos modificados del paquete descargado.
npm run verify
python tests/browser_smoke_v091.py
git add core.js message.js expansion.js highlight.js whatsapp.js manifest.json package.json README.md tests/core.test.mjs tests/mongodb-imports.test.mjs tests/browser_smoke_v091.py docs/PARCHE_V091.md
git commit -m "fix: reconocer MongoDB e imports aislados en WhatsApp"
git push -u origin fix/mongodb-imports-v091
```

Después crea un pull request en GitHub. Esta opción evita reescribir automáticamente `main` y permite revisión del parche.

## Consideraciones

- MongoDB se interpreta como lenguaje `mongodb`, basado en JavaScript, y sus fragmentos permanecen texto seleccionable.
- El detector no evalúa ni ejecuta el código. Evita modificar la burbuja original de WhatsApp.
- Un mensaje que WhatsApp ya haya aplanado perdiendo los saltos originales no puede reconstruirse con certeza.
- La detección automática es conservadora y puede no identificar todos los dialectos; se ampliará con casos reales de prueba.
- El informe de diagnóstico no contiene texto de mensajes ni nombres de contactos.
