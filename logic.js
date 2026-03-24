import { PROFILES, PLAN, FALLBACK_REPLACEMENTS, safeClone } from './data.js';
import { loadDislikes, callClaude, withRetry } from './api.js';

export function extractJsonObject(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Відповідь не містить JSON-об’єкт');
  }
  return text.slice(start, end + 1);
}

export function extractJsonArray(text) {
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Відповідь не містить JSON-масив');
  }
  return text.slice(start, end + 1);
}

export function lbl(t) {
  return {
    breakfast: 'Сніданок',
    lunch: 'Обід',
    lunch_2: 'Обід 2',
    snack: 'Перекус',
    dinner: 'Вечеря'
  }[t] || t;
}

export function getEffectiveMeal(meal, replacedMeals) {
  return replacedMeals?.[meal.id] || meal;
}

export function calculateDayTotals(day, replacedMeals) {
  const her = [0, 0, 0, 0];
  const him = [0, 0, 0, 0];

  for (const meal of day.meals) {
    const current = getEffectiveMeal(meal, replacedMeals);
    const kbjv = current.kbjv || meal.kbjv;
    if (!kbjv) continue;

    kbjv.her.forEach((v, i) => {
      her[i] += Number(v || 0);
    });

    kbjv.him.forEach((v, i) => {
      him[i] += Number(v || 0);
    });
  }

  return { her, him };
}

