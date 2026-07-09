# PsyAssist Supervision Workflow After Primary Analysis

## 1. Purpose

This document describes the product workflow that starts after PsyAssist has built the primary supervision analysis for a case.

It is written for the web application developer. The goal is to preserve the Telegram bot's clinical product logic while translating it into app screens, states, buttons, and user actions.

This is not a code map. It is a product specification of what the user should experience after the initial supervision reflection/analysis is delivered.

## 2. Scope

This document covers:

- the user path after completion of the primary client-level supervision analysis;
- all next-action branches shown to the user;
- sequential delivery of the primary analysis;
- satisfaction check and closure arc;
- deepening the case through additional levels;
- chat/screenshot analysis;
- supervision article generation;
- content generation from the case;
- case saving and the case library;
- paywall and access points;
- returning to a saved case and continuing work.

Out of scope:

- the pre-analysis intake flow: confidentiality, case name, duration, basic context, clinical context, supervision request, supervisor style, focus, depth, and question collection;
- implementation code;
- database migrations;
- visual design details.

## 3. High-level Flow Diagram

```text
Primary supervision analysis
        ↓
Sequential delivery of analysis blocks
        ↓
"Did this become clearer?"
        ↓
What do you want to do next?
├── Finish / save case
├── Deepen the analysis
├── Analyze client chat / screenshot
├── Create supervision article
├── Create content from the case
├── Get questions for the next session
└── Return to menu / case library
```

Expanded:

```text
Primary analysis complete
        ↓
10-block sequential output
        ├── Continue supervision block
        ├── Analyze chat screenshot
        └── Skip to end
        ↓
Reflective closure
        ↓
"Did this answer become clearer?"
        ├── Yes
        │   ↓
        │   Ask: "What do you take from this supervision?"
        │   ↓
        │   Short integration synthesis
        │   ↓
        │   Final CTA menu
        │   ├── Create supervision article
        │   ├── Continue deep analysis
        │   ├── Save case and finish
        │   └── New case
        │
        └── No
            ↓
            "Some cases require slower shared holding"
            ↓
            ├── Continue with PsyAssist
            └── Discuss in personal supervision
```

Additional production branches:

```text
Client-level analysis complete
        ↓
Psychotype/WOW prompt may appear
        ├── Get questions for next session
        │   ↓
        │   Append questions to case_context
        │   ↓
        │   Return to smart level navigation
        └── Later
            ↓
            Return to smart level navigation

User taps "Deepen: <level>"
        ↓
"How do you want to continue?"
        ├── Continue with PsyAssist
        └── Discuss in personal supervision

Chat analysis complete
        ↓
What next?
        ├── Deepen chat analysis
        ├── Simulate therapist response
        │   ├── More variants
        │   └── Return to analysis
        ├── Find my blind spots
        └── Save insight and finish
            ├── Resume interrupted supervision question
            └── Or return to main menu
```

## 4. Detailed Flows

### 4.1 After Primary Supervision Analysis

#### Screen

The primary client-level analysis is not shown as one long wall of text. It is split into sequential blocks and delivered one block at a time.

The bot expects a 9-section clinical analysis plus a final "Supervisor orientation" anchor. In the user experience this becomes approximately 10 sequential messages.

#### Buttons during sequential delivery

Each block can show:

- `➡️ Продолжить супервизию`
- `📸 Разобрать переписку`
- `⏭ Завершить разбор`

#### Meaning of buttons

`➡️ Продолжить супервизию`

- Shows the next block of the primary analysis.
- Continues until all blocks have been delivered.

`📸 Разобрать переписку`

- Interrupts the current sequential delivery.
- Opens screenshot/chat analysis flow.
- Keeps the current case context active.
- After chat analysis, the result is appended to the case context.

`⏭ Завершить разбор`

- Skips remaining blocks.
- Moves the user to the reflective closure / response check.

#### After all blocks

After the sequential output finishes, the bot sends a short reflective closure. It reframes the user's original supervision request clinically, without simply echoing it.

Then it shows the response-check buttons:

- `✅ Да, стало понятнее`
- `🌑 Нет, хочу пойти глубже`

