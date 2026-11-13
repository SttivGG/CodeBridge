# CodeBridge v0.9 — Diagnóstico local, estabilidad y Low Mode

CodeBridge es una extensión local para **Chrome y Edge** que presenta fragmentos de código de los mensajes de WhatsApp Web como tarjetas **seleccionables, copiables y con opción «Ver original»**. No modifica el texto que WhatsApp transporta, no intercepta Ctrl+V ni ejecuta código recibido.

**Estado:** se verificaron **44 pruebas unitarias** y **seis suites de navegador en Chromium** con conversaciones simuladas (v0.4–v0.8). La v0.9 **no ha sido probada todavía en una sesión real de WhatsApp Web**, ni en Edge. No constituye una certificación de seguridad.

## Novedades v0.9 — diagnóstico local

- Nuevo panel de **Diagnóstico local** integrado en la interfaz Nexo, con tarjetas activas, mensajes revisados, fallos, cola pendiente, tiempo medio de renderizado y percentil 95.
- Botones **Actualizar métricas**, **Copiar informe** y **Reiniciar contadores**.
- Los datos se mantienen exclusivamente en la memoria de la pestaña, no contienen textos, identificadores ni código, y no se envían a servidores.
- El informe JSON se copia al portapapeles únicamente por acción del usuario.
- Contadores y muestras acotadas a 128 tiempos recientes; el sistema de diagnóstico no crece indefinidamente con los mensajes.
- La v0.9 recupera de forma segura una burbuja ante fallos de procesamiento, dejando WhatsApp operativo.
- Mantiene ambos perfiles (**Equilibrado** y **Low Mode**), glassmorphism opcional, soporte de NASM, mensajes largos y botones de copia.
- Se conservan las 41 pruebas existentes, añadiendo 3 pruebas unitarias de diagnóstico y una sexta suite Chromium. Se incluye un benchmark reproducible con un chat simulado.

### Lo que **no** miden las estadísticas

No miden directamente CPU ni RAM del computador. Los tiempos miden el trabajo del visor, no el rendimiento global de WhatsApp. Más detalles: [Diagnóstico local v0.9](docs/DIAGNOSTICO_LOCAL_V09.md).

## Funcionalidades heredadas de v0.8

### Perfil de rendimiento configurable

- **Equilibrado (por defecto):** resaltado local de sintaxis, numeración opcional, temas de VS Code y el vidrio Nexo configurable de v0.7.
- **Low Mode:** conserva lectura, selección, desplazamiento y copia del texto original, pero desactiva **tokenización y colores por token**, numeración, transparencia/desenfoque de las tarjetas y transiciones. Muestra un único nodo de texto de código por tarjeta. Utiliza lotes más pequeños para no ocupar demasiado tiempo el hilo principal.
- En Low Mode el panel también desactiva filtros de vidrio y animaciones. Los controles visuales incompatibles quedan deshabilitados temporalmente; las preferencias de Equilibrado se conservan para cuando vuelvas.
- El perfil queda guardado **localmente** mediante `chrome.storage.local`, sin almacenar el contenido de los chats.

### Seguridad e integridad

- Sigue construyendo la interfaz con `textContent` y nodos DOM, **nunca con HTML no confiable ni ejecución de fragmentos**.
- Ante código que exceda **65.536 caracteres** CodeBridge no intenta renderizarlo: WhatsApp muestra el mensaje original, sin tarjeta incompleta. Este es un límite interno de la extensión y no el de WhatsApp.
- Señales no intrusivas para controles bidireccionales, caracteres invisibles y controles no imprimibles. El texto **nunca se reescribe**.
- Se conserva la expansión conservadora de «Leer más» y los mensajes normales no se transforman.
- La fuente de verdad para **Copiar código** es el texto leído del mensaje; nunca una imagen.

### Rendimiento y estabilidad

- Una única hoja de estilos constructible reutilizada entre los Shadow DOM, con alternativa por compatibilidad.
- Actualizar desenfoque, opacidad, apariencia, tamaño de letra o altura **no vuelve a tokenizar** ni reconstruir las tarjetas.
- Limpieza de referencias cuando WhatsApp elimina mensajes del DOM; cancelación de temporizadores al desactivar.
- Desenfoque adaptativo sin recorridos de todas las tarjetas en cada nuevo mensaje.
- En el arranque se cargan las preferencias **antes del primer análisis del chat**.

## Instalación (sin Node.js ni Docker)

1. Desactiva y elimina de tu navegador la versión anterior de CodeBridge, especialmente si es v0.8. No mantengas varias versiones activas.
2. Descarga y **descomprime** el ZIP de v0.9 en una carpeta permanente.
3. Abre `chrome://extensions` o `edge://extensions`, activa **Modo desarrollador** y elige **Cargar descomprimida**.
4. Selecciona la carpeta `CodeBridge_v0.9`, donde se encuentra `manifest.json`.
5. Abre el panel lateral de CodeBridge y pulsa **Activar en WhatsApp**. Concede acceso únicamente a `https://web.whatsapp.com/*`.
6. Recarga WhatsApp Web. Desde el panel, elige **Equilibrado** o **Low Mode**.

