import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

    const { candidateName, role, language } = await req.json()

    if (!candidateName) {
      return new Response(JSON.stringify({ error: "Missing candidateName" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    // 1. Find or create candidate
    let { data: candidate } = await supabase
      .from("candidates")
      .select("id")
      .ilike("name", candidateName)
      .limit(1)
      .single()

    if (!candidate) {
      const { data: newCandidate, error } = await supabase
        .from("candidates")
        .insert({ name: candidateName })
        .select("id")
        .single()

      if (error) throw new Error(`Failed to create candidate: ${error.message}`)
      candidate = newCandidate
    }

    // 2. Find default user (interviewer) — for MVP, use first user
    const { data: user } = await supabase
      .from("users")
      .select("id")
      .limit(1)
      .single()

    if (!user) throw new Error("No user found. Create a user first.")

    // 3. Find or create job position
    const positionTitle = role || "QA Automation Engineer"
    let { data: position } = await supabase
      .from("job_positions")
      .select("id")
      .ilike("title", positionTitle)
      .limit(1)
      .single()

    if (!position) {
      const { data: newPos } = await supabase
        .from("job_positions")
        .insert({ title: positionTitle, department: "Engineering" })
        .select("id")
        .single()
      position = newPos
    }

    // 4. Create interview
    const { data: interview, error: intErr } = await supabase
      .from("interviews")
      .insert({
        candidate_id: candidate!.id,
        interviewer_id: user.id,
        job_position_id: position?.id || null,
        status: "live",
        language: language || "en",
        started_at: new Date().toISOString(),
      })
      .select("id, status, started_at")
      .single()

    if (intErr) throw new Error(`Failed to create interview: ${intErr.message}`)

    return new Response(
      JSON.stringify({ ok: true, interview }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("create-interview error:", error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  }
})