#### Psychotype / WOW branch after client-level completion

On some client-level completion paths, before returning the user to the level navigation, the bot may show an additional WOW prompt about psychotype/session preparation.

This branch appears only once for the case. It is tracked so the same WOW prompt is not repeatedly shown for the same case.

Buttons:

- `Получить вопросы`
- `Спасибо, сделаем это позже`

`Получить вопросы`

- Builds questions for the next session from the active case material.
- Uses the current case's initial material and appended `case_context`.
- Sends the questions to the user.
- Appends the generated result into `case_context` as `[Вопросы для сессии]`.
- Returns the user to smart level navigation for the current case.

`Спасибо, сделаем это позже`

- Sends a short acknowledgement.
- Returns the user to smart level navigation for the current case.

### 4.2 If User Is Satisfied / Finishes

#### User clicks `✅ Да, стало понятнее`

The bot asks:

```text
🌑 Что вы забираете из этой супервизии?

Опишите, что стало для вас важным, неожиданным или более ясным.
```

The user answers in free text or voice.

#### What is saved

If this is the client-level closure:

- the user's takeaway is saved as the case's main insight if that field is empty;
- the primary client-level analysis has already been saved as client-level summary;
- the case remains available in `/mycases`;
- free intro consumption is handled when the session is closed.

If this is a non-client level:

- a structured case entry is saved:
  - level type;
  - user's input / supervision request;
  - AI response;
  - supervisor anchor / reformulated request;
  - integration synthesis;
  - user takeaway;
  - compact input and anchor synthesis.

#### Integration synthesis

After the user writes what they take from the supervision, PsyAssist sends a short synthesis, usually 2-4 lines. It uses the central dynamic and/or main defense from the clinical map when available.

Then it shows the final CTA menu:

- `📚 Создать супервизионную статью`
- `🧠 Продолжить углублённый разбор`
- `💾 Сохранить кейс и завершить`
- `🚀 Новый случай`

#### User clicks `💾 Сохранить кейс и завершить`

The case is not newly created at this point; it was already persisted during intake. This action:

- finishes the supervision session;
- recomputes user counters;
- consumes free intro if applicable;
- checks that the database row exists before claiming the case is saved;
- clears the active case;
- returns the user to the main menu.

User-facing successful copy:

```text
Случай сохранён в вашей профессиональной библиотеке.

Вы сможете:
— вернуться к нему позже
— продолжить супервизию
— собрать статью или контент
— отслеживать динамику своей практики
```

If no case row exists, the bot does not falsely claim that the case was saved. It tells the user that the case was not fully оформлен and should be started through the full `/case` path.

#### CTA after save / finish

After save or finish paths, the bot can send additional feedback/navigation CTA messages.

Post-save feedback CTA:

- `⭐ Оставить отзыв`
- `💬 Дать обратную связь`

Post-session CTA:

- `🚀 Взять следующий кейс`
- `👥 Пригласить коллегу в тестирование`

`🚀 Взять следующий кейс`

- Resets case state.
- Clears supervision/chat/reflection state.
- Starts new case collection.
- Asks the user to describe the new case with anonymized data.

`👥 Пригласить коллегу в тестирование`

- Sends an invitation text with the bot link.
- Shows the same post-session CTA again.

### 4.3 If User Chooses "Deepen Analysis"

There are several entry points into deepening:

- `🌑 Нет, хочу пойти глубже` after the response check;
- `🧠 Продолжить углублённый разбор` from the final CTA menu;
- `🔍 Да, разобрать глубже` from older post-reflection keyboards;
- `Углубить: <level>` from the level navigation menu;
- retention shortcuts after some completed flows:
  - `🔥 Проверить мой контрперенос глубже`
  - `🎭 Смоделировать следующую интервенцию`
  - `🧠 Найти мои слепые зоны`
  - `📈 Посмотреть динамику терапии`

#### If user clicks `🌑 Нет, хочу пойти глубже`

The bot does not immediately start a new analysis.

It first sends a soft escalation frame:

```text
Некоторые случаи требуют более медленного и совместного удерживания процесса.
```