export function getFallbackGeneratedPlan() {
  return [
    {
      day: 1,
      title: 'День 1',
      prep: 'Підготувати крупу та запекти курку',
      meals: [
        { type: 'breakfast', icon: '☀️', name: 'Сирники з йогуртом', her: '180г сирників · 80г йогурту', him: '260г сирників · 120г йогурту', kbjv: { her: [420, 28, 14, 42], him: [620, 40, 20, 60] } },
        { type: 'lunch', icon: '🌙', name: 'Курка з рисом та овочами', her: '150г курки · 160г рису · овочі', him: '220г курки · 220г рису · овочі', kbjv: { her: [650, 46, 14, 70], him: [920, 66, 18, 102] } },
        { type: 'snack', icon: '🍎', name: 'Йогурт з ягодами', her: '170г йогурту · ягоди', him: '230г йогурту · ягоди', kbjv: { her: [170, 14, 5, 16], him: [240, 20, 7, 20] } },
        { type: 'dinner', icon: '🌆', name: 'Суп з індичкою', her: '400мл супу', him: '500мл супу', kbjv: { her: [390, 30, 12, 28], him: [540, 42, 16, 34] } }
      ]
    },
    {
      day: 2,
      title: 'День 2',
      prep: null,
      meals: [
        { type: 'breakfast', icon: '☀️', name: 'Вафлі з творогу', her: '2 вафлі · 120г творогу', him: '3 вафлі · 180г творогу', kbjv: { her: [390, 30, 11, 36], him: [560, 42, 16, 58] } },
        { type: 'lunch', icon: '🌙', name: 'Індичка з булгуром', her: '150г індички · 160г булгуру', him: '220г індички · 220г булгуру', kbjv: { her: [680, 48, 14, 76], him: [960, 68, 18, 108] } },
        { type: 'snack', icon: '🍎', name: 'Сир кисломолочний з фруктами', her: '150г сиру · 1 ківі', him: '220г сиру · 1 банан', kbjv: { her: [180, 20, 4, 14], him: [280, 30, 6, 28] } },
        { type: 'dinner', icon: '🌆', name: 'Тушкована індичка з овочами', her: '150г індички · овочі', him: '220г індички · овочі', kbjv: { her: [410, 36, 15, 18], him: [560, 50, 18, 22] } }
      ]
    },
    {
      day: 3,
      title: 'День 3',
      prep: null,
      meals: [
        { type: 'breakfast', icon: '☀️', name: 'Йогуртові панкейки', her: '5 панкейків · йогурт', him: '7 панкейків · йогурт', kbjv: { her: [400, 22, 11, 52], him: [580, 30, 15, 74] } },
        { type: 'lunch', icon: '🌙', name: 'Курячі тефтелі з рисом', her: '160г тефтель · 150г рису', him: '220г тефтель · 220г рису', kbjv: { her: [650, 46, 15, 72], him: [920, 64, 20, 102] } },
        { type: 'snack', icon: '🍎', name: 'Йогурт з ягодами та насінням', her: '170г йогурту · ягоди', him: '230г йогурту · ягоди', kbjv: { her: [170, 14, 5, 16], him: [250, 20, 8, 22] } },
        { type: 'dinner', icon: '🌆', name: 'Курячий суп з овочами', her: '400мл супу', him: '500мл супу', kbjv: { her: [430, 32, 14, 34], him: [620, 48, 18, 46] } }
      ]
    },
    {
      day: 4,
      title: 'День 4',
      prep: null,
      meals: [
        { type: 'breakfast', icon: '☀️', name: 'Тости з рікоттою та ягодами', her: '2 тости · рікотта · ягоди', him: '3 тости · рікотта · ягоди', kbjv: { her: [360, 20, 10, 46], him: [520, 28, 14, 66] } },
        { type: 'lunch', icon: '🌙', name: 'Риба з картоплею та салатом', her: '170г риби · 180г картоплі', him: '230г риби · 250г картоплі', kbjv: { her: [620, 42, 16, 62], him: [880, 58, 22, 92] } },
        { type: 'snack', icon: '🍎', name: 'Кефір і груша', her: '200мл кефіру · груша', him: '300мл кефіру · груша', kbjv: { her: [150, 7, 2, 24], him: [220, 11, 3, 30] } },
        { type: 'dinner', icon: '🌆', name: 'Овочеве рагу з індичкою', her: '150г індички · овочі', him: '220г індички · овочі', kbjv: { her: [420, 35, 14, 22], him: [580, 50, 18, 28] } }
      ]
    },
    {
      day: 5,
      title: 'День 5',
      prep: null,
      meals: [
        { type: 'breakfast', icon: '☀️', name: 'Сирники з бананом', her: '180г сирників · ½ банана', him: '260г сирників · 1 банан', kbjv: { her: [430, 28, 14, 48], him: [630, 40, 20, 66] } },
        { type: 'lunch', icon: '🌙', name: 'Яловичина з булгуром', her: '150г яловичини · 150г булгуру', him: '220г яловичини · 220г булгуру', kbjv: { her: [710, 48, 18, 64], him: [980, 66, 24, 96] } },
        { type: 'snack', icon: '🍎', name: 'Сир кисломолочний з ягодами', her: '150г сиру · ягоди', him: '220г сиру · ягоди', kbjv: { her: [170, 20, 4, 12], him: [260, 30, 6, 18] } },
        { type: 'dinner', icon: '🌆', name: 'Суп-пюре з куркою', her: '400мл супу', him: '500мл супу', kbjv: { her: [400, 31, 13, 26], him: [560, 44, 17, 34] } }
      ]
    },
    {
      day: 6,
      title: 'Вихідний день 1',
      prep: null,
      meals: [
        { type: 'breakfast', icon: '☀️', name: 'Панкейки з йогуртом', her: '5 панкейків', him: '7 панкейків', kbjv: { her: [400, 22, 11, 52], him: [580, 30, 15, 74] } },
        { type: 'lunch', icon: '🌙', name: 'Паста з куркою', her: '250г пасти', him: '360г пасти', kbjv: { her: [640, 36, 16, 72], him: [920, 52, 22, 104] } },
        { type: 'lunch_2', icon: '🍝', name: 'Запечена паста з сиром', her: '250г запіканки', him: '360г запіканки', kbjv: { her: [520, 32, 18, 50], him: [760, 48, 24, 72] } },
        { type: 'snack', icon: '🍎', name: 'Йогурт з фруктами', her: '170г йогурту', him: '230г йогурту', kbjv: { her: [170, 14, 5, 16], him: [250, 20, 8, 22] } },
        { type: 'dinner', icon: '🌆', name: 'Індичка з овочами', her: '150г індички', him: '220г індички', kbjv: { her: [410, 36, 15, 18], him: [560, 50, 18, 22] } }
      ]
    },
    {
      day: 7,
      title: 'Вихідний день 2',
      prep: null,
      meals: [
        { type: 'breakfast', icon: '☀️', name: 'Вафлі з творогу', her: '2 вафлі', him: '3 вафлі', kbjv: { her: [390, 30, 11, 36], him: [560, 42, 16, 58] } },
        { type: 'lunch', icon: '🌙', name: 'Курка з рисом', her: '150г курки · 160г рису', him: '220г курки · 220г рису', kbjv: { her: [650, 46, 14, 70], him: [920, 66, 18, 102] } },
        { type: 'lunch_2', icon: '🍝', name: 'Домашня піца', her: '2 шматки', him: '3 шматки', kbjv: { her: [520, 26, 20, 48], him: [760, 38, 28, 70] } },
        { type: 'snack', icon: '🍎', name: 'Фрукти і сир', her: 'сир + фрукт', him: 'сир + фрукт', kbjv: { her: [180, 18, 4, 16], him: [260, 26, 6, 24] } },
        { type: 'dinner', icon: '🌆', name: 'Курячий суп', her: '400мл супу', him: '500мл супу', kbjv: { her: [430, 32, 14, 34], him: [620, 48, 18, 46] } }
      ]
    }
  ];
}

