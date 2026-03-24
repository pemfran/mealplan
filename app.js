import { AppState, PROFILES, PLAN } from './data.js';
import {
  loadReplacedMeals,
  loadDislikes,
  addDislike,
  clearDislikesData,
  upsertReplacedMeal,
  clearReplacedMeals,
  callClaude,
  withRetry
} from './api.js';
import {
  lbl,
  getEffectiveMeal,
  calculateDayTotals,
  buildGenPrompt,
  parseGeneratedPlan,
  normalizePlan,
  getFallbackGeneratedPlan,
  generateReplacement
} from './logic.js';

const busyMeals = new Set();
let toastTimer = null;

function show(id, display = 'block') {
  const el = document.getElementById(id);
  if (el) el.style.display = display;
}

function hide(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;

  t.textContent = msg;
  t.classList.add('show');

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    t.classList.remove('show');
  }, 3200);
}

function selectWho(who) {
  AppState.who = who;
  localStorage.setItem('meal-who', who);

  document.getElementById('btn-her')?.classList.toggle('selected', who === 'her');
  document.getElementById('btn-him')?.classList.toggle('selected', who === 'him');
  document.getElementById('start-btn').disabled = false;
}

async function startApp() {
  if (!AppState.who) return;

  localStorage.setItem('meal-who', AppState.who);
  hide('setup-screen');
  show('app');
  await initApp();
}

function resetWho() {
  localStorage.removeItem('meal-who');
  hide('app');
  show('setup-screen', 'flex');

  AppState.who = null;

  document.getElementById('btn-her')?.classList.remove('selected');
  document.getElementById('btn-him')?.classList.remove('selected');
  document.getElementById('start-btn').disabled = true;
}

async function initApp() {
  const p = PROFILES[AppState.who];
  if (!p) return;

  document.getElementById('hdr-who-btn').textContent = `${p.emoji} ${p.name}`;
  document.getElementById('hdr-meta').textContent = `${Object.keys(PLAN).length} днів · Краків · ${p.name}`;
  document.getElementById('hdr-chips').innerHTML = `
    <span class="hdr-chip">🎯 ${p.kcal} ккал</span>
    <span class="hdr-chip">💪 Б${p.p}г</span>
    <span class="hdr-chip">🥑 Ж${p.f}г</span>
    <span class="hdr-chip">🌾 В${p.c}г</span>
  `;

  AppState.replacedMeals = await loadReplacedMeals();

  const tabsBar = document.getElementById('tabs-bar');
  tabsBar.innerHTML = '';

  const totalDays = Object.keys(PLAN).length;
  for (let d = 1; d <= totalDays; d++) {
    const btn = document.createElement('button');
    btn.className = `tab-btn${d === 1 ? ' active' : ''}`;
    btn.textContent = `День ${d}`;
    btn.onclick = () => switchDay(d);
    tabsBar.appendChild(btn);
  }

  renderAllDays();
  switchDay(1);
  await refreshDislikesPanel();
}

function renderAllDays() {
  const main = document.getElementById('main-content');
  main.innerHTML = '';

  const totalDays = Object.keys(PLAN).length;
  for (let d = 1; d <= totalDays; d++) {
    const el = document.createElement('div');
    el.id = `day-${d}`;
    el.className = 'tab-panel';
    el.innerHTML = renderDay(d);
    main.appendChild(el);
  }
}

function renderDay(dayNum) {
  const day = PLAN[dayNum];
  if (!day) return '';

  let html = `
    <div class="day-hdr">
      <span class="day-label">День ${dayNum}</span>
      <h2 class="day-title">${day.title}</h2>
    </div>
  `;

  if (day.prep) {
    html += `
      <div class="prep-box">
        <span class="prep-icon">🔪</span>
        <div><strong>Prep сьогодні:</strong> ${day.prep}</div>
      </div>
    `;
  }

  html += '<div class="meals-grid">';

  for (const meal of day.meals) {
    const current = getEffectiveMeal(meal, AppState.replacedMeals);
    const isReplaced = !!AppState.replacedMeals[meal.id];

    html += `
      <div class="meal-card ${meal.type === 'snack' ? 'snack-card' : ''} ${isReplaced ? 'replaced' : ''}" id="card-${meal.id}">
        <div class="meal-bar ${meal.type}"></div>
        <div class="meal-head">
          <div class="meal-type-tag">${current.icon} ${lbl(meal.type)}</div>
          <div class="meal-name">${current.name}</div>
        </div>

        <div class="portions" id="por-${meal.id}">
          <div class="portion her">
            <span class="p-who">👩 Альона</span>
            <span class="p-text">${current.her}</span>
          </div>
          <div class="portion him">
            <span class="p-who">👨 Діма</span>
            <span class="p-text">${current.him}</span>
          </div>
        </div>

        <div class="generating" id="gen-${meal.id}">
          <div class="gen-spin"></div>
          <div class="gen-label">AI шукає заміну…</div>
        </div>

        <div class="meal-foot">
          <button class="dislike-btn" id="dbtn-${meal.id}" onclick="dislikeMeal('${meal.id}', ${dayNum})">
            ${isReplaced ? '👎 Замінити ще' : '👎 Не подобається'}
          </button>
          <span class="replaced-badge">✨ Замінено</span>
        </div>
      </div>
    `;
  }

  html += '</div>';
  html += renderKBJV(dayNum);

  return html;
}

