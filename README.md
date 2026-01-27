# 🎯 Interactive Slides - Presentaciones Interactivas

Una aplicación web premium para crear y gestionar presentaciones interactivas con herramientas de dibujo, selección, arrastre y texto.

## ✨ Características

- 🎨 **Editor Visual Completo**: Crea diapositivas con imágenes 1920x1080 y audio
- 🖌️ **Herramientas Interactivas**:
  - **Dibujar**: Trazos con colores y grosores personalizables
  - **Seleccionar**: Colocar sellos (círculos rojos)
  - **Arrastrar**: Objetos movibles por los participantes
  - **Texto**: Campos de texto editables
- 🔐 **Acceso Protegido**: Panel de administración con contraseña
- 📊 **Visualización de Resultados**: Revisa las interacciones de cada usuario
- ⚡ **Control de Presentación**: Inicia/pausa el acceso de participantes
- 💾 **Almacenamiento en Nube**: Integración completa con Supabase

## 🚀 Instalación

### 1. Clonar e Instalar Dependencias

```bash
cd interactive-slides
npm install
```

### 2. Configurar Supabase

#### A. Crear Proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) y crea una cuenta
2. Crea un nuevo proyecto
3. Copia tu **Project URL** y **Anon Key**

#### B. Configurar Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_anon_key
```

#### C. Ejecutar el Schema SQL

1. Ve a tu proyecto de Supabase
2. Abre el **SQL Editor** (icono de base de datos en el menú lateral)
3. Copia TODO el contenido del archivo `SUPABASE_SCHEMA.sql`
4. Pégalo en el editor y haz clic en **RUN**

#### D. Configurar Storage

1. Ve a **Storage** en el menú lateral de Supabase
2. Crea un nuevo bucket llamado `media`
3. Configúralo como **público**:
   - Click en el bucket `media`
   - Ve a **Policies**
   - Crea una política con:
     - **Policy Name**: `Public Access`
     - **Policy Definition**: 
       ```sql
       (bucket_id = 'media'::text)
       ```
     - Marca todas las operaciones: SELECT, INSERT, UPDATE, DELETE

### 3. Ejecutar la Aplicación

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

## 📖 Uso

### Para Administradores

1. **Acceder al Editor**:
   - Haz clic en el icono de engranaje ⚙️ (esquina superior derecha)
   - Ingresa la contraseña: `123`

2. **Crear Diapositivas**:
   - Click en "Crear Nueva Diapositiva"
   - Sube una imagen de fondo (1920x1080 recomendado)
   - Opcionalmente, sube un archivo de audio
   - Añade herramientas interactivas:
     - **Arrastrar**: Sube una imagen pequeña que los usuarios podrán mover
     - **Seleccionar**: Activa la herramienta de sellos
     - **Trazar**: Habilita el dibujo libre
     - **Texto**: Crea campos de texto editables

3. **Guardar y Activar**:
   - Click en **GUARDAR** para almacenar en Supabase
   - Click en **INICIAR PRESENTACIÓN** para permitir acceso a usuarios

4. **Ver Resultados**:
   - Click en **VER RESULTADOS**
   - Selecciona un participante para ver sus interacciones

### Para Participantes

1. Ingresa tu nombre/alias
2. Espera a que el administrador inicie la presentación
3. Interactúa con cada diapositiva usando las herramientas disponibles
4. Click en **GUARDAR Y CONTINUAR** para avanzar
5. Al finalizar, tus respuestas quedarán registradas

## 🎨 Personalización

### Cambiar la Contraseña del Administrador

Edita `src/components/AliasEntry.jsx`, línea ~24:

```javascript
if (pass === '123') {  // Cambia '123' por tu contraseña
```

### Modificar Colores del Tema

Edita `src/index.css`, variables CSS:

```css
:root {
  --accent-primary: #7c3aed;  /* Púrpura */
  --accent-secondary: #2563eb; /* Azul */
  /* ... más colores */
}
```

## 🛠️ Tecnologías

- **React 18** - Framework UI
- **Vite** - Build tool
- **Supabase** - Backend (Base de datos + Storage)
- **Lucide React** - Iconos
- **Canvas API** - Dibujo y renderizado
- **Framer Motion** - Animaciones
- **Canvas Confetti** - Efectos de celebración

## 📁 Estructura del Proyecto

```
interactive-slides/
├── src/
│   ├── components/
│   │   ├── AliasEntry.jsx      # Pantalla de entrada
│   │   ├── SlideEditor.jsx     # Editor de diapositivas
│   │   ├── SlideViewer.jsx     # Visualizador para participantes
│   │   └── ResultsViewer.jsx   # Panel de resultados
│   ├── lib/
│   │   └── supabase.js         # Cliente de Supabase
│   ├── App.jsx                 # Componente principal
│   ├── main.jsx                # Punto de entrada
│   └── index.css               # Estilos globales
├── SUPABASE_SCHEMA.sql         # Schema de base de datos
├── .env                        # Variables de entorno
└── package.json
```

## 🐛 Solución de Problemas

### Error: "new row violates row-level security policy"

- Asegúrate de haber ejecutado TODO el archivo `SUPABASE_SCHEMA.sql`
- Verifica que las políticas RLS estén creadas correctamente

### Las imágenes no se cargan

- Verifica que el bucket `media` en Supabase Storage sea público
- Revisa que las políticas de Storage permitan INSERT y SELECT

### La aplicación no guarda datos

- Verifica que las variables de entorno en `.env` sean correctas
- Abre la consola del navegador (F12) para ver errores específicos

## 📝 Licencia

MIT

## 👨‍💻 Soporte

Para reportar problemas o sugerencias, abre un issue en el repositorio.

---

**Desarrollado con ❤️ usando React y Supabase**
