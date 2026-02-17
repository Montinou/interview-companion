# PLAN: Interview Profiles & Onboarding

## Problema

El sistema actual solo soporta un tipo de entrevista (QA Automation Engineer):
- `InterviewGuide.tsx` tiene preguntas hardcodeadas
- `analyze-chunk` tiene un prompt genérico sin contexto del rol
- `generate-scorecard` usa 6 dimensiones fijas (actitud, comunicación, técnico, estratégico, liderazgo, inglés)
- No hay forma de configurar qué evaluar para diferentes roles

## Principio de diseño

**La IA hace el trabajo pesado.** El usuario describe el rol en lenguaje natural → la IA genera el plan completo de entrevista, criterios de evaluación, y dimensiones del scorecard. Sin formularios complejos, sin schemas rígidos.

## Concepto: Interview Profile

Un "perfil" es un JSON que contiene TODO lo que la IA necesita para analizar una entrevista:

```typescript
{
  // Metadata
  name: "Senior React Developer",
  role_type: "technical",      // technical | soft_skills | mixed | cultural
  seniority: "senior",         // junior | mid | senior | lead | staff
  language: "en",              // idioma de la entrevista
  
  // Lo que el usuario escribe (input)
  description: "Senior React developer for our fintech platform. Must know TypeScript, Next.js, state management (Zustand/Redux), testing (Jest/RTL), and have experience with CI/CD. Nice to have: GraphQL, microservices, performance optimization.",
  
  // Lo que la IA genera (output)
  evaluation_dimensions: [
    { key: "react", label: "React & Next.js", weight: 3 },
    { key: "typescript", label: "TypeScript", weight: 2 },
    { key: "testing", label: "Testing Strategy", weight: 2 },
    { key: "architecture", label: "Architecture & Patterns", weight: 2 },
    { key: "communication", label: "Communication", weight: 1 },
    { key: "problem_solving", label: "Problem Solving", weight: 2 },
  ],
  
  interview_structure: {
    total_duration: 60,
    phases: [
      {
        name: "Introduction & Background",
        duration: 5,
        questions: [
          { text: "Walk me through your last 2-3 projects...", listen_for: "React experience, project complexity, ownership" },
          { text: "What's your day-to-day workflow?", listen_for: "CI/CD awareness, testing habits, code review" }
        ]
      },
      {
        name: "React Deep Dive",
        duration: 20,
        questions: [
          { text: "How do you manage state in a large React app?", listen_for: "Zustand/Redux knowledge, when to use what, server state vs client state" },
          { text: "Explain React Server Components vs Client Components", listen_for: "Next.js App Router understanding, streaming, suspense" },
          // ...más preguntas generadas
        ]
      },
      // ...más fases
    ]
  },
  
  analysis_instructions: "Focus on practical React experience over theoretical knowledge. Red flags: can't explain component lifecycle, no testing experience, unclear about TypeScript benefits. Green flags: mentions performance optimization, has RSC experience, understands hydration, uses proper patterns (compound components, render props, hooks composition). For this seniority, expect deep understanding of rendering behavior, custom hooks, and architectural decisions.",
  
  red_flags: [
    "Can't explain useEffect cleanup",
    "No experience with TypeScript",
    "Never written tests",
    "Can't articulate architectural decisions",
    "Only jQuery/vanilla experience"
  ],
  
  green_flags: [
    "Mentions React Server Components",
    "Has performance optimization experience",
    "Understands bundle splitting",
    "Led technical initiatives",
    "Contributed to component libraries"
  ]
}
```

## Cambios en DB

### Nueva tabla: `interview_profiles`

```sql
CREATE TABLE interview_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  name VARCHAR(256) NOT NULL,
  role_type VARCHAR(50) NOT NULL DEFAULT 'technical',
  seniority VARCHAR(50),
  language VARCHAR(10) DEFAULT 'en',
  
  -- Input del usuario
  description TEXT NOT NULL,
  tech_stack TEXT[],                    -- tags: ["React", "TypeScript", "Next.js"]
  
  -- Output de la IA (generado una vez, editable después)
  evaluation_dimensions JSONB,         -- [{key, label, weight}]
  interview_structure JSONB,           -- {total_duration, phases: [{name, duration, questions}]}
  analysis_instructions TEXT,          -- instrucciones custom para analyze-chunk
  red_flags JSONB,                     -- ["flag1", "flag2"]
  green_flags JSONB,                   -- ["flag1", "flag2"]
  
  -- Meta
  is_template BOOLEAN DEFAULT true,    -- true = reusable template
  usage_count INTEGER DEFAULT 0,       -- cuántas veces se usó
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Modificar tabla: `interviews`

```sql
ALTER TABLE interviews
  ADD COLUMN profile_id INTEGER REFERENCES interview_profiles(id) ON DELETE SET NULL,
  ADD COLUMN profile_override JSONB;  -- override parcial del perfil para ESTA entrevista