Then it asks how the user wants to continue with the case.

Buttons:

- `🧠 Продолжить с PsyAssist`
- `🤝 Обсудить случай в личной супервизии`

`🧠 Продолжить с PsyAssist`

- Opens the smart level/navigation menu.
- Keeps the active case and clinical memory.

`🤝 Обсудить случай в личной супервизии`

- Routes to the existing live/personal supervision CTA.
- This is an escalation option, not the same as the AI deepening flow.

#### Intermediate screen before deepening a specific level

When the user taps `Углубить: <level>` from smart navigation, the bot first shows an intermediate selector:

```text
Углубить разбор

Выберите, как хотите продолжить работу со случаем.
```

Buttons:

- `🧠 Продолжить с PsyAssist`
- `🤝 Обсудить случай в личной супервизии`

Only after `🧠 Продолжить с PsyAssist` does the bot enter the existing `deepen_<level>` flow.

#### Main deepening menu

When the user continues with PsyAssist, the bot shows a level/navigation menu. It is important that the user sees the available levels because this is both a clinical navigation tool and a product value signal.

Available level actions:

- `Клиентская динамика`
- `Как клиент воспринимает Вас в терапии`
- `Что происходило с Вами рядом с этим клиентом`
- `Где терапия может снова остановиться`
- `Куда вести следующую сессию`
- `Как работать с этим случаем дальше`
- `🧠 Продолжить свободное обсуждение`
- `✅ Завершить разбор и сохранить кейс`
- `✨ Новый случай`
- `💎 Подписка`

The exact set depends on progress:

- completed levels are hidden from the normal "next level" list;
- the current level may appear as `Углубить: <level label>`;
- non-client levels are locked until the client level has been completed.

If a non-client level is chosen without an active case, the bot does not start the level analysis. It asks the user to choose a saved case or start a new case.

If an active case exists but the client level has not been completed, the bot shows the client-level gate and routes the user back to the client foundation level.

#### Level mapping

| Navigation key | Product level | User-facing label |
|---|---|---|
| `nav_1` | Client level / foundation | Клиентская динамика |
| `nav_2` | Transference | Как клиент воспринимает Вас в терапии |
| `nav_3` | Countertransference | Что происходило с Вами рядом с этим клиентом |
| `nav_4` | Risks and boundaries | Где терапия может снова остановиться |
| `nav_5` | Next session strategy | Куда вести следующую сессию |
| `nav_6` | Hypotheses and interventions | Как работать с этим случаем дальше |

#### Client level deepening

Client level uses the legacy module-question flow:

1. Ask explicit supervision request for this deepening.
2. Ask session depth:
   - `⚡ 3 вопроса — быстрый фокус`
   - `🌿 5 вопросов — глубокий разбор`
   - `🧭 На ваше клиническое усмотрение`
3. Ask fixed questions from the relevant question bank.
4. User answers each question by text or voice.
5. Each answer is appended to case context.
6. AI builds integration reflection / clinical map.
7. Client level completion unlocks other levels.

#### Non-client level deepening

Non-client levels use a newer one-probe architecture:

1. Require an explicit supervision request for this direction.
2. Ask one precise level probe question.
3. User answers by text or voice.
4. AI sufficiency gate evaluates whether the answer is specific enough.
5. If sufficient:
   - proceed to full level analysis using that Q/A.
6. If insufficient:
   - AI generates 1-3 clarifying questions;
   - the user answers them sequentially;
   - the next clarifying question may adapt to previous answers;
   - then the full level analysis is produced.

#### Fixed probe questions for non-client levels

| Level | Probe question |
|---|---|
| Transference | Как клиент начинает воспринимать вас в процессе терапии? |
| Countertransference | Что происходило с вами рядом с этим клиентом? |
| Risks / boundaries | Что в этой работе сейчас тревожит вас больше всего — где вы чувствуете риск, размывание границ или слепую зону? |
| Strategy | Что сейчас кажется вам самым непонятным или тупиковым в дальнейшей стратегии работы с этим клиентом? |
| Hypotheses / interventions | Какие ваши интервенции особенно повлияли на процесс — в лучшую или сложную сторону? |

