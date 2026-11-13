# CodeBridge 0.8 — Revisión de seguridad y rendimiento

## Modelo de amenazas

| Activo / riesgo | Medida implementada | Riesgo residual |
|---|---|---|
| Fragmentos potencialmente maliciosos recibidos | DOM por `textContent`; sin `eval` ni `innerHTML` | Posibles fallos del navegador, heurísticas insuficientes, errores del contenido original |
| HTML/JS en un mensaje | Se dibuja literalmente, no se interpreta | El usuario puede copiar y ejecutar por su cuenta el código recibido |
| Caracteres invisibles / Trojan Source | Advertencias sobre bidi y zero-width, sin modificar bytes | La advertencia no identifica toda técnica de ofuscación |
| Fragmentos enormes / abuso de CPU | Límite de 65.536 caracteres, render compacto >24.000, Low Mode sin tokens | No todos los patrones de carga han sido sometidos a pruebas de estrés |
| Exposición de chats privados | Permiso host opcional para `web.whatsapp.com`, sin peticiones de red propias ni guardado de mensajes | La extensión activa **puede leer** el DOM de ese sitio; el usuario debe confiar en el código instalado |
| Fugas por registros | Sin telemetría ni contenido guardado en Chrome Storage | Depende de mantener este criterio en futuras versiones |
| Fugas por referencias DOM | Limpieza al desaparecer mensajes y al desactivar; temporizadores cancelados | No se comprobó con heap snapshots repetidos de horas de navegación |
| Cambios internos de WhatsApp | Reconocimiento conservador; botón Ver original; no altera envío | Los selectores pueden dejar de funcionar cuando WhatsApp cambie |
| Filtrado en la publicación | Manifest MV3, CSP `script-src 'self'`, dependencias externas no requeridas | Auditoría de paquetes, publicación y términos pendiente |

## Decisiones de arquitectura

1. **Perfíl Equilibrado:** usa tokenizador en local y paleta Nexo/VS Code. Para código >24.000 caracteres o >600 líneas se utiliza texto compacto.
2. **Perfil Low Mode:** texto puro con un nodo `pre`, sin nodos por token ni numeración; mantiene un host por tarjeta, copiar y mostrar original. Se deshabilita el cristal de panel y tarjetas.
3. **Procesamiento incremental:** lotes de hasta 30 tarjetas (Equilibrado) o 10 (Low Mode); 12 ms o 40 ms entre lotes; se siguen recibiendo mensajes mientras se procesa una cola.
4. **Solo los cambios visuales profundos regeneran las tarjetas:** idioma/tema, ajuste de líneas o cambio de perfil. Los controles de opacidad, desenfoque, altura y tipografía no reanalizan la sintaxis.
5. **Hoja de estilos compartida** entre múltiples ShadowRoots cuando el navegador lo admite, con `style` local como fallback.
6. **Sin caché persistente de contenido:** no se guarda historial de fragmentos, ni se transfieren mensajes a servicios de análisis.
7. **Sin transformación irreversible:** el texto del mensaje original de WhatsApp permanece en su elemento DOM y puede restaurarse.

## Evidencia automatizada (noviembre 2026)

- **41 pruebas unitarias:** pasan.
- **5 suites funcionales Chromium, chat simulado** (v0.4–v0.8): pasan.
- **v0.8:** 500 mensajes de prueba en Low Mode procesados en aproximadamente 2,7 s en el contenedor de pruebas. Tiempo de laboratorio, sujeto al equipo y al DOM utilizado.
- **XSS sintético:** contenido `script` e `img onerror` en texto no se ejecuta.
- **Límite interno:** un mensaje con más de 65.536 caracteres queda en su vista original.
- **Copia:** igualdad exacta del texto observado del ejemplo de ensamblador.
- **Limpieza:** retirar todos los elementos del chat y desactivar CodeBridge elimina hosts y desconecta observación.
- **Compatibilidad real WhatsApp Web y Edge:** pendiente.

## Próximo trabajo recomendado

- Ensayo real entre dos usuarios y comparación bit a bit de mensajes a través de WhatsApp.
- Perfiles de CPU, memoria y FPS en Windows 11 de gama media y equipo modesto, repitiendo las pruebas bajo condiciones equivalentes.
- Pruebas de navegación de 30–60 minutos y capturas de heap para detectar retención de nodos después de cambios de chat.
- Control estricto de cambios del DOM de WhatsApp y pruebas en versiones de Chrome/Edge especificadas.
- Revisión independiente de permisos, privacidad, condiciones de WhatsApp y seguridad antes de publicar.
