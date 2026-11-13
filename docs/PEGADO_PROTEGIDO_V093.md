# CodeBridge v0.9.3 — Protección de pegado Python

## Causa

WhatsApp utiliza `_texto_` para cursivas y tres acentos graves (backticks) para monoespaciado. Cuando se pega código como `def __init__`, el formato de WhatsApp puede interpretar algunos guiones bajos. CodeBridge no puede adivinar caracteres ya eliminados del mensaje recibido.

## Corrección

Se intercepta el evento **paste** únicamente dentro del compositor del chat de WhatsApp Web si está activa la opción "Proteger código al pegar" y el texto contiene código reconocido junto a símbolos que pueden activar formato de WhatsApp. El fragmento se inserta delimitado con tres backticks; el interior conserva sus caracteres originales. El receptor con CodeBridge puede copiar el código sin los delimitadores visibles; sin CodeBridge, WhatsApp debe mostrarlo monoespaciado.

Los elementos HTML se escapan antes de su inserción en el compositor. Se usan saltos `<br>` únicamente como estructura de edición, para evitar que Chromium duplique líneas vacías. No se almacena el código en el diagnóstico ni se envía a servidores CodeBridge. Se emite una advertencia local si la inserción no puede verificarse.

## Limitaciones

- **Requiere validación en una conversación de WhatsApp Web real.** La API de edición del compositor podría cambiar.
- Solo protege código pegado con Ctrl+V; no repara código tecleado ni mensajes enviados previamente.
- No se interceptan bloques que ya incluyen delimitadores de tres backticks, mensajes normales, búsquedas ni campos distintos del compositor.
- En equipos sin CodeBridge, el contenido se visualiza con formato monoespaciado conforme a la implementación de WhatsApp; su compatibilidad debe probarse en el destinatario.
- El emisor debe comprobar el borrador antes de enviar si aparece la advertencia de integridad.

## Prueba manual

1. Instalar v0.9.3 en el emisor y receptor (desactivar versiones anteriores y recargar WhatsApp Web).
2. Confirmar en el panel que "Proteger código al pegar" está activado.
3. Copiar el ejemplo `class Producto` con `def __init__` y `def __str__` desde VS Code y pegarlo con Ctrl+V en el compositor del chat.
4. Verificar que aparecen los delimitadores de monoespaciado en el borrador, que el código conserva sus guiones bajos y que no aparece el aviso de fallo.
5. Enviar y usar "Copiar código" en el receptor. Comparar la cadena copiada con el original (incluyendo líneas vacías y caracteres exactos).
6. Enviar un mensaje normal con guiones bajos y comprobar que no es transformado en código.

## Verificación automatizada

`npm run verify` y `python tests/browser_safe_paste_v093.py`. El test usa Chromium y un compositor simulado, **no una sesión real de WhatsApp**.
