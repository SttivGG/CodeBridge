# v0.9.6.5 — corrección del primer clic

## Causa probable

En v0.9.6.4, `prepareClipboard()` hacía `readText()` para obtener el código, `writeText()` para preparar la versión protegida y un **segundo `readText()`** para verificar. Algunos gestores del portapapeles y navegadores pueden devolver un valor antiguo o rechazar esa segunda lectura incluso cuando `writeText()` ya terminó correctamente. Por eso el primer clic parecía fallido y el segundo encontraba el código protegido.

## Cambios

1. Consultar `chrome.permissions.contains({permissions: ["clipboardRead"]})` antes de volver a solicitar permiso.
2. Tras escribir con éxito (`navigator.clipboard.writeText()` resuelta), informar «preparado en un clic» y notificar al chat sin bloquear la interfaz.
3. Eliminar la segunda lectura obligatoria. El éxito significa **escritura aceptada por el navegador**, no prueba byte a byte del mensaje entregado por WhatsApp.
4. Mantener el campo local y «Copiar código protegido» si el navegador bloquea **realmente** lectura o escritura.
5. Proteger la lógica contra clics simultáneos y conservar la normalización del código previamente definida.

## Validación

- Test del primer clic con una segunda lectura simulada como obsoleta: la versión nueva no hace esa lectura.
- Permiso ya concedido: no aparece una segunda petición.
- Escritura rechazada: se ofrece copia explícita.
- `__init__`, `__str__` y saltos de línea: se mantienen en el texto preparado.

**Limitación:** durante la primera autorización, el diálogo de permisos del navegador puede consumir la activación del usuario; en ese caso puede ser necesaria la ruta manual. La instalación y pruebas reales en Brave/WhatsApp Web siguen pendientes.
