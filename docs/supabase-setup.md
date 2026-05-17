# Supabase: persistence PsyAssist

Краткая инструкция для production-слоя кейсов и супервизии.

## Переменные окружения

В `.env.local` (или в настройках хостинга):


| Переменная                      | Назначение           |
| ------------------------------- | -------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | URL проекта Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon (public) ключ   |


Без этих переменных приложение **не падает**: маршруты `/api/persistence/`* возвращают `{ ok: false, code: "SUPABASE_DISABLED" }`, страница `/assistant` показывает мягкое предупреждение и продолжает разбор в сессии.

## SQL migration

Примените миграции (по порядку):

1. `supabase/migrations/20260209120000_psyassist_persistence.sql`
2. `supabase/migrations/20260514120000_case_structured_memory.sql` (или объединённая `20260517120000_cases_rls_and_structured_memory.sql`)

Способ:

- **Supabase Dashboard** → SQL Editor → вставить содержимое файла → Run  
- или **Supabase CLI**: `supabase db push` / `supabase migration up` (как принято в вашем пайплайне)

В миграции создаются таблицы:

- `public.cases`
- `public.supervision_progress`
- `public.supervision_sessions`

Включён **RLS** на всех трёх; политики завязаны на `**auth.uid() = user_id`** (select / insert / update; для `cases` также delete по своим строкам).

## Auth

Строки привязаны к `**auth.users.id`** (`user_id uuid`). Пока пользователь **не залогинен** через Supabase Auth в этом же браузере (cookie-сессия для `@supabase/ssr`), API вернёт `{ ok: false, code: "NO_SESSION" }` — это ожидаемо, не ошибка сервера.

## Поведение API (проверка готовности)


| Условие                                                          | Ответ                                               |
| ---------------------------------------------------------------- | --------------------------------------------------- |
| Нет `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `200`, `{ ok: false, code: "SUPABASE_DISABLED" }`   |
| Клиент есть, нет сессии Auth                                     | `200`, `{ ok: false, code: "NO_SESSION" }`          |
| Невалидное тело запроса                                          | `400`, `{ ok: false, code: "INVALID_BODY" }`        |
| Ошибка БД                                                        | `500`, код вида `SAVE_FAILED` / `APPEND_FAILED` / … |


Исключение: при выключенном Supabase тело запроса для `POST` не обрабатывается до проверки env — клиент всё равно получает предсказуемый JSON без падения процесса.