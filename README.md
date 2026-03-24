# AI Meal Planner

## Що всередині
- 7-денна AI генерація меню
- Replace meal через OpenAI
- Локальний shopping list з нормалізованих інгредієнтів
- Supabase upsert для `replaced_meals` через `?on_conflict=meal_id`
- Збереження weekly plan у `localStorage`

## Перед запуском
1. Встав ключі у `config.js`
2. Запусти локальний сервер, бо `type="module"` не працює через `file://`
   - Python: `python3 -m http.server 8000`
   - або будь-який інший static server
3. Відкрий `http://localhost:8000`

## Важливо
Прямий OpenAI ключ у фронтенді небезпечний. Для production краще проксі / edge function / serverless endpoint.

## Supabase таблиця
Очікується таблиця `replaced_meals` з полями:
- `meal_id` text primary key or unique
- `meal_json` jsonb
- `updated_at` timestamptz

## RLS
Потрібні політики на `select`, `insert`, `update`, `delete` для anon, якщо ти використовуєш anon key у фронтенді.