#### Final feedback after deepening

After deepening analysis, PsyAssist:

- sends the level analysis;
- saves the level result into case memory / case entries;
- asks for integration / user takeaway when applicable;
- then shows the same final CTA menu or retention actions.

For some direct toolbox paths, the bot shows:

- `🔥 Проверить мой контрперенос глубже`
- `🎭 Смоделировать следующую интервенцию`
- `🧠 Найти мои слепые зоны`
- `📈 Посмотреть динамику терапии`
- `📒 Зафиксировать инсайт и завершить`

#### Answer locked state

The production bot has an answer-lock guard.

If the bot is waiting for the user's answer to a current clinical question, the user should not be allowed to jump forward by pressing navigation buttons.

Buttons affected include:

- `➡️ Продолжить супервизию`
- `⏭ Завершить разбор`
- `deepen_same_case`
- `deepen_<level>`

When this state is active, the bot sends the answer-lock message and keeps the user on the current question. The app should preserve the same behavior: one clinical question must be answered or intentionally exited before another branch starts.

### 4.4 If User Chooses "Analyze Chat / Screenshot"

#### Where it appears

Chat/screenshot analysis appears in several places:

- during sequential delivery of primary analysis: `📸 Разобрать переписку`;
- in the supervision section menu: `📸 Разбор переписки`;
- if the user explicitly types a chat-analysis intent while in a clinical question flow, the current flow can be paused and chat analysis opens;
- from the "choose from my cases" path, where the user selects a saved case first.

#### Availability

During sequential primary analysis, chat analysis requires that the client level has been completed.

If no active case exists, the bot offers:

- continue active case;
- choose from saved cases.

#### User upload

The user is asked to send a screenshot/image of correspondence.

Before upload, the bot warns:

```text
Перед отправкой обязательно удалите:
— имя
— телефон
— фото
— любые идентифицирующие данные.
```

#### Analysis focus

The chat flow can ask the user to choose focus:

- client state;
- defenses and resistance;
- boundaries and contract;
- transference and attachment;
- pressure / urgency / manipulations;
- help determine focus.

#### Result persistence

After analysis:

- the result is sent to the user;
- if an active case exists, it is appended to `case_context` as `[Разбор переписки — <focus>]`;
- this means later supervision, article, and content can use the screenshot analysis as part of the case memory.

#### After chat analysis

The user sees:

- `🔥 Углубить анализ`
- `🎭 Смоделировать ответ клиенту`
- `🧠 Найти мои слепые зоны`
- `📒 Зафиксировать инсайт и завершить`

#### `🔥 Углубить анализ`

The bot keeps the same chat-analysis context and asks the user to send more material.

The user can send:

- additional screenshots;
- text fragments;
- observations;
- doubts;
- a concrete question about the dynamic.

The bot returns to `awaiting_chat_screenshot` mode and continues the same clinical chat-analysis thread.

#### `🎭 Смоделировать ответ клиенту`

The bot generates exactly three therapist response options to the latest client message:

- `Мягкое присоединение`
- `Фокус на переживании`
- `Бережная конфронтация`

These are generated as ready-to-use therapist replies, without extra psychoeducation or commentary.

After the three variants, the bot shows:

- `🎭 Ещё варианты`
- `🔥 Вернуться в разбор`

`🎭 Ещё варианты`

- Generates another set of three response variants from the same chat context.

`🔥 Вернуться в разбор`

- Returns to the chat continuation keyboard:
  - `🔥 Углубить анализ`
  - `🎭 Смоделировать ответ клиенту`
  - `🧠 Найти мои слепые зоны`
  - `📒 Зафиксировать инсайт и завершить`

#### `🧠 Найти мои слепые зоны`

The bot analyzes possible blind spots of the therapist in the correspondence:

- where the therapist may be reacting without noticing it;
- possible countertransference;
- role the client may be pulling the therapist into;
- one concrete question for the therapist before the next session.

After the blind-spot analysis, the bot returns to the same chat continuation keyboard.

#### `📒 Зафиксировать инсайт и завершить`

