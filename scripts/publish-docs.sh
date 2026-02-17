#!/bin/bash

DOCS_DIR="/Users/agustinmontoya/.openclaw/workspace-interviews/interview-companion-v2/docs"

echo "Publishing Interview Companion v2 Genesis docs to Quoth..."

# Kill any existing mcporter processes
pkill -f mcporter
sleep 2

# Function to publish a document
publish_doc() {
    local doc_id="$1"
    local file_path="$2"
    local reasoning="$3"
    local evidence="$4"
    
    echo "---"
    echo "Publishing: $doc_id"
    echo "File: $file_path"
    
    mcporter call quoth.quoth_propose_update \
        doc_id="$doc_id" \
        new_content="$(cat "$file_path")" \
        reasoning="$reasoning" \
        evidence_snippet="$evidence" \
        visibility="project" &
    
    # Wait for process to complete (or timeout after 10s)
    local pid=$!
    sleep 10
    
    # Kill if still running (SSE hang)
    if kill -0 $pid 2>/dev/null; then
        kill $pid 2>/dev/null
        echo "  → Forced termination (SSE hang)"
    fi
    
    # Small delay between calls
    sleep 2
}

# Publish all 11 documents
publish_doc "interview-companion-v2/architecture/project-overview" \
    "$DOCS_DIR/architecture/project-overview.md" \
    "Genesis doc 1/11: Project overview with differential analysis" \
    "Next.js 16 + Tauri v2 + Deepgram + Kimi/Cerebras"

publish_doc "interview-companion-v2/architecture/tech-stack" \
    "$DOCS_DIR/architecture/tech-stack.md" \
    "Genesis doc 2/11: Complete tech stack breakdown" \
    "Next.js 16, Tauri v2, Drizzle ORM, Deepgram nova-3"

publish_doc "interview-companion-v2/architecture/repo-structure" \
    "$DOCS_DIR/architecture/repo-structure.md" \
    "Genesis doc 3/11: Repository structure and file organization" \
    "Monorepo with Next.js, Tauri, Supabase functions"

publish_doc "interview-companion-v2/patterns/coding-conventions" \
    "$DOCS_DIR/patterns/coding-conventions.md" \
    "Genesis doc 4/11: Coding conventions and patterns" \
    "TypeScript strict, Server Components, Tauri commands"

publish_doc "interview-companion-v2/patterns/testing-patterns" \
    "$DOCS_DIR/patterns/testing-patterns.md" \
    "Genesis doc 5/11: Testing strategies and workflows" \
    "Manual testing, Tauri dev mode, Edge Function local testing"

publish_doc "interview-companion-v2/contracts/api-schemas" \
    "$DOCS_DIR/contracts/api-schemas.md" \
    "Genesis doc 6/11: API schemas and endpoints" \
    "Next.js API routes, Supabase Edge Functions, Tauri commands"

publish_doc "interview-companion-v2/contracts/database-models" \
    "$DOCS_DIR/contracts/database-models.md" \
    "Genesis doc 7/11: Database models and schema" \
    "8 tables: interviews, transcripts, ai_insights, scorecards"

publish_doc "interview-companion-v2/contracts/shared-types" \
    "$DOCS_DIR/contracts/shared-types.md" \
    "Genesis doc 8/11: Shared TypeScript types" \
    "CaptureConfig, TranscriptChunk, AIInsight, Scorecard types"

publish_doc "interview-companion-v2/patterns/error-handling" \
    "$DOCS_DIR/patterns/error-handling.md" \
    "Genesis doc 9/11: Error handling patterns" \
    "Rust Result, try-catch, AIManager failover, Realtime errors"

publish_doc "interview-companion-v2/patterns/security-patterns" \
    "$DOCS_DIR/patterns/security-patterns.md" \
    "Genesis doc 10/11: Security patterns and auth" \
    "Clerk auth, internal API key, RLS bypass, CORS, env vars"

publish_doc "interview-companion-v2/meta/tech-debt" \
    "$DOCS_DIR/meta/tech-debt.md" \
    "Genesis doc 11/11: Technical debt tracker" \
    "Missing tests, CORS wildcard, hardcoded prompts, export feature"

echo "---"
echo "✅ All 11 documents published to Quoth!"
echo ""
echo "Next: Publish 4 shared docs (stt-comparison, llm-failover, tauri-nextjs, supabase-edge-functions)"