```

- `profile_id` → apunta al template base
- `profile_override` → JSON patch: `{ "analysis_instructions": "Also evaluate SQL skills...", "evaluation_dimensions": [...modified...] }`

### Modificar tabla: `scorecards`

Las dimensiones fijas (attitude, communication, technical, strategic, leadership, english) se mantienen como fallback, pero se agrega:

```sql
ALTER TABLE scorecards
  ADD COLUMN dimensions JSONB;  -- {"react": 8, "typescript": 7, "testing": 6, ...}
```

Cuando hay perfil → usa `dimensions` (dinámico). Sin perfil → fallback a las 6 columnas fijas.

## Flujo de Onboarding

### 1. Crear perfil (una vez por tipo de rol)

```
Usuario llena formulario simple:
┌─────────────────────────────────────┐
│ Profile Name: [Senior React Dev   ] │
│ Role Type:    [Technical ▾]         │
│ Seniority:    [Senior ▾]           │
│ Language:     [English ▾]           │
│ Tech Stack:   [React] [TS] [Next]   │ ← tags, autocompletable
│                                     │
│ Description:                        │
│ ┌─────────────────────────────────┐ │
│ │ Senior React developer for our  │ │
│ │ fintech platform. Must know...  │ │
│ └─────────────────────────────────┘ │
│                                     │
│        [✨ Generate Plan]           │
└─────────────────────────────────────┘
```

### 2. IA genera el plan completo

Un solo prompt a Kimi genera todo:
- Evaluation dimensions con pesos
- Interview structure con fases, timing, y preguntas
- Analysis instructions para el copilot
- Red flags y green flags esperados

### 3. Usuario revisa y edita

```
┌─────────────────────────────────────┐
│ ✅ Generated Interview Plan         │
│                                     │
│ 📊 Evaluation Dimensions:          │
│   React & Next.js ████████ (×3)    │
│   TypeScript      ██████ (×2)      │
│   Testing         ██████ (×2)      │
│   [Edit] [+ Add dimension]         │
│                                     │
│ 📋 Interview Structure:            │
│   Phase 1: Introduction (5 min)     │
│   Phase 2: React Deep Dive (20 min) │
│   Phase 3: Architecture (15 min)    │
│   Phase 4: English (15 min)         │
│   Phase 5: Candidate Q&A (5 min)    │
│   [Edit phases]                     │
│                                     │
│ 🔴 Red Flags: [edit list]          │
│ 🟢 Green Flags: [edit list]        │
│                                     │
│   [Save as Template]  [Use Now]     │
└─────────────────────────────────────┘
```

### 4. Iniciar entrevista con perfil

```
"New Interview"
→ Select candidate (or create)
→ Select profile template (or create new)
→ Optionally customize for this candidate
   (e.g., "Also evaluate SQL since the team needs it")
→ Start
```

### 5. Durante la entrevista

- **InterviewGuide** → renderiza las fases y preguntas del perfil (dinámico, no hardcodeado)
- **analyze-chunk** → inyecta `analysis_instructions` + `red_flags` + `green_flags` del perfil en el prompt
- **RadarScorecard** → muestra las dimensiones del perfil (no las 6 fijas)

### 6. Post-entrevista

- **generate-scorecard** → usa las dimensiones del perfil para el scoring
- **Radar chart** → ejes dinámicos basados en `evaluation_dimensions`

## Cambios en componentes

### `analyze-chunk` (Edge Function)

```diff
- const prompt = `You are a technical interview analysis copilot...`
+ // Merge profile + override
+ const profile = interview.interview_profiles
+ const override = interview.profile_override || {}
+ const instructions = override.analysis_instructions || profile?.analysis_instructions || ""
+ const redFlags = override.red_flags || profile?.red_flags || []
+ const greenFlags = override.green_flags || profile?.green_flags || []
+ 
+ const prompt = `You are an interview analysis copilot.
+ 
+ Role: ${profile?.name || role}
+ Seniority: ${profile?.seniority || "unknown"}
+ 
+ ${instructions ? `Analysis focus:\n${instructions}` : ""}
+ ${redFlags.length ? `Known red flags for this role:\n${redFlags.map(f => `- ${f}`).join("\n")}` : ""}
+ ${greenFlags.length ? `Known green flags for this role:\n${greenFlags.map(f => `- ${f}`).join("\n")}` : ""}
+ 
+ Analyze this transcript chunk...`
```

### `generate-scorecard` (Edge Function)

```diff
- "scores": { "attitude": 1-10, "communication": 1-10, ... }
+ // Dynamic dimensions from profile
+ const dims = profile?.evaluation_dimensions || DEFAULT_DIMS
+ const dimsPrompt = dims.map(d => `"${d.key}": 1-10 // ${d.label}`).join(",\n")
+ 
+ "scores": { ${dimsPrompt} }
```

### `InterviewGuide.tsx`

```diff
- const phases: PhaseSection[] = [ /* hardcoded */ ]
+ // Read from profile
+ const phases = profile?.interview_structure?.phases || []
```

Ya no tiene preguntas hardcodeadas. Lee del perfil. Si no hay perfil, muestra un mensaje "No interview plan loaded".

### `RadarScorecard.tsx`

```diff
- const DIMS = [ {key: 'actitud', label: 'Actitud'}, ... ]
+ // Dynamic from profile or fallback
+ const DIMS = profile?.evaluation_dimensions?.map(d => ({
+   key: d.key, label: d.label
+ })) || DEFAULT_DIMS
```

### `PlanGuideTabbed.tsx`

Sin cambios — ya es dinámico.

## API: Generate Profile

### `POST /api/profiles/generate`

```typescript
// Input
{ description: string, role_type: string, seniority: string, tech_stack: string[], language: string }