The bot clears temporary chat-analysis state:

- chat screenshot text;
- current chat focus;
- chat analysis instruction.

If chat analysis interrupted an active supervision question, the bot resumes the exact paused question instead of dropping the user to menu.

If there was no interrupted supervision question, the bot ends the chat-analysis branch and returns to the main menu.

### 4.5 If User Chooses "Supervision Article"

#### Entry points

The supervision article appears as a primary integration action:

- from final CTA after supervision: `📚 Создать супервизионную статью`;
- from a saved case card/library: dynamic button `Создать/Открыть супервизионную статью`;
- from content hub paths where article is used as the preferred source.

#### Behavior

When the user requests an article:

1. Resolve active case or explicit case ID.
2. Check ownership if case ID is explicit.
3. If an article already exists for this case:
   - open saved article;
   - do not regenerate;
   - restore it into session cache so derivatives/content can use it.
4. If no article exists:
   - generate a supervision article from case memory;
   - save it for the case;
   - send it to the user.

#### User receives

The user gets:

- article header: `📚 Супервизионная статья`;
- full article text, chunked if necessary;
- follow-up menu.

#### Buttons after article

After a generated or opened article, the user sees:

- `✅ Завершить и сохранить кейс`
- `✍️ Создать контент по кейсу`
- `🤝 Коллаборации / эфиры`
- `🧠 Продолжить исследование`

#### Feedback CTA after a fresh article

After a fresh supervision article is generated and sent, the bot also sends a lightweight feedback CTA.

Buttons:

- `⭐ Оставить отзыв`
- `💬 Дать обратную связь`
- `➡️ Продолжить работу`

This CTA is shown at the emotional peak after generation. It is not shown again when the user opens an already saved article, to avoid repeatedly asking for feedback on re-read.

### 4.6 If User Chooses "Create Content"

#### Entry points

Content generation can be opened from:

- post-article menu: `✍️ Создать контент по кейсу`;
- Professional Growth menu: `📚 Контент из супервизии`;
- saved case content hub;
- case card if content already exists (`Контент-архив`).

#### Paywall 350 ₽

The post-article content path is gated:

```text
Доступ к контенту и формулировкам по этому кейсу — 350 ₽
```

The 350 ₽ product opens content for the current case only and saves generated materials in the case history.

If the user already has:

- `case_content` grant for this case, or
- active time-bounded plan,

then the paywall is skipped and the content hub opens directly.

This bypass is especially important on `post_art_content`: if payment/webhook already granted access, the bot must not show the same upsell again. It should resolve the case, check ownership, and open the content hub directly.

If no entitlement is found, the user sees:

- `💳 Оплатить 350 ₽`
- `↩️ Вернуться к кейсу`

#### If user tries to pay for content without active case

The bot does not create a payment. It asks the user to return to the needed case through the case library and try again.

#### Content hub

Once access is available, the bot first opens the real production content hub for the selected case.

The first content hub screen shows:

- dynamic article button:
  - `Создать супервизионную статью`, or
  - `Открыть супервизионную статью`, if the article already exists;
- `📱 Серия постов`;
- `🤝 Коллаборации / эфиры`;
- `✅ Завершить`.

The full content brief flow starts only after the user chooses `📱 Серия постов`.

#### Empty state in content section

If the user opens the content section but there is no suitable case/material yet, the bot shows an empty-state CTA.

Buttons:

- `🧠 Начать новый кейс`
- `📁 Выбрать из моих кейсов`, only if saved cases exist.

If the user has no saved cases, only `🧠 Начать новый кейс` is shown.

#### Content brief flow for `📱 Серия постов`

Available content brief steps:

1. Platform:
   - Telegram
   - Instagram
   - ВКонтакте
   - Threads
   - B17
   - Дзен
   - YouTube
2. Style:
   - Профессиональный
   - Живой / личный
   - Академический
   - Тёплый терапевтический
   - Провокационный
3. Format:
   - Серию постов
   - Один глубокий пост
   - Carousel / слайды
   - Тему эфира
   - Статью
   - Короткие мысли / цитаты
