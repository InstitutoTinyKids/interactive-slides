-- Agregar campo is_active a la tabla extras
ALTER TABLE extras ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Actualizar todos los extras existentes para que estén activos por defecto
UPDATE extras SET is_active = true WHERE is_active IS NULL;
