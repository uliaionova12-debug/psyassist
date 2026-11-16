"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import {
  ANSWER_LIMITS,
  BOOKING_URL,
  FORMAT_LABELS,
  HOW_LONG_OPTIONS,
  PAY_INDIVIDUAL_URL,
  PRICE_COUPLE,
  PRICE_INDIVIDUAL,
  TOPICS,
  type ClientMap,
  type RazborAnswers,
  type RazborApiError,
  type RazborApiSuccess,
  type RazborFormat,
} from "@/lib/razbor/config";

import { reachGoal } from "./metrika";
import { TrackedLink } from "./TrackedLink";

const STORAGE_KEY = "razbor_form_v1";
const TOTAL_STEPS = 8;
const STEP_CONTACT = 7;
const STEP_LOADING = 8;
const STEP_RESULT = 9;

type FormState = {
  step: number;
  format: RazborFormat | null;
  topic: string | null;
  answers: RazborAnswers;
  name: string;
  contact: string;
  consent: boolean;
  result: { client_map: ClientMap; ai_status: "ok" | "error" } | null;
};

const initialState: FormState = {
  step: 0,
  format: null,
  topic: null,
  answers: { what: "", howLong: "", tried: "", want: "", whyNow: "" },
  name: "",
  contact: "",
  consent: false,
  result: null,
};

type QuestionKey = keyof RazborAnswers;

const QUESTIONS: {
  key: QuestionKey;
  title: string;
  hint: string;
  required?: boolean;
}[] = [
  {
    key: "what",
    title: "Что сейчас происходит?",
    hint: "Опишите своими словами, можно коротко. Это единственный обязательный вопрос.",
    required: true,
  },
  {
    key: "howLong",
    title: "Как давно это длится?",
    hint: "Выберите самый близкий вариант.",
  },
  {
    key: "tried",
    title: "Что вы уже пробовали?",
    hint: "Разговоры, книги, другие специалисты — или пока ничего. Любой ответ подходит.",
  },
  {
    key: "want",
    title: "Что вы хотите получить в итоге?",
    hint: "Как вы поймёте, что стало лучше?",
  },
  {
    key: "whyNow",
    title: "Почему вы решили заняться этим именно сейчас?",
    hint: "Можно пропустить этот вопрос.",
  },
];

function loadState(): FormState {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState;
    const saved = {
      ...initialState,
      ...(JSON.parse(raw) as Partial<FormState>),
    };
    if (saved.step === STEP_LOADING) saved.step = STEP_CONTACT;
    if (saved.step === STEP_RESULT && !saved.result) saved.step = STEP_CONTACT;
    return saved;
  } catch {
    return initialState;
  }
}

function isValidContact(value: string): boolean {
  const v = value.trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return true;
  if (/^(@|https?:\/\/t\.me\/|t\.me\/)?[a-zA-Z][a-zA-Z0-9_]{4,31}$/.test(v))
    return true;
  return v.replace(/\D/g, "").length >= 10 && /^[\d\s()+-]+$/.test(v);
}

export function RazborForm({ onExit }: { onExit: () => void }) {
  const [state, setState] = useState<FormState>(initialState);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const honeypotRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setState(loadState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage may be unavailable (private mode) */
    }
  }, [state, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    headingRef.current?.focus();
    window.scrollTo(0, 0);
  }, [state.step, hydrated]);

  const update = (patch: Partial<FormState>) =>
    setState((s) => ({ ...s, ...patch }));
  const setAnswer = (key: QuestionKey, value: string) =>
    setState((s) => ({ ...s, answers: { ...s.answers, [key]: value } }));
  const go = (step: number) => {
    setError(null);
    update({ step });
  };
  const back = () => (state.step === 0 ? onExit() : go(state.step - 1));

  const restart = () => {
    setError(null);
    setState(initialState);
  };

  async function submit() {
    if (!state.format || !state.topic) return;
    reachGoal("razbor_complete", { format: state.format });
    go(STEP_LOADING);
    try {
      const res = await fetch("/api/razbor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format: state.format,
          topic: state.topic,
          answers: state.answers,
          name: state.name,
          contact: state.contact,
          consent: state.consent,
          website: honeypotRef.current?.value ?? "",
        }),
        signal: AbortSignal.timeout(45_000),
      });
      const data = (await res.json().catch(() => null)) as
        | RazborApiSuccess
        | RazborApiError
        | null;
      if (!data || !data.ok) {
        setState((s) => ({ ...s, step: STEP_CONTACT }));
        setError(
          data?.message ??
            "Не получилось отправить ответы. Попробуйте ещё раз.",
        );
        return;
      }
      reachGoal("razbor_lead_success", { format: state.format });
      setState((s) => ({
        ...s,
        step: STEP_RESULT,
        result: { client_map: data.client_map, ai_status: data.ai_status },
      }));
    } catch {
      setState((s) => ({ ...s, step: STEP_CONTACT }));
      setError(
        "Нет связи с сервером. Проверьте интернет и попробуйте ещё раз.",
      );
    }
  }

  if (!hydrated) {
    return <main className="rz rz-form-shell" aria-busy="true" />;
  }

  const { step } = state;
  const progress = step < TOTAL_STEPS ? step + 1 : TOTAL_STEPS;

  return (
    <main className="rz rz-form-shell">
      <div className="rz-form-wrap">
        {step < STEP_LOADING ? (
          <div className="rz-form-top">
            <button type="button" className="rz-link-btn" onClick={back}>
              ← {step === 0 ? "На главную" : "Назад"}
            </button>
            <div
              className="rz-progress"
              role="progressbar"
              aria-label="Прогресс разбора"
              aria-valuemin={1}
              aria-valuemax={TOTAL_STEPS}
              aria-valuenow={progress}
              aria-valuetext={`Шаг ${progress} из ${TOTAL_STEPS}`}
            >
              <span className="rz-progress-label">
                Шаг {progress} из {TOTAL_STEPS}
              </span>
              <span className="rz-progress-track">
                <span
                  className="rz-progress-bar"
                  style={{ width: `${(progress / TOTAL_STEPS) * 100}%` }}
                />
              </span>
            </div>
          </div>
        ) : null}

        {step === 0 ? (
          <ChoiceStep
            headingRef={headingRef}
            title="Как вы хотите работать?"
            hint="Это поможет точнее подготовить карту ситуации."
            name="format"
            options={(Object.keys(FORMAT_LABELS) as RazborFormat[]).map(
              (f) => ({ value: f, label: FORMAT_LABELS[f] }),
            )}
            value={state.format}
            onChange={(v) =>
              update({
                format: v as RazborFormat,
                topic: state.format === v ? state.topic : null,
              })
            }
            onNext={() => go(1)}
          />
        ) : null}

        {step === 1 && state.format ? (
          <ChoiceStep
            headingRef={headingRef}
            title="С чем хотите разобраться?"
            hint="Выберите тему, которая ближе всего."
            name="topic"
            options={TOPICS[state.format].map((t) => ({ value: t, label: t }))}
            value={state.topic}
            onChange={(v) => update({ topic: v })}
            onNext={() => go(2)}
          />
        ) : null}

        {step >= 2 && step <= 6 ? (
          <QuestionStep
            key={QUESTIONS[step - 2]!.key}
            headingRef={headingRef}
            question={QUESTIONS[step - 2]!}
            number={step - 1}
            value={state.answers[QUESTIONS[step - 2]!.key]}
            onChange={(v) => setAnswer(QUESTIONS[step - 2]!.key, v)}
            onNext={() => go(step + 1)}
          />
        ) : null}

        {step === STEP_CONTACT ? (
          <ContactStep
            headingRef={headingRef}
            honeypotRef={honeypotRef}
            name={state.name}
            contact={state.contact}
            consent={state.consent}
            error={error}
            onChange={update}
            onSubmit={submit}
          />
        ) : null}

        {step === STEP_LOADING ? (
          <div className="rz-loading" role="status" aria-live="polite">
            <span className="rz-spinner" aria-hidden="true" />
            <h1 ref={headingRef} tabIndex={-1} className="rz-h2">
              Готовлю карту ситуации
            </h1>
            <p className="rz-muted">
              Обычно это занимает 10–20 секунд. Не закрывайте страницу.
            </p>
          </div>
        ) : null}

        {step === STEP_RESULT && state.result && state.format ? (
          <ResultStep
            headingRef={headingRef}
            format={state.format}
            map={state.result.client_map}
            onRestart={restart}
            onExit={onExit}
          />
        ) : null}
      </div>
    </main>
  );
}

type HeadingRef = React.RefObject<HTMLHeadingElement | null>;

function StepHeading({
  headingRef,
  children,
  hint,
}: {
  headingRef: HeadingRef;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <>
      <h1 ref={headingRef} tabIndex={-1} className="rz-step-title">
        {children}
      </h1>
      {hint ? <p className="rz-muted rz-step-hint">{hint}</p> : null}
    </>
  );
}

function ChoiceStep(props: {
  headingRef: HeadingRef;
  title: string;
  hint: string;
  name: string;
  options: { value: string; label: string }[];
  value: string | null;
  onChange: (v: string) => void;
  onNext: () => void;
}) {
  const hintId = useId();
  const [touched, setTouched] = useState(false);
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!props.value) {
      setTouched(true);
      return;
    }
    props.onNext();
  };
  return (
    <form onSubmit={onSubmit} noValidate>
      <fieldset className="rz-fieldset" aria-describedby={hintId}>
        <legend className="rz-sr-only">{props.title}</legend>
        <StepHeading headingRef={props.headingRef}>{props.title}</StepHeading>
        <p id={hintId} className="rz-muted rz-step-hint">
          {props.hint}
        </p>
        <div className="rz-options">
          {props.options.map((o) => (
            <label key={o.value} className="rz-option">
              <input
                type="radio"
                name={props.name}
                value={o.value}
                checked={props.value === o.value}
                onChange={() => props.onChange(o.value)}
              />
              <span>{o.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {touched && !props.value ? (
        <p className="rz-error" role="alert">
          Выберите один из вариантов.
        </p>
      ) : null}
      <button type="submit" className="rz-btn rz-btn-block">
        Далее
      </button>
    </form>
  );
}

function QuestionStep(props: {
  headingRef: HeadingRef;
  question: (typeof QUESTIONS)[number];
  number: number;
  value: string;
  onChange: (v: string) => void;
  onNext: () => void;
}) {
  const { question } = props;
  const fieldId = useId();
  const hintId = useId();
  const errId = useId();
  const [error, setError] = useState<string | null>(null);
  const isChoice = question.key === "howLong";
  const max =
    question.key === "what" ? ANSWER_LIMITS.what.max : ANSWER_LIMITS.text;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (
      question.required &&
      props.value.trim().length < ANSWER_LIMITS.what.min
    ) {
      setError(
        "Напишите хотя бы пару предложений — так карта получится точнее.",
      );
      return;
    }
    props.onNext();
  };

  return (
    <form onSubmit={onSubmit} noValidate>
      <p className="rz-eyebrow">Вопрос {props.number} из 5</p>
      {isChoice ? (
        <fieldset className="rz-fieldset" aria-describedby={hintId}>
          <legend className="rz-sr-only">{question.title}</legend>
          <StepHeading headingRef={props.headingRef}>
            {question.title}
          </StepHeading>
          <p id={hintId} className="rz-muted rz-step-hint">
            {question.hint}
          </p>
          <div className="rz-options">
            {HOW_LONG_OPTIONS.map((o) => (
              <label key={o} className="rz-option">
                <input
                  type="radio"
                  name="howLong"
                  value={o}
                  checked={props.value === o}
                  onChange={() => props.onChange(o)}
                />
                <span>{o}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : (
        <>
          <StepHeading headingRef={props.headingRef}>
            <label htmlFor={fieldId}>{question.title}</label>
          </StepHeading>
          <p id={hintId} className="rz-muted rz-step-hint">
            {question.hint}
          </p>
          <textarea
            id={fieldId}
            className="rz-textarea"
            rows={6}
            maxLength={max}
            value={props.value}
            required={question.required}
            aria-required={question.required || undefined}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${hintId} ${errId}` : hintId}
            onChange={(e) => {
              setError(null);
              props.onChange(e.target.value);
            }}
          />
        </>
      )}
      {error ? (
        <p id={errId} className="rz-error" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" className="rz-btn rz-btn-block">
        Далее
      </button>
      {!question.required ? (
        <button
          type="button"
          className="rz-btn-secondary rz-btn-block"
          onClick={() => {
            props.onChange("");
            props.onNext();
          }}
        >
          Пропустить
        </button>
      ) : null}
    </form>
  );
}

function ContactStep(props: {
  headingRef: HeadingRef;
  honeypotRef: React.RefObject<HTMLInputElement | null>;
  name: string;
  contact: string;
  consent: boolean;
  error: string | null;
  onChange: (patch: Partial<FormState>) => void;
  onSubmit: () => void;
}) {
  const nameId = useId();
  const contactId = useId();
  const contactHintId = useId();
  const consentId = useId();
  const [errors, setErrors] = useState<{
    name?: string;
    contact?: string;
    consent?: string;
  }>({});

  const handle = (e: FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!props.name.trim()) next.name = "Укажите, как к вам обращаться.";
    if (!isValidContact(props.contact))
      next.contact = "Укажите телефон, ник в Telegram или почту.";
    if (!props.consent)
      next.consent = "Без согласия мы не сможем обработать ваши ответы.";
    setErrors(next);
    if (Object.keys(next).length) return;
    props.onSubmit();
  };

  return (
    <form onSubmit={handle} noValidate>
      <StepHeading
        headingRef={props.headingRef}
        hint="Юлия получит ваши ответы и сможет связаться с вами для записи."
      >
        Куда прислать ответ?
      </StepHeading>

      <div className="rz-field">
        <label htmlFor={nameId} className="rz-label">
          Как к вам обращаться
        </label>
        <input
          id={nameId}
          className="rz-input"
          type="text"
          autoComplete="given-name"
          maxLength={ANSWER_LIMITS.name}
          value={props.name}
          aria-required="true"
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? `${nameId}-err` : undefined}
          onChange={(e) => props.onChange({ name: e.target.value })}
        />
        {errors.name ? (
          <p id={`${nameId}-err`} className="rz-error">
            {errors.name}
          </p>
        ) : null}
      </div>

      <div className="rz-field">
        <label htmlFor={contactId} className="rz-label">
          Телефон, Telegram или почта
        </label>
        <input
          id={contactId}
          className="rz-input"
          type="text"
          autoComplete="tel"
          maxLength={ANSWER_LIMITS.contact}
          placeholder="+7 900 000-00-00 или @username"
          value={props.contact}
          aria-required="true"
          aria-invalid={errors.contact ? true : undefined}
          aria-describedby={
            errors.contact ? `${contactHintId} ${contactId}-err` : contactHintId
          }
          onChange={(e) => props.onChange({ contact: e.target.value })}
        />
        <p id={contactHintId} className="rz-muted rz-small">
          Только для связи по записи. Без рассылок.
        </p>
        {errors.contact ? (
          <p id={`${contactId}-err`} className="rz-error">
            {errors.contact}
          </p>
        ) : null}
      </div>

      <div className="rz-hp" aria-hidden="true">
        <label>
          Сайт
          <input
            ref={props.honeypotRef}
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
          />
        </label>
      </div>

      <div className="rz-field">
        <div className="rz-consent">
          <input
            id={consentId}
            type="checkbox"
            checked={props.consent}
            aria-required="true"
            aria-invalid={errors.consent ? true : undefined}
            aria-describedby={errors.consent ? `${consentId}-err` : undefined}
            onChange={(e) => props.onChange({ consent: e.target.checked })}
          />
          <label htmlFor={consentId}>
            Я принимаю условия{" "}
            <a href="/razbor/offer" target="_blank" rel="noopener">
              оферты
            </a>{" "}
            и даю согласие на обработку персональных данных по{" "}
            <a href="/razbor/privacy" target="_blank" rel="noopener">
              политике конфиденциальности
            </a>
            , включая обработку ответов сервисом OpenAI.
          </label>
        </div>
        {errors.consent ? (
          <p id={`${consentId}-err`} className="rz-error">
            {errors.consent}
          </p>
        ) : null}
      </div>

      {props.error ? (
        <p className="rz-error rz-error-box" role="alert">
          {props.error}
        </p>
      ) : null}

      <button type="submit" className="rz-btn rz-btn-block">
        Получить карту ситуации
      </button>
    </form>
  );
}

function ResultStep(props: {
  headingRef: HeadingRef;
  format: RazborFormat;
  map: ClientMap;
  onRestart: () => void;
  onExit: () => void;
}) {
  const { map, format } = props;
  return (
    <div className="rz-result">
      <p className="rz-eyebrow">Предварительная карта ситуации</p>
      <h1 ref={props.headingRef} tabIndex={-1} className="rz-step-title">
        Вот с чего можно начать
      </h1>

      <section className="rz-card rz-result-card" aria-label="Карта ситуации">
        <p>{map.short}</p>
        <h2 className="rz-h3">На чём стоит сосредоточиться</h2>
        <ul className="rz-list">
          {map.focus.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
        <h2 className="rz-h3">Как может пройти первая встреча</h2>
        <p>{map.first_session}</p>
        <h2 className="rz-h3">Следующий шаг</h2>
        <p>{map.next_step}</p>
      </section>

      <section className="rz-card rz-result-cta" aria-labelledby="rz-cta-title">
        <h2 id="rz-cta-title" className="rz-h3">
          {format === "individual"
            ? "Индивидуальная консультация"
            : "Семейная консультация"}
        </h2>
        <p className="rz-muted">
          {format === "individual" ? PRICE_INDIVIDUAL : PRICE_COUPLE} · 50 минут
          · онлайн
        </p>
        {format === "individual" ? (
          <>
            <TrackedLink
              goal="razbor_pay_click"
              href={PAY_INDIVIDUAL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rz-btn rz-btn-block"
            >
              Оплатить {PRICE_INDIVIDUAL}
            </TrackedLink>
            <TrackedLink
              goal="razbor_time_click"
              href={BOOKING_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rz-btn-secondary rz-btn-block"
            >
              Я оплатил(а) — выбрать время
            </TrackedLink>
            <p className="rz-muted rz-small">
              Оплата по СБП. Перенести встречу можно не позднее чем за 24 часа.
            </p>
          </>
        ) : (
          <>
            <TrackedLink
              goal="razbor_time_click"
              href={BOOKING_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rz-btn rz-btn-block"
            >
              Выбрать время
            </TrackedLink>
            <p className="rz-muted rz-small">
              Ссылку на оплату {PRICE_COUPLE} пришлёт Юлия после записи.
              Перенести встречу можно не позднее чем за 24 часа.
            </p>
          </>
        )}
      </section>

      <p className="rz-muted rz-small">
        Карта подготовлена с помощью AI по вашим ответам. Это не диагноз и не
        заключение — на встрече Юлия уточнит детали. Если вам сейчас очень
        тяжело, позвоните 112 или на телефон доверия.
      </p>

      <div className="rz-result-links">
        <button type="button" className="rz-link-btn" onClick={props.onExit}>
          ← На главную
        </button>
        <button type="button" className="rz-link-btn" onClick={props.onRestart}>
          Пройти заново
        </button>
      </div>
    </div>
  );
}
