# Arquitectura y prioridades posteriores a v0.6

## Flujo actual

Editor → copiar → pegar directamente en WhatsApp Web → enviar texto nativo → `MutationObserver` agrega la burbuja a la cola → comprobación «Leer más» → detección conservadora → tarjeta Shadow DOM local → copiar / ver original.

## Reglas de seguridad visual

- No almacenar historiales de conversaciones ni códigos fuente.
- No interceptar `Ctrl+V`, Enter ni la API de envío de WhatsApp.
- No interpretar el código como HTML/JS ejecutable: solo nodos de texto.
- No generar una tarjeta cuando sigue apareciendo «Leer más» o el contenido aún no se ha expandido.
- No sustituir el mensaje original en la base de WhatsApp; solo ocultarlo visualmente cuando la tarjeta es válida.
- No colorear textos normales sin estructura de código.

## Rendimiento v0.6

El observador procesa la mutación de la burbuja, no todo el chat cada vez. Mantiene una cola `Set` de elementos únicos y procesa lotes de 30 mensajes, con deduplicación por contenido. El escaneo completo solo se hace en la carga inicial y ante una orden explícita de reescaneo o cambio de preferencias. En fragmentos >24.000 caracteres o >600 líneas conserva un único nodo de texto sin generar miles de spans.

## Próximos incrementos

1. **v0.6.1**: validación en un WhatsApp Web real de Chrome y Edge; ajustar selectores solo si se observa un fallo.
2. **v0.7**: integrar Shiki desde una versión fijada, empaquetando gramáticas/temas como recursos locales de la extensión; usar trabajadores de forma compatible con Manifest V3 si las pruebas de rendimiento lo justifican.
3. **v0.7**: detectar y sugerir lenguaje mediante heurísticas y nombre de archivo cuando esté disponible, con mecanismo de anulación manual opcional, sin afectar el envío.
4. **v0.8**: validar WhatsApp Web instalado como aplicación de Windows, accesibilidad y soporte multiidioma para «Leer más».
5. **v0.9**: auditoría de permisos, privacidad, seguridad y compatibilidad con condiciones de WhatsApp antes de distribución.
