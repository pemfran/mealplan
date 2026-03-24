const CATEGORY_MAP = {
  'chicken breast': 'Protein',
  egg: 'Protein',
  salmon: 'Protein',
  shrimp: 'Protein',
  turkey: 'Protein',
  beef: 'Protein',
  greek_yogurt: 'Dairy',
  cottage_cheese: 'Dairy',
  milk: 'Dairy',
  cheese: 'Dairy',
  rice: 'Carbs',
  buckwheat: 'Carbs',
  bulgur: 'Carbs',
  pasta: 'Carbs',
  potato: 'Carbs',
  tomato: 'Vegetables',
  cucumber: 'Vegetables',
  carrot: 'Vegetables',
  zucchini: 'Vegetables',
  broccoli: 'Vegetables',
  banana: 'Fruit',
  apple: 'Fruit',
  berries: 'Fruit',
  olive_oil: 'Pantry',
  flour: 'Pantry',
  garlic: 'Pantry',
  onion: 'Pantry',
};

function categoryForName(name) {
  const key = name.replace(/\s+/g, '_');
  return CATEGORY_MAP[key] || 'Other';
}

export function buildShoppingList(plan, replacedMeals = {}) {
  if (!plan?.days?.length) return {};

  const aggregate = {};
  const finalMeals = [];

  for (const day of plan.days) {
    for (const baseMeal of day.meals) {
      const meal = replacedMeals[baseMeal.meal_id] || baseMeal;
      finalMeals.push(meal);
    }
  }

  for (const meal of finalMeals) {
    for (const ingredient of meal.ingredients) {

      const name = ingredient.name.trim().toLowerCase();
      const unit = (ingredient.unit || 'pcs').trim().toLowerCase();

      const key = `${name}__${unit}`;

      if (!aggregate[key]) {
        aggregate[key] = {
          name,
          unit,
          amount: 0,
          category: categoryForName(name),
        };
      }

      aggregate[key].amount += Number(ingredient.amount) || 0;
    }
  }

  const groups = {};

  for (const item of Object.values(aggregate)) {
    const category = item.category;

    if (!groups[category]) groups[category] = [];

    groups[category].push({
      ...item,
      amount: Math.round(item.amount * 10) / 10,
    });
  }

  for (const arr of Object.values(groups)) {
    arr.sort((a, b) => a.name.localeCompare(b.name));
  }

  return Object.fromEntries(
    Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  );
}
