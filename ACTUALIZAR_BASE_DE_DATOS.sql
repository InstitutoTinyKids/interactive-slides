-- ============================================
-- UPDATE PARA SOPORTE MULTI-PROGRAMA
-- ============================================

-- 1. Agregar columna para la clave de acceso de cada programa
ALTER TABLE projects ADD COLUMN IF NOT EXISTS access_code TEXT DEFAULT '123';

-- 2. Asegurar que el ID de proyectos sea flexible (quitar default fijo)
ALTER TABLE projects ALTER COLUMN id DROP DEFAULT;

-- 3. Crear los programas iniciales requeridos
INSERT INTO projects (id, name, is_active, access_code) VALUES
('baby-program', 'Baby Program', false, '123'),
('mini-program', 'Mini Program', false, '123'),
('tiny-program', 'Tiny Program', false, '123'),
('big-program', 'Big Program', false, '123'),
('junior-program', 'Junior Program', false, '123'),
('reading-club', 'Reading Club', false, '123'),
('conversation-club', 'Conversation Club', false, '123')
ON CONFLICT (id) DO NOTHING;

-- 4. Opcional: Actualizar el proyecto actual si existe
UPDATE projects SET name = 'Guía Tiny Kids' WHERE id = 'main-project';
