import { CONFIG } from '../config.js';

export async function replaceMealWithAI(payload) {
  try {
    const res = await fetch(CONFIG.REPLACE_MEAL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: CONFIG.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data?.error || 'Failed to replace meal.');
    }

    return data;
  } catch (error) {
    console.error('replaceMealWithAI error:', error);
    throw error;
  }
}
