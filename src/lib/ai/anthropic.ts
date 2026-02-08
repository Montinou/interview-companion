/**
 * Lightweight Anthropic API client for Haiku + Sonnet.
 * No SDK dependency — direct HTTP calls.
 */

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const ANTHROPIC_BASE_URL = 'https://api.anthropic.com/v1';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AnthropicResponse {
  content: Array<{
    type: 'text' | 'thinking';
    text?: string;
    thinking?: string;
  }>;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

interface CallOptions {
  model: string;
  system: string;
  messages: Message[];
  maxTokens?: number;
  thinking?: {
    type: 'enabled';
    budget_tokens: number;
  };
}

export async function callAnthropic(options: CallOptions): Promise<{
  text: string;
  thinking: string | null;
  usage: { input: number; output: number };
}> {
  const { model, system, messages, maxTokens = 1024, thinking } = options;

  const body: Record<string, unknown> = {
    model,
    system,
    messages,
    max_tokens: maxTokens,
  };

  if (thinking) {
    body.thinking = thinking;
    // max_tokens is for output text only; thinking budget is separate
  }

  const response = await fetch(`${ANTHROPIC_BASE_URL}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error (${response.status}): ${error}`);
  }

  const data: AnthropicResponse = await response.json();

  let text = '';
  let thinkingText: string | null = null;

  for (const block of data.content) {
    if (block.type === 'thinking' && block.thinking) {
      thinkingText = block.thinking;
    } else if (block.type === 'text' && block.text) {
      text = block.text;
    }
  }

  return {
    text,
    thinking: thinkingText,
    usage: {
      input: data.usage.input_tokens,
      output: data.usage.output_tokens,
    },
  };
}

// Model constants
export const HAIKU = 'claude-3-5-haiku-latest';
export const SONNET = 'claude-sonnet-4-5-20250514';
