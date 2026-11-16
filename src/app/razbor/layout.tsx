import type { Metadata, Viewport } from "next";

import { RAZBOR_SITE_URL } from "@/lib/razbor/config";
import { RAZBOR_OG_IMAGE } from "@/lib/razbor/og";

import { Metrika } from "./_components/Metrika";
import "./razbor.css";

export const metadata: Metadata = {
  metadataBase: new URL(RAZBOR_SITE_URL),
  applicationName: "Разбор ситуации — Юлия Ионова",
  appleWebApp: { title: "Разбор ситуации" },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: "Юлия Ионова — психолог",
    images: [RAZBOR_OG_IMAGE],
  },
  twitter: { card: "summary_large_image", images: ["/razbor/og.jpg"] },
};

export const viewport: Viewport = {
  themeColor: "#F5EFE6",
};

export default function RazborLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="rz-root" data-razbor="">
      {children}
      <Metrika />
    </div>
  );
}
