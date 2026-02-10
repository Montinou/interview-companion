#!/bin/bash
# Apply database migration
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

# Load .env
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Use unpooled connection for DDL
DB_URL="${DATABASE_URL_UNPOOLED:-$DATABASE_URL}"

if [ -z "$DB_URL" ]; then
  echo "❌ DATABASE_URL not found in .env"
  exit 1
fi

MIGRATION_FILE="${1:-drizzle/0003_add_job_positions.sql}"

if [ ! -f "$MIGRATION_FILE" ]; then
  echo "❌ Migration file not found: $MIGRATION_FILE"
  exit 1
fi

echo "🚀 Applying migration: $MIGRATION_FILE"
echo "📦 Database: ${DB_URL%%\?*}"

psql "$DB_URL" -f "$MIGRATION_FILE"

echo "✅ Migration applied successfully"
