import { callOpenAI } from "./openaiClient.js";
import { buildReplaceMealPayload } from "./prompts.js";
import { normalizeMeal } from "../core/normalize.js";

export async function replaceMeal(input) {
  const payload = buildReplaceMealPayload(input);

  const parsed = await callOpenAI({
    action: "replace_meal",
    payload,
  });

  return normalizeMeal(parsed, payload.meal_id);
} catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Failed to replace meal');
}