function renderKBJV(dayNum) {
  const day = PLAN[dayNum];
  const totals = calculateDayTotals(day, AppState.replacedMeals);

  const herTotals = totals.her;
  const himTotals = totals.him;

  const herTarget = PROFILES.her;
  const himTarget = PROFILES.him;

  const delta = (value, target) => {
    const p = Math.round(((value - target) / target) * 100);
    if (Math.abs(p) <= 8) return '<span class="d-ok">✓</span>';
    return p > 8
      ? `<span class="d-over">+${p}%</span>`
      : `<span class="d-low">${p}%</span>`;
  };

  return `
    <div class="kbjv-wrap" id="kbjv-${dayNum}">
      <div class="kbjv-scroll">
        <div class="kbjv-table">
          <div class="kbjv-hdr">
            <div>Прийом</div>
            <div>ккал</div>
            <div>Білок</div>
            <div>Жири</div>
            <div>Вуглев.</div>
          </div>

          ${day.meals.map((meal) => {
            const current = getEffectiveMeal(meal, AppState.replacedMeals);
            const k = current.kbjv || meal.kbjv;

            return `
              <div class="kbjv-row">
                <div class="kbjv-lbl">${current.icon} ${lbl(meal.type)}</div>
                <div class="kbjv-val">${k.her[0]}/${k.him[0]}</div>
                <div class="kbjv-val p">${k.her[1]}/${k.him[1]}</div>
                <div class="kbjv-val f">${k.her[2]}/${k.him[2]}</div>
                <div class="kbjv-val c">${k.her[3]}/${k.him[3]}</div>
              </div>
            `;
          }).join('')}

          <div class="kbjv-row her-row">
            <div class="kbjv-lbl">👩 Альона</div>
            <div class="kbjv-val">${herTotals[0]}</div>
            <div class="kbjv-val p">${herTotals[1]}</div>
            <div class="kbjv-val f">${herTotals[2]}</div>
            <div class="kbjv-val c">${herTotals[3]}</div>
          </div>

          <div class="kbjv-row him-row">
            <div class="kbjv-lbl">👨 Діма</div>
            <div class="kbjv-val">${himTotals[0]}</div>
            <div class="kbjv-val p">${himTotals[1]}</div>
            <div class="kbjv-val f">${himTotals[2]}</div>
            <div class="kbjv-val c">${himTotals[3]}</div>
          </div>

          <div class="kbjv-row tgt-row">
            <div class="kbjv-lbl">🎯 Ціль А</div>
            <div class="kbjv-val">${delta(herTotals[0], herTarget.kcal)}</div>
            <div class="kbjv-val">${delta(herTotals[1], herTarget.p)}</div>
            <div class="kbjv-val">${delta(herTotals[2], herTarget.f)}</div>
            <div class="kbjv-val">${delta(herTotals[3], herTarget.c)}</div>
          </div>

          <div class="kbjv-row tgt-row">
            <div class="kbjv-lbl">🎯 Ціль Д</div>
            <div class="kbjv-val">${delta(himTotals[0], himTarget.kcal)}</div>
            <div class="kbjv-val">${delta(himTotals[1], himTarget.p)}</div>
            <div class="kbjv-val">${delta(himTotals[2], himTarget.f)}</div>
            <div class="kbjv-val">${delta(himTotals[3], himTarget.c)}</div>
          </div>
        </div>
      </div>

      <div class="kbjv-foot">
        Альона: 1750 ккал / Б118 / Ж63 / В187 · Діма: 2450 ккал / Б180 / Ж75 / В270
      </div>
    </div>
  `;
}

