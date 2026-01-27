-- ============================================
-- INTERACTIVE SLIDES - DATABASE SCHEMA
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY DEFAULT 'main-project',
  name TEXT NOT NULL DEFAULT 'Mi Presentación',
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Slides table
CREATE TABLE IF NOT EXISTS slides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE DEFAULT 'main-project',
  image_url TEXT,
  audio_url TEXT,
  elements JSONB DEFAULT '[]',
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Interactions table (user responses)
CREATE TABLE IF NOT EXISTS interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slide_id UUID REFERENCES slides(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  drawings JSONB DEFAULT '[]',
  stamps JSONB DEFAULT '[]',
  text_responses JSONB DEFAULT '{}',
  icon_positions JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Public read access" ON projects;
DROP POLICY IF EXISTS "Public write access" ON projects;
DROP POLICY IF EXISTS "Public read access" ON slides;
DROP POLICY IF EXISTS "Public write access" ON slides;
DROP POLICY IF EXISTS "Public read access" ON interactions;
DROP POLICY IF EXISTS "Public write access" ON interactions;

-- Create permissive policies for demo/education use
CREATE POLICY "Public read access" ON projects FOR SELECT USING (true);
CREATE POLICY "Public write access" ON projects FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public read access" ON slides FOR SELECT USING (true);
CREATE POLICY "Public write access" ON slides FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public read access" ON interactions FOR SELECT USING (true);
CREATE POLICY "Public write access" ON interactions FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- INITIAL DATA
-- ============================================

-- Insert default project if not exists
INSERT INTO projects (id, name, is_active)
VALUES ('main-project', 'Mi Presentación Interactiva', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_slides_project ON slides(project_id);
CREATE INDEX IF NOT EXISTS idx_slides_order ON slides(order_index);
CREATE INDEX IF NOT EXISTS idx_interactions_slide ON interactions(slide_id);
CREATE INDEX IF NOT EXISTS idx_interactions_alias ON interactions(alias);
CREATE INDEX IF NOT EXISTS idx_interactions_created ON interactions(created_at DESC);
