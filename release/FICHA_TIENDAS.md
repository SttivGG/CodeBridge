# Ficha de publicación para tiendas — CodeBridge 1.0 RC1

## Identidad

**Nombre propuesto:** CodeBridge — Código en WhatsApp Web  
**Categoría propuesta:** Herramientas para desarrolladores / Productividad  
**Editor:** [PENDIENTE: identidad del desarrollador/editor]  
**Contacto de soporte:** [PENDIENTE: correo o formulario privado]  
**Sitio del proyecto:** https://github.com/SttivGG/CodeBridge  
**Política de privacidad:** [PENDIENTE: URL pública exacta de la versión definitiva]

**Descripción breve (propuesta):**

> Visualiza código seleccionable en WhatsApp Web y prepáralo para compartir sin perder caracteres.

**Descripción larga (propuesta):**

> CodeBridge muestra fragmentos de código directamente en WhatsApp Web como tarjetas seleccionables y copiables, con detección de lenguajes, temas visuales y Low Mode para equipos con recursos limitados. El usuario puede cambiar el lenguaje manualmente, recuperar el mensaje original y copiar el código desde la tarjeta.
>
> Smart Clipboard permite preparar bajo petición el código copiado desde cualquier editor, envolviéndolo en texto monoespaciado antes de pegarlo en WhatsApp. No envía mensajes automáticamente ni modifica directamente el editor del chat. Para ver las tarjetas enriquecidas, el receptor necesita CodeBridge instalado; sin la extensión verá el mensaje en el formato admitido por WhatsApp.
>
> Los fragmentos se procesan localmente. Los permisos de acceso al sitio y de lectura del portapapeles son opcionales y se solicitan al utilizar las funciones correspondientes.
>
> Producto independiente, no afiliado a Meta ni a WhatsApp. La compatibilidad depende de WhatsApp Web y puede variar con sus actualizaciones.

## Justificación de permisos (para consola de desarrollador)

| Permiso | Justificación |
|---|---|
| `sidePanel` | Abrir configuración, Smart Clipboard y diagnóstico local |
| `storage` | Persistir ajustes visuales y señales técnicas efímeras sin guardar mensajes |
| `clipboardWrite` | Copiar fragmentos elegidos por el usuario, código protegido e informes numéricos |
| `scripting` | Activar o desactivar el script del visor con una acción explícita |
| Host opcional `https://web.whatsapp.com/*` | Acceder a los mensajes visibles para presentar fragmentos como tarjetas en esa página, sin acceso a otros sitios |
| `clipboardRead` opcional | Leer el texto copiado al pulsar el botón «Preparar portapapeles»; el usuario puede revocarlo |

## Recursos gráficos y contenido de la ficha

- Ícono 128 × 128 px incluido en el paquete. Comprobar su legibilidad en fondo claro y oscuro.
- Crear al menos una captura del **producto instalado de verdad** (no de un prototipo antiguo). Se recomienda una captura del chat con código ficticio y otra del panel de opciones.
- No incluir números telefónicos, nombres de contactos, códigos privados ni conversaciones reales en las capturas.
- Revisar las dimensiones requeridas por cada tienda al cargar la ficha y ajustar las imágenes sin distorsión.
- Evitar frases como «aprobado por WhatsApp», «oficial» o «garantiza cero pérdida de código».

## Verificaciones previas

- [ ] Enlace real de política de privacidad accesible y con identidad/contacto completados.
- [ ] Capturas actuales del binario RC instalado, sin contenido personal.
- [ ] Pruebas en Chrome y Edge sobre WhatsApp Web real.
- [ ] Revisión de condiciones de WhatsApp, licencias y derechos de marca.
- [ ] Declaración de uso de datos coherente con la política y el código.
- [ ] Clasificación/edad correctas, precio y país(es) de distribución definidos.
- [ ] Integridad del ZIP y SHA-256 verificados.

**Fuentes oficiales consultadas:**
- Chrome listing: https://developer.chrome.com/docs/webstore/program-policies/listing-requirements/
- Chrome privacy/limited use: https://developer.chrome.com/docs/webstore/program-policies/policies
- Chrome assets: https://developer.chrome.com/docs/webstore/best-listing
- Edge publishing: https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/publish-extension
- Edge policies: https://learn.microsoft.com/legal/microsoft-edge/extensions/developer-policies
