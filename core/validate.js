const MEAL_TYPES = new Set(['breakfast', 'lunch', 'dinner']);
const UNITS = new Set(['g', 'ml', 'pcs']);

function ensure(condition, message) {
  if (!condition) throw new Error(message);
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

export function validateMeal(meal, expectedMealId = null, expectedType = null) {
  ensure(meal && typeof meal === 'object', 'Meal must be an object');
  ensure(typeof meal.meal_id === 'string' && meal.meal_id.trim(), 'Meal must have meal_id');
  ensure(typeof meal.type === 'string' && MEAL_TYPES.has(meal.type), `Meal type must be one of: ${[...MEAL_TYPES].join(', ')}`);
  ensure(typeof meal.name === 'string' && meal.name.trim(), 'Meal must have a name');
  ensure(isFiniteNumber(meal.servings) && meal.servings > 0, 'Meal servings must be a positive number');
  ensure(typeof meal.kid_friendly === 'boolean', 'Meal must have kid_friendly boolean');
  ensure(isFiniteNumber(meal.prep_time_min) && meal.prep_time_min > 0, 'Meal must have prep_time_min');
  ensure(Array.isArray(meal.ingredients) && meal.ingredients.length > 0, 'Meal must have ingredients');
  ensure(Array.isArray(meal.recipe) && meal.recipe.length > 0, 'Meal must have recipe steps');
  ensure(meal.macros_per_serving && typeof meal.macros_per_serving === 'object', 'Meal must have macros_per_serving');

  const macros = meal.macros_per_serving;
  for (const key of ['calories', 'protein', 'fat', 'carbs']) {
    ensure(isFiniteNumber(macros[key]) && macros[key] >= 0, `Macro ${key} must be a non-negative number`);
  }

  meal.ingredients.forEach((item, idx) => {
    ensure(item && typeof item === 'object', `Ingredient ${idx + 1} must be an object`);
    ensure(typeof item.name === 'string' && item.name.trim(), `Ingredient ${idx + 1} must have a name`);
    ensure(isFiniteNumber(item.amount) && item.amount > 0, `Ingredient ${idx + 1} amount must be a positive number`);
    ensure(typeof item.unit === 'string' && UNITS.has(item.unit), `Ingredient ${idx + 1} unit must be one of: ${[...UNITS].join(', ')}`);
  });

  meal.recipe.forEach((step, idx) => {
    ensure(typeof step === 'string' && step.trim(), `Recipe step ${idx + 1} must be a non-empty string`);
  });

  if (expectedMealId) ensure(meal.meal_id === expectedMealId, `Meal must keep meal_id=${expectedMealId}`);
  if (expectedType) ensure(meal.type === expectedType, `Meal must keep type=${expectedType}`);
}

export function validatePlan(plan) {
  ensure(plan && typeof plan === 'object', 'Plan must be an object');
  ensure(Array.isArray(plan.days), 'Plan must have days array');
  ensure(plan.days.length === 7, 'Plan must contain exactly 7 days');

  const expectedIds = [];
  for (let day = 1; day <= 7; day += 1) {
    expectedIds.push(`day${day}_breakfast`, `day${day}_lunch`, `day${day}_dinner`);
  }
  const actualIds = [];

  plan.days.forEach((dayObj, index) => {
    const dayNum = index + 1;
    ensure(dayObj && typeof dayObj === 'object', `Day ${dayNum} must be an object`);
    ensure(dayObj.day === dayNum, `Day object must have day=${dayNum}`);
    ensure(Array.isArray(dayObj.meals), `Day ${dayNum} must have meals array`);
    ensure(dayObj.meals.length === 3, `Day ${dayNum} must have exactly 3 meals`);

    const types = new Set();
    dayObj.meals.forEach((meal) => {
      validateMeal(meal);
      types.add(meal.type);
      actualIds.push(meal.meal_id);
    });

    for (const requiredType of MEAL_TYPES) {
      ensure(types.has(requiredType), `Day ${dayNum} must contain ${requiredType}`);
    }
  });

  ensure(expectedIds.every((id) => actualIds.includes(id)), 'Plan meal_ids do not match required ids');
}
