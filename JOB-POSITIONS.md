# Job Positions Structure

## Schema

Nueva tabla `job_positions` para gestionar puestos de trabajo y su relación con entrevistas.

### Tabla: job_positions

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | serial | Primary key |
| title | varchar(256) | Título del puesto (ej: "QA Automation Engineer") |
| description | text | Descripción general del puesto |
| requirements | jsonb | Requisitos técnicos (ver estructura abajo) |
| seniority_level | varchar(50) | Nivel de seniority (Junior, Middle, Middle +, Senior) |
| location | varchar(256) | Ubicación (Remote, Hybrid, Office) |
| salary_range | varchar(100) | Rango salarial |
| status | varchar(50) | Estado: `open`, `closed`, `on_hold` |
| jira_epic | varchar(50) | Epic de Jira asociado (ej: TI-7197) |
| created_at | timestamp | Fecha de creación |
| updated_at | timestamp | Última actualización |

### Structure de `requirements` (JSONB)

```json
{
  "technical_skills": [
    "Playwright",
    "TypeScript/JavaScript",
    "CI/CD (GitHub Actions or Azure DevOps)",
    "Page Object Model",
    "API Testing"
  ],
  "experience": "5+ years in QA automation",
  "english_level": "Advanced (B2+)",
  "nice_to_have": [
    "Performance testing (K6/JMeter)",
    "Mobile testing (Appium)",
    "Data-driven testing frameworks"
  ]
}
```

### Relación con `interviews`

- Campo nuevo: `interviews.job_position_id` → `job_positions.id`
- Relación: Una entrevista es para UN candidato aplicando a UN puesto
- ON DELETE: SET NULL (si se borra el puesto, la entrevista queda sin puesto asignado)

## Migración

### Aplicar migración (desde Mac o Vercel)

```bash
cd ~/interview-companion
./scripts/apply-migration.sh drizzle/0003_add_job_positions.sql
```

O con drizzle-kit:

```bash
npx drizzle-kit push
```

### Qué hace la migración

1. Crea tabla `job_positions`
2. Agrega campo `job_position_id` a `interviews`
3. Crea índice para lookups rápidos
4. Inserta puesto "QA Automation Engineer" (ID 1)
5. Asocia entrevistas existentes (Nicolas & Frederico) al puesto

## Uso en código

### Crear nuevo puesto

```typescript
import { db } from '@/lib/db';
import { jobPositions } from '@/lib/db/schema';

await db.insert(jobPositions).values({
  title: 'QA Automation Engineer',
  description: 'Playwright expert for web testing',
  requirements: {
    technical_skills: ['Playwright', 'TypeScript', 'CI/CD'],
    experience: '5+ years',
    english_level: 'Advanced',
    nice_to_have: ['K6', 'Appium']
  },
  seniorityLevel: 'Middle +',
  location: 'Remote (LATAM)',
  status: 'open',
  jiraEpic: 'TI-7197'
});
```

### Asociar entrevista con puesto

```typescript
await db.insert(interviews).values({
  candidateId: 1,
  interviewerId: 1,
  jobPositionId: 1,  // ← Nueva relación
  status: 'scheduled',
  scheduledAt: new Date('2026-02-10T20:00:00Z')
});
```

### Query con relaciones

```typescript
const interview = await db.query.interviews.findFirst({
  where: eq(interviews.id, 1),
  with: {
    candidate: true,
    jobPosition: true,
    scorecard: true
  }
});

console.log(interview.jobPosition.title); // "QA Automation Engineer"
```

## Roadmap

- [ ] UI para gestionar job positions (CRUD)
- [ ] Filtrar candidatos por puesto
- [ ] Comparar candidatos del mismo puesto
- [ ] Dashboard de hiring pipeline por puesto
- [ ] Templates de scorecard por seniority level
