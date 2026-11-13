/** All dates are shown in WIB (Asia/Jakarta), whatever the viewer's device timezone. */
export const TZ = "Asia/Jakarta";

const idr = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
export const formatIDR = (amount: number) => idr.format(amount);

/** 90 -> "1h 30m", 720 -> "12h", 0 -> "0h" */
export function formatMinutes(minutes: number) {
  const sign = minutes < 0 ? "-" : "";
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (m === 0) return `${sign}${h}h`;
  if (h === 0) return `${sign}${m}m`;
  return `${sign}${h}h ${m}m`;
}

const dateFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "numeric", month: "short", year: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
const timeFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false });

export const formatDate = (iso: string | null | undefined) => (iso ? dateFmt.format(new Date(iso)) : "—");
export const formatDateTime = (iso: string) => `${dateTimeFmt.format(new Date(iso))} WIB`;
export const formatTime = (iso: string) => timeFmt.format(new Date(iso));
export const formatLessonSlot = (startsAt: string, endsAt: string) =>
  `${dateTimeFmt.format(new Date(startsAt))}–${formatTime(endsAt)} WIB`;

/** "2026-11" -> "November 2026" */
export function formatMonth(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, 1)).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
}

/** Current month in WIB as "YYYY-MM". */
export function currentMonth() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit" }).formatToParts(new Date());
  return `${parts.find((p) => p.type === "year")!.value}-${parts.find((p) => p.type === "month")!.value}`;
}

export const humanize = (s: string) => s.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