export function buildGenPrompt(hD, himD, opts) {
  const ht = PROFILES.her;
  const ht2 = PROFILES.him;

  return `
Створи план харчування на 7 днів для сім'ї (2 дорослих + 2 дітей).

Поверни тільки валідний JSON масив з 7 елементів.
Без markdown.
Без пояснень.
Без тексту до або після JSON.

Профілі:
Альона: ${ht.kcal} ккал, Б ${ht.p}, Ж ${ht.f}, В ${ht.c}
Діма: ${ht2.kcal} ккал, Б ${ht2.p}, Ж ${ht2.f}, В ${ht2.c}

Відхилені страви Альони: ${hD.length ? hD.join(', ') : 'немає'}
Відхилені страви Діми: ${himD.length ? himD.join(', ') : 'немає'}

Правила:
- Дні 1-5: рівно 4 meals: breakfast, lunch, snack, dinner
- Дні 6-7: рівно 5 meals: breakfast, lunch, lunch_2, snack, dinner
- breakfast family-friendly
- dinner без омлетів
- dinner для Діми з меншим обсягом вуглеводів
- страви реальні, нормальні, без "яйця + тост"
- продукти доступні в Польщі
- ${opts.variety ? 'не повторювати основу страви занадто часто' : ''}
- ${opts.seasonal ? 'врахувати сезонність березня' : ''}
- ${opts.budget ? 'тримати бюджетним' : ''}

Іконки:
breakfast=☀️
lunch=🌙
lunch_2=🍝
snack=🍎
dinner=🌆

Формат кожного дня:
{
  "day": 1,
  "title": "...",
  "prep": null,
  "meals": [
    {
      "type": "breakfast",
      "icon": "☀️",
      "name": "...",
      "her": "...",
      "him": "...",
      "kbjv": {
        "her": [ккал, білок, жири, вуглеводи],
        "him": [ккал, білок, жири, вуглеводи]
      }
    }
  ]
}

Поверни тільки JSON масив з 7 днів.
`.trim();
}

export function parseGeneratedPlan(raw) {
  const clean = raw.replace(/```json|```/g, '').trim();

  let jsonText;
  try {
    jsonText = extractJsonArray(clean);
  } catch {
    console.error('RAW PLAN:', raw);
    throw new Error('AI не повернув JSON-масив');
  }

  let arr;
  try {
    arr = JSON.parse(jsonText);
  } catch (err) {
    console.error('BROKEN JSON:', jsonText);
    throw new Error(`JSON parse error: ${err.message}`);
  }

  if (!Array.isArray(arr)) {
    throw new Error('AI повернув не масив');
  }

  if (arr.length < 7) {
    throw new Error(`Очікувалось 7 днів, отримано ${arr.length}`);
  }

  return arr.slice(0, 7);
}

export function normalizePlan(arr) {
  const np = {};

  arr.forEach((day, idx) => {
    const d = idx + 1;
    const expectedTypes =
      d >= 6
        ? ['breakfast', 'lunch', 'lunch_2', 'snack', 'dinner']
        : ['breakfast', 'lunch', 'snack', 'dinner'];

    const meals = Array.isArray(day.meals) ? day.meals : [];

    np[d] = {
      title: day.title || `День ${d}`,
      prep: day.prep || null,
      meals: expectedTypes.map((type, i) => {
        const m = meals.find((x) => x.type === type) || meals[i] || {};
        const iconMap = {
          breakfast: '☀️',
          lunch: '🌙',
          lunch_2: '🍝',
          snack: '🍎',
          dinner: '🌆'
        };

        const kbjv = m.kbjv || { her: [0, 0, 0, 0], him: [0, 0, 0, 0] };

        return {
          id: `${d}-${type}-${i}`,
          type,
          icon: m.icon || iconMap[type],
          name: m.name || `Страва ${i + 1}`,
          her: m.her || '',
          him: m.him || '',
          kbjv: {
            her: Array.isArray(kbjv.her) ? kbjv.her : [0, 0, 0, 0],
            him: Array.isArray(kbjv.him) ? kbjv.him : [0, 0, 0, 0]
          },
          ingredients_total: Array.isArray(m.ingredients_total) ? m.ingredients_total : []
        };
      })
    };
  });

  return np;
}

