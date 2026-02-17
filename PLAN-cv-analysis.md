# Plan: CV Upload & AI Analysis

## Goal
Upload candidate CVs before interviews. AI parses them, enriches the candidate profile,
detects pre-interview flags, and suggests the best interview profile to use.

## Architecture

### Storage: Cloudflare R2 (NOT Supabase Storage)
- **Why R2**: 10GB free, no egress fees, S3-compatible API, scales with the product
- **Why NOT Supabase Storage**: 1GB free tier, eats into DB project quota, not ideal for binary files at scale
- **Worker**: Same CF account as STT proxy (agusmontoya@gmail.com)
- **Bucket**: `interview-companion-cvs`
- **Access**: Pre-signed URLs for upload/download, never expose bucket directly
- **Path convention**: `{org_id}/{candidate_id}/{filename}` — natural org isolation in storage too

### Pipeline

```
User drags CV  →  Pre-signed URL  →  R2 upload  →  CF Worker extracts text
      ↓                                                    ↓
   UI shows                                         Kimi parses JSON
   upload %                                                ↓
                                                   candidate.cv_data = {
                                                     name, email, phone,
                                                     tech_stack, years_exp,
                                                     seniority_estimate,
                                                     education, languages,
                                                     employment_gaps,
                                                     pre_flags, strengths
                                                   }
                                                           ↓
                                                   Profile Matcher
                                                           ↓
                                              "87% match: QA Automation Senior"
```

### Components

| Component | Where | What |
|-----------|-------|------|
| Upload API | Next.js API route | Generates R2 pre-signed URL, saves cv_url to candidates |
| Text Extractor | CF Worker (or API route) | PDF → text (pdf-parse), DOCX → text |
| CV Analyzer | Kimi (Edge Function or API route) | Text → structured JSON |
| Profile Matcher | API route | cv_data.tech_stack vs interview_profiles.tech_stack → score |
| Pre-flags | Part of CV Analyzer | Detect inconsistencies, gaps, generic content |
| UI: Upload | Dashboard "New Interview" page | Drag & drop + progress bar |
| UI: Suggestions | Dashboard "New Interview" page | Profile cards with match % |

### DB Changes

**candidates table** (existing fields, already in schema):
- `cv_url` TEXT — R2 URL
- `cv_data` JSONB — parsed CV data

**New: cv_data schema**:
```json
{
  "raw_text": "...",           // extracted text (for re-analysis)
  "parsed": {
    "name": "string",
    "email": "string",
    "phone": "string",
    "location": "string",
    "tech_stack": ["Playwright", "TypeScript", "CI/CD"],
    "years_experience": 5,
    "seniority_estimate": "senior",  // AI-estimated
    "education": [{"institution": "...", "degree": "...", "year": 2018}],
    "languages": [{"name": "English", "level": "advanced"}, {"name": "Spanish", "level": "native"}],
    "certifications": ["ISTQB", "AWS"],
    "employment_history": [
      {"company": "...", "role": "...", "from": "2020", "to": "2023", "description": "..."}
    ]
  },
  "analysis": {
    "strengths": ["5 years automation experience", "Led migration from Cypress to Playwright"],
    "concerns": ["No CI/CD mentioned", "Gap 2019-2020 unexplained"],
    "pre_flags": [
      {"type": "red", "text": "Claims 6 years Playwright but framework released 2020"},
      {"type": "yellow", "text": "Generic CV, no specific project details"}
    ],
    "interview_focus": ["Ask about specific Playwright projects", "Clarify employment gap"],
    "profile_matches": [
      {"profileId": 1, "name": "QA Automation Senior", "score": 0.87, "reason": "Tech stack overlap: Playwright, TS, CI/CD"}
    ]
  },
  "processed_at": "ISO timestamp",
  "ai_provider": "kimi"
}
```

### Cloudflare R2 Setup

**Account**: agusmontoya@gmail.com (same as STT proxy)
**Token**: ~/.openclaw/credentials/cloudflare-token (already exists)

```bash
# Create bucket
CLOUDFLARE_API_TOKEN=$(cat ~/.openclaw/credentials/cloudflare-token | tr -d '\n')
curl -X PUT "https://api.cloudflare.com/client/v4/accounts/1154ac48d60dfeb452e573ed0be70bd6/r2/buckets" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "interview-companion-cvs"}'
```

### Text Extraction Strategy

**PDF**: Use `pdf-parse` (npm) or `pdfjs-dist` — works in Node.js API routes
**DOCX**: Use `mammoth` (npm) — extracts text from Word docs
**Where**: Next.js API route (NOT Edge Function — needs Node.js runtime for these libs)

### AI Analysis Prompt (Kimi)

```
You are a technical recruiter's AI assistant. Parse this CV/resume and extract structured data.

CV Text:
{extracted_text}

Target role (if known): {role_hint}

Respond in JSON:
{
  "parsed": { ... },
  "analysis": {
    "strengths": [...],
    "concerns": [...],
    "pre_flags": [...],
    "interview_focus": [...]
  }
}

Rules:
- Be factual. Only flag what's actually in the CV.
- Estimate seniority based on years + responsibilities, not job titles.
- Detect inconsistencies (timeline math, impossible claims).
- Identify generic/template CVs (copy-paste job descriptions).
- Suggest specific interview questions based on CV gaps or claims.
```

### Profile Matching Algorithm

Simple but effective:
1. Extract `tech_stack` from cv_data
2. For each interview_profile, compute Jaccard similarity on tech_stack
3. Bonus weight for matching seniority level
4. Return top 3 matches with scores
5. If no match > 50%, suggest creating new profile (pre-populated from CV data)

### Implementation Order

1. **R2 bucket creation** + pre-signed URL endpoint
2. **Upload UI** (drag & drop in "New Interview" flow)
3. **Text extraction** (PDF/DOCX → text)
4. **Kimi analysis** (text → structured JSON → cv_data)
5. **Profile matcher** (cv_data vs existing profiles)
6. **Pre-flags in HUD** (show CV analysis at interview start)
7. **"New Interview" flow** (upload CV → see suggestions → pick profile → start)

### Cost

- R2: Free (10GB storage, 10M reads/month, 1M writes/month)
- Kimi: ~$0.001 per CV analysis (< 2K tokens)
- Total: essentially $0 per CV
