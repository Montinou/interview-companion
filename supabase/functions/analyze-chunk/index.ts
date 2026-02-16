import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

// AI Provider abstraction
interface AIProvider {
  name: string
  analyze(prompt: string, maxTokens?: number): Promise<string>
}

class KimiProvider implements AIProvider {
  name = "kimi"
  private apiKey: string
  private model: string

  constructor(apiKey: string, model = "kimi-k2-turbo-preview") {
    this.apiKey = apiKey
    this.model = model
  }

  async analyze(prompt: string, maxTokens = 1024): Promise<string> {
    const response = await fetch("https://api.moonshot.ai/v1/chat/completions", {
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

  async analyze(prompt: string, maxTokens = 1024): Promise<string> {
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

// AI Manager with failover
class AIManager {
  private providers: AIProvider[]

  constructor(providers: AIProvider[]) {
    this.providers = providers
  }

  async analyze(prompt: string, maxTokens = 1024): Promise<{ result: string; provider: string }> {
    for (const provider of this.providers) {
      try {
        const result = await provider.analyze(prompt, maxTokens)
        return { result, provider: provider.name }
      } catch (e) {
        console.warn(`${provider.name} failed: ${e.message}, trying next...`)
      }
    }
    throw new Error("All AI providers exhausted")
  }
}

// Build AI manager from env
function buildAIManager(): AIManager {
  const providers: AIProvider[] = []

  const kimiKey = Deno.env.get("MOONSHOT_API_KEY")
  if (kimiKey) providers.push(new KimiProvider(kimiKey))

  const cerebrasKey = Deno.env.get("CEREBRAS_API_KEY")
  if (cerebrasKey) providers.push(new CerebrasProvider(cerebrasKey))

  if (providers.length === 0) {
    throw new Error("No AI providers configured. Set MOONSHOT_API_KEY or CEREBRAS_API_KEY.")
  }

  return new AIManager(providers)
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    // Auth: check internal API key
    const internalKey = req.headers.get("x-internal-key")
    const expectedKey = Deno.env.get("INTERNAL_API_KEY")
    if (!internalKey || internalKey !== expectedKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const { interviewId, chunk } = await req.json()

    if (!interviewId || !chunk) {
      return new Response(JSON.stringify({ error: "Missing interviewId or chunk" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Init Supabase client (service role — bypasses RLS)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    // 1. Get interview metadata
    const { data: interview, error: intErr } = await supabase
      .from("interviews")
      .select("id, candidate_id, job_position_id, roles, roles_assigned, status")
      .eq("id", interviewId)
      .single()

    if (intErr || !interview) {
      return new Response(JSON.stringify({ error: "Interview not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // 2. Get candidate name
    const { data: candidate } = await supabase
      .from("candidates")
      .select("name")
      .eq("id", interview.candidate_id)
      .single()

    // 3. Get job position
    const { data: jobPosition } = interview.job_position_id
      ? await supabase
          .from("job_positions")
          .select("title")
          .eq("id", interview.job_position_id)
          .single()
      : { data: null }

    // 4. Save transcript chunk
    const speakerRole = interview.roles && interview.roles_assigned
      ? (chunk.speaker === interview.roles.host ? "host" : "guest")
      : null

    await supabase.from("transcripts").insert({
      interview_id: interviewId,
      text: chunk.text,
      speaker: chunk.speaker || "unknown",
      speaker_role: speakerRole,
      confidence: chunk.confidence ? Math.round(chunk.confidence * 100) : null,
      timestamp: chunk.timestamp || new Date().toISOString(),
    })

    // 5. Get last insight (previous analysis state) for differential analysis
    const { data: lastInsight } = await supabase
      .from("ai_insights")
      .select("*")
      .eq("interview_id", interviewId)
      .order("timestamp", { ascending: false })
      .limit(1)
      .single()

    // 6. Build context for differential analysis
    const previousState = lastInsight
      ? `Previous analysis state:
Sentiment: ${lastInsight.sentiment || "unknown"}
Red flags so far: ${JSON.stringify(lastInsight.content && lastInsight.type === "red-flag" ? [lastInsight.content] : [])}
Topics covered: ${lastInsight.topic || "none"}
Running scores: ${JSON.stringify(lastInsight.score || {})}
Last summary: ${lastInsight.content || "none"}`
      : "This is the beginning of the interview. No previous analysis."

    const speakerLabel = speakerRole === "host" ? "Interviewer" : speakerRole === "guest" ? "Candidate" : chunk.speaker || "Unknown"

    // 7. Call AI (differential analysis: chunk + previous state)
    const ai = buildAIManager()

    const prompt = `You are a technical interview analysis copilot. Analyze this new transcript chunk in context of the interview state.

Candidate: ${candidate?.name || "Unknown"} — Role: ${jobPosition?.title || "Unknown"}

${previousState}

New transcript chunk:
[${speakerLabel}] ${chunk.text}

Analyze ONLY what's new in this chunk. Respond in JSON:
{
  "sentiment": "positive|negative|neutral|evasive",
  "type": "red-flag|green-flag|suggestion|note|contradiction",
  "severity": "critical|warning|info|success",
  "content": "brief description of what you detected",
  "suggestion": "follow-up question if relevant, or null",
  "topic": "topic category being discussed",
  "evidence": "exact quote from the chunk that supports your analysis",
  "response_quality": 1-10,
  "score": {"technical": 1-10, "communication": 1-10, "experience": 1-10}
}

Rules:
- Be evidence-based. Quote the transcript.
- If nothing notable happened in this chunk, set type to "note" and severity to "info".
- Don't repeat previous flags. Only flag NEW observations.
- Score should reflect cumulative assessment, not just this chunk.
- JSON only, no markdown.`

    const { result: aiResult, provider: usedProvider } = await ai.analyze(prompt)

    // 8. Parse AI response
    let analysis: Record<string, unknown>
    try {
      // Strip markdown code fences if present
      const cleaned = aiResult.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
      analysis = JSON.parse(cleaned)
    } catch {
      // If AI returns non-JSON, wrap it
      analysis = {
        type: "note",
        severity: "info",
        content: aiResult,
        sentiment: "neutral",
        topic: "unparseable",
        score: {},
      }
    }

    // 9. Save insight (triggers Supabase Realtime → dashboard)
    const { data: insight, error: insightErr } = await supabase
      .from("ai_insights")
      .insert({
        interview_id: interviewId,
        type: analysis.type || "note",
        severity: analysis.severity || "info",
        content: analysis.content || "",
        suggestion: analysis.suggestion || null,
        topic: analysis.topic || null,
        evidence: analysis.evidence || null,
        response_quality: analysis.response_quality || null,
        sentiment: analysis.sentiment || null,
        score: analysis.score || null,
      })
      .select()
      .single()

    if (insightErr) {
      console.error("Failed to save insight:", insightErr)
    }

    // 10. Update interview AI provider if not set
    if (!interview.ai_provider) {
      await supabase
        .from("interviews")
        .update({ ai_provider: usedProvider })
        .eq("id", interviewId)
    }

    // 11. Role detection (first few chunks — if roles not assigned yet)
    if (!interview.roles_assigned) {
      const { count } = await supabase
        .from("transcripts")
        .select("*", { count: "exact", head: true })
        .eq("interview_id", interviewId)

      // After 5+ chunks, try to detect roles
      if ((count || 0) >= 5) {
        const { data: recentTranscripts } = await supabase
          .from("transcripts")
          .select("speaker, text")
          .eq("interview_id", interviewId)
          .order("timestamp", { ascending: true })
          .limit(10)

        if (recentTranscripts && recentTranscripts.length > 0) {
          const rolePrompt = `These are the first minutes of a technical interview.
Identify who is the interviewer (asks questions) and who is the candidate (answers).

${recentTranscripts.map((t: { speaker: string; text: string }) => `[${t.speaker}] ${t.text}`).join("\n")}

Respond JSON only: {"host": "speaker_X", "guest": "speaker_Y"}`

          try {
            const { result: roleResult } = await ai.analyze(rolePrompt, 100)
            const cleaned = roleResult.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
            const roles = JSON.parse(cleaned)

            if (roles.host && roles.guest) {
              await supabase
                .from("interviews")
                .update({ roles, roles_assigned: true })
                .eq("id", interviewId)

              // Backfill speaker_role on existing transcripts
              await supabase
                .from("transcripts")
                .update({ speaker_role: "host" })
                .eq("interview_id", interviewId)
                .eq("speaker", roles.host)

              await supabase
                .from("transcripts")
                .update({ speaker_role: "guest" })
                .eq("interview_id", interviewId)
                .eq("speaker", roles.guest)
            }
          } catch (e) {
            console.warn("Role detection failed:", e.message)
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        insight,
        provider: usedProvider,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("analyze-chunk error:", error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  }
})
