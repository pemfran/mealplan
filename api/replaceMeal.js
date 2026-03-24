import { callOpenAI } from "./openaiClient.js"
import { replacePrompt } from "./prompts.js"
import { normalizeMeal } from "../normalize.js"

export async function replaceMealWithAI({ mealId, mealType, dayIndex, params, existingDayMeals, allMealNames }) {
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildReplaceMealUserPrompt({
    mealId,
    mealType,
    dayIndex,
    params,
    existingDayMeals,
    allMealNames,
  });

  let lastError = null;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const parsed = await callOpenAI({ systemPrompt, userPrompt });
      validateMeal(parsed, mealId, mealType);
      return normalizeMeal(parsed, mealId);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Failed to replace meal');
}
