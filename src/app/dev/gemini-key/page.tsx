import { redirect } from "next/navigation";

import { GeminiKeyDevClient } from "@/app/dev/gemini-key/GeminiKeyDevClient";

export default function DevGeminiKeyPage() {
  if (process.env.NODE_ENV !== "development") {
    redirect("/");
  }

  return <GeminiKeyDevClient />;
}
