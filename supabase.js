import { CONFIG } from './config.js';

function hasSupabaseConfig() {
  return Boolean(CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY && !CONFIG.SUPABASE_URL.includes('PASTE_') && !CONFIG.SUPABASE_ANON_KEY.includes('PASTE_'));
}

function getHeaders() {
  return {
    apikey: CONFIG.SUPABASE_ANON_KEY,
    Authorization: `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };
}

export async function upsertReplacedMeal(mealId, meal) {
  if (!hasSupabaseConfig()) return null;

  const url = `${CONFIG.SUPABASE_URL}/rest/v1/${CONFIG.SUPABASE_REPLACED_MEALS_TABLE}?on_conflict=meal_id`;
  const body = [
    {
      meal_id: mealId,
      meal_json: meal,
      updated_at: new Date().toISOString(),
    },
  ];

  const res = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase upsert failed: ${res.status} ${text}`);
  }

  return res.json();
}

export async function fetchReplacedMeals() {
  if (!hasSupabaseConfig()) return {};

  const url = `${CONFIG.SUPABASE_URL}/rest/v1/${CONFIG.SUPABASE_REPLACED_MEALS_TABLE}?select=meal_id,meal_json`;
  const res = await fetch(url, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase fetch failed: ${res.status} ${text}`);
  }

  const rows = await res.json();
  const map = {};
  for (const row of rows) {
    if (row?.meal_id && row?.meal_json) map[row.meal_id] = row.meal_json;
  }
  return map;
}