// AI generates everything
const prompt = `Generate a complete interview plan for the following role:

Role: ${role_type} - ${seniority}
Description: ${description}
Tech Stack: ${tech_stack.join(", ")}
Interview Language: ${language}

Generate a JSON with:
1. evaluation_dimensions: Array of {key, label, weight(1-3)}. 5-8 dimensions specific to this role. Weight indicates importance.
2. interview_structure: {total_duration: 60, phases: [{name, duration, questions: [{text, listen_for}]}]}. 4-6 phases covering introduction, technical depth, scenarios, language assessment, and Q&A.
3. analysis_instructions: Paragraph of specific instructions for the real-time AI copilot analyzing this interview. What to focus on, what patterns indicate competence for THIS role.
4. red_flags: Array of 5-8 specific red flags for this role and seniority.
5. green_flags: Array of 5-8 specific green flags for this role and seniority.

Be specific to the role. A React developer interview is VERY different from a QA engineer interview.
Generate 4-6 questions per technical phase.
JSON only, no markdown.`

// Output → save to interview_profiles
```

### `POST /api/profiles` — CRUD

Standard CRUD: create, read, update, delete templates.

### `PATCH /api/interviews/:id/profile-override`

Save per-interview customizations.

## UI: Páginas nuevas

### `/dashboard/profiles` — Lista de templates

- Grid/list de perfiles guardados
- Nombre, role type, seniority, usage count
- Actions: edit, duplicate, delete

### `/dashboard/profiles/new` — Crear perfil

- Formulario simple (name, description, tech_stack, seniority, language)
- Botón "Generate Plan" → llama a `/api/profiles/generate`
- Preview del plan generado con edición inline
- "Save as Template"

### `/dashboard/profiles/[id]` — Editar perfil

- Mismo formulario + plan generado
- "Regenerate" para re-generar el plan
- Vista previa del InterviewGuide como se vería

### Modificar `/dashboard/interviews/new` — Agregar selector de perfil

- Dropdown de templates existentes
- "Create new profile" inline
- Textarea para override: "Additional instructions for this interview"

## Estimación

| Task | Complejidad | Tiempo |
|------|------------|--------|
| DB migration (nueva tabla + alter) | Baja | 30 min |
| Drizzle schema update | Baja | 15 min |
| API generate profile (AI prompt) | Media | 1 hr |
| API CRUD profiles | Baja | 45 min |
| UI: Profile list page | Baja | 1 hr |
| UI: Profile create/edit page | Media | 2 hr |
| UI: Profile selector en new interview | Baja | 30 min |
| InterviewGuide → dinámico | Media | 1 hr |
| RadarScorecard → dinámico | Media | 1 hr |
| analyze-chunk → inyectar perfil | Baja | 30 min |
| generate-scorecard → dimensiones dinámicas | Media | 1 hr |
| create-interview EF → aceptar profile_id | Baja | 15 min |
| **TOTAL** | | **~10 hr** |

## Orden de implementación

1. **DB + Schema** — migración, Drizzle types
2. **API generate** — el prompt que genera perfiles (testeable aislado)
3. **API CRUD** — guardar/leer/editar perfiles
4. **Edge Functions** — inyectar perfil en analyze-chunk y generate-scorecard
5. **InterviewGuide dinámico** — leer del perfil
6. **RadarScorecard dinámico** — ejes variables
7. **UI profiles** — páginas de gestión
8. **UI interview creation** — selector de perfil
9. **Backward compatibility** — sin perfil = comportamiento actual (6 dims fijas)

## Backward Compatibility

- Entrevistas sin `profile_id` → usan las 6 dimensiones hardcodeadas (fallback)
- `analyze-chunk` sin perfil → prompt genérico actual (sin cambios)
- `InterviewGuide` sin perfil → "No plan loaded" o carga preguntas default
- Todo opt-in: si no creás perfiles, todo funciona igual que ahora
