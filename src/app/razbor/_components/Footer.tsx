import Link from "next/link";

import { CONTACTS } from "@/lib/razbor/config";

export function RazborFooter() {
  return (
    <footer className="rz-footer" data-razbor-footer="">
      <div className="rz-container">
        <nav aria-label="Документы" className="rz-footer-links">
          <Link href="/razbor/offer">Договор-оферта</Link>
          <Link href="/razbor/privacy">Политика конфиденциальности</Link>
        </nav>
        <p>
          <a href={`mailto:${CONTACTS.email}`}>{CONTACTS.email}</a>
          <br />
          <a href={CONTACTS.phoneHref}>{CONTACTS.phoneDisplay}</a>
        </p>
        <p className="rz-footer-legal">
          {CONTACTS.ownerFull}
          <br />
          ИНН {CONTACTS.inn} · ОГРНИП {CONTACTS.ogrnip}
        </p>
      </div>
    </footer>
  );
}
