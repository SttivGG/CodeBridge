# Corrección segura de pegado — CodeBridge v0.9.5

## Incidencia

Al pegar clases Python con métodos `__init__` y `__str__`, v0.9.3/v0.9.4 intentaba insertar un mensaje monoespaciado con `document.execCommand('insertHTML')`, cancelando el evento de pegado. Este método es obsoleto y no sincroniza de forma confiable el estado interno del compositor de WhatsApp Web. Como consecuencia, se generaba una alerta de verificación y a veces quedaba vacío el campo.

## Solución

- El listener es **pasivo**: no usa `preventDefault`, `stopImmediatePropagation` ni `insertHTML`.
- El pegado inicial lo realiza únicamente WhatsApp.
- Si el código reconocido contiene marcadores que WhatsApp podría interpretar, se muestra **Copiar protegido**.
- Solo cuando el usuario pulsa el botón, se copia ` ``` ` + código original + ` ``` ` al portapapeles. No hay envío ni modificación automática del borrador.
- Si antes del primer pegado el editor estaba vacío **y el borrador sigue coincidiendo con el código original**, se selecciona el borrador para que un segundo Ctrl+V lo sustituya. Si no, el usuario debe seleccionar únicamente el código, para no borrar otros mensajes.
- Las sugerencias se descartan al segundo pegado, al presionar Enter en el compositor, al desactivar la extensión o tras 30 segundos.
- Las estadísticas no almacenan fragmentos ni texto copiado.

## Pruebas

- `npm test` — 64/64 pruebas.
- `python tests/browser_safe_paste_v095.py` — primer pegado no cancelado, segundo pegado con triple backtick, copia íntegra en destinatario y mensajes normales sin alterar.
- Suites de navegador v0.4 a v0.9.2 — todas correctas en Chromium simulado.

## Limitaciones

La solución requiere un clic y segundo Ctrl+V para los casos sensibles. La compatibilidad con el editor de WhatsApp Web real debe ser confirmada manualmente. No afirmamos que la inserción protegida sea automática ni que un primer pegado sin protección sea seguro frente al formateo de WhatsApp.
