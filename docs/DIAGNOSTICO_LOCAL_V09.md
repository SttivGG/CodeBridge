# CodeBridge 0.9 — Diagnóstico local de rendimiento

## Objetivo

Permitir medir el trabajo **de CodeBridge**, sin registrar ni transmitir contenido de WhatsApp. El diagnóstico se mantiene en la memoria de cada pestaña, se consulta explícitamente desde el panel y se reinicia al recargar o cerrar dicha pestaña.

## Indicadores

| Métrica | Definición |
| --- | --- |
| Tarjetas activas | Cantidad de fragmentos transformados actualmente presentes en el DOM del chat |
| Mensajes revisados | Conteo acumulado de burbujas examinadas durante la sesión |
| Tarjetas creadas | Conteo acumulado de tarjetas generadas (incluye reemplazos por cambios de modo) |
| Cola pendiente | Burbujas a procesar en el siguiente lote |
| Render promedio | Media del tiempo de construcción de una tarjeta, últimos 128 valores |
| Render p95 | Percentil 95 de los últimos 128 tiempos de construcción de tarjeta |
| Fallos del visor | Excepciones recuperadas durante el análisis de burbujas |
| Expansiones | Intentos de expandir «Leer más» sobre fragmentos de código |
| Omitidos por tamaño | Intentos que exceden el límite máximo seguro |
| Eliminadas | Referencias a tarjetas liberadas al retirar mensajes del DOM |
| Copias | Acciones de copia completadas o fallidas |

Los tiempos de lote son adicionales en el informe exportado. Su unidad es milisegundos. **No se trata de medidas directas de CPU ni de RAM**, no debe interpretarse que `render p95` equivale a latencia global de WhatsApp, y la cuenta de burbujas puede incluir reevaluaciones debidas a cambios de DOM. Los límites de 128 muestras evitan que las estadísticas crezcan indefinidamente.

## Privacidad y modelo de amenazas

- No se registra texto de mensajes, código fuente, nombre de archivo, ID de chat, contacto, número telefónico ni URL.
- No hay llamadas de red ni telemetría remota del diagnóstico.
- Los contadores son valores agregados con nombres de evento permitidos; excepciones se agrupan por tipo y **nunca se vuelca el texto de la excepción**.
- El informe JSON solo se escribe en el portapapeles cuando el usuario pulsa «Copiar informe».
- Reiniciar contadores no altera mensajes, tarjetas, perfil visual ni contenido original.
- Desactivar el visor elimina el observador DOM, los listeners y las tarjetas del chat.
- Una extensión con permiso para WhatsApp Web **sí puede acceder al contenido visible mientras esté activada**. El diagnóstico no elimina esa capacidad; limita lo que almacenamos o exportamos.

## Uso

1. Abre WhatsApp Web y comprueba que CodeBridge está activado.
2. Abre el panel lateral de CodeBridge.
3. Busca «Diagnóstico local» y pulsa **Actualizar métricas**.
4. Envía varios fragmentos de prueba; vuelve a actualizar.
5. Para comparar los perfiles, pulsa **Reiniciar contadores**, procesa un conjunto equivalente de mensajes, registra los tiempos y repite en Low Mode.
6. Si compartes el reporte, pulsa **Copiar informe**; únicamente contiene métricas numéricas y el nombre del perfil.

## Interpretación de Low Mode

Low Mode desactiva tokenización visual y vidrio, pero utiliza lotes pequeños y espaciados para no monopolizar el hilo principal. Por eso **su tiempo total de finalización puede ser mayor**, incluso cuando el tiempo de renderizado individual de tarjeta sea notablemente inferior. Esta decisión es intencional: priorizamos la capacidad de seguir escribiendo y navegando con fluidez.

### Ejemplo reproducible (Chromium simulado, 250 mensajes)

| Perfil | Tiempo total observado | Render promedio | Render p95 |
| --- | ---: | ---: | ---: |
| Equilibrado | 1.101 ms | 0,68 ms | 1,20 ms |
| Low Mode | 2.321 ms | 0,14 ms | 0,30 ms |

Resultados de **una sola ejecución** de `python tests/benchmark_modes.py` en el entorno de desarrollo; no son una comparación estadística robusta ni una prueba de la app oficial o de WhatsApp real. La carga de JavaScript, el hardware, la cantidad de nodos y el planificador pueden cambiar los resultados. Para validar comercialmente debemos hacer múltiples ensayos en computadores físicos.

## Criterios antes de 1.0

- Comparar el contenido copiado con el original, carácter por carácter.
- Medir impacto sobre escritura, scroll y cambios de conversación en equipos de 4–8 GB de RAM.
- Validar acceso/permiso y rendimiento en Chrome y Edge reales.
- Probar sesiones prolongadas, 500–1.000 mensajes, código ambiguo, HTML malicioso y mensajería normal.
- Verificar que una actualización de WhatsApp no deja mensajes ocultos si falla el renderer.
- Revisar políticas de Chrome Web Store, Edge Add-ons y WhatsApp antes de distribuir.
