export function buildShoppingList(input) {
  const days = Array.isArray(input)
    ? input
    : Array.isArray(input?.days)
      ? input.days
      : [];

  const totals = new Map();

  for (const day of days) {
    const meals = [
      day?.breakfast,
      day?.lunch,
      day?.dinner,
      day?.snack,
    ].filter(Boolean);

    for (const meal of meals) {
      const ingredients = Array.isArray(meal?.ingredients) ? meal.ingredients : [];

      for (const item of ingredients) {
        const name = String(item?.name || '').trim();
        const unit = String(item?.unit || 'g').trim();
        const amount = Number(item?.amount || 0);

        if (!name || !amount) continue;

        const key = `${name.toLowerCase()}__${unit}`;

        if (!totals.has(key)) {
          totals.set(key, { name, unit, amount: 0 });
        }

        totals.get(key).amount += amount;
      }
    }
  }

  return Array.from(totals.values())
    .sort((a, b) => a.name.localeCompare(b.name, 'uk'))
    .map((item) => ({
      ...item,
      amount: item.unit === 'pcs'
        ? Math.round(item.amount * 10) / 10
        : Math.round(item.amount),
    }));
}
