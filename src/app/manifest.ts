import type { MetadataRoute } from "next";

const DESC =
  "Цифровой аналитический сервис профессиональной супервизионной поддержки для психологов и специалистов помогающих профессий";

/** PNG icons live under `public/icons/` (see `scripts/generate-brand-icons.cjs`). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PsyAssist",
    short_name: "PsyAssist",
    description: DESC,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#050508",
    theme_color: "#050508",
    icons: [
      { src: "/icons/icon-16.png", sizes: "16x16", type: "image/png" },
      { src: "/icons/icon-32.png", sizes: "32x32", type: "image/png" },
      { src: "/icons/icon-48.png", sizes: "48x48", type: "image/png" },
      { src: "/icons/icon-72.png", sizes: "72x72", type: "image/png" },
      { src: "/icons/icon-96.png", sizes: "96x96", type: "image/png" },
      { src: "/icons/icon-128.png", sizes: "128x128", type: "image/png" },
      { src: "/icons/icon-180.png", sizes: "180x180", type: "image/png" },
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-256.png", sizes: "256x256", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-1024.png", sizes: "1024x1024", type: "image/png" },
    ],
  };
}