## Prueba recomendada con dos personas

1. Ambos usuarios instalan la **misma v0.9**, la activan y recargan WhatsApp Web.
2. Desde VS Code, envía por WhatsApp el archivo de prueba `tests/fixtures/hola_mundo.asm` o un fragmento Java. No lo pegues antes en el panel.
3. Verifica que tanto el remitente como el receptor pueden **Copiar código** y **Ver original**, y que las líneas y espacios se conservan en el texto accesible en WhatsApp.
4. Cambia a **Low Mode** y confirma que desaparecen los colores por token y el cristal, pero el texto aún puede seleccionarse y copiarse.
5. Envía un bloque largo que active «Leer más». Comprueba que aparece una tarjeta completa tras expandirse.
6. Prueba mensajes de texto ordinario; deben quedar intactos.
7. Comprueba la experiencia en Chrome y Edge. Registra navegador, versión, número de fragmentos, tiempos y errores.

## Pruebas automatizadas

El ZIP incluye el código fuente y los scripts. Para **desarrollo**, con Node.js 20+ y Python + Playwright/Chromium:

```bash
npm run verify
python tests/browser_smoke_v04.py
python tests/browser_smoke_v05.py
python tests/browser_smoke_v06.py
python tests/browser_smoke_v07.py
python tests/browser_smoke_v08.py
python tests/browser_smoke_v09.py
python tests/benchmark_modes.py # opcional: resultados dependen del equipo
```

En una prueba sintética de Chromium, **Low Mode procesó 500 mensajes de ensamblador en ~2,65 segundos** en este entorno. Es un resultado de laboratorio, no una promesa de rendimiento en otros equipos ni una comparación estandarizada con Equilibrado.

## Archivo y documentación

- `sidepanel.html`, `styles.css`, `app.js`: interfaz Nexo, perfil de rendimiento y diagnóstico numérico.
- `visual.js`: validación de preferencias y cálculo de las opciones efectivas de cada perfil.
- `core.js`, `message.js`, `expansion.js`: reconocimiento de código y «Leer más».
- `highlight.js`: renderizado local y camino de texto puro para Low Mode.
- `security.js`: avisos pasivos sobre caracteres potencialmente engañosos.
- `diagnostics.js`: métricas en memoria y exportación numérica acotada.
- `docs/DIAGNOSTICO_LOCAL_V09.md`: contrato de privacidad, pruebas, interpretación y límites de rendimiento.
- `src/content-feature.js`: ciclo de vida, observación DOM, tarjetas, limpieza y optimización.
- `whatsapp.js`: script clásico precompilado e instalable (generado con `npm run bundle:content`).
- `docs/SEGURIDAD_Y_RENDIMIENTO_V08.md`: amenazas, salvaguardas, riesgos residuales y criterios de validación.
- `docs/panel_diagnostico_v09.png`, `docs/panel_low_v08.png` y `docs/chat_low_v08.png`: capturas de pruebas en Chromium simulado.

## Límites importantes

- **Low Mode prioriza recursos por encima del resaltado.** No conserva colores de sintaxis, pero sí el formato de texto y sus controles de copia.
- No puede recuperar los caracteres que WhatsApp haya modificado, comprimido o eliminado antes de mostrarlos en el DOM.
- La detección automática es heurística; un lenguaje ambiguo puede quedar como texto normal.
- La integración usa la estructura interna del DOM de WhatsApp Web. Puede romperse tras actualizaciones de WhatsApp.
- Solo funciona en WhatsApp Web mediante navegadores compatibles. **No se instala dentro de la app oficial de Windows ni de las apps móviles.**
- La extensión puede leer contenido visible de WhatsApp Web mientras está activada. No lo almacena como historial ni lo envía a servidores propios. Ese acceso implica responsabilidad: instala solo versiones en las que confíes.
- No afiliada a Meta ni a WhatsApp. Una distribución pública requiere analizar las condiciones de uso y auditar de manera independiente.

Referencia visual: [Nexo Facturación](https://github.com/SttivGG/Facturacion-hexagonal), utilizada por solicitud de su propietario. No se alteró ese repositorio ni se distribuyeron fuentes tipográficas de terceros.

## Repositorio y política de publicación

Repositorio principal: https://github.com/SttivGG/CodeBridge

Este ZIP contiene el código fuente, la extensión instalable, pruebas y un workflow básico de CI. **No tiene licencia de software abierto establecida**: antes de aceptar contribuciones o distribuir comercialmente debe decidirse la licencia y comprobar las condiciones de terceros. No subir datos reales de conversaciones ni llaves de API.

Para cargar el código en el repositorio nuevo, lee [Importar a GitHub](docs/IMPORTAR_A_GITHUB.md).
