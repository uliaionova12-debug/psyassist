import type { Metadata } from "next";
import "./globals.css";

import { AppHeader } from "@/components/layout/AppHeader";

export const metadata: Metadata = {
  title: "PsyAssist",
  description: "AI-супервизор для психологов"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <AppHeader />
        {children}
      </body>
    </html>
  );
}

