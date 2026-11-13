# Subir CodeBridge v0.9.2 al repositorio

Repositorio: https://github.com/SttivGG/CodeBridge

Esta actualización **no se subió automáticamente** a GitHub. El paquete incluye todos los archivos para ejecutar la extensión; partió de la versión v0.9.1 ya validada.

## Desde Windows PowerShell

1. Descarga y descomprime `CodeBridge_v0.9.2_instalable.zip`.
2. Abre una terminal en una carpeta de trabajo y clona el repositorio si no lo tienes localmente:

```powershell
git clone https://github.com/SttivGG/CodeBridge.git
cd CodeBridge
git pull --ff-only origin main
git switch -c feature/manual-language-v092
```

3. **Copia el contenido de la carpeta `CodeBridge_v0.9.2` a esta carpeta `CodeBridge`**, sin eliminar la carpeta oculta `.git`. No utilices sincronización con borrado (`/MIR`).
4. Verifica y publica:

```powershell
npm run verify
python tests/browser_smoke_v092.py
git status
git diff --stat
git add .
git commit -m "feat: seleccionar lenguaje por mensaje y pruebas v0.9.2"
git push -u origin feature/manual-language-v092
```

5. Abre un pull request hacia `main` en GitHub para revisar los cambios y evitar sobrescribir el historial.

**Importante:** si el `main` todavía está en v0.9 y no contiene la v0.9.1, el paquete completo incorpora también las correcciones de MongoDB e imports. Revísalas en el diff antes de hacer merge. No incluyas tokens ni capturas de conversaciones reales.
