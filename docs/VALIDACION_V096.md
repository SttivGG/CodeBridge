# Validación de CodeBridge v0.9.6 — experimental

Fecha: 2026-11-13.

- `npm run verify`: **72/72 pruebas unitarias correctas**; construye el content script `whatsapp.js` a partir de los módulos locales.
- `tests/browser_smart_clipboard_v096.py`: **aprobada** en Chromium con APIs de portapapeles y permisos simuladas; comprueba escritura y lectura bajo clic, permiso negado, revocación, rechazo de texto no reconocido, selección manual y copia exacta de `Producto` con `__init__` y `__str__`.
- `browser_safe_paste_v095.py`: **aprobada**, sin interceptar el pegado nativo de WhatsApp.
- `browser_smoke_v04.py` … `browser_smoke_v092.py`: **ocho suites heredadas aprobadas** con casos de tarjetas, NASM, MongoDB, Python, Java, expansión de mensajes largos, Low Mode, Nexo Glass y diagnóstico.
- `browser_compat_v092.py`: **Chromium aprobado**, Chrome y Microsoft Edge **omitidos** porque no estaban instalados en el entorno de prueba.

**Sin verificar:** concesión del permiso opcional en una extensión real de Chrome/Edge (la prueba usa un mock), pegado de extremo a extremo en WhatsApp Web, persistencia del formateo tras el envío, WhatsApp Desktop oficial y Android/iOS.

El modo estable v0.9.5 debe conservarse hasta completar la validación real con dos usuarios.
