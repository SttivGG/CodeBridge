# CodeBridge 0.9.2 — alcance y validación

## Cambios introducidos

- `manual.js`: catálogo de 18 idiomas y resolución del lenguaje manual con validación y límites.
- `src/content-feature.js`: un solo selector transitorio por chat al pasar el cursor sobre un mensaje sin tarjeta; selector en cada tarjeta, deshacer automático; estado efímero por DOM `WeakMap`.
- `scripts/build-content.mjs`, `whatsapp.js`: incorporación del módulo compartido al bundle clásico Manifest V3.
- `sidepanel.html`: instrucciones de uso del nuevo flujo.
- `tests/manual.test.mjs`, `tests/browser_smoke_v092.py`: pruebas específicas.
- `manifest.json`, `package.json`: actualización del número de versión.

## Verificación y alcance

- 58/58 unitarias (`npm run verify`).
- 8/8 suites Chromium simuladas: versiones v0.4, v0.5, v0.6, v0.7, v0.8, v0.9, v0.9.1, v0.9.2.
- El nuevo test verifica conversiones bajo elección explícita, cambios de idioma de la tarjeta y exactitud del portapapeles.
- No se efectuaron pruebas en Edge, WhatsApp Web real ni PWA; el usuario debe validar esas plataformas.

## Restricciones de diseño

- No guarda ni transmite código de WhatsApp. No necesita permisos adicionales.
- El control manual nunca se activa sin una acción expresa del usuario.
- Los mensajes que superan el límite interno no se procesan en modo manual.
- `Detección automática` revierte la selección manual. Si no hay firma automática, el mensaje vuelve a verse con formato original.
- Se conservan las opciones Low Mode y diagnóstico local; no se agregan nuevas métricas que identifiquen conversaciones.

## Shiki y compatibilidad

Se investigó el uso de Shiki, pero no se incluyó en esta versión: el paquete no está disponible para compilar en este entorno y su dependencia de gramáticas, recursos y ejecución WebAssembly requiere auditoría del empaquetado local y política CSP de MV3. La versión 0.9.2 preserva el motor local conocido. La futura implementación deberá tener fallback, carga selectiva, cero peticiones de red y prueba de consumo en ambos modos.

## Comprobación de navegadores (v0.9.2)

`python tests/browser_compat_v092.py` ejecuta una prueba compacta en Chromium, Chrome y Edge detectados. Los navegadores ausentes se etiquetan **SKIP** y no como aprobados. Para comprobar únicamente las instalaciones de Windows:

```powershell
$env:CB_BROWSER_CHANNELS='chrome,msedge'
python tests/browser_compat_v092.py
```

En este entorno: **Chromium: PASS** (dos resoluciones, copia exacta, cambio a Low Mode); **Chrome: SKIP**; **Edge: SKIP**. No se verificó la PWA ni la app nativa de WhatsApp Windows.
