# Configuración de Supabase para Diapositivas Interactivas

Para que la aplicación funcione correctamente, sigue estos pasos:

### 1. Crear el Proyecto
Ve a [Supabase](https://supabase.com/) y crea un nuevo proyecto.

### 2. Ejecutar el Script SQL
Copia el contenido del archivo `SUPABASE_SCHEMA.sql` que se encuentra en la raíz de este proyecto y ejecútalo en el **Editor SQL** de Supabase.

### 3. Configurar Almacenamiento (Storage)
1. Ve a la sección de **Storage** en Supabase.
2. Crea un nuevo "Bucket" llamado `media`.
3. Asegúrate de ponerlo como **Público** para que las imágenes y audios se puedan ver.

### 4. Variables de Entorno
Crea un archivo `.env` en la raíz de este proyecto (o edita `src/lib/supabase.js`) con tus credenciales:

```env
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_llave_anon_de_supabase
```

### 5. Ejecutar Localmente
```bash
npm install
npm run dev
```

La aplicación permite:
- **Cargar imágenes y audios** desde el editor.
- **Dibujar con diferentes colores y grosores** en las diapositivas.
- **Sesiones individuales**: Cada usuario ingresa un alias y sus dibujos se guardan por separado en la tabla `interactions` sin sobreescribir a otros.
