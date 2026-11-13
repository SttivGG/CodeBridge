# CodeBridge v0.9.6.2 — Aviso duplicado de pegado protegido

## Qué ocurría

En v0.9.6.1 el panel confirmaba que Smart Clipboard había preparado el portapapeles, pero el aviso antiguo «Copiar protegido» podía seguir abierto en WhatsApp Web. La confirmación dependía de una notificación directa a la pestaña mediante `chrome.tabs.query` + `chrome.tabs.sendMessage`; sus errores se ignoraban. Si no llegaba, el aviso quedaba visible pese a la preparación correcta.

El aviso también podía permanecer abierto después de la preparación y convertirse en una segunda instrucción redundante.

## Corrección

- El panel sigue enviando la notificación directa, pero emite **además** una señal por `chrome.storage.local.set` con clave `codebridge.smartClipboardPreparedNotice`.
- El visor observa `chrome.storage.onChanged`; al recibir la señal, cierra cualquier aviso local anterior y cancela uno pendiente.
- No se transmite código fuente ni contenido del portapapeles. El valor de la señal es un identificador aleatorio por acción; no se usa para rastrear chats ni determinar si un mensaje posterior está protegido.
- Un pegado nuevo **sin** formato protegido todavía muestra el aviso opcional. Pegar un bloque ya protegido no lo muestra.
- No se intercepta `Ctrl+V`, ni se altera el editor interno de WhatsApp.

## Actualización correcta

1. Abre `chrome://extensions` (o `edge://extensions`). **Desactiva o elimina todas las versiones anteriores de CodeBridge**. Si permanecen dos extensiones instaladas, ambas pueden mostrar avisos y editar la presentación de las tarjetas.
2. Instala **solamente** `CodeBridge_v0.9.6.2-smart-paste` mediante **Cargar descomprimida**.
3. Cierra completamente todas las pestañas de WhatsApp Web y abre de nuevo `https://web.whatsapp.com/`. Las extensiones antiguas pueden haber dejado scripts activos en una pestaña abierta, incluso después de cargar otra carpeta.
4. Abre CodeBridge y activa su integración. Copia código desde cualquier editor.
5. Pulsa **Preparar portapapeles** y asegúrate de que indique «protegido» o «ya está protegido».
6. Si el cuadro de WhatsApp tiene código sin protección de un intento anterior, **bórralo o selecciónalo por completo**. Luego pega con `Ctrl+V`, revisa los identificadores `__init__` y `__str__` y envía.
7. No debe aparecer «Copiar protegido» después de preparar ese fragmento. Si copias otro código desde el editor después, ya se trata de un portapapeles nuevo: vuelve a prepararlo.

## Validación

- 72/72 pruebas unitarias.
- 12/12 pruebas de regresión en Chromium con chat simulado.
- Prueba adicional donde `tabs.query` falla a propósito, pero el evento `storage.onChanged` cierra el aviso.

**Pendiente:** comprobar en la sesión real de WhatsApp Web del usuario. Las pruebas de simulación no garantizan compatibilidad con todos los cambios futuros en la interfaz de WhatsApp.
