import { callOpenAI } from "./openaiClient.js";
import { buildMenuPromptPayload } from "./prompts.js";
import { validateMenu } from "../core/validate.js";
import { normalizeMenu } from "../core/normalize.js";

export async function generateMenu(payload) {
  try {
    const response = await fetch('./api/generate-menu', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const text = await response.text();

    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      throw new Error('Invalid JSON response from server');
    }

    if (!response.ok) {
      throw new Error(data?.error || `HTTP ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('generateMenu failed:', error);
    throw error;
  }
}
