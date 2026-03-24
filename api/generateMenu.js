import { CONFIG } from '../config.js';

export async function generateMenuPlan(payload) {
  const res = await fetch(`${CONFIG.SUPABASE_URL}/functions/v1/generate-menu`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: CONFIG.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  let data;
  try {
    data = await res.json();
  } catch {
    const text = await res.text();
    throw new Error(`Function failed: ${res.status} ${text}`);
  }

  if (!res.ok) {
    throw new Error(data?.error || `Function failed with status ${res.status}`);
  }

  return data;
}
