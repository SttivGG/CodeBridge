# Importación de CodeBridge v0.9 a GitHub

Repositorio destino: https://github.com/SttivGG/CodeBridge

Se verificó que el repositorio existe y está vacío (sin archivos ni confirmación inicial). La cuenta conectada puede leerlo, pero **la integración rechazó la escritura con HTTP 403**; por ello esta entrega se encuentra en el ZIP y no se ha publicado remotamente.

## Método recomendado en Windows / PowerShell

1. Descarga y descomprime `CodeBridge_v0.9_instalable.zip` en una carpeta permanente.
2. En VS Code, abre **la carpeta interna `CodeBridge_v0.9`** que contiene `manifest.json` (no la carpeta que la contiene).
3. Ejecuta estos comandos en PowerShell desde esa carpeta:

```powershell
git init -b main
git remote add origin https://github.com/SttivGG/CodeBridge.git
git add .
git commit -m "feat: CodeBridge v0.9 y diagnostico local privado"
git push -u origin main
```

Si Git solicita autenticación, inicia sesión con tu cuenta habitual de GitHub. No introduzcas tokens en el repositorio. Si aparece que el remoto tiene commits (por ejemplo, porque añadiste un README), **no uses `--force`**: recupera y concilia la historia antes de realizar el push.

## Instalación de la extensión

La carpeta descomprimida es instalable directamente en `chrome://extensions` o `edge://extensions` mediante «Cargar descomprimida». Desactiva las versiones anteriores, abre el panel y activa la integración con WhatsApp Web.

## Verificación del código

Con Node.js 20+:

```powershell
npm run verify
```

Las pruebas de navegador usan Playwright y Chromium:

```powershell
python tests/browser_smoke_v09.py
python tests/benchmark_modes.py
```

**Importante:** la prueba en Chromium simula un chat, no sustituye la validación en WhatsApp Web real. Tampoco mide CPU ni RAM del sistema.

## Archivo privado y licencias

Evita subir datos reales, claves, tokens, `.env`, capturas de conversaciones o información personal. La publicación pública del código no autoriza automáticamente a terceros a reutilizarlo; antes de aceptar contribuciones, define expresamente una licencia de distribución y realiza una revisión legal.
