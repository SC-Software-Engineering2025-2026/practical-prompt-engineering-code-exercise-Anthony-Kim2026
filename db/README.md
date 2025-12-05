DB migration notes and quickstart

This folder contains a reference PostgreSQL schema for the Prompt Library MVP.

Run the migration (local Postgres) using psql:

```bash
# create database (if needed)
createdb promptlib_dev
# run migration
psql -d promptlib_dev -f db/001_create_tables.sql
```

Notes:
- The schema uses UUID primary keys (pgcrypto/gen_random_uuid()).
- Full-text search: `prompts.search_vector` uses `to_tsvector` and a GIN index.
- Embeddings are stored in `prompt_embeddings` as `REAL[]` for reference; in production use a dedicated vector DB.
- The `metadata` columns are JSONB for flexible fields (model, tokenEstimate, etc.).

Example queries:

# basic prompt list for a workspace
SELECT id, title, rating, created_at FROM prompts WHERE workspace_id = 'workspace-uuid' ORDER BY created_at DESC LIMIT 50;

# full-text search
SELECT id, title, ts_rank_cd(search_vector, to_tsquery('simple', 'marketing & email')) AS rank
FROM prompts
WHERE search_vector @@ to_tsquery('simple', 'marketing & email')
ORDER BY rank DESC LIMIT 20;