export async function generateReplacement(currentMeal, originalMeal, dayNum, replacedMeals) {
  const day = PLAN[dayNum];

  const herExisting = [0, 0, 0, 0];
  const himExisting = [0, 0, 0, 0];

  for (const meal of day.meals) {
    if (meal.id === originalMeal.id) continue;

    const current = replacedMeals[meal.id] || meal;
    const kbjv = current.kbjv || meal.kbjv;
    if (!kbjv) continue;

    kbjv.her.forEach((v, i) => {
      herExisting[i] += Number(v || 0);
    });

    kbjv.him.forEach((v, i) => {
      himExisting[i] += Number(v || 0);
    });
  }

  const herTarget = PROFILES.her;
  const himTarget = PROFILES.him;

  const herLeft = [
    herTarget.kcal - herExisting[0],
    herTarget.p - herExisting[1],
    herTarget.f - herExisting[2],
    herTarget.c - herExisting[3]
  ];

  const himLeft = [
    himTarget.kcal - himExisting[0],
    himTarget.p - himExisting[1],
    himTarget.f - himExisting[2],
    himTarget.c - himExisting[3]
  ];

  const others = day.meals
    .filter((m) => m.id !== originalMeal.id)
    .map((m) => `- ${lbl(m.type)}: ${(replacedMeals[m.id] || m).name}`)
    .join('\n');

  const dl = await loadDislikes();
  const hD = dl.filter((d) => d.who === 'her').map((d) => d.name);
  const himD = dl.filter((d) => d.who === 'him').map((d) => d.name);
  const allDislikes = [...hD, ...himD].map((x) => String(x).toLowerCase());

  const prompt = `<task>Заміни одну страву. Поверни тільки валідний JSON об'єкт без markdown.</task>
<replace><name>${currentMeal.name}</name><type>${originalMeal.type}</type><day>${dayNum}</day></replace>
<remaining><her kcal="${herLeft[0]}" p="${herLeft[1]}" f="${herLeft[2]}" c="${herLeft[3]}"/><him kcal="${himLeft[0]}" p="${himLeft[1]}" f="${himLeft[2]}" c="${himLeft[3]}"/></remaining>
<others>${others}</others>
<dislikes><her>${hD.length ? hD.join(', ') : 'немає'}</her><him>${himD.length ? himD.join(', ') : 'немає'}</him></dislikes>
<rules>
- Інша страва, не дублювати others
- Реальні нормальні страви
- Для dinner у Діми менше вуглеводів
- Формат:
{"name":"...","icon":"☀️/🌙/🍎/🌆/🍝","her":"...","him":"...","kbjv":{"her":[0,0,0,0],"him":[0,0,0,0]}}
</rules>`;

  try {
    const text = await withRetry(() => callClaude(prompt, 1000), 2);
    const parsed = JSON.parse(extractJsonObject(text));

    if (
      !parsed?.name ||
      !parsed?.her ||
      !parsed?.him ||
      !parsed?.kbjv ||
      !Array.isArray(parsed.kbjv.her) ||
      !Array.isArray(parsed.kbjv.him)
    ) {
      throw new Error('AI повернув неповну структуру');
    }

    if (allDislikes.includes(String(parsed.name).toLowerCase())) {
      throw new Error('AI повернув disliked meal');
    }

    return parsed;
  } catch (e) {
    console.warn('AI replacement failed, using fallback:', e);

    const pool = FALLBACK_REPLACEMENTS[originalMeal.type] || [];
    const found = pool.find(
      (item) =>
        item.name.toLowerCase() !== String(currentMeal.name).toLowerCase() &&
        !allDislikes.includes(item.name.toLowerCase())
    );

    if (!found) {
      throw new Error('Не вдалося підібрати fallback-заміну');
    }

    return safeClone(found);
  }
}