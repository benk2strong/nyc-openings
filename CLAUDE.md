# NYC Openings — Project Context

## What This Is
A Node.js backend that pulls NYC restaurant/retail data from Google Places API, stores it in Supabase (PostgreSQL), and detects new business openings via weekly diffs. Data feeds a Substack newsletter and eventually a mobile app.

## Tech Stack
- Runtime: Node.js
- Database: Supabase (table: places_nyc)
- API: Google Places API (New) — Nearby Search endpoint
- Credentials: stored in .env, never hardcoded, never exposed in logs or errors

## Critical Rules
- NEVER expose API keys in error output. All try/catch blocks must log only err.message and err.response.status/data, never the full error object.
- NEVER run scripts that make API calls without explicit user approval. Show the code first.
- Always verify your work. After writing code, read it back and check for: missing error handling, hardcoded values that should be env vars, assumptions about data shape.
- Separate planning from implementation. When given a complex task, first outline your approach and get confirmation before writing code.
- State assumptions. If you're unsure about an API response format, a file location, or a data type, say so before proceeding.

## Build & Run
- Install: npm install
- Run main pull: node pull.js
- All env vars in .env: GOOGLE_PLACES_API_KEY, SUPABASE_URL, SUPABASE_KEY

## Database Schema (places_nyc)
name (text), address (text), latitude (float8), longitude (float8), category (text), place_source_id (text, unique), phone (text), website (text), date_created (date), social_media (jsonb), first_seen (timestamptz), last_seen (timestamptz)

## Development Process Rules
- Always check todo.md before starting a new task. Work top-down within the current phase.
- Never start a Phase 3 or 4 task while Phase 1 has incomplete Must Have items.
- After completing any task, update todo.md to mark it done.
- If a task isn't on the list, add it to the appropriate phase before starting it.
