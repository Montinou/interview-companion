import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { aiInsights, transcripts } from '@/lib/db/schema';
import { validateApiKey, unauthorizedResponse } from '@/lib/api-auth';

// AI Gateway for Gemini Flash
const AI_GATEWAY_URL = 'https://ai-gateway.vercel.sh/v1/chat/completions';
const AI_GATEWAY_KEY = process.env.AI_GATEWAY_KEY;

// Interview guide context for the AI
const INTERVIEW_CONTEXT = `
Sos un asistente de entrevistas de QA para Distillery. Tu rol es analizar respuestas de candidatos y detectar:

## Red Flags (respuestas flojas)
- Asume que testing tiene la culpa de bugs en producción
- No entiende el "para qué" de la automatización (solo dice "para testear más rápido")
- Dice que 100% de cobertura automatizada "sí, se puede" sin mencionar ROI
- Solo quiere "scriptear a ciegas", no le interesa el negocio
- Actitud defensiva o poco colaborativa
- Habla mal de todos sus empleadores anteriores

## Green Flags (respuestas maduras)
- Pregunta "¿para qué?" antes de "¿cómo?"
- Habla de ROI, balance, priorización
- Menciona colaboración con devs/PM
- Reconoce lo que no sabe
- Tiene visión macro del proceso de testing
- Experiencia con CI/CD, Page Objects, frameworks

## Las 3 Preguntas Críticas
1. "100% de cobertura automatizada" → Respuesta madura menciona ROI, limitaciones, balance
2. "Bugs en producción a pesar de testing" → Respuesta madura analiza causa raíz, no culpa al testing
3. "Para qué sirve la automatización" → Respuesta madura: depende del proyecto, regresión, CI/CD, feedback

Respondé en JSON con este formato:
{
  "hasSuggestion": true/false,
  "suggestion": "pregunta de seguimiento sugerida" | null,
  "redFlag": "descripción del red flag detectado" | null,
  "greenFlag": "descripción del green flag detectado" | null,
  "note": "observación adicional" | null
}
`;

interface AnalyzeRequest {
  interviewId: number;
  triggerReason: string;
  triggerContext: string;
  recentTranscript: string;
  candidateInfo: {
    name: string;
    position?: string;
    experience?: string;
  };
  stats?: {
    duration: number;
    redFlagCount: number;
    greenFlagCount: number;
    currentTopic?: string;
  };
}

export async function POST(request: NextRequest) {
  // Machine-to-machine auth (tier1 → server)
  if (!validateApiKey(request)) {
    return unauthorizedResponse('Invalid or missing API key');
  }

  try {
    const body: AnalyzeRequest = await request.json();
    const { 
      interviewId, 
      triggerReason, 
      triggerContext, 
      recentTranscript, 
      candidateInfo,
      stats 
    } = body;

    if (!interviewId || !triggerReason || !recentTranscript) {
      return NextResponse.json(
        { error: 'Missing required fields: interviewId, triggerReason, recentTranscript' },
        { status: 400 }
      );
    }

    // Save transcript chunk to DB
    await db.insert(transcripts).values({
      interviewId,
      text: recentTranscript,
      speaker: 'candidate', // Default, can be improved with speaker detection
    });

    // Build prompt for Gemini
    const prompt = `
${INTERVIEW_CONTEXT}

## Candidato
${candidateInfo.name}${candidateInfo.position ? ` - ${candidateInfo.position}` : ''}${candidateInfo.experience ? ` (${candidateInfo.experience})` : ''}

## Estado de la Entrevista
- Duración: ${stats?.duration ? Math.floor(stats.duration / 60) + ' minutos' : 'N/A'}
- Red flags detectados: ${stats?.redFlagCount ?? 0}
- Green flags detectados: ${stats?.greenFlagCount ?? 0}
- Tema actual: ${stats?.currentTopic ?? 'N/A'}

## Razón del Análisis
${triggerReason}: ${triggerContext}

## Transcripción Reciente
${recentTranscript}

Analizá la transcripción y respondé en JSON.
`;

    // Call Gemini Flash via AI Gateway
    const aiResponse = await fetch(AI_GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AI_GATEWAY_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!aiResponse.ok) {
      console.error('AI Gateway error:', await aiResponse.text());
      return NextResponse.json(
        { error: 'AI analysis failed' },
        { status: 502 }
      );
    }

    const aiData = await aiResponse.json();
    const analysisText = aiData.choices?.[0]?.message?.content || '{}';
    
    let analysis;
    try {
      analysis = JSON.parse(analysisText);
    } catch {
      analysis = { hasSuggestion: false, note: analysisText };
    }

    // Save insights to DB
    const insightsToSave = [];

    if (analysis.suggestion) {
      insightsToSave.push({
        interviewId,
        type: 'suggestion',
        content: analysis.suggestion,
      });
    }

    if (analysis.redFlag) {
      insightsToSave.push({
        interviewId,
        type: 'red-flag',
        content: analysis.redFlag,
      });
    }

    if (analysis.greenFlag) {
      insightsToSave.push({
        interviewId,
        type: 'green-flag',
        content: analysis.greenFlag,
      });
    }

    if (analysis.note) {
      insightsToSave.push({
        interviewId,
        type: 'note',
        content: analysis.note,
      });
    }

    if (insightsToSave.length > 0) {
      await db.insert(aiInsights).values(insightsToSave);
    }

    return NextResponse.json({
      success: true,
      analysis,
      savedInsights: insightsToSave.length,
    });

  } catch (error) {
    console.error('Error in /api/analyze:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Health check
export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    endpoint: '/api/analyze',
    description: 'Tier 2 analysis endpoint for interview insights'
  });
}
