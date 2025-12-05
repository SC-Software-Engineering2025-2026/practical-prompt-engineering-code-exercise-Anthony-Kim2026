-- 001_create_tables.sql
-- PostgreSQL schema for prompt library MVP
-- Run: psql -d yourdb -f 001_create_tables.sql

-- Enable extensions commonly useful for full-text and UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Users (simple auth owner reference)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  hashed_password TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Organizations (optional)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  plan TEXT DEFAULT 'free',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Workspaces group prompts and permissions
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Prompts (canonical prompt store)
CREATE TABLE IF NOT EXISTS prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  rating SMALLINT DEFAULT 0,
  -- tsvector column for full-text search (title + content)
  search_vector tsvector,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Trigger function to update search_vector and updated_at
CREATE OR REPLACE FUNCTION prompts_search_vector_trigger() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector := to_tsvector('simple', coalesce(NEW.title, '') || ' ' || coalesce(NEW.content, ''));
  NEW.updated_at = now();
  RETURN NEW;
END
$$;

CREATE TRIGGER prompts_tsvector_update BEFORE INSERT OR UPDATE
ON prompts FOR EACH ROW EXECUTE PROCEDURE prompts_search_vector_trigger();

-- Indexes to support search and common filters
CREATE INDEX IF NOT EXISTS prompts_search_idx ON prompts USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS prompts_workspace_idx ON prompts (workspace_id);
CREATE INDEX IF NOT EXISTS prompts_rating_idx ON prompts (rating);

-- Prompt versions (immutable history)
CREATE TABLE IF NOT EXISTS prompt_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID REFERENCES prompts(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE (prompt_id, version_number)
);

-- Prompt usage events for analytics and cost attribution
CREATE TABLE IF NOT EXISTS prompt_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID REFERENCES prompts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  model TEXT,
  tokens_in INTEGER,
  tokens_out INTEGER,
  cost_estimate NUMERIC(12,6),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Simple materialized view (optional) for quick stats per workspace
CREATE MATERIALIZED VIEW IF NOT EXISTS workspace_prompt_stats AS
SELECT w.id AS workspace_id,
       count(p.*) AS total_prompts,
       avg(NULLIF(p.rating,0)) AS avg_rating
FROM workspaces w
LEFT JOIN prompts p ON p.workspace_id = w.id
GROUP BY w.id;

-- Note: To use vector/semantic search, store embeddings in a separate table
-- Embeddings table (reference only)
CREATE TABLE IF NOT EXISTS prompt_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID REFERENCES prompts(id) ON DELETE CASCADE,
  provider TEXT,
  model TEXT,
  vector REAL[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Example: simple permission table (workspace-level roles)
CREATE TABLE IF NOT EXISTS workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'editor', -- owner/editor/viewer
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);

-- End of migration
