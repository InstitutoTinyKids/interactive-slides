-- Tabla para carpetas de extras
CREATE TABLE IF NOT EXISTS extra_folders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla para extras (links y juegos)
CREATE TABLE IF NOT EXISTS extras (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('link', 'game')),
    content TEXT NOT NULL,
    folder_id UUID REFERENCES extra_folders(id) ON DELETE SET NULL,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_extras_folder_id ON extras(folder_id);
CREATE INDEX IF NOT EXISTS idx_extras_order ON extras(order_index);
CREATE INDEX IF NOT EXISTS idx_extra_folders_order ON extra_folders(order_index);

-- Habilitar Row Level Security (RLS)
ALTER TABLE extra_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE extras ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad: permitir lectura pública, escritura solo autenticada
CREATE POLICY "Permitir lectura pública de carpetas extras"
    ON extra_folders FOR SELECT
    USING (true);

CREATE POLICY "Permitir escritura autenticada de carpetas extras"
    ON extra_folders FOR ALL
    USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir lectura pública de extras"
    ON extras FOR SELECT
    USING (true);

CREATE POLICY "Permitir escritura autenticada de extras"
    ON extras FOR ALL
    USING (auth.role() = 'authenticated');
