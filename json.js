export function safeJsonParse(text) {
  if (typeof text !== 'string') throw new Error('AI response is not a string');

  const trimmed = text.trim();
  if (!trimmed) throw new Error('AI response is empty');

  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error('Invalid JSON from AI');
  }
}

export function stringifyPretty(value) {
  return JSON.stringify(value, null, 2);
}