function switchDay(dayNum) {
  AppState.currentDay = dayNum;

  document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));

  document.getElementById(`day-${dayNum}`)?.classList.add('active');

  const tabs = document.querySelectorAll('.tab-btn');
  if (tabs[dayNum - 1]) {
    tabs[dayNum - 1].classList.add('active');
    tabs[dayNum - 1].scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center'
    });
  }
}

async function refreshDislikesPanel() {
  const list = await loadDislikes();
  const panel = document.getElementById('dislikes-list');
  const badge = document.getElementById('dislikes-badge');

  if (!panel || !badge) return;

  badge.textContent = list.length || '';
  badge.style.display = list.length ? 'inline-block' : 'none';

  if (!list.length) {
    panel.innerHTML = '<div class="dl-empty">Поки жодної відмови 👍</div>';
    return;
  }

  const byWho = { her: [], him: [] };
  list.forEach((d) => {
    (byWho[d.who] ??= []).push(d);
  });

  const groupHtml = (who, items) => {
    if (!items?.length) return '';
    return `
      <div class="dl-group">
        <div class="dl-group-lbl">${PROFILES[who].emoji} ${PROFILES[who].name}</div>
        ${items.map((d) => `
          <div class="dl-item">
            <span class="dl-type-tag">${lbl(d.type)}</span>
            <span class="dl-item-name">${d.name}</span>
          </div>
        `).join('')}
      </div>
    `;
  };

  panel.innerHTML = `
    ${groupHtml('her', byWho.her)}
    ${groupHtml('him', byWho.him)}
    <button class="dl-clear-btn" onclick="clearDislikes()">🗑️ Очистити все</button>
  `;
}

async function clearDislikes() {
  await clearDislikesData();
  showToast('🗑️ Список відхилених очищено');
  await refreshDislikesPanel();
}

async function dislikeMeal(mealId, dayNum) {
  if (busyMeals.has(mealId)) return;
  busyMeals.add(mealId);

  const btn = document.getElementById(`dbtn-${mealId}`);
  const gen = document.getElementById(`gen-${mealId}`);
  const card = document.getElementById(`card-${mealId}`);
  const por = document.getElementById(`por-${mealId}`);
  const meal = PLAN[dayNum]?.meals.find((m) => m.id === mealId);

  if (!meal || !btn || !gen || !card || !por) {
    busyMeals.delete(mealId);
    return;
  }

  const current = getEffectiveMeal(meal, AppState.replacedMeals);

  btn.disabled = true;
  por.style.display = 'none';
  gen.classList.add('active');

  try {
    await addDislike(current.name, meal.type, AppState.who);
    await refreshDislikesPanel();

    const newMeal = await generateReplacement(current, meal, dayNum, AppState.replacedMeals);

    await upsertReplacedMeal(mealId, newMeal);
    AppState.replacedMeals[mealId] = newMeal;

    card.querySelector('.meal-name').textContent = newMeal.name;
    card.querySelector('.meal-type-tag').textContent = `${newMeal.icon} ${lbl(meal.type)}`;
    por.innerHTML = `
      <div class="portion her">
        <span class="p-who">👩 Альона</span>
        <span class="p-text">${newMeal.her}</span>
      </div>
      <div class="portion him">
        <span class="p-who">👨 Діма</span>
        <span class="p-text">${newMeal.him}</span>
      </div>
    `;

    por.style.display = 'flex';
    gen.classList.remove('active');
    card.classList.add('replaced');
    btn.innerHTML = '👎 Замінити ще';
    btn.disabled = false;

    const panel = document.getElementById(`day-${dayNum}`);
    const old = panel?.querySelector('.kbjv-wrap');
    const tmp = document.createElement('div');
    tmp.innerHTML = renderKBJV(dayNum);

    if (old) old.replaceWith(tmp.firstElementChild);
    else if (panel) panel.appendChild(tmp.firstElementChild);

    showToast('✨ Страву замінено!');
  } catch (e) {
    gen.classList.remove('active');
    por.style.display = 'flex';
    btn.disabled = false;
    console.error(e);
    showToast(`❌ ${e.message}`);
  } finally {
    busyMeals.delete(mealId);
  }
}

