import { generateMenuPlan } from './api/generateMenu.js';
import { replaceMealWithAI } from './api/replaceMeal.js';
import { buildShoppingList } from './shopping/buildShoppingList.js';
import { AppState, clearReplacedMeals, loadLocalReplacedMeals, loadPlan, saveLocalReplacedMeals, savePlan } from './state.js';
import { fetchReplacedMeals, upsertReplacedMeal } from './supabase.js';

const els = {
  adultsInput: document.getElementById('adultsInput'),
  childrenInput: document.getElementById('childrenInput'),
  caloriesAdult1Input: document.getElementById('caloriesAdult1Input'),
  caloriesAdult2Input: document.getElementById('caloriesAdult2Input'),
  proteinAdult1Input: document.getElementById('proteinAdult1Input'),
  proteinAdult2Input: document.getElementById('proteinAdult2Input'),
  dislikesInput: document.getElementById('dislikesInput'),
  carbsInput: document.getElementById('carbsInput'),
  notesInput: document.getElementById('notesInput'),
  generateBtn: document.getElementById('generateBtn'),
  resetBtn: document.getElementById('resetBtn'),
  status: document.getElementById('status'),
  daysRoot: document.getElementById('daysRoot'),
  shoppingRoot: document.getElementById('shoppingRoot'),
};

function getParamsFromForm() {
  return {
    days: 7,
    people: {
      adults: Number(els.adultsInput.value || 2),
      children: Number(els.childrenInput.value || 0),
    },
    targets: {
      adult1: {
        calories: Number(els.caloriesAdult1Input.value || 1900),
        protein: Number(els.proteinAdult1Input.value || 100),
      },
      adult2: {
        calories: Number(els.caloriesAdult2Input.value || 2700),
        protein: Number(els.proteinAdult2Input.value || 190),
      },
    },
    constraints: {
      dislikes: splitCsv(els.dislikesInput.value),
      preferred_carbs: splitCsv(els.carbsInput.value),
    },
    notes: els.notesInput.value.trim(),
  };
}

