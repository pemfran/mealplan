import { callOpenAI } from "./openaiClient.js";
import { buildMenuPromptPayload } from "./prompts.js";
import { validateMenu } from "../core/validate.js";
import { normalizeMenu } from "../core/normalize.js";

export async function generateMenu(input) {
  const payload = buildMenuPromptPayload(input);
  const parsed = await callOpenAI({
    action: "generate_menu",
    payload,
  });

  validateMenu(parsed);
  return normalizeMenu(parsed);
} catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Failed to generate menu');
}
