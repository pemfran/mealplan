import { callOpenAI } from './openaiClient.js';
import { buildMenuUserPrompt, buildSystemPrompt } from './prompts.js';
import { validatePlan } from './validate.js';
import { normalizePlan } from './normalize.js';

export async function generateMenuPlan(params) {
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildMenuUserPrompt(params);

  let lastError = null;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const parsed = await callOpenAI({ systemPrompt, userPrompt });
      validatePlan(parsed);
      return normalizePlan(parsed);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Failed to generate menu');
}
