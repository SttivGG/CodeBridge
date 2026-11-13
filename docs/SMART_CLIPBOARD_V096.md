# Smart Clipboard v0.9.6 — diseño experimental

## Alcance

**Objetivo:** preparar en el portapapeles un fragmento de código que podrá pegarse con el evento nativo Ctrl+V en WhatsApp Web, sin requerir modificaciones ni complementos en la aplicación de origen.

**Decisión:** NO interceptar, cancelar, sintetizar ni forzar la inserción de texto en el editor de WhatsApp. El método v0.9.3/v0.9.4 con `insertHTML` se retiró debido a problemas de sincronización con la aplicación web. El fallback v0.9.5 permanece disponible.

## Arquitectura

- `smart-clipboard.js`: función pura `planSmartClipboard(text, preferredLanguage)`; normaliza `CRLF` a `LF`, valida detección o elección manual, longitud, fences ambiguos y vuelta exacta con `recognizeChatCode`. No usa APIs ni guarda texto.
- `sidepanel.html`: sección de preparación, selector de lenguaje, botón de preparación y revocación.
- `app.js`: `prepareClipboard()` llama a `chrome.permissions.request({permissions:['clipboardRead']})` por clic explícito, luego `navigator.clipboard.readText()`, decide y, solo con un plan seguro, `navigator.clipboard.writeText()`. Comprueba la escritura leyendo una vez más antes de mostrar éxito. No imprime ni almacena el código.
- `manifest.json`: `optional_permissions:["clipboardRead"]`. Permiso concedido solo tras consentimiento; los permisos existentes de la v0.9.5 no cambian.
- `whatsapp.js` y el visor siguen con la misma política pasiva de pegar nativamente. El contenido preparado se envía como texto monoespaciado y el receptor ve tarjeta si usa CodeBridge.

## Casos que NO se modifican

- Texto normal o código no reconocido con «Detección automática».
- Código que ya contiene delimitadores ` ``` ` o está protegido.
- Contenido vacío, demasiado largo, elección de lenguaje inválida o imposibilidad de verificar integridad.
- Permiso rechazado o error de lectura/escritura del portapapeles.

## Limitaciones explícitas

- El origen del texto puede ser cualquier aplicación, pero la **preparación se hace en Chrome/Edge con CodeBridge abierto**. No funciona automáticamente en WhatsApp Desktop oficial ni en Android/iOS.
- La selección manual de lenguaje valida la preparación, pero el texto protegido no transporta metadatos del lenguaje. El receptor puede necesitar la opción «Ver como código» o cambiar de lenguaje en la tarjeta.
- El formato delimitado por triple acento grave no admite sin ambigüedad literales iguales dentro del propio código; no se transforman.
- No hay acceso a datos arbitrarios del portapapeles sin consentimiento: el permiso opcional solicitado por el navegador es potente, por lo que debe revocarse cuando no se necesite.
- **No garantizamos aún la fidelidad de extremo a extremo en WhatsApp real** hasta comparar el código copiado en el receptor con el original.

## Pruebas

`npm run verify` valida parser, límites, NASM, Java, MongoDB, Python, no doble protección, rechazo de texto corriente y privacidad de diagnósticos.

`python tests/browser_smart_clipboard_v096.py` valida el panel en Chromium con API de portapapeles y permisos simulados (lectura solo tras clic, doble lectura para verificación, revocación, negación de permisos, selección manual de Python, ningún código en el estado visible).

`python tests/browser_safe_paste_v095.py` valida que el pegado nativo y el fallback manual no hayan sido sustituidos.
