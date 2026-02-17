-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Permitir lectura pública de carpetas extras" ON extra_folders;
DROP POLICY IF EXISTS "Permitir escritura autenticada de carpetas extras" ON extra_folders;
DROP POLICY IF EXISTS "Permitir lectura pública de extras" ON extras;
DROP POLICY IF EXISTS "Permitir escritura autenticada de extras" ON extras;

-- Crear nuevas políticas que permitan todas las operaciones
-- (La seguridad se maneja a nivel de aplicación con contraseña)

-- Políticas para extra_folders
CREATE POLICY "Permitir todas las operaciones en carpetas extras"
    ON extra_folders FOR ALL
    USING (true)
    WITH CHECK (true);

-- Políticas para extras
CREATE POLICY "Permitir todas las operaciones en extras"
    ON extras FOR ALL
    USING (true)
    WITH CHECK (true);
