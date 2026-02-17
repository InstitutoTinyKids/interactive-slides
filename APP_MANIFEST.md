# 📔 Manifiesto de Aplicación: Central TK

Este documento es la **Fuente de Verdad** técnica y estética de Central TK. Su propósito es garantizar que cualquier evolución futura de la plataforma mantenga la calidad "Premium", la coherencia visual y la lógica funcional que la define.

---

## 🎨 1. ADN Visual (Design System)

La aplicación utiliza una estética de **Glassmorphism Moderno** sobre un fondo espacial profundo.

### Paleta de Colores
- **Fondo Base**: `#050510` (Negro Espacial).
- **Acción Primaria (Admin/General)**: `#7C3AED` (Violeta Intenso) -> `#3B82F6` (Azul Eléctrico).
- **Acción Guías (Teacher)**: `#A78BFA` (Lavanda).
- **Acción Quizzes (Student)**: `#3B82F6` (Azul).
- **Acción de Éxito/Navegación**: `#10B981` (Verde Esmeralda).
- **Texto Principal**: `#FFFFFF` (Blanco Puro).
- **Texto Secundario**: `#94A3B8` (Gris Muted).

### Tipografía
- **Encabezados (h1, h2, h3)**: `Outfit`, font-weight 800-900.
- **Cuerpo y UI**: `Plus Jakarta Sans`, font-weight 400-700.

### Efecto Cristal (Glassmorphism)
- **Fondo**: `rgba(15, 15, 25, 0.8)` con `backdrop-filter: blur(20px)`.
- **Borde**: `1px solid rgba(255, 255, 255, 0.1)`.
- **Sombras**: Sombras suaves y profundas para dar profundidad.

---

## 🏗️ 2. Arquitectura de Layout

### Reglas del Header (Barra Superior)
- **Altura Fija**: Aproximadamente 75px.
- **Fila Única Obligatoria**: Los elementos nunca deben saltar a una segunda línea (no `flex-wrap` en contenedores de acciones).
- **Jerarquía**: 
  - Izquierda: Nombre de la Lección/Proyecto (con truncado `...` si no hay espacio).
  - Derecha: Grupo de botones de acción.

### Paneles Laterales (Sidebars)
- **Lógica de Visibilidad**: 
  - Ocultos por defecto para maximizar el área de trabajo.
  - Se activan mediante iconos específicos (Tuerca para Ajustes, Capas para Diapositivas).
- **Comportamiento en iPad (1024px)**:
  - Los paneles se comportan como **Overlays** (flotan sobre el contenido) con fondo oscuro traslúcido.
  - Deben incluir siempre un botón de cierre `X` visible.
- **Botón de Capas (Verde)**: En modo compacto (iPad/Mobile), este botón es **Verde Esmeralda** y se ubica al principio del grupo de acciones derecho.

---

## 🛠️ 3. Mapa Funcional de Vistas

### 1. Home (Acceso)
- **Roles**: Admin, Teacher, Student.
- **Botones**: Compactos (padding 12px 20px), iconos de 24px.
- **Navegación**: El panel de selección de programas es dinámico. Muestra migas de pan (breadcrumbs) solo cuando se entra en carpetas.

### 2. Galería (Administración)
- **Gestión**: Carpetas y Proyectos mezclados con capacidad de Re-ordenamiento (`framer-motion`).
- **Estados**: Proyectos "Activos" vs "Pausados".
- **Filtros**: Pestañas para "Todas", "Guías" y "Quizzes".

### 3. Editores (Guías y Quiz)
- **Guardado Premium**: 
  - Al hacer clic en GUARDAR, el botón cambia a Verde Esmeralda, muestra el texto "¡GUARDADO!" y el icono `ShieldCheck`.
  - Duración del estado de éxito: **1 segundo**.
  - Evitar cierres bruscos: El formulario debe dar tiempo a ver el éxito antes de cerrarse.
- **Consistencia**: Ambos editores usan el mismo sistema de pestañas y botones iconográficos.

### 4. Visores (Viewer)
- **Experiencia de Estudiante**: Limpia, centrada en el contenido.
- **Interactividad**: Herramientas de dibujo, arrastre de iconos y sellos.

---

## 🚫 4. Limitaciones y "Reglas de Oro"

1. **NUNCA** permitir que el header se rompa en dos filas. Priorizar iconos sobre texto en pantallas pequeñas.
2. **NUNCA** dejar al usuario de iPad sin botón para abrir el panel de diapositivas (asegurar breakpoint de 1024px).
3. **NUNCA** usar colores genéricos (Rojo puro, Verde puro). Usar siempre las variantes de la paleta definida (Esmeralda, Violeta, etc.).
4. **NUNCA** aplicar cambios que deformen el canvas de edición al abrir paneles laterales en móviles (usar Overlays).
5. **SIEMPRE** usar iconos de la librería `lucide-react` para mantener la línea iconográfica.

---

## 📂 5. Referencia de Archivos Clave
- `index.css`: Contiene todas las váriables CSS y clases globales de Glassmorphism.
- `App.jsx`: Orquestador principal de vistas y roles.
- `HomeView.jsx`: Lógica de entrada y selección de programas.
- `GaleriaView.jsx`: Gestión de archivos y carpetas.
- `GuiaEditor.jsx` / `QuizView.jsx`: Herramientas de creación.
- `GuiaPres.jsx`: El motor de renderizado para el estudiante.

---
*Este manifiesto debe ser consultado antes de cada actualización para preservar la integridad de Central TK.*
