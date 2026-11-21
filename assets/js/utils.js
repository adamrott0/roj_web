/**
 * Sdílené utility pro web Oddíl ROJ
 * Formátování datumu, telefonů, timestamps, escapování HTML a stahování souborů.
 */

export function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

export function formatDate(iso) {
  if (!iso) return "";
  const parts = iso.split("-").map(Number);
  if (parts.length < 3 || parts.some(isNaN)) return iso;
  const [y, m, d] = parts;
  return `${d}.\u00A0${m}.\u00A0${y}`;
}

export function formatDateRange(start, end) {
  if (!start) return "";
  const startParts = start.split("-").map(Number);
  if (startParts.length < 3 || startParts.some(isNaN)) return start;
  const [sy, sm, sd] = startParts;

  // Používáme nedělitelné mezery (\u00A0), aby se termín nikdy nezalomil uprostřed data
  const nbsp = "\u00A0";

  if (!end || end === start) {
    return `${sd}.${nbsp}${sm}.${nbsp}${sy}`;
  }

  const endParts = end.split("-").map(Number);
  if (endParts.length < 3 || endParts.some(isNaN)) {
    return `${sd}.${nbsp}${sm}.${nbsp}${sy}${nbsp}–${nbsp}${end}`;
  }
  const [ey, em, ed] = endParts;

  if (sy === ey && sm === em) {
    return `${sd}.${nbsp}–${nbsp}${ed}.${nbsp}${sm}.${nbsp}${sy}`;
  }
  if (sy === ey) {
    return `${sd}.${nbsp}${sm}.${nbsp}–${nbsp}${ed}.${nbsp}${em}.${nbsp}${sy}`;
  }
  return `${sd}.${nbsp}${sm}.${nbsp}${sy}${nbsp}–${nbsp}${ed}.${nbsp}${em}.${nbsp}${ey}`;
}

export function formatTimestamp(ts) {
  if (!ts) return "–";
  let date;
  if (typeof ts.toDate === "function") {
    date = ts.toDate();
  } else if (ts.seconds) {
    date = new Date(ts.seconds * 1000);
  } else if (ts instanceof Date) {
    date = ts;
  } else {
    date = new Date(ts);
  }
  if (Number.isNaN(date.getTime())) return "–";

  const d = date.getDate();
  const m = date.getMonth() + 1;
  const y = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${d}. ${m}. ${y} ${hh}:${mm}`;
}

export function formatPhoneNumber(value) {
  if (!value) return "";
  const trimmed = value.trim();
  const isInternational = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");

  if (!digits) return isInternational ? "+" : "";

  if (isInternational && digits.startsWith("420")) {
    const rest = digits.slice(3, 12);
    const groups = rest.match(/.{1,3}/g) || [];
    return `+420 ${groups.join(" ")}`.trim();
  }

  if (!isInternational) {
    const groups = digits.slice(0, 9).match(/.{1,3}/g) || [];
    return groups.join(" ");
  }

  const groups = digits.slice(0, 15).match(/.{1,3}/g) || [];
  return `+${groups.join(" ")}`;
}

export function getTodayIso() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function sanitizeFilename(name) {
  return (name || "soubor")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\\/:*?"<>|]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .toLowerCase();
}

export async function downloadImage(url, filename, buttonEl) {
  const originalHtml = buttonEl ? buttonEl.innerHTML : "";
  if (buttonEl) {
    buttonEl.disabled = true;
    buttonEl.textContent = "Stahuji…";
  }
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(blobUrl);
  } catch (err) {
    console.warn("Přímé stažení se nezdařilo, otevírám v novém okně:", err);
    window.open(url, "_blank", "noopener,noreferrer");
  } finally {
    if (buttonEl) {
      buttonEl.disabled = false;
      buttonEl.innerHTML = originalHtml;
    }
  }
}
