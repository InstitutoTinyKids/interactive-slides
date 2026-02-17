---
description: Guía maestra para crear o modificar juegos del ecosistema Tiny Kids
---

# 🚀 Workflow: Tiny Kids Game Engine

Este workflow define los estándares técnicos y visuales para crear nuevos juegos o modificar los existentes, asegurando consistencia total en diseño, lógica de Supabase y funciones de administración.

## 🎨 1. Estándares de Diseño (UI/UX)
- **Frameworks**: React (Standalone), Tailwind CSS, Lucide Icons (o SVG personalizados).
- **Tipografía**: 'Nunito' o 'Inter' desde Google Fonts.
- **Contenedor Base**: 
  - Usar siempre la clase personalizada `.min-h-screen-safe` (definida como `min-height: 100dvh`).
  - Fondo: Degradados suaves (ej: `bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-100`).
  - Responsive: `viewport-fit=cover` y manejo de `env(safe-area-inset-*)`.
- **Estilo Visual**: 
  - Glassmorphism para tarjetas (`backdrop-filter: blur(12px)`).
  - Minimalismo: No usar iconos gigantes en la portada.
  - Botones: Bordes redondeados (`rounded-2xl` o `rounded-full`) con micro-animaciones de presión (`active:scale-95`).
- **Manejo de Imágenes/Assets**:
  - Usar siempre `object-contain` en lugar de `object-cover` para evitar que las ilustraciones se corten.
  - Sincronizar el padding (`p-1` o `p-2`) en ambos lados de los elementos interactivos (especialmente en cartas que giran) para evitar saltos visuales.

## 💾 2. Lógica de Supabase (Backend)
- **Tabla**: `game_content`.
- **Bucket**: `game-assets` (Público).
- **Estructura de Carpeta**: `${GAME_TYPE}/${GAME_VERSION}/`.
- **Funciones Críticas**:
  - `handleFileUpload`: Si se sube un archivo con un nombre que ya existe para ese juego/versión, **DEBE** borrar el archivo anterior del Storage antes de subir el nuevo para evitar archivos huérfanos.
  - `handleDelete`: Debe borrar primero el archivo del Storage (`supabase.storage.remove()`) y luego el registro de la DB.
  - `handleDeleteAll`: Debe listar todos los archivos de la carpeta del juego en Storage, borrarlos todos, y luego borrar todos los registros de la DB del juego.

## 🛠️ 3. Panel de Administración (AdminPanel)
- **Protección**: Clave maestra (por defecto "123").
- **Funciones obligatorias**:
  - Carga masiva (Imágenes y Audios).
  - Botón de **BORRAR TODO** (Papelera roja al lado del botón de carga).
  - Resumen de contenido: Lista de palabras con indicadores visuales de si tienen imagen (IMG) o audio (AUD).

## 🎮 4. Estructura de Componentes React
1. `App`: Estado global (view, stats, dbData).
2. `MenuScreen`: Pantalla de inicio minimalista.
3. `GameScreen`: Lógica central del juego.
4. `ReviewScreen`: Lista de vocabulario/repaso.
5. `AdminPanel`: Panel de mantenimiento con sincronización de Storage.

## 📝 5. Pasos para crear un Juego Nuevo
1. Copiar la estructura base de `Select 01.html`.
2. Actualizar constantes: `GAME_TYPE` y `GAME_VERSION`.
3. Ajustar la lógica de `GameScreen` para la nueva mecánica.
4. Verificar que el fondo cubra el 100% con `min-h-screen-safe`.
5. Probar que el botón "Borrar Todo" funcione correctamente en el nuevo volumen.
