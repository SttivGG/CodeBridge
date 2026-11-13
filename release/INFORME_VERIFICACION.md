# Informe técnico de verificación — CodeBridge 1.0 RC1

**Fecha de ejecución:** 2026-11-13  
**Base:** CodeBridge v0.9.6.5 conservada; nueva revisión de documentación, manifest, declaración de privacidad y empaquetado mínimo.  
**Versión técnica:** 0.9.7 (`version_name`: 1.0 RC1).

## Resultados reproducidos

| Verificación | Resultado | Alcance |
|---|---|---|
| `npm run verify:release` | **PASS** | 72 pruebas unitarias, bundle de content script y auditoría estática de distribución |
| `tests/browser_smoke_v04.py` | PASS | Mensajes, copia y restauración |
| `tests/browser_smoke_v05.py` | PASS | «Leer más», código largo |
| `tests/browser_smoke_v06.py` | PASS | Apariencia Nexo, configuración, render incremental |
| `tests/browser_smoke_v07.py` | PASS | NASM y glassmorphism |
| `tests/browser_smoke_v08.py` | PASS | Low Mode, seguridad de HTML, 500 mensajes simulados |
| `tests/browser_smoke_v09.py` | PASS | Métricas locales y restauración |
| `tests/browser_smoke_v091.py` | PASS | MongoDB, Java imports, Python |
| `tests/browser_smoke_v092.py` | PASS | Cambios manuales de lenguaje |
| `tests/browser_no_duplicate_v0963.py` | PASS | Sin avisos de pegado duplicados |
| `tests/browser_clipboard_recovery_v0964.py` | PASS | Primer clic, permisos y recuperación |
| `tests/browser_smart_clipboard_v096.py` | PASS | Smart Clipboard sin protección doble |
| `tests/browser_compat_v092.py` | **PASS Chromium** | Dos tamaños de ventana, ASM, copia exacta, Low Mode; **Chrome y Edge OMITIDOS** porque no están instalados |

**Total:** 72/72 unitarias, 12/12 scripts de navegador terminados (último script de compatibilidad con dos canales omitidos, no validados). No supone validación de WhatsApp Web real ni una auditoría independiente de seguridad.

## Auditoría automatizada de empaquetado

- CSP de extensión `script-src 'self'; object-src 'self'`.
- Permiso de sitio opcional exclusivo a `web.whatsapp.com` y lectura del portapapeles opcional.
- Sin solicitudes de red o ejecución dinámica evidentes en los archivos JavaScript de producción revisados por patrones estáticos.
- Sin `innerHTML = ...` ni `execCommand('insertHTML')` en el código de producción.
- Íconos 16 × 16, 48 × 48 y 128 × 128 con dimensiones correctas.
- Versión técnica, nombre RC y versión de paquete coherentes.
- Declaración visible sobre acceso a mensajes y portapapeles, previa activación.

Estas comprobaciones son **estáticas y limitadas**: no demuestran ausencia de vulnerabilidades ni sustituyen pruebas con usuarios reales, escaneo de dependencias y revisión de permisos en una tienda.

## Problemas abiertos

1. Pruebas en Chrome/Edge reales y sesiones prolongadas aún pendientes.
2. Riesgo de incompatibilidad por cambios en el DOM de WhatsApp Web.
3. Revisión de términos de servicio de WhatsApp/Meta y licencias, pendiente antes de publicar.
4. Falta identidad del publicador y canal privado de soporte para la política de privacidad.
5. No se verificó todavía una actualización mediante la tienda o desde una versión de producción instalada.

**Decisión de lanzamiento:** *apta para beta cerrada y pruebas adicionales; no apta todavía para envío público a tiendas*.
