/**
 * JST (Asia/Tokyo) timezone utilities.
 * All server-side date logic should use these helpers instead of manual +9h offset.
 */

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** Convert a UTC Date to JST by adding 9 hours */
export const toJST = (date: Date) => new Date(date.getTime() + JST_OFFSET_MS);

/** Get current time in JST */
export const nowJST = () => toJST(new Date());

/** Get JST hour (0-23) from a UTC Date */
export const getJSTHour = (date: Date) => toJST(date).getUTCHours();

/** Get the start of today in UTC, calculated from JST midnight */
export const todayStartUTC = () => {
  const jst = nowJST();
  return new Date(Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate()) - JST_OFFSET_MS);
};

/** Get YYYY-MM-DD string in JST */
export const toJSTDateString = (date: Date) => {
  const jst = toJST(date);
  const y = jst.getUTCFullYear();
  const m = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(jst.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

/** Check if a UTC date falls on "today" in JST */
export const isTodayJST = (date: Date) => {
  const jstDate = toJST(date);
  const jstNow = nowJST();
  return (
    jstDate.getUTCFullYear() === jstNow.getUTCFullYear() &&
    jstDate.getUTCMonth() === jstNow.getUTCMonth() &&
    jstDate.getUTCDate() === jstNow.getUTCDate()
  );
};

/** Get JST day of week (0=Sunday) */
export const getJSTDay = () => nowJST().getUTCDay();
