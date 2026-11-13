# Versiones y ramas sugeridas

- Base congelada funcional: `0.9.6.5` (entregada y reportada como funcional por el usuario).
- Release candidate: `manifest.version=0.9.7`, `manifest.version_name=1.0 RC1`, `package.version=1.0.0-rc.1`.
- Rama sugerida: `release/1.0-rc1`.
- Etiqueta Git sugerida **únicamente después de aprobar los controles**: `v1.0.0-rc.1`.
- `main`: no reemplazar hasta superar el gate de lanzamiento y revisión.

Comandos sugeridos en la carpeta del código fuente, después de revisar estado remoto:

```powershell
git fetch origin
git switch -c release/1.0-rc1 origin/main
# Copiar los archivos de CodeBridge_1.0_RC1_FUENTES.zip en el clon, sin incluir ZIPs generados ni archivos ajenos.
npm run verify:release
python tests/browser_no_duplicate_v0963.py
python tests/browser_clipboard_recovery_v0964.py
git status
git add .
git commit -m "release: preparar CodeBridge 1.0 RC1"
git push -u origin release/1.0-rc1
```

Crear PR contra `main`, analizar diferencias y no mezclar automáticamente. Si el repositorio tiene cambios nuevos, resolverlos antes. El conector de GitHub puede no tener permisos para hacer push; no se ha escrito nada desde aquí.
