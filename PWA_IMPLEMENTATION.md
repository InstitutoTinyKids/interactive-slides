# 📋 Implementación PWA - Central TK

## ✅ Archivos Creados

### 1. `/public/manifest.json`
**Propósito**: Configuración de la PWA
- Define nombre de la app: "Central TK"
- Configura iconos (usa tu logo.png existente)
- Establece modo de pantalla completa (`display: standalone`)
- Color de tema: #4F46E5 (azul índigo)
- Orientación: portrait (vertical)

### 2. `/public/service-worker.js`
**Propósito**: Habilita instalación y cache inteligente
- **Estrategia**: Network First (prioriza datos frescos de Supabase)
- **Fallback**: Cache (solo si no hay internet)
- **Actualizaciones**: Automáticas al recargar
- **Cache**: Solo recursos estáticos básicos (index.html, logo)

### 3. `/index.html` (modificado)
**Cambios realizados**:
- ✅ Agregados meta tags PWA en `<head>`
- ✅ Agregado link al manifest
- ✅ Agregados meta tags para iOS/Safari
- ✅ Agregado script de registro del Service Worker
- ❌ **NO se modificó** ninguna funcionalidad existente

### 4. `/GUIA_INSTALACION_PWA.md`
**Propósito**: Instrucciones para usuarios finales
- Cómo instalar en tablets Android
- Solución de problemas
- Verificación de instalación exitosa

---

## 🔧 Configuración Técnica

### Estrategia de Cache
```javascript
Network First → Fallback a Cache
```

**¿Por qué esta estrategia?**
- ✅ Siempre obtiene datos frescos de Supabase cuando hay internet
- ✅ Solo usa cache si no hay conexión
- ✅ Asegura que las actualizaciones se vean inmediatamente
- ✅ Funciona offline como respaldo

### Recursos en Cache
- `/` (página principal)
- `/index.html`
- `/logo.png`
- **Dinámico**: Cualquier recurso visitado se cachea automáticamente

---

## 🚀 Próximos Pasos

### Para Desarrollo Local

1. **Ejecutar el servidor de desarrollo**:
   ```bash
   npm run dev
   ```

2. **Probar PWA localmente**:
   - ⚠️ PWA requiere HTTPS o localhost
   - En desarrollo (localhost) funcionará
   - Para probar instalación real, necesitas desplegar

### Para Producción

1. **Build de producción**:
   ```bash
   npm run build
   ```

2. **Desplegar a tu hosting** (Vercel/Netlify/etc):
   - Asegúrate de que tenga **HTTPS** (obligatorio para PWA)
   - Sube todos los archivos del build
   - Verifica que `/manifest.json` y `/service-worker.js` sean accesibles

3. **Probar instalación**:
   - Abre Chrome en Android
   - Ve a tu URL de producción
   - Debería aparecer el banner "Instalar Central TK"

---

## 🧪 Cómo Probar

### En Desarrollo (localhost)

1. Ejecuta `npm run dev`
2. Abre Chrome
3. Ve a DevTools → Application → Manifest
4. Verifica que aparezca la configuración
5. Ve a Application → Service Workers
6. Verifica que esté registrado

### En Producción (después de desplegar)

1. Abre Chrome en tablet Android
2. Ve a tu URL de producción
3. Espera el banner de instalación
4. Instala la app
5. Verifica que:
   - Aparezca icono en pantalla de inicio
   - Se abra en pantalla completa
   - Funcione sin barras del navegador

---

## 📊 Verificación de Funcionalidad

### ✅ Lo que NO cambió
- ❌ Código React (0 cambios)
- ❌ Componentes (0 cambios)
- ❌ Lógica de negocio (0 cambios)
- ❌ Conexión a Supabase (0 cambios)
- ❌ Estilos CSS (0 cambios)

### ✅ Lo que SÍ se agregó
- ✅ Capacidad de instalación
- ✅ Pantalla completa en móviles
- ✅ Icono en pantalla de inicio
- ✅ Funcionamiento offline (respaldo)
- ✅ Actualizaciones automáticas

---

## 🔄 Actualizaciones Futuras

### Para actualizar contenido (guías/quiz)
**No necesitas hacer nada especial**:
- Edita en Supabase como siempre
- Los cambios se verán automáticamente
- El Service Worker usa Network First

### Para actualizar la app (código)
1. Haz cambios en tu código
2. Haz build: `npm run build`
3. Despliega
4. Los usuarios verán cambios al recargar
5. El Service Worker se actualiza automáticamente

### Para cambiar versión del cache
Si necesitas forzar actualización de cache:
1. Edita `/public/service-worker.js`
2. Cambia `CACHE_NAME` de `'central-tk-v1'` a `'central-tk-v2'`
3. Despliega
4. El cache antiguo se eliminará automáticamente

---

## 🎨 Personalización Futura

### Cambiar color de tema
Edita `/public/manifest.json`:
```json
"theme_color": "#TU_COLOR_AQUI"
```

### Cambiar iconos
Reemplaza `/public/logo.png` con tu icono:
- Tamaño recomendado: 512x512px
- Formato: PNG con fondo transparente o sólido

### Cambiar nombre de la app
Edita `/public/manifest.json`:
```json
"name": "Tu Nuevo Nombre",
"short_name": "Nombre Corto"
```

---

## 📱 Compatibilidad

### ✅ Soportado
- Android (Chrome, Edge, Samsung Internet)
- iOS/Safari (con limitaciones)
- Desktop (Chrome, Edge)

### ⚠️ Limitaciones en iOS
- Instalación menos obvia (requiere Safari)
- Algunas funcionalidades limitadas
- Pero funciona como web app

---

## 🆘 Troubleshooting

### Service Worker no se registra
- Verifica que estés en HTTPS o localhost
- Revisa la consola del navegador
- Verifica que `/service-worker.js` sea accesible

### Banner de instalación no aparece
- Verifica que el manifest sea válido
- Asegúrate de estar en HTTPS
- Prueba instalación manual desde menú de Chrome

### Cambios no se reflejan
- Limpia cache del navegador
- Desregistra el Service Worker (DevTools → Application)
- Recarga con Ctrl+Shift+R

---

## 📞 Recursos Adicionales

- [PWA Checklist](https://web.dev/pwa-checklist/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)

---

**Implementado**: Febrero 2026
**Versión**: 1.0
**Estado**: ✅ Listo para desplegar
