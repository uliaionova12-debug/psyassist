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
2. `supabase/migrations/20260517120000_cases_rls_and_structured_memory.sql`
3. `supabase/migrations/20260517140000_cases_auth_user_id_rls.sql` (обязательно, если в production `cases.user_id` — bigint)

Способ:

- **Supabase Dashboard** → SQL Editor → вставить содержимое файла → Run  
- или **Supabase CLI**: `supabase db push` / `supabase migration up` (как принято в вашем пайплайне)

В миграции создаются таблицы:

- `public.cases`
- `public.supervision_progress`
- `public.supervision_sessions`

Включён **RLS** на всех трёх. Для `cases` владелец — `**auth_user_id uuid`** (`auth.uid() = auth_user_id`). Остальные таблицы persistence — `user_id uuid`.

## Auth

Строки кейсов привязаны к `**auth.users.id`** через `auth_user_id`. Пока пользователь **не залогинен** через Supabase Auth в этом же браузере (cookie-сессия для `@supabase/ssr`), API вернёт `{ ok: false, code: "NO_SESSION" }` — это ожидаемо, не ошибка сервера.

## Поведение API (проверка готовности)


| Условие                                                          | Ответ                                               |
| ---------------------------------------------------------------- | --------------------------------------------------- |
| Нет `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `200`, `{ ok: false, code: "SUPABASE_DISABLED" }`   |
| Клиент есть, нет сессии Auth                                     | `200`, `{ ok: false, code: "NO_SESSION" }`          |
| Невалидное тело запроса                                          | `400`, `{ ok: false, code: "INVALID_BODY" }`        |
| Ошибка БД                                                        | `500`, код вида `SAVE_FAILED` / `APPEND_FAILED` / … |


Исключение: при выключенном Supabase тело запроса для `POST` не обрабатывается до проверки env — клиент всё равно получает предсказуемый JSON без падения процесса.