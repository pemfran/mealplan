import { CONFIG } from '../config.js';

function withTimeout(ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);

  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timer),
  };
}

export async function callOpenAI({ action, payload }) {
  if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY) {
    throw new Error('Supabase config is missing in config.js');
  }

  const timeout = withTimeout(CONFIG.REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${CONFIG.SUPABASE_URL}/functions/v1/ai-menu`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: CONFIG.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
      },
      signal: timeout.signal,
      body: JSON.stringify({
        action,
        payload,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(
        data?.error
          ? `Edge Function failed: ${JSON.stringify(data.error)}`
          : `Edge Function failed with status ${res.status}`
      );
    }

    if (!data?.content) {
      throw new Error('Edge Function returned empty content');
    }

    return JSON.parse(data.content);
  } finally {
    timeout.cleanup();
  }
}