4. Depth:
   - Осторожно / популярно
   - Средняя глубина
   - Глубоко профессионально
5. Goal:
   - Продающий
   - Вовлекающий
   - Дискуссионный
   - Прогревающий
   - Мотивирующий
   - Экспертный
   - Провокационный
   - Универсальный

After brief collection:

1. PsyAssist generates 12 title/angle options.
2. User chooses one title by pressing a numbered button.
3. PsyAssist generates the content.
4. Generated content is saved as a content asset for the case.

#### Title-flow controls

After generating title options, the bot shows numbered title buttons and two control buttons:

- `🔄 Другие заголовки`
- `✖️ Отмена`

`🔄 Другие заголовки`

- Regenerates the title list for the same brief.
- Uses a nonce to reject stale title keyboards from older generations.
- If the clicked keyboard is stale, the bot tells the user to use the fresh list.

`✖️ Отмена`

- Clears the current content brief and title stash.
- Tells the user that material collection was cancelled and they can return to `/mycases`.

When a numbered title is selected, the bot also uses the nonce to avoid applying outdated or double-fired title callbacks.

#### Actions after generated content

After content is generated, the user sees refinement options:

- `✅ Оставляем так`
- `✏️ Хочу доработать`
- `🎯 Сделать острее`
- `🧠 Сделать глубже`
- `❤️ Сделать человечнее`
- `✅ Завершить и сохранить кейс`
- `🏠 Главное меню`

If user chooses "Хочу доработать", they can type or dictate free-form instructions. PsyAssist regenerates the same material with the user's directive.

If user chooses "Оставляем так", PsyAssist confirms the material is ready for publication and shows a final CTA to save/continue.

Production final CTA after `✅ Оставляем так`:

- `✅ Завершить и сохранить кейс`
- `⭐ Оставить отзыв`
- `💬 Дать обратную связь`

### 4.7 Case Saving

#### When case is created

The case is created and persisted before the first analysis starts, after the user completes the case intake and narrative.

The case includes:

- user ID;
- therapist name;
- case title;
- client alias/name/code;
- first session date / duration proxy;
- initial narrative;
- later appended context.

#### What is appended during work

During the session, PsyAssist appends to the case:

- answers to supervision questions;
- primary analysis;
- integration reflection;
- chat/screenshot analysis;
- level analysis results;
- supervision request snapshot;
- client-level summary;
- foundation story;
- main insight;
- content assets;
- supervision article.

#### Finish/save action

When the user clicks save/finish:

- the bot does not recreate the case;
- it verifies that the saved row exists;
- it ends the session;
- it clears active case state;
- it returns the user to main navigation.

The first free intro/free case consumption is idempotent. It may be triggered from more than one legitimate finish path, but repeated calls should not double-consume access.

### 4.8 Returning to a Saved Case

#### Entry points

The user can return through:

- `/mycases`;
- `🧩 Работа с кейсами` → `🗂 Мои сохранённые кейсы`;
- `🔄 Продолжить активный кейс`;
- `↩️ Вернуться к кейсу`;
- `back_to_mycases` callbacks after article/content/save paths.

#### Case list

The library shows case buttons. Each button usually displays:

- case title or client alias;
- therapy duration if the date is available.

#### Opening a case

When a user opens a saved case:

1. Ownership is checked.
2. Case is loaded into active session.
3. Client-level completion flag is restored from case progress.
4. A compact overview card is shown.
5. The action menu appears.

#### Saved case actions

From the saved case card, available actions:

- `📂 Развернуть полный разбор`
- `📚 История случая`
- `🧠 Уровневые разборы`
- `📚 Создать/Открыть супервизионную статью`
- `✍️ Контент-архив`, only if saved content assets exist
- `🧠 Продолжить исследование`
- `📂 Вернуться к моим кейсам`
- `🚀 Начать новый кейс`
- `✅ Завершить супервизию`

#### Expand actions

Expand actions are paginated/chunked. They should not silently truncate therapist language.

`📂 Развернуть полный разбор`

- Shows full case material and all available entries.

`📚 История случая`

- Shows the narrative/foundation story.

