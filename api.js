import { LS_KEY } from './data.js';

export const SB_URL = 'https://rkacfuljpkjtehjkmqyc.supabase.co';
export const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJrYWNmdWxqcGtqdGVoamttcXljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyNDg4OTIsImV4cCI6MjA4OTgyNDg5Mn0.ydkfhtpCdidcIIc5Qaq9ZIuYaOulOEL9AjwLSSOy8Kc';

export const SB_H = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=minimal',
};

export const PROXY = `${SB_URL}/functions/v1/claude-proxy`;

export async function callClaude(prompt, maxTokens = 2800) {
  const r = await fetch(PROXY, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  let data;
  try {
    data = await r.json();
  } catch {
    throw new Error(`Proxy повернув не JSON. HTTP ${r.status}`);
  }

  if (!r.ok) {
    console.error('Claude proxy error:', data);
    throw new Error(data?.error?.message || data?.message || `HTTP ${r.status}`);
  }

  const text =
    data?.content?.[0]?.text ||
    data?.text ||
    data?.data?.content?.[0]?.text ||
    data?.result?.content?.[0]?.text ||
    data?.response ||
    null;

  if (!text || typeof text !== 'string') {
    console.error('Unexpected proxy response:', data);
    throw new Error('Проксі не повернув текст відповіді');
  }

  return text.trim();
}

export async function withRetry(fn, attempts = 2) {
  let lastError;

  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, 700));
      }
    }
  }

  throw lastError;
}

export async function sbGet(table, query = '') {
  const r = await fetch(`${SB_URL}/rest/v1/${table}?${query}`, {
    headers: { ...SB_H, Prefer: 'return=representation' },
  });

  if (!r.ok) {
    throw new Error(`GET ${table}: ${r.status}`);
  }

  return r.json();
}

export async function sbDelete(table, query = '') {
  const r = await fetch(`${SB_URL}/rest/v1/${table}?${query}`, {
    method: 'DELETE',
    headers: SB_H,
  });

  if (!r.ok) {
    throw new Error(`DELETE ${table}: ${r.status}`);
  }
}

export async function upsertReplacedMeal(mealId, mealData) {
  const res = await fetch(`${SB_URL}/rest/v1/replaced_meals?on_conflict=meal_id`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify([
      {
        meal_id: mealId,
        meal_data: mealData,
      },
    ]),
  });

  const text = await res.text();

  if (!res.ok) {
    console.error('UPSERT replaced_meals failed:', res.status, text);
    throw new Error(text || `UPSERT failed: ${res.status}`);
  }

  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed[0] : parsed;
  } catch {
    return text;
  }
}

export async function loadReplacedMeals() {
  const res = await fetch(`${SB_URL}/rest/v1/replaced_meals?select=*`, {
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
    },
  });

  const text = await res.text();

  if (!res.ok) {
    console.error('LOAD ERROR:', res.status, text);
    return {};
  }

  const rows = JSON.parse(text);
  const map = {};

  rows.forEach((row) => {
    if (row?.meal_id) {
      map[row.meal_id] = row.meal_data;
    }
  });

  return map;
}

export async function clearReplacedMeals() {
  const res = await fetch(`${SB_URL}/rest/v1/replaced_meals?id=not.is.null`, {
    method: 'DELETE',
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
    },
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    console.error('CLEAR ERROR', res.status, txt);
  }
}

export async function loadDislikes() {
  try {
    const d = await sbGet('dislikes', 'select=who,meal_name,meal_type&order=created_at.desc');
    return d.map((r) => ({
      who: r.who,
      name: r.meal_name,
      type: r.meal_type,
    }));
  } catch (e) {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY) || '[]');
    } catch {
      return [];
    }
  }
}

export async function addDislike(name, type, who) {
  try {
    const ex = await sbGet(
      'dislikes',
      `select=id&who=eq.${encodeURIComponent(who)}&meal_name=eq.${encodeURIComponent(name)}&limit=1`
    );

    if (!ex.length) {
      const r = await fetch(`${SB_URL}/rest/v1/dislikes`, {
        method: 'POST',
        headers: { ...SB_H, Prefer: 'return=representation' },
        body: JSON.stringify({
          who,
          meal_name: name,
          meal_type: type,
        }),
      });

      if (!r.ok) {
        throw new Error(`INSERT dislikes failed: ${r.status}`);
      }
    }
  } catch (e) {
    try {
      const l = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
      if (!l.some((d) => d.name === name && d.who === who)) {
        l.push({ name, type, who });
        localStorage.setItem(LS_KEY, JSON.stringify(l));
      }
    } catch {}
  }

  return loadDislikes();
}

export async function clearDislikesData() {
  try {
    await sbDelete('dislikes', 'id=neq.00000000-0000-0000-0000-000000000000');
  } catch {
    localStorage.removeItem(LS_KEY);
  }
}