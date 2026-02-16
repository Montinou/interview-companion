import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

// AI Provider (same as analyze-chunk — shared via import map in production)
interface AIProvider {
  name: string
  analyze(prompt: string, maxTokens?: number): Promise<string>
}

class KimiProvider implements AIProvider {
  name = "kimi"
  private apiKey: string
  private model: string

  constructor(apiKey: string, model = "kimi-k2.5") {
    this.apiKey = apiKey
    this.model = model
  }

  async analyze(prompt: string, maxTokens = 4096): Promise<string> {
    const response = await fetch("https://api.moonshot.cn/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: maxTokens,
        temperature: 0.1,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Kimi API error ${response.status}: ${err}`)
    }

    const data = await response.json()
    return data.choices[0].message.content
  }
}

class CerebrasProvider implements AIProvider {
  name = "cerebras"
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async analyze(prompt: string, maxTokens = 4096): Promise<string> {
    const response = await fetch("https://api.cerebras.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b",
        messages: [{ role: "user", content: prompt }],
        max_tokens: maxTokens,
        temperature: 0.1,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Cerebras API error ${response.status}: ${err}`)
    }

    const data = await response.json()
    return data.choices[0].message.content
  }
}

function getAIProvider(): AIProvider {
  const kimiKey = Deno.env.get("KIMI_API_KEY")
  if (kimiKey) return new KimiProvider(kimiKey)

  const cerebrasKey = Deno.env.get("CEREBRAS_API_KEY")
  if (cerebrasKey) return new CerebrasProvider(cerebrasKey)

  throw new Error("No AI provider configured")
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    // Auth
    const internalKey = req.headers.get("x-internal-key")
    const expectedKey = Deno.env.get("INTERNAL_API_KEY")
    if (!internalKey || internalKey !== expectedKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const { interviewId } = await req.json()

    if (!interviewId) {
      return new Response(JSON.stringify({ error: "Missing interviewId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    // 1. Get interview + candidate + job position
    const { data: interview } = await supabase
      .from("interviews")
      .select("*, candidates(*), job_positions(*)")
      .eq("id", interviewId)
      .single()

    if (!interview) {
      return new Response(JSON.stringify({ error: "Interview not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // 2. Get full transcript (ordered by timestamp)
    const { data: transcriptRows } = await supabase
      .from("transcripts")
      .select("speaker, speaker_role, text, timestamp")
      .eq("interview_id", interviewId)
      .order("timestamp", { ascending: true })

    if (!transcriptRows || transcriptRows.length === 0) {
      return new Response(JSON.stringify({ error: "No transcript data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // 3. Get all insights accumulated during the interview
    const { data: insights } = await supabase
      .from("ai_insights")
      .select("type, content, evidence, sentiment, score, topic")
      .eq("interview_id", interviewId)
      .order("timestamp", { ascending: true })

    // 4. Build full transcript text
    const fullTranscript = transcriptRows
      .map((t: { speaker_role: string | null; speaker: string; text: string }) => {
        const label = t.speaker_role === "host" ? "Interviewer"
          : t.speaker_role === "guest" ? "Candidate"
          : t.speaker || "Unknown"
        return `[${label}] ${t.text}`
      })
      .join("\n")

    // 5. Summarize insights
    const redFlags = (insights || []).filter((i: { type: string }) => i.type === "red-flag")
    const greenFlags = (insights || []).filter((i: { type: string }) => i.type === "green-flag")
    const contradictions = (insights || []).filter((i: { type: string }) => i.type === "contradiction")

    const candidateName = interview.candidates?.name || "Unknown"
    const role = interview.job_positions?.title || "Unknown"

    // 6. Generate scorecard with AI (uses full transcript — this is the ONE time we send everything)
    const ai = getAIProvider()

    const prompt = `You are generating a final scorecard for a technical interview.

Candidate: ${candidateName}
Role: ${role}
Duration: ${transcriptRows.length} transcript segments

Red flags detected during interview (${redFlags.length}):
${redFlags.map((f: { content: string; evidence: string }) => `- ${f.content} (evidence: "${f.evidence || "n/a"}")`).join("\n") || "None"}

Green flags detected during interview (${greenFlags.length}):
${greenFlags.map((f: { content: string; evidence: string }) => `- ${f.content} (evidence: "${f.evidence || "n/a"}")`).join("\n") || "None"}

Contradictions detected (${contradictions.length}):
${contradictions.map((c: { content: string }) => `- ${c.content}`).join("\n") || "None"}

Full transcript:
${fullTranscript}

Generate a comprehensive scorecard. Respond in JSON:
{
  "overall_score": 1-10,
  "recommendation": "hire|no_hire|maybe",
  "scores": {
    "attitude": 1-10,
    "communication": 1-10,
    "technical": 1-10,
    "strategic": 1-10,
    "leadership": 1-10,
    "english": 1-10
  },
  "strengths": ["strength with evidence quote", ...],
  "weaknesses": ["weakness with evidence quote", ...],
  "summary": "3-4 sentence executive summary",
  "notes": "additional observations for the hiring manager"
}

Rules:
- Base ALL scores on evidence from the transcript
- Every strength/weakness MUST include a quote from the transcript
- Be fair: distinguish between "doesn't know" and "didn't express well"
- Don't penalize for nervousness or accent
- The recommendation is a suggestion, not a decision
- JSON only, no markdown.`

    const result = await ai.analyze(prompt, 4096)

    // 7. Parse scorecard
    let scorecard: Record<string, unknown>
    try {
      const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
      scorecard = JSON.parse(cleaned)
    } catch {
      return new Response(JSON.stringify({ error: "Failed to parse AI scorecard", raw: result }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const scores = scorecard.scores as Record<string, number> || {}

    // 8. Upsert scorecard
    const existing = await supabase
      .from("scorecards")
      .select("id")
      .eq("interview_id", interviewId)
      .single()

    const scorecardData = {
      interview_id: interviewId,
      attitude: scores.attitude || null,
      communication: scores.communication || null,
      technical: scores.technical || null,
      strategic: scores.strategic || null,
      leadership: scores.leadership || null,
      english: scores.english || null,
      overall_score: scorecard.overall_score || null,
      recommendation: `${scorecard.recommendation || "maybe"}: ${scorecard.notes || ""}`,
      strengths: scorecard.strengths || [],
      weaknesses: scorecard.weaknesses || [],
      summary: scorecard.summary || "",
      notes: scorecard.notes || "",
      updated_at: new Date().toISOString(),
    }

    let savedScorecard
    if (existing.data) {
      const { data } = await supabase
        .from("scorecards")
        .update(scorecardData)
        .eq("interview_id", interviewId)
        .select()
        .single()
      savedScorecard = data
    } else {
      const { data } = await supabase
        .from("scorecards")
        .insert(scorecardData)
        .select()
        .single()
      savedScorecard = data
    }

    // 9. Mark interview as completed
    await supabase
      .from("interviews")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", interviewId)

    return new Response(
      JSON.stringify({ ok: true, scorecard: savedScorecard }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("generate-scorecard error:", error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  }
})
