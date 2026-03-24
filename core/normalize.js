const NAME_MAP = {
  eggs: 'egg',
  tomatoes: 'tomato',
  cherry_tomatoes: 'tomato',
  chicken_fillet: 'chicken breast',
  chicken_fillets: 'chicken breast',
  yoghurt: 'greek yogurt',
  yogurt: 'greek yogurt',
  greek_yoghurt: 'greek yogurt',
  гречка: 'buckwheat',
  рис: 'rice',
  куряче_філе: 'chicken breast',
  яйця: 'egg',
  помідори: 'tomato',
};

const UNIT_MAP = {
  gram: 'g',
  grams: 'g',
  g: 'g',
  ml: 'ml',
  milliliter: 'ml',
  milliliters: 'ml',
  piece: 'pcs',
  pieces: 'pcs',
  pcs: 'pcs',
  'pcs.': 'pcs',
};

function normalizeString(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[()]/g, '')
    .replace(/\s+/g, ' ');
}

export function normalizeIngredientName(name) {
  const key = normalizeString(name).replace(/\s+/g, '_');
  return NAME_MAP[key] || normalizeString(name);
}

export function normalizeUnit(unit) {
  const normalized = normalizeString(unit);
  return UNIT_MAP[normalized] || normalized;
}

export function normalizeMeal(meal, forcedMealId = null) {
  return {
    meal_id: forcedMealId || String(meal.meal_id).trim(),
    type: String(meal.type).trim().toLowerCase(),
    name: String(meal.name).trim(),
    servings: Number(meal.servings),
    kid_friendly: Boolean(meal.kid_friendly),
    prep_time_min: Math.round(Number(meal.prep_time_min)),
    ingredients: (meal.ingredients || []).map((item) => ({
      name: normalizeIngredientName(item.name),
      amount: roundAmount(Number(item.amount)),
      unit: normalizeUnit(item.unit),
    })),
    macros_per_serving: {
      calories: roundAmount(Number(meal.macros_per_serving?.calories || 0)),
      protein: roundAmount(Number(meal.macros_per_serving?.protein || 0)),
      fat: roundAmount(Number(meal.macros_per_serving?.fat || 0)),
      carbs: roundAmount(Number(meal.macros_per_serving?.carbs || 0)),
    },
    recipe: (meal.recipe || []).map((step) => String(step).trim()).filter(Boolean),
  };
}

export function normalizePlan(plan) {
  return {
    days: plan.days.map((dayObj, idx) => ({
      day: idx + 1,
      meals: dayObj.meals.map((meal) => normalizeMeal(meal)),
    })),
  };
}

function roundAmount(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 10) / 10;
}
