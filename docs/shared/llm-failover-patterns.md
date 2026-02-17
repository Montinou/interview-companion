# LLM Failover Patterns for Edge Functions

## Sequential Failover Chain Architecture

**Edge Functions with LLM failover** enable reliable AI responses within strict timeout limits (typically 60s). When Provider 1 fails or times out, the system automatically falls back to Provider 2, then Provider 3, forming a sequential chain. This pattern prevents single-point-of-failure from slow or rate-limited LLM providers. Each provider attempt is wrapped in try-catch, logging errors before continuing to the next. The chain continues until a provider succeeds or all options are exhausted. This architecture works for Supabase, Vercel, and Cloudflare Workers.

```typescript
for (const provider of this.providers) {
  try { return await provider.generate(prompt); }
  catch (err) { console.error(`${provider.name} failed`); }
}
```

**Summary:** Sequential failover chains ensure AI availability by cascading through multiple LLM providers on error or timeout.

## Optimal Provider Selection Strategy

**Model selection for edge environments** requires prioritizing latency, cost, and reliability. Use turbo/preview variants (kimi-k2-turbo-preview) designed for speed, achieving ~1.2s response times. Never use reasoning models (kimi-k2.5, o1) as they exceed 60s timeouts. Test latency with real prompts before production deployment. Free tiers (Cerebras, NVIDIA) should be exhausted before paid options. Large context windows (262K tokens) don't justify large prompts—keep inputs minimal. The ideal chain: fastest/cheapest first, reliable fallback second, nuclear option last.

**Summary:** Prioritize turbo models, avoid reasoning variants, test latency, and chain from cheapest to most expensive provider.

## Moonshot Kimi API Configuration

**Kimi API integration** requires correct endpoint selection and model variant understanding for low-latency AI responses. Use api.moonshot.ai/v1 (NOT api.moonshot.cn—different region) for global access. The kimi-k2-turbo-preview model delivers ~1.2s responses with 262K context window, ideal for edge functions. The kimi-k2.5 reasoning model requires temperature=1 and takes >60s, unsuitable for time-sensitive tasks. API format is OpenAI SDK compatible (chat completions endpoint). Authentication uses Bearer token in Authorization header.

```typescript
const response = await fetch('https://api.moonshot.ai/v1/chat/completions', {
  headers: { 'Authorization': `Bearer ${MOONSHOT_API_KEY}` }
});
```

**Summary:** Use api.moonshot.ai with kimi-k2-turbo-preview for fast edge function responses; avoid kimi-k2.5 for real-time tasks.

## Differential Analysis for Real-Time Processing

**Differential analysis pattern** dramatically reduces latency and cost by sending only incremental context instead of full conversation history. Send current chunk + last AI insight (~300 tokens total) rather than entire transcript. The AI retains sufficient context to detect patterns, contradictions, and sentiment shifts without processing thousands of tokens. This approach enables sub-2s analysis cycles for streaming applications. Works exceptionally well for interview analysis, chat moderation, and live transcription annotation. Reduces API costs by 10-50x compared to full-context approaches.

```typescript
const prompt = `Previous insight: ${lastInsight}\nNew chunk: ${currentChunk}\nAnalyze changes:`;
```

**Summary:** Send only new data + previous insight to LLM, reducing latency and cost by 10-50x for real-time analysis.

## Cost Optimization Strategies

**LLM cost optimization** in production systems requires strategic provider routing and credit management. Exhaust one-time free credits (Cerebras, NVIDIA) before monthly subscriptions. Kimi offers the best cost-per-token for recharge ($1-5 lasts months). Route non-urgent requests through OpenClaw gateway when Claude Max quota is available (zero marginal cost). Reserve expensive models (Claude, GPT-4) for post-processing, not real-time analysis. Free tiers are one-time, not monthly—use them first. Monitor usage to avoid surprise bills. Circuit breakers add complexity without benefit for MVP—sequential failover is sufficient.

**Summary:** Use free credits first, route through gateways, reserve expensive models for batch processing, skip circuit breakers for MVP.

## Anti-Patterns to Avoid

**Edge Function anti-patterns** include over-engineering reliability, misusing reasoning models, and inefficient context management. Circuit breakers add complexity without reliability gains—sequential failover suffices. Calling one Edge Function from another is unreliable due to internal routing. Sending full transcripts to real-time analysis causes timeouts—use differential approach. Using reasoning models (o1, kimi-k2.5) for time-sensitive tasks guarantees timeouts. Large context windows don't justify large prompts. Over-complicated retry logic introduces bugs. Synchronous chains are simpler and more debuggable than parallel + race conditions.

**Summary:** Avoid circuit breakers, Edge-to-Edge calls, full-context prompts, reasoning models for real-time, and over-engineered retry logic.

## FAQ

**Q: Should I use circuit breaker or sequential failover?**  
A: Sequential failover. Circuit breakers add complexity without reliability benefit for MVP. Simple is better.

**Q: Can I call one Edge Function from another?**  
A: No. Supabase/Vercel internal routing is unreliable. Call from client instead and orchestrate there.

**Q: Why not send the full transcript to the LLM?**  
A: Huge latency and cost. Differential analysis (new chunk + last insight) gives same quality at 10-50x lower cost.

**Q: Can I use reasoning models like kimi-k2.5 or o1 in edge functions?**  
A: No. They take >60s and will timeout. Use turbo/preview variants designed for speed.

**Q: Which Kimi endpoint should I use?**  
A: api.moonshot.ai (global). NOT api.moonshot.cn (China region). Use kimi-k2-turbo-preview model.

**Q: How do I optimize costs without sacrificing reliability?**  
A: Chain free tiers first (Cerebras, NVIDIA), then cheap paid (Kimi), then expensive (Claude) as nuclear option.
