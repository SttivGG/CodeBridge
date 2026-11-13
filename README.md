# CodeBridge 1.0 RC1 (versión técnica 0.9.7)

**Candidata de publicación para pruebas privadas; aún no es una versión pública aprobada.**

CodeBridge es una extensión independiente para navegadores Chromium que mejora la **visualización local** de código en WhatsApp Web, conservando selección, copia, resaltado por lenguaje y modo de bajo consumo (Low Mode). También permite preparar **bajo petición** código copiado desde cualquier editor mediante Smart Clipboard. **No está afiliada, aprobada ni respaldada por WhatsApp o Meta.**

## Descargas

- `CodeBridge_1.0_RC1_EXTENSION.zip`: paquete mínimo de ejecución, listo para cargar descomprimido o evaluar para tiendas; no contiene pruebas ni capturas de conversaciones.
- `CodeBridge_1.0_RC1_FUENTES.zip`: código fuente completo, pruebas, documentos y scripts reproducibles.

El número técnico en `manifest.json` es `0.9.7`; `version_name` muestra «1.0 RC1». El paquete npm usa `1.0.0-rc.1`. El panel consulta `chrome.runtime.getManifest()` y muestra `v0.9.7` sin etiquetas desactualizadas.

## Instalación de prueba

1. Desactiva todas las instalaciones previas de CodeBridge en la página de extensiones de tu navegador.
2. Extrae `CodeBridge_1.0_RC1_EXTENSION.zip` en una carpeta propia.
3. Abre `chrome://extensions` (o `edge://extensions`, `brave://extensions`), activa modo desarrollador y carga la carpeta descomprimida.
4. Abre el panel, comprueba versión `v0.9.7`, lee la declaración de acceso y pulsa «Activar en WhatsApp» solo si estás de acuerdo.
5. Recarga WhatsApp Web. Para fragmentos con guiones bajos u otros símbolos de formato, usa «Preparar portapapeles» **una vez por fragmento** antes de pegar.
6. Prueba el contenido en el receptor con «Copiar código»; compara el original carácter a carácter.

No se intercepta el evento Ctrl+V ni se altera directamente el campo de composición de WhatsApp. El código no se ejecuta. El motor de resaltado continúa siendo local y simplificado (no Shiki).

## Privacidad y seguridad

- El permiso para `web.whatsapp.com` es opcional y se pide explícitamente al activar la integración.
- El permiso `clipboardRead` se solicita por separado al pulsar «Preparar portapapeles»; se puede revocar en el panel.
- Los fragmentos procesados no se envían a servidores de CodeBridge. Se usan en memoria para renderizar y copiar, no se guardan en preferencias.
- Los diagnósticos registran **solo indicadores agregados**; no guardan texto de mensajes, nombres de contactos ni código.
- El usuario controla los mensajes enviados por WhatsApp: no hay envío automático.

Consulta [POLITICA_PRIVACIDAD.md](release/POLITICA_PRIVACIDAD.md) para el borrador de publicación. **Falta designar un contacto de privacidad real antes del lanzamiento.**

## Verificación y distribución

```bash
npm run verify:release
python tests/browser_no_duplicate_v0963.py
python tests/browser_clipboard_recovery_v0964.py
python tests/browser_smart_clipboard_v096.py
python scripts/pack-release.py
```

Requiere Node.js 20+, Python 3.11+ y Playwright con Chromium para pruebas de navegador. Las pruebas de Chromium usan **interfaces simuladas**; Chrome, Brave y Edge reales todavía necesitan validación manual. Al empaquetar, `pack-release.py` genera los dos ZIPs y sus hashes SHA-256.

## Lo que falta antes del lanzamiento público

1. Pruebas en WhatsApp Web real entre dos usuarios, Chrome y Edge, con Python `__init__` / `__str__`, MongoDB, Java, NASM, mensajes largos y Low Mode.
2. Definir la identidad legal del editor, un canal privado de soporte y la licencia del software y sus activos.
3. Publicar una URL accesible para la política de privacidad y verificar que las declaraciones reflejan el paquete real.
4. Revisión del cumplimiento con las condiciones de WhatsApp y las políticas de las tiendas, idealmente con asesoría jurídica.
5. Realizar capturas de **la RC instalada**, sin datos personales ni mensajes reales de terceros, y completar las fichas de Chrome y Edge.
6. Subir el código a una rama del repositorio y crear un tag de candidato **sin publicar ni reemplazar `main` automáticamente**.

Detalles y matriz de pruebas: [CHECKLIST_PUBLICACION.md](release/CHECKLIST_PUBLICACION.md). El repositorio conectado puede tener una versión anterior; estos paquetes no realizan cambios remotos.
