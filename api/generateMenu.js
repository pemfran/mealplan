const SUPABASE_URL = 'https://rkacfuljpkjtehjkmqyc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJrYWNmdWxqcGtqdGVoamttcXljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyNDg4OTIsImV4cCI6MjA4OTgyNDg5Mn0.ydkfhtpCdidcIIc5Qaq9ZIuYaOulOEL9AjwLSSOy8Kc';

function parseJsonSafe(text) {
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {
      error: 'Edge Function returned invalid JSON',
      raw: text,
    };
  }
}

export async function generateMenu(payload) {
  let response;

  try {
    response = await fetch(`${SUPABASE_URL}/functions/v1/generate-menu`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    throw new Error(`Network error while calling Edge Function: ${error.message}`);
  }

  const text = await response.text();
  const data = parseJsonSafe(text);

  if (!response.ok) {
    throw new Error(data?.error || `HTTP ${response.status}`);
  }

  if (!data || !Array.isArray(data.days) || data.days.length !== 7) {
    throw new Error('Invalid menu structure returned from Edge Function');
  }

  return data;
}
