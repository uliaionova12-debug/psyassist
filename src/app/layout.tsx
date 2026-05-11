import type { Metadata } from "next";
import "./globals.css";

import { BillingCheckoutReturnListener } from "@/components/billing/BillingCheckoutReturnListener";
import { ConditionalAssistantFooter } from "@/components/layout/ConditionalAssistantFooter";
import { AppHeader } from "@/components/layout/AppHeader";

export const metadata: Metadata = {
  title: "PsyAssist",
  description:
    "Цифровой аналитический сервис профессиональной супервизионной поддержки для психологов и специалистов помогающих профессий",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/icon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "PsyAssist",
    statusBarStyle: "black-translucent",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className="h-full overflow-x-clip">
      <body className="flex min-h-screen min-h-dvh flex-col overflow-x-clip">
        <BillingCheckoutReturnListener />
        <AppHeader />
        {/* min-h-min prevents flex collapse that lets main overflow under the footer */}
        <div className="flex min-h-min min-w-0 flex-1 flex-col">{children}</div>
        <ConditionalAssistantFooter />
      </body>
    </html>
  );
}

