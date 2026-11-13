# CodeBridge v0.5 — Integración de mensajes largos

## Corrección principal

`MutationObserver` detecta burbujas nuevas. Antes de reconocer/renderizar, la extensión inspecciona **únicamente el control nativo visible** de expansión en esa burbuja. Si aparece «Leer más» o sus equivalentes locales:

1. Mantiene visible el mensaje original de WhatsApp y **no crea ninguna tarjeta parcial**.
2. Si el prefijo del mensaje tiene indicios sólidos de código, pulsa el control nativo de expansión; nunca el compositor ni los botones de envío.
3. Espera la actualización del DOM: el botón debe desaparecer **y el texto recuperado debe ser más largo** que su vista contraída.
4. Solo entonces aplica `recognizeChatCode()` y `renderHighlighted()`; `Copiar código` utiliza ese texto completo.
5. Si la expansión no funciona, el botón original sigue disponible para intervención manual. Se limita el número de intentos automáticos.

Los mensajes normales con «Leer más» no se expanden automáticamente y no se decoran. La expansión no se implementa mediante acceso a módulos internos de WhatsApp ni peticiones de red.

## Invariantes

- No modificar ni interceptar `paste`, Enter o envío.
- No convertir mensajes contraídos en tarjetas que parezcan completas.
- No copiar un prefijo truncado como si fuera código íntegro.
- No ocultar los controles nativos antes de que el texto esté listo.
- Mantener el mensaje original en el DOM y el botón **Ver original**.
- Procesamiento local, sin almacenamiento ni transmisión de mensajes.

## Pruebas

- `npm run verify`: motor, detección, protocolo, etiquetas de expansión, prefijos y límites.
- `python tests/browser_smoke_v05.py`: Chromium real con DOM de chat simulado y contenido completo con retraso, expansión normal y tardía, fallo de expansión, prosa intacta, copia y cambio dinámico de texto.
- **Pendiente:** validación en WhatsApp Web real con sus selectores actuales y dos navegadores (emisor/receptor).

## Backlog

- Verificar el HTML exacto de «Leer más» en WhatsApp Web real; añadir selectores solo si son necesarios.
- Integrar resaltado TextMate/Shiki con temas auténticos de VS Code.
- Indicador discreto de idioma dudoso con opción «Ver como código» para evitar falsos negativos.
- Optimizar renderizado de fragmentos de miles de líneas (virtualización opcional).
- Pruebas del compositor con preservación de espacios y saltos de línea para futuras versiones.