function splitCsv(value) {
  return String(value || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

function setStatus(message, type = '') {
  els.status.textContent = message;
  els.status.className = `status ${type}`.trim();
}

function setLoading(isLoading) {
  document.body.classList.toggle('loading', isLoading);
  els.generateBtn.disabled = isLoading;
  els.resetBtn.disabled = isLoading;
}

function getEffectiveMeal(baseMeal) {
  return AppState.replacedMeals[baseMeal.meal_id] || baseMeal;
}

function getAllMealNames(plan) {
  const names = [];
  for (const day of plan.days) {
    for (const meal of day.meals) {
      names.push(getEffectiveMeal(meal).name);
    }
  }
  return names;
}

function renderAll() {
  renderPlan();
  renderShopping();
}

function renderPlan() {
  const plan = AppState.plan;
  if (!plan?.days?.length) {
    els.daysRoot.innerHTML = '<div class="empty">План ще не згенеровано.</div>';
    return;
  }

  els.daysRoot.innerHTML = plan.days.map((day) => renderDay(day)).join('');

  els.daysRoot.querySelectorAll('[data-replace-id]').forEach((button) => {
    button.addEventListener('click', async () => {
      const mealId = button.getAttribute('data-replace-id');
      await handleReplaceMeal(mealId);
    });
  });
}

function renderDay(day) {
  const mealHtml = day.meals
    .map((baseMeal) => renderMeal(getEffectiveMeal(baseMeal), Boolean(AppState.replacedMeals[baseMeal.meal_id])))
    .join('');

  return `
    <section class="card">
      <div class="day-title">
        <h2>День ${day.day}</h2>
        <div class="tiny">3 страви</div>
      </div>
      <div class="meal-list">${mealHtml}</div>
    </section>
  `;
}

function renderMeal(meal, isReplaced) {
  const macros = meal.macros_per_serving;
  const ingredients = meal.ingredients.map((item) => `<li>${escapeHtml(item.name)} — ${item.amount} ${item.unit}</li>`).join('');
  const recipe = meal.recipe.map((step) => `<li>${escapeHtml(step)}</li>`).join('');

  return `
    <article class="meal">
      <div class="meal-top">
        <div>
          <div class="meal-type">${escapeHtml(meal.type)}</div>
          <h3>${escapeHtml(meal.name)}</h3>
          <div>
            ${meal.kid_friendly ? '<span class="pill">kid-friendly</span>' : ''}
            ${isReplaced ? '<span class="pill">replaced</span>' : ''}
            <span class="pill">${meal.prep_time_min} хв</span>
          </div>
        </div>
        <button class="secondary" data-replace-id="${escapeHtml(meal.meal_id)}">Замінити</button>
      </div>
      <div class="macros">
        <span class="macro">${macros.calories} kcal</span>
        <span class="macro">P ${macros.protein} g</span>
        <span class="macro">F ${macros.fat} g</span>
        <span class="macro">C ${macros.carbs} g</span>
        <span class="macro">${meal.servings} servings</span>
      </div>
      <ul class="ingredients">${ingredients}</ul>
      <ol class="recipe">${recipe}</ol>
    </article>
  `;
}

function renderShopping() {
  const plan = AppState.plan;
  if (!plan?.days?.length) {
    els.shoppingRoot.innerHTML = 'Згенеруй меню, щоб побачити список покупок.';
    return;
  }

  const shopping = buildShoppingList(plan, AppState.replacedMeals);
  const groups = Object.entries(shopping);

  if (!groups.length) {
    els.shoppingRoot.innerHTML = 'Немає даних для shopping list.';
    return;
  }

  els.shoppingRoot.innerHTML = groups.map(([groupName, items]) => `
    <div class="shopping-group">
      <h4>${escapeHtml(groupName)}</h4>
      <ul>
        ${items.map((item) => `<li>${escapeHtml(item.name)} — ${item.amount} ${item.unit}</li>`).join('')}
      </ul>
    </div>
  `).join('');
}

async function handleGenerate() {
  try {
    setLoading(true);
    setStatus('Генерація меню...', '');
    const params = getParamsFromForm();
    const plan = await generateMenuPlan(params);
    savePlan(plan, params);
    renderAll();
    setStatus('Меню згенеровано.', 'ok');
  } catch (error) {
    console.error(error);
    setStatus(error.message || 'Не вдалося згенерувати меню.', 'error');
  } finally {
    setLoading(false);
  }
}

async function handleReplaceMeal(mealId) {
  try {
    if (!AppState.plan) return;
    setLoading(true);
    setStatus(`Заміна ${mealId}...`, '');

    const { dayObj, baseMeal } = findMealById(mealId);
    if (!dayObj || !baseMeal) throw new Error(`Meal not found: ${mealId}`);

    const replacement = await replaceMealWithAI({
      mealId,
      mealType: baseMeal.type,
      dayIndex: dayObj.day,
      params: AppState.params || getParamsFromForm(),
      existingDayMeals: dayObj.meals.map((meal) => getEffectiveMeal(meal)),
      allMealNames: getAllMealNames(AppState.plan),
    });

    // Preserve the user's existing persistence rule.
    await upsertReplacedMeal(mealId, replacement);
    AppState.replacedMeals[mealId] = replacement;
    saveLocalReplacedMeals(AppState.replacedMeals);

    renderAll();
    setStatus(`Страву ${mealId} замінено.`, 'ok');
  } catch (error) {
    console.error(error);
    setStatus(error.message || 'Не вдалося замінити страву.', 'error');
  } finally {
    setLoading(false);
  }
}

function findMealById(mealId) {
  for (const dayObj of AppState.plan.days) {
    for (const baseMeal of dayObj.meals) {
      if (baseMeal.meal_id === mealId) return { dayObj, baseMeal };
    }
  }
  return {};
}

async function hydrateFromStorage() {
  loadPlan();
  loadLocalReplacedMeals();

  try {
    const remoteReplaced = await fetchReplacedMeals();
    if (remoteReplaced && Object.keys(remoteReplaced).length) {
      AppState.replacedMeals = { ...AppState.replacedMeals, ...remoteReplaced };
      saveLocalReplacedMeals(AppState.replacedMeals);
    }
  } catch (error) {
    console.warn('Supabase replaced meals were not loaded:', error.message);
  }

  renderAll();
}

function resetReplacements() {
  clearReplacedMeals();
  renderAll();
  setStatus('Локальні заміни очищено. Дані в Supabase не видалялися.', 'ok');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

els.generateBtn.addEventListener('click', handleGenerate);
els.resetBtn.addEventListener('click', resetReplacements);

hydrateFromStorage();