`🧠 Уровневые разборы`

- Shows full level-by-level analyses.

`✍️ Контент-архив`

- Lists saved content assets.
- Reading saved content is always free.
- Opening an asset shows the full saved body and a button back to archive.

#### Continuing a saved case

`🧠 Продолжить исследование` opens the smart level-navigation menu.

From there the user can:

- deepen the current level;
- choose another unlocked level;
- continue free discussion;
- create article/content;
- save/finish;
- start a new case.

### 4.9 Paywall Points

#### New case / second case

Before opening a new case intake, the bot checks entitlement:

- founder bypass if configured;
- active time-bounded plan:
  - day unlimited;
  - week;
  - month professional;
- first free intro if the user has no saved cases;
- floating `case_single` grant.

If no access is available, paywall is shown.

Important rule:

- saved case means free intro is considered spent even if a flag says otherwise.

#### Deepening after limit

Deepening is gated by `_paywall_block_deepening`:

- if depth is under the free limit, allow;
- if active time-bounded plan exists, allow;
- if active case has a case grant that allows deepening, allow;
- otherwise show paywall.

This gate runs immediately before starting `deepen_<level>` flows.

For non-client levels with an active case, the production order is:

1. ensure client-level foundation is complete;
2. run the deepening paywall gate;
3. start the level probe flow only if access is allowed.

For client-level deepening, the same paywall gate runs before collecting the new supervision request/depth flow.

#### Content by case — 350 ₽

Content generation from a case is gated separately:

- `case_content` grant for this case allows it;
- active time-bounded plans allow it;
- otherwise user pays `Контент по кейсу — 350 ₽`.

This applies especially from the post-article `Создать контент по кейсу` branch.

#### Tariffs shown in paywall

Paywall keyboard:

- `Один кейс — 190 ₽`
- `Контент по кейсу — 350 ₽`
- `24 часа — 990 ₽`
- `Неделя — 1490 ₽`
- `Professional — 4900 ₽`

Access status/profile screen copy mentions final prices as:

- one case: 190 ₽;
- content and formulations by case: 350 ₽;
- day unlimited: 990 ₽;
- week: 1450 ₽;
- month Professional: 4990 ₽.

This discrepancy should be clarified before app implementation.

#### Payment flow

When a user clicks a tariff:

1. If YooKassa is unavailable, show temporary unavailable message.
2. For `case_content`, active case is required.
3. If email for receipt is missing:
   - ask user to enter email;
   - save email in profile;
   - resume payment creation.
4. Create YooKassa payment intent.
5. Send payment link.
6. On webhook/payment activation, grant access according to plan.

#### Grant semantics

- `case_single`: permission for one new case; can be floating before the case exists.
- `case_content`: permission for content on a concrete case; needs active case.
- `day_unlimited`, `week`, `month_pro`: global time-bounded access.

## 5. State and Data Model

This section describes meaning, not implementation.

### Active case

The case currently loaded into the user's session.

Used by:

- supervision continuation;
- article generation;
- content generation;
- screenshot/chat analysis;
- payment binding for case-specific products.

If there is no active case, the app should ask the user to pick from saved cases or start a new one.

### Case context

Accumulated clinical material appended over time:

- initial case narrative;
- previous context;
- question/answer pairs;
- primary analysis;
- chat/screenshot analysis;
- level-specific analyses;
- user's reflections and takeaways.

This is the clinical memory surface that later flows read from.

### Supervision request

The explicit anchor for the current supervision or deepening path.

It must be collected before:

- primary analysis;
- client-level deepening;
- non-client level probe analysis.

When deepening a level, the new supervision request should not silently overwrite previous context; it becomes the anchor for that deepening.

### Selected supervisor persona

The user-selected supervisor style/persona for the current supervision.

It should apply during:

- primary client-level analysis;
- clarifying-flow completion;
- non-client level analysis where persona support is wired.

It should stay within clinical supervision boundaries and not leak into content generation.

### Answers

User answers are collected from:

- fixed question bank for primary/module flows;
- single probe question for non-client levels;
- AI-generated clarifying questions only when probe material is insufficient;
- free-form reflection/takeaway fields.

