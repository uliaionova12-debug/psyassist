"use client";

import Image from "next/image";
import { useRef, useState } from "react";

export type Diploma = {
  src: string;
  title: string;
  details: string;
  width: number;
  height: number;
};

export function DiplomaGallery({ items }: { items: Diploma[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [active, setActive] = useState<Diploma | null>(null);

  const open = (d: Diploma) => {
    setActive(d);
    dialogRef.current?.showModal();
  };
  const close = () => dialogRef.current?.close();

  return (
    <>
      <ul className="rz-diplomas">
        {items.map((d) => (
          <li key={d.src} className="rz-card rz-diploma">
            <button
              type="button"
              className="rz-diploma-btn"
              onClick={() => open(d)}
              aria-label={`Увеличить скан: ${d.title}`}
            >
              <Image
                src={d.src}
                alt=""
                width={d.width}
                height={d.height}
                sizes="(max-width: 640px) 45vw, 220px"
                className="rz-diploma-img"
                loading="lazy"
              />
            </button>
            <p className="rz-diploma-title">{d.title}</p>
            <p className="rz-diploma-details">{d.details}</p>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialogRef}
        className="rz-dialog"
        aria-label={active ? `Скан: ${active.title}` : "Скан документа"}
        onClose={() => setActive(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        {active ? (
          <div className="rz-dialog-inner">
            <Image
              src={active.src}
              alt={`Скан: ${active.title}. ${active.details}`}
              width={active.width}
              height={active.height}
              sizes="(max-width: 900px) 100vw, 900px"
              className="rz-dialog-img"
            />
            <div className="rz-dialog-bar">
              <p>
                <strong>{active.title}</strong>
                <br />
                {active.details}
              </p>
              <button
                type="button"
                className="rz-btn rz-btn-small"
                onClick={close}
                autoFocus
              >
                Закрыть
              </button>
            </div>
          </div>
        ) : null}
      </dialog>
    </>
  );
}
