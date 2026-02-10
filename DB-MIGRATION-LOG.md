# Database Migration Log

## 2026-02-10 20:57 UTC

### Migration: Add job_positions table + interview relation

**File:** `drizzle/0003_add_job_positions.sql`  
**Target DB:** `ep-autumn-mud-aig83eeq` (write primary)  
**Status:** ✅ Applied successfully

#### Changes:
- ✅ Created `job_positions` table
- ✅ Added `job_position_id` column to `interviews` table
- ✅ Created index on `interviews.job_position_id`
- ✅ Inserted default position: "QA Automation Engineer" (ID: 1)
- ✅ Associated existing interviews (Nicolas Lobos, Frederico Reales) with position

#### Results:
```sql
-- job_positions
id | title                  | seniority_level | location       | status | jira_epic
1  | QA Automation Engineer | Middle +        | Remote (LATAM) | open   | TI-7197

-- interviews (updated)
id | candidate        | status    | job_position_id | position
1  | Nicolas Lobos    | completed | 1               | QA Automation Engineer
2  | Frederico Reales | completed | 1               | QA Automation Engineer
```

#### Database Connection Update:
- **OLD (read-only):** `br-sweet-bird-aiwanlf7` (recovery mode)
- **NEW (write primary):** `ep-autumn-mud-aig83eeq`

#### Command used:
```bash
PGPASSWORD="..." psql "postgresql://neondb_owner@ep-autumn-mud-aig83eeq-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require" -f drizzle/0003_add_job_positions.sql
```

#### Next steps:
- [ ] Update Vercel env vars to ep-autumn-mud (if not already done)
- [ ] Update Mac .env to ep-autumn-mud
- [ ] Build UI for job positions CRUD
- [ ] Enable filtering/comparison by job position
