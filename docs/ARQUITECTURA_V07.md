# CodeBridge v0.7 — Arquitectura y decisiones técnicas

## Objetivo

Código fuente seleccionable y copiable en WhatsApp Web sin convertirlo a imagen. La vista enriquecida se compone de elementos DOM encapsulados mediante Shadow DOM y no interfiere con el envío de mensajes.

## Flujo

1. El usuario pega y envía texto en WhatsApp como siempre.
2. El script de contenido observa cambios de mensaje y encola únicamente burbujas afectadas.
3. Si se detecta `Leer más` y el prefijo sugiere código, lo expande por el control normal y espera a disponer de más contenido.
4. `recognizeChatCode` reconoce patrones de Java, Python, SQL, etc.; desde v0.7 detecta NASM/x86-64.
5. `renderHighlighted` crea exclusivamente nodos `span` y nodos de texto. No hace `innerHTML` con código del usuario.
6. La tarjeta ofrece `Copiar código` (texto original del mensaje) y `Ver original` (restaura la burbuja nativa).
7. Si hay más de 35 tarjetas activas, se desactiva el `backdrop-filter` de esas tarjetas. El panel sigue pudiendo mostrar cristal.

## Preferencias

`chrome.storage.local` guarda únicamente preferencias: `uiMode`, `theme`, `lineNumbers`, `wrap`, `fontSize`, `maxHeight`, `glassBlur`, `glassOpacity`, `glassCards`. No almacena contenido de conversaciones.

## Compatibilidad

Chrome Manifest V3, navegador Chrome o Edge, permiso `web.whatsapp.com` solicitado al usuario, aislamiento mediante Shadow DOM. No se modifica WhatsApp Desktop oficial. La versión actual no se ha probado contra la interfaz en vivo de WhatsApp.

## Riesgos residuales

- Cambios de estructura DOM de WhatsApp o colapso inesperado de mensajes.
- Sintaxis de ensamblador distintas del ejemplo NASM y falsos negativos en fragmentos demasiado pequeños.
- Coste de `backdrop-filter` en dispositivos con recursos limitados, reducido con un umbral de 35 tarjetas.
- Las pruebas de navegador se ejecutan sobre una maqueta del DOM, no la plataforma real.
- Shiki/TextMate es una mejora posterior, no parte de esta versión.
