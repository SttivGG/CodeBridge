# Política de privacidad de CodeBridge — borrador para publicación

**Última revisión:** 13 de noviembre de 2026  
**Responsable del producto:** [PENDIENTE: nombre o razón social del publicador]  
**Contacto de privacidad:** [PENDIENTE: correo o formulario privado verificado]  
**Estado:** borrador; completar y verificar antes de publicarlo en una tienda.

## Qué hace CodeBridge

CodeBridge es una extensión de navegador independiente que presenta localmente mensajes con código fuente en WhatsApp Web mediante tarjetas seleccionables y copiables. No es un producto de Meta ni de WhatsApp. También ofrece Smart Clipboard para preparar, tras la acción expresa del usuario, un fragmento de código copiado de otra aplicación.

## Qué información puede acceder o procesar

Con el permiso opcional del sitio `web.whatsapp.com`, la extensión accede al **contenido de mensajes visibles** para decidir si contienen código fuente y mostrarlo con formato. Este acceso puede incluir información personal o confidencial que aparezca en los mensajes. No examina el contenido de sitios web distintos de `web.whatsapp.com`.

Al pulsar «Preparar portapapeles», la extensión puede solicitar permiso opcional para **leer el texto del portapapeles**. Ese texto puede incluir información sensible. La lectura no es continua, no se ejecuta en segundo plano, no depende del editor que originó el texto y se inicia solo por la acción del usuario. La extensión puede escribir texto protegido en el portapapeles para que el usuario lo pegue donde elija.

## Finalidades

El contenido de mensajes y del portapapeles se procesa localmente para detectar lenguajes, mostrar código, copiar fragmentos y preparar su transporte en texto monoespaciado. La extensión no envía mensajes automáticamente ni ejecuta el código mostrado.

## Almacenamiento y transmisión

Las **preferencias de apariencia, rendimiento y permisos de visualización** pueden guardarse localmente mediante las APIs del navegador. Las estadísticas de diagnóstico permanecen en memoria temporal y presentan conteos y tiempos agregados, no contenido de mensajes ni nombres de contactos. Puede guardarse un marcador técnico efímero de que se preparó un portapapeles; no incluye texto ni su hash.

Esta versión del código fuente no incorpora una API de telemetría propia, análisis remoto del contenido, publicidad ni servidores de CodeBridge para recibir conversaciones o fragmentos. **WhatsApp continúa procesando los mensajes que el usuario decide enviar dentro de su propio servicio**, conforme a sus condiciones y política.

El código fuente temporal que aparezca en los campos de recuperación del panel se utiliza únicamente en la sesión visible, sin guardarse en `chrome.storage`, y puede borrarse desde el panel o al cerrar esa vista.

## Permisos de navegador

- `sidePanel`: abrir la interfaz de CodeBridge.
- `storage`: guardar preferencias locales y señales técnicas temporales sin texto de conversaciones.
- `clipboardWrite`: copiar código elegido por el usuario y diagnósticos agregados.
- `scripting`: activar el visor de CodeBridge en WhatsApp Web con permiso explícito del sitio.
- Permiso opcional de sitio `https://web.whatsapp.com/*`: analizar localmente los mensajes visibles para presentar tarjetas de código.
- `clipboardRead` (opcional): leer el portapapeles únicamente tras pulsar «Preparar portapapeles».

## Control del usuario

Se puede desactivar la integración en cualquier momento, revocar el permiso `clipboardRead`, restaurar la apariencia y eliminar la extensión desde la configuración del navegador. El texto escrito por el usuario en WhatsApp sigue siendo responsabilidad del propio usuario; CodeBridge no envía mensajes automáticamente.

## Terceros y contacto

No se comparte el contenido analizado con servidores de CodeBridge ni con anunciantes. Los mensajes enviados a WhatsApp se rigen por los propios servicios de WhatsApp. Antes de la publicación se incorporará un canal privado para consultas de privacidad y se revisará el cumplimiento de la normativa aplicable, incluidos los derechos de las personas cuyos datos pudieran aparecer en conversaciones.

**No publicar esta política como definitiva sin completar y revisar los campos pendientes y contrastarla con el binario final.**
