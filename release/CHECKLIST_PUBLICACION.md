# Gate de lanzamiento — CodeBridge 1.0 RC1

**Fecha:** 2026-11-13  
**Versión técnica del manifiesto:** 0.9.7  
**Nombre comercial de la candidata:** 1.0 RC1

## Cumplido en la preparación local

- [x] Tomar la versión v0.9.6.5 como base congelada (Smart Clipboard de un clic).
- [x] Separar los archivos de producción de pruebas, imágenes históricas y código fuente.
- [x] Versión del panel obtenida del manifiesto, sin texto duro de versión anterior.
- [x] Mantener permisos opcionales para acceso a WhatsApp Web y lectura del portapapeles.
- [x] Añadir explicación visible del acceso a mensajes y del portapapeles antes de activar.
- [x] Generar política de privacidad **borrador**, justificaciones de permisos y documentación de tiendas.
- [x] Añadir auditoría local de empaquetado y hashes SHA-256.
- [x] Ejecutar las pruebas unitarias/regresión y el smoke de navegador **simulado** (ver resultados en `release/INFORME_VERIFICACION.md`).

## Bloqueadores antes de subir a una tienda

- [ ] Validar en WhatsApp Web real **con dos usuarios distintos** el pegado Python `__init__`, `__str__` y el botón «Copiar código».
- [ ] Validar Chrome real, Edge real y, si se anunciará, Brave; Windows 11 y al menos un equipo de bajos recursos.
- [ ] Documentar comportamiento ante cambios de conversación, «Leer más», 500+ mensajes, desconexión y actualización de WhatsApp.
- [ ] Verificar que el perfil Low Mode reduce carga en escenarios reales; los diagnósticos **no miden directamente CPU/RAM**.
- [ ] Identificar el responsable legal y añadir un canal privado de soporte/privacidad.
- [ ] Elegir el modelo de licenciamiento, revisar titularidad y licencias de terceros (iconos, tipografías, capturas, software).
- [ ] Publicar la URL final de privacidad y asegurar que coincide con las declaraciones de la extensión.
- [ ] Revisar con asesoría adecuada los riesgos de compatibilidad con los términos de WhatsApp; ninguna publicación garantiza aprobación ni autorización.
- [ ] Crear capturas auténticas para las tiendas con datos ficticios y completar metadatos.
- [ ] Probar actualización desde v0.9.6.5 a RC y recuperación ante errores, sin pérdida de preferencias.
- [ ] Importar código al repositorio en rama de candidato, revisar diff y etiquetar el commit probado, **sin forzar `main`**.
- [ ] Someter la extensión a revisión de tiendas primero en una distribución limitada / no listada según posibilidades de la plataforma.

## Escenarios de aceptación funcional

| Caso | Resultado mínimo |
|---|---|
| Python con dunders y f-strings | Código original = código copiado desde tarjeta, carácter por carácter |
| MongoDB, Java, NASM | Detección automática o elección manual y copia exacta |
| Mensajes largos con «Leer más» | La tarjeta espera a recibir el texto completo; nunca muestra un fragmento como si fuera íntegro |
| Mensaje normal | Sin convertir a tarjeta sin razón |
| Smart Clipboard | Permiso bajo petición, un clic cuando está concedido y alternativa de copia manual cuando falla |
| Low Mode | Sin resaltado por token ni desenfoque; copia y selección intactas |
| Chat extenso | Sin errores críticos, sin crecimiento sostenido de memoria tras abandonar conversación |
| Desactivar | Restauración de la presentación original, sin impedir el uso normal de WhatsApp |
| Privacidad | Sin red externa, sin guardar código en storage, diagnósticos solo agregados |

## Riesgo abierto

CodeBridge opera sobre el DOM de WhatsApp Web, una interfaz de terceros que cambia sin previo aviso; una actualización puede romper su compatibilidad. El uso y la eventual publicación requieren revisar las condiciones de WhatsApp y las políticas de cada tienda. Esta candidata es para evaluación limitada, **no está aprobada por Meta ni por las tiendas**.