async function openGenPlanScreen() {
  document.getElementById('gen-screen').classList.add('active');
  document.getElementById('gp-progress').classList.remove('active');
  document.getElementById('gp-start-btn').disabled = false;
  document.getElementById('gp-cancel-btn').style.display = 'block';

  const dl = await loadDislikes();
  const prev = document.getElementById('gp-dislikes-preview');

  if (!dl.length) {
    prev.innerHTML = '<div class="gen-empty">Немає відхилених — план буде різноманітним</div>';
    return;
  }

  prev.innerHTML = `
    <div class="gen-tags">
      ${dl.map((d) => `<span class="gen-tag">${d.who === 'her' ? '👩' : '👨'} ${d.name}</span>`).join('')}
    </div>
  `;
}

function closeGenPlanScreen() {
  document.getElementById('gen-screen').classList.remove('active');
}

function setStep(n) {
  for (let i = 1; i <= 4; i++) {
    document.getElementById(`gps-${i}`).className =
      'gen-step' + (i < n ? ' done' : i === n ? ' active' : '');
  }
}

function applyNewPlan(arr) {
  const np = normalizePlan(arr);

  Object.keys(PLAN).forEach((k) => delete PLAN[k]);
  Object.assign(PLAN, np);

  Object.keys(AppState.replacedMeals).forEach((k) => delete AppState.replacedMeals[k]);

  renderAllDays();
  switchDay(1);

  const p = PROFILES[AppState.who];
  if (p) {
    document.getElementById('hdr-meta').textContent = `${Object.keys(PLAN).length} днів · Краків · ${p.name}`;
  }
}

async function runGeneration() {
  const btn = document.getElementById('gp-start-btn');
  const cancel = document.getElementById('gp-cancel-btn');
  const progress = document.getElementById('gp-progress');
  const txt = document.getElementById('gp-prog-txt');

  btn.disabled = true;
  cancel.style.display = 'none';
  progress.classList.add('active');

  try {
    setStep(1);
    txt.textContent = 'Завантажую список відмов…';

    const dl = await loadDislikes();
    const hD = dl.filter((d) => d.who === 'her').map((d) => d.name);
    const himD = dl.filter((d) => d.who === 'him').map((d) => d.name);

    const opts = {
      variety: document.getElementById('gp-variety').checked,
      seasonal: document.getElementById('gp-seasonal').checked,
      budget: document.getElementById('gp-budget').checked
    };

    setStep(2);
    txt.textContent = 'AI генерує страви…';

    let plan;
    try {
      const prompt = buildGenPrompt(hD, himD, opts);
      const raw = await withRetry(() => callClaude(prompt, 2800), 2);
      console.log('RAW PLAN RESPONSE:', raw);

      setStep(3);
      txt.textContent = 'Перевіряю структуру…';

      plan = parseGeneratedPlan(raw);
      console.log('PARSED PLAN:', plan);
    } catch (aiErr) {
      console.error('AI generation failed, fallback used:', aiErr);
      setStep(3);
      txt.textContent = 'AI зламався, застосовую fallback…';
      plan = getFallbackGeneratedPlan();
    }

    setStep(4);
    txt.textContent = 'Застосовую новий план…';

    await clearReplacedMeals();
    AppState.replacedMeals = {};
    applyNewPlan(plan);

    closeGenPlanScreen();
    switchDay(1);
    showToast('✨ Новий план готовий!');
  } catch (e) {
    console.error('runGeneration error:', e);
    progress.classList.remove('active');
    btn.disabled = false;
    cancel.style.display = 'block';
    showToast(`❌ ${e.message}`);
  }
}

function toggleDislikesPanel() {
  const wrap = document.getElementById('dislikes-panel-wrap');
  const overlay = document.getElementById('panel-overlay');
  const isOpen = wrap.classList.contains('open');

  wrap.classList.toggle('open', !isOpen);
  overlay.classList.toggle('active', !isOpen);

  if (!isOpen) {
    refreshDislikesPanel();
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  const saved = localStorage.getItem('meal-who');
  if (saved && PROFILES[saved]) {
    AppState.who = saved;
    show('app');
    hide('setup-screen');
    await initApp();
  }
});

window.selectWho = selectWho;
window.startApp = startApp;
window.resetWho = resetWho;
window.toggleDislikesPanel = toggleDislikesPanel;
window.openGenPlanScreen = openGenPlanScreen;
window.closeGenPlanScreen = closeGenPlanScreen;
window.runGeneration = runGeneration;
window.dislikeMeal = dislikeMeal;
window.clearDislikes = clearDislikes;