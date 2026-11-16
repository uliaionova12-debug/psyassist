import type { Metadata } from "next";
import Image from "next/image";

import {
  PRICE_COUPLE,
  PRICE_INDIVIDUAL,
  RAZBOR_SITE_URL,
} from "@/lib/razbor/config";
import { RAZBOR_OG_IMAGE } from "@/lib/razbor/og";

import { RazborFooter } from "./_components/Footer";
import { DiplomaGallery } from "./_components/DiplomaGallery";
import { RazborApp, StartButton } from "./_components/RazborApp";
import { DIPLOMAS, FAQ, REVIEWS, STEPS, TOPICS_LIST } from "./content";

const TITLE = "Разбор ситуации — психолог Юлия Ионова";
const DESCRIPTION =
  "Бесплатный разбор: пять вопросов — и вы поймёте, с чего начать. Тревога, отношения, кризисы, выгорание. Консультации онлайн, 50 минут.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: RAZBOR_SITE_URL },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: "Юлия Ионова — психолог",
    images: [RAZBOR_OG_IMAGE],
    title: TITLE,
    description: DESCRIPTION,
    url: RAZBOR_SITE_URL,
  },
  twitter: { title: TITLE, description: DESCRIPTION },
};

export default function RazborPage() {
  return (
    <RazborApp>
      <div className="rz">
        <main>
          <section className="rz-hero" aria-labelledby="rz-hero-title">
            <div className="rz-container rz-hero-grid">
              <div className="rz-hero-text">
                <p className="rz-eyebrow">Юлия Ионова · психолог</p>
                <h1 id="rz-hero-title" className="rz-h1">
                  Разбор ситуации
                </h1>
                <p className="rz-lead">
                  Пять вопросов — и вы поймёте, с чего начать
                </p>
                <StartButton />
                <p className="rz-muted rz-small rz-hero-note">
                  Бесплатно. Около трёх минут
                </p>
              </div>
              <div className="rz-hero-photo">
                <Image
                  src="/razbor/portrait.jpg"
                  alt="Юлия Ионова, психолог"
                  width={1067}
                  height={1600}
                  priority
                  fetchPriority="high"
                  sizes="(max-width: 720px) calc(100vw - 40px), 300px"
                  className="rz-photo"
                />
              </div>
            </div>
          </section>

          <section className="rz-section" aria-labelledby="rz-how">
            <div className="rz-container">
              <h2 id="rz-how" className="rz-h2">
                Как это работает
              </h2>
              <ol className="rz-steps">
                {STEPS.map((s, i) => (
                  <li key={s.title} className="rz-step">
                    <span className="rz-step-num" aria-hidden="true">
                      {i + 1}
                    </span>
                    <div>
                      <h3 className="rz-h3">{s.title}</h3>
                      <p className="rz-muted">{s.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section className="rz-section" aria-labelledby="rz-topics">
            <div className="rz-container">
              <h2 id="rz-topics" className="rz-h2">
                С чем работаю
              </h2>
              <ul className="rz-topic-grid">
                {TOPICS_LIST.map((t) => (
                  <li key={t.title} className="rz-card">
                    <h3 className="rz-h3">{t.title}</h3>
                    <p className="rz-muted">{t.text}</p>
                  </li>
                ))}
              </ul>
              <p className="rz-muted rz-small rz-note">
                Я не ставлю диагнозы и не назначаю лечение. Если по вашей
                ситуации нужна помощь врача, скажу об этом прямо.
              </p>
            </div>
          </section>

          <section className="rz-section" aria-labelledby="rz-about">
            <div className="rz-container">
              <h2 id="rz-about" className="rz-h2">
                О психологе
              </h2>
              <div className="rz-about-grid">
                <Image
                  src="/razbor/office-green.jpg"
                  alt="Юлия Ионова в кабинете"
                  width={1067}
                  height={1600}
                  sizes="(max-width: 720px) calc(100vw - 40px), 280px"
                  className="rz-photo rz-about-photo"
                />
                <div>
                  <div
                    className="rz-scheme"
                    role="img"
                    aria-label="Психолог: семейный, клинический, социальный. 15 лет практики"
                  >
                    <div className="rz-scheme-root">Психолог</div>
                    <div className="rz-scheme-branches">
                      <span>семейный</span>
                      <span>клинический</span>
                      <span>социальный</span>
                    </div>
                    <div className="rz-scheme-years">15 лет практики</div>
                  </div>
                  <p>
                    Меня зовут Юлия Ионова. Помогаю взрослым и парам, когда
                    мешает тревога, не складываются отношения, случился кризис
                    или накопилось выгорание.
                  </p>
                  <p>
                    Работаю бережно и по делу: вместе разбираемся, что на самом
                    деле происходит и что с этим можно сделать. Консультирую
                    онлайн.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="rz-section" aria-labelledby="rz-edu">
            <div className="rz-container">
              <h2 id="rz-edu" className="rz-h2">
                Образование
              </h2>
              <p className="rz-badge">
                Аккредитованный психолог и супервизор ОППЛ, 2025
              </p>
              <DiplomaGallery items={DIPLOMAS} />
              <p className="rz-muted rz-small rz-note">
                Нажмите на документ, чтобы рассмотреть скан.
              </p>
            </div>
          </section>

          <section className="rz-section" aria-labelledby="rz-price">
            <div className="rz-container">
              <h2 id="rz-price" className="rz-h2">
                Формат и стоимость
              </h2>
              <div className="rz-prices">
                <div className="rz-card rz-price rz-price-free">
                  <h3 className="rz-h3">Диагностический разбор</h3>
                  <p className="rz-price-value">Бесплатно</p>
                  <p className="rz-muted">
                    Тот самый разбор из пяти вопросов в начале страницы.
                    Онлайн-анкета, около трёх минут, карта ситуации — сразу.
                  </p>
                  <StartButton className="rz-btn rz-btn-block" />
                </div>
                <div className="rz-card rz-price">
                  <h3 className="rz-h3">Индивидуальная консультация</h3>
                  <p className="rz-price-value">{PRICE_INDIVIDUAL}</p>
                  <p className="rz-muted">50 минут · онлайн</p>
                </div>
                <div className="rz-card rz-price">
                  <h3 className="rz-h3">Семейная консультация</h3>
                  <p className="rz-price-value">{PRICE_COUPLE}</p>
                  <p className="rz-muted">50 минут · онлайн · для пары</p>
                </div>
              </div>
              <p className="rz-note">
                Оплата — после записи, по СБП. Перенести встречу можно не
                позднее чем за 24 часа.
              </p>
              <Image
                src="/razbor/detail-laptop-crop.jpg"
                alt=""
                width={1040}
                height={420}
                sizes="(max-width: 720px) calc(100vw - 40px), 680px"
                className="rz-photo rz-wide-photo"
              />
            </div>
          </section>

          <section className="rz-section" aria-labelledby="rz-reviews">
            <div className="rz-container">
              <h2 id="rz-reviews" className="rz-h2">
                Отзывы
              </h2>
              <ul className="rz-reviews">
                {REVIEWS.map((r) => (
                  <li key={r.author} className="rz-card">
                    <figure className="rz-review">
                      <blockquote>
                        <p>«{r.text}»</p>
                      </blockquote>
                      <figcaption className="rz-muted rz-small">
                        {r.author}
                      </figcaption>
                    </figure>
                  </li>
                ))}
              </ul>
              <p className="rz-muted rz-small rz-note">
                Отзывы клиентов. Результат зависит от запроса и совместной
                работы.
              </p>
            </div>
          </section>

          <section className="rz-section" aria-labelledby="rz-faq">
            <div className="rz-container">
              <h2 id="rz-faq" className="rz-h2">
                Частые вопросы
              </h2>
              <div className="rz-faq">
                {FAQ.map((f) => (
                  <details key={f.q} className="rz-faq-item">
                    <summary>{f.q}</summary>
                    <p className="rz-muted">{f.a}</p>
                  </details>
                ))}
              </div>
            </div>
          </section>

          <section className="rz-section rz-final" aria-labelledby="rz-final">
            <div className="rz-container">
              <h2 id="rz-final" className="rz-h2">
                Начните с разбора
              </h2>
              <p className="rz-lead">
                Пять вопросов, около трёх минут — и станет понятнее, с чего
                начать.
              </p>
              <StartButton />
              <p className="rz-muted rz-small rz-hero-note">Бесплатно</p>
            </div>
          </section>
        </main>
        <RazborFooter />
      </div>
    </RazborApp>
  );
}