Answers must be preserved and attached to the case context.

### Generated analysis

Primary analysis:

- generated after client-level question flow;
- delivered sequentially;
- saved as client-level summary;
- used to unlock deeper levels.

Level analysis:

- generated for selected level;
- saved as a structured case entry;
- can be shown later in saved case "Уровневые разборы".

### Deepening results

Each deeper analysis should store:

- level type;
- user input / Q&A;
- AI response;
- integration synthesis;
- user takeaway if collected.

### Answer lock

Temporary state meaning: the bot is waiting for a required user answer and should not let the user skip forward through unrelated navigation.

Used to prevent:

- moving to the next supervision block while a question expects an answer;
- skipping to the end while an answer is pending;
- starting another deepening flow before the current question is resolved.

### Chat analysis interruption state

If chat/screenshot analysis interrupts a supervision question, the bot remembers the return mode.

After `📒 Зафиксировать инсайт и завершить`, the bot either:

- resumes the exact paused supervision question; or
- returns to the main menu if there was no paused supervision question.

### Psychotype/WOW state

The bot tracks whether the psychotype/WOW prompt has already been shown for a case.

This prevents repeated prompts for the same case and preserves the one-time production behavior.

### Article

Supervision article is generated from case memory.

If already generated for a case:

- opening the article should reuse the saved article;
- it should not regenerate automatically.

Article becomes a preferred source for later content generation and derivative materials.

### Content outputs

Generated content assets are saved to the case.

Saved content is readable for free later through content archive.

Generating new content is gated by content entitlement.

### Content title nonce

During title selection, the bot stores a nonce for the current title list.

The nonce prevents:

- stale title keyboards from older generations;
- double-fired title callbacks;
- generating content from an outdated title list.

## 6. What Must Stay Unchanged in App Implementation

The web app must preserve:

- clinical algorithm order;
- base intake and primary analysis sequence;
- fixed question bank behavior for client-level/module flows;
- client level as required foundation before other levels;
- level navigation as a visible product affordance;
- explicit supervision request before each deepening path;
- intermediate PsyAssist/personal-supervision choice before level deepening;
- answer-lock behavior while required questions wait for user input;
- psychotype/WOW prompt as one-time case branch;
- supervisor persona boundaries;
- no mixing of supervision mode and content mode;
- screenshot/chat anonymization warning;
- chat-analysis interruption and return-to-paused-question behavior;
- case-specific memory isolation;
- saved article reuse instead of silent regeneration;
- case-content paywall at 350 ₽;
- content entitlement bypass after `case_content` or time-bounded access is already active;
- content title nonce protection;
- second/new case paywall logic;
- saved case library and ability to return to case;
- no false "case saved" message if no case row exists.

## 7. Open Questions for Юлия

1. Tariff inconsistency:
   - paywall rows show `Неделя — 1490 ₽` and `Professional — 4900 ₽`;
   - access card copy mentions `Неделя — 1450 ₽` and `Месяц Professional — 4990 ₽`.
   Which prices are canonical for the app?

2. The code has both:
   - article-derived direct derivatives (`Коллаборации / эфиры`, old talk/visual handlers);
   - full content brief flow (`platform → style → format → depth → goal → titles → generation`).
   Should the app expose both, or should all public-content work go only through the content brief hub?

3. The content-layer gate helper `_gate_content_layer` is currently a no-op in several entry points, while `post_art_content` has a real 350 ₽ entitlement gate. Should the app enforce paid content access globally for all content entry points?

4. Chat/screenshot analysis has multiple entry points and can interrupt current question flow. In the app, should this be a global floating action available during all supervision screens, or only a button inside relevant screens?

5. For non-client levels, the bot uses a single probe plus AI sufficiency gate. If insufficient, it asks 1-3 generated clarifying questions. Should the app show the sufficiency decision transparently, or keep it invisible as in the bot?

6. The bot has legacy and newer closure paths (`finish_case`, `end_today`, `finish_after_reflection`, `post_art_finish`). In the app, should these be unified into one "Save and finish" UX, while preserving the same data effects?
