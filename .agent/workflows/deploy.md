---
description: Build and prepare for production deployment
---

# Workflow: Deploy to Production

Este workflow compila el proyecto y prepara los archivos para despliegue en producción.

## Pasos

// turbo
1. Compilar el proyecto para producción
```bash
npm run build
```

2. Verificar que la carpeta `dist` se haya creado correctamente
   - La carpeta debe contener: `index.html`, carpeta `assets`, y archivos estáticos

3. **IMPORTANTE**: Los archivos compilados están en la carpeta `dist/`
   - Estos archivos deben ser subidos manualmente a https://guias.institutotinykids.com/
   - O configurar un script de despliegue automático (FTP, rsync, etc.)

## Notas
- El servidor de desarrollo (`npm run dev`) debe estar detenido antes de hacer build
- Después del build, puedes probar localmente con `npm run preview`
- Los cambios NO se reflejarán en producción hasta que subas la carpeta `dist` al servidor
