# Smart Clipboard v0.9.6.1 — evitar el aviso duplicado

## Problema

Smart Clipboard y el aviso de pegado de WhatsApp Web son componentes separados. El primero actualizaba correctamente el portapapeles pero no notificaba a un aviso ya abierto en el chat. Así parecía que la extensión pedía proteger el mismo código otra vez.

## Solución

1. Tras copiar y volver a leer el texto protegido, el panel envía `codebridge:clipboard:prepared` a las pestañas autorizadas de `https://web.whatsapp.com/*` mediante la mensajería propia de Chrome.
2. El mensaje contiene **solo el tipo de evento**. Nunca incluye texto del portapapeles, identificadores de usuario, fragmentos, hashes ni contenido del chat.
3. El content script valida que el emisor pertenezca a la extensión y modifica solamente la sugerencia temporal: elimina el botón «Copiar protegido» si ya estaba visible; si la sugerencia estaba pendiente, muestra un aviso de reemplazo de borrador.
4. Si el pegado posterior contiene un bloque ya protegido, el aviso anterior desaparece y no se programa otro. Si llega un fragmento nuevo sin protección, la advertencia continúa disponible.
5. **Sin automatismos ocultos:** no se intercepta Ctrl+V ni se reescribe el cuadro de WhatsApp.

## Limitación importante

La preparación es **por fragmento**, no un modo persistente. Un borrador sin proteger **no se reescribe solo** al preparar el portapapeles. Se debe seleccionar y reemplazar con Ctrl+V antes de enviarlo. Si WhatsApp altera los caracteres del código una vez enviado, CodeBridge no puede reconstruirlos con seguridad.

## Pruebas

`npm run verify`, `python tests/browser_smart_clipboard_v096.py`, `python tests/browser_smart_clipboard_sync_v0961.py` y suites históricas de navegador. Aún no probado directamente en WhatsApp real; confirmar mediante prueba manual con dos usuarios.
