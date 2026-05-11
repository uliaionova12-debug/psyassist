export type ClinicalCopyMethod = "clipboard" | "execCommand" | "prompt";

/**
 * Copy plain text in production: Clipboard API when permitted, else legacy execCommand,
 * else prompt with selectable text.
 */
export async function copyClinicalPlainText(text: string): Promise<{
  ok: boolean;
  method: ClinicalCopyMethod;
}> {
  if (typeof window === "undefined") {
    return { ok: false, method: "clipboard" };
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return { ok: true, method: "clipboard" };
    }
  } catch {
    // fall through
  }

  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "true");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    ta.style.top = "0";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const copied = document.execCommand("copy");
    document.body.removeChild(ta);
    if (copied) {
      return { ok: true, method: "execCommand" };
    }
  } catch {
    // fall through
  }

  window.prompt("Выделите текст и скопируйте (⌘C / Ctrl+C):", text);
  return { ok: true, method: "prompt" };
}
