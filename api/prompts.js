import { stringifyPretty } from '../utils/json.js';

export function buildSystemPrompt() {
  return [
    'You are a meal-planning engine.',
    'Return only valid JSON.',
    'Do not include markdown, explanations, headings, comments, code fences, or any text outside JSON.',
    'Generate practical family meals with realistic ingredients and realistic macro estimates.',
    'Use supermarket-friendly ingredients and home-cooking recipes.',
    'Breakfasts and dinners must be kid-friendly.',
    'Avoid repeating the same meal name within the same 7-day plan.',
    'Do not suggest breakfast-style meals for dinner.',
    'All ingredient amounts must be numeric.',
    'Allowed ingredient units only: g, ml, pcs.',
    'Macros must be per serving and numeric.',
    'Recipe must be an array of short steps.',
    'Use exactly the requested meal_id values. Never invent a different format.',
  ].join(' ');
}

export function buildMenuUserPrompt(params) {
  const mealIds = [];
  for (let day = 1; day <= 7; day += 1) {
    mealIds.push(`day${day}_breakfast`, `day${day}_lunch`, `day${day}_dinner`);
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
