import { CONFIG } from '../config.js';
import { safeJsonParse } from '../utils/json.js';

function isConfigured() {
  return Boolean(CONFIG.OPENAI_API_KEY && !CONFIG.OPENAI_API_KEY.includes('PASTE_'));
}

function withTimeout(promise, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);

  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timer),
  };
}

export async function callOpenAI({ systemPrompt, userPrompt }) {
  if (!isConfigured()) {
    throw new Error('OpenAI API key is missing in config.js');
  }

  const timeout = withTimeout(null, CONFIG.REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(CONFIG.OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CONFIG.OPENAI_API_KEY}`,
      },
      signal: timeout.signal,
      body: JSON.stringify({
        model: CONFIG.OPENAI_MODEL,
        temperature: CONFIG.OPENAI_TEMPERATURE,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`OpenAI request failed: ${res.status} ${text}`);
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error('OpenAI returned empty content');
    return safeJsonParse(content);
  } finally {
    timeout.cleanup();
  }
}
