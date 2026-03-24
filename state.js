import { CONFIG } from './config.js';

export const AppState = {
  params: null,
  plan: null,
  replacedMeals: {},
};

export function savePlan(plan, params) {
  AppState.plan = plan;
  AppState.params = params;
  localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify({ plan, params }));
}

export function loadPlan() {
  try {
    const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.plan) AppState.plan = parsed.plan;
    if (parsed?.params) AppState.params = parsed.params;
    return parsed;
  } catch {
    return null;
  }
}

export function saveLocalReplacedMeals(map) {
  AppState.replacedMeals = { ...map };
  localStorage.setItem(CONFIG.REPLACED_STORAGE_KEY, JSON.stringify(AppState.replacedMeals));
}

export function loadLocalReplacedMeals() {
  try {
    const raw = localStorage.getItem(CONFIG.REPLACED_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    AppState.replacedMeals = parsed && typeof parsed === 'object' ? parsed : {};
    return AppState.replacedMeals;
  } catch {
    return {};
  }
}

export function clearReplacedMeals() {
  AppState.replacedMeals = {};
  localStorage.removeItem(CONFIG.REPLACED_STORAGE_KEY);
}
