# v0.9.6.3 — Resolución del aviso duplicado

## Causa

En v0.9.6.2 convivían dos flujos: Smart Clipboard preparando texto protegido por acción explícita del usuario y un escucha pasivo de `paste` dentro de WhatsApp que generaba una tarjeta flotante con «Copiar protegido» para código con marcadores sensibles. Se intentó solucionar mediante mensajes entre panel y chat, pero eran eventos independientes, con potencial de notificaciones viejas e inconsistencias entre sesiones. Los tests previos no modelaban todas las interacciones reales.

## Corrección

- Se eliminó el escucha de `paste` del content script y toda la generación de su aviso; no se cancela ni reescribe ningún pegado.
- Se retiró del panel la opción «Ayuda de pegado protegido».
- La notificación «portapapeles preparado» sigue siendo compatible, pero únicamente limpia elementos flotantes obsoletos. No pasa texto de un contexto a otro.
- Al inyectarse una versión nueva en la misma pestaña, solicita al content script anterior que se desactive y libere observadores. Esto no desinstala otras extensiones ni puede impedir que otra extensión independiente inyecte su propio aviso.
- El único proceso guiado es «Preparar portapapeles» desde Smart Clipboard. El texto original no se modifica dentro de WhatsApp por CodeBridge.

## Limitación

La extensión ya no advierte de un pegado sin preparar. Cada fragmento sensible debe prepararse manualmente antes de enviarse. No existe todavía un modo con un solo Ctrl+V que preserve la sintaxis de todos los lenguajes en el WhatsApp real.

## Prueba de regresión

La prueba `tests/browser_no_duplicate_v0963.py` crea un editor simulado, inyecta una notificación heredada, verifica su eliminación, envía pegados sin proteger y protegidos, confirma que no aparece ningún aviso nuevo y valida «Copiar código» sobre un mensaje recibido.
