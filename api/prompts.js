import { stringifyPretty } from '../utils/json.js';

export function buildMenuPromptPayload(input) {
  return {
    days: 7,
    adults: input.adults,
    children: input.children,
    calorieTarget: input.calorieTarget,
    proteinTarget: input.proteinTarget,
    constraints: input.constraints,
    preferences: input.preferences,
  };
}

export function buildReplaceMealPayload(input) {
  return {
    meal_id: input.meal_id,
    type: input.type,
    day: input.day,
    currentMealName: input.currentMealName,
    constraints: input.constraints,
    existingDayMeals: input.existingDayMeals,
  };
}

  const schema = {
    days: [
      {
        day: 1,
        meals: [
          {
            meal_id: 'day1_breakfast',
            type: 'breakfast',
            name: 'Meal name',
            servings: 4,
            kid_friendly: true,
            prep_time_min: 20,
            ingredients: [
              { name: 'egg', amount: 2, unit: 'pcs' },
              { name: 'greek yogurt', amount: 250, unit: 'g' },
            ],
            macros_per_serving: {
              calories: 380,
              protein: 22,
              fat: 12,
              carbs: 40,
            },
            recipe: ['Step 1', 'Step 2'],
          },
        ],
      },
    ],
  };

  const payload = {
    request: 'Generate a full 7-day meal plan',
    required_meal_ids_in_order: mealIds,
    rules: {
      breakfasts_and_dinners_must_be_kid_friendly: true,
      total_days: 7,
      meals_per_day: ['breakfast', 'lunch', 'dinner'],
      weekend_extra_lunch: false,
      allowed_units: ['g', 'ml', 'pcs'],
      avoid_same_meal_name_twice_per_week: true,
      keep_recipes_practical: true,
      use_supermarket_friendly_ingredients: true,
    },
    user_params: params,
    output_schema_example: schema,
  };

  return stringifyPretty(payload);
}

export function buildReplaceMealUserPrompt({ mealId, mealType, dayIndex, params, existingDayMeals, allMealNames }) {
  const schema = {
    meal_id: mealId,
    type: mealType,
    name: 'Replacement meal name',
    servings: 4,
    kid_friendly: mealType !== 'lunch',
    prep_time_min: 25,
    ingredients: [
      { name: 'chicken breast', amount: 500, unit: 'g' },
      { name: 'rice', amount: 200, unit: 'g' },
    ],
    macros_per_serving: {
      calories: 450,
      protein: 32,
      fat: 14,
      carbs: 42,
    },
    recipe: ['Step 1', 'Step 2'],
  };

  const payload = {
    request: 'Generate one replacement meal',
    rules: {
      replacement_only: true,
      return_single_json_object: true,
      must_keep_same_meal_id: mealId,
      must_keep_same_type: mealType,
      avoid_repeating_existing_meal_names: allMealNames,
      breakfasts_and_dinners_must_be_kid_friendly: true,
      allowed_units: ['g', 'ml', 'pcs'],
      practical_home_cooking_only: true,
    },
    day_context: {
      day: dayIndex,
      meals_for_same_day: existingDayMeals,
    },
    user_params: params,
    output_schema_example: schema,
  };

  return stringifyPretty(payload);
}
