/**
 * 日付は "YYYY-MM-DD" の文字列で扱う。タイムゾーンの影響を避けるため、計算は UTC で行う。
 */
export type ISODate = string;

const ISO_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isISODate(value: unknown): value is ISODate {
  if (typeof value !== "string") return false;
  const m = ISO_PATTERN.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

function toUTC(date: ISODate): Date {
  const m = ISO_PATTERN.exec(date);
  if (!m) throw new Error(`日付の形式が正しくありません: ${date}`);
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

function fromUTC(date: Date): ISODate {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/**
 * 「ある日から nか月以内」の期限日を求める。
 *
 * 民法は初日を数えず（140条）、月で定めた期間は起算日に応当する日の前日に満了する（143条）。
 * 結果として、期限日は「基準日の nか月後の同じ日」になる。
 * 応当する日がない月（例：11月30日の3か月後）は、その月の末日になる。
 */
export function addMonthsClamped(date: ISODate, months: number): ISODate {
  const base = toUTC(date);
  const totalMonths = base.getUTCFullYear() * 12 + base.getUTCMonth() + months;
  const year = Math.floor(totalMonths / 12);
  const monthIndex = totalMonths % 12;
  const day = Math.min(base.getUTCDate(), daysInMonth(year, monthIndex));
  return fromUTC(new Date(Date.UTC(year, monthIndex, day)));
}

export function addYearsClamped(date: ISODate, years: number): ISODate {
  return addMonthsClamped(date, years * 12);
}

/** 「ある日から n日以内」の期限日（初日を数えない）。 */
export function addDays(date: ISODate, days: number): ISODate {
  const base = toUTC(date);
  base.setUTCDate(base.getUTCDate() + days);
  return fromUTC(base);
}

export function yearOf(date: ISODate): number {
  return toUTC(date).getUTCFullYear();
}

export function endOfYear(year: number): ISODate {
  return `${year}-12-31`;
}

export function minDate(a: ISODate, b: ISODate): ISODate {
  return a <= b ? a : b;
}

export function maxDate(a: ISODate, b: ISODate): ISODate {
  return a >= b ? a : b;
}

/** from から to までの日数（to が過去なら負の値）。 */
export function daysBetween(from: ISODate, to: ISODate): number {
  return Math.round((toUTC(to).getTime() - toUTC(from).getTime()) / 86_400_000);
}

/** 利用者の端末の日付で今日を返す。 */
export function todayISO(now: Date = new Date()): ISODate {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

/** 例：2027年2月1日（月） */
export function formatJapaneseDate(date: ISODate): string {
  const d = toUTC(date);
  return `${d.getUTCFullYear()}年${d.getUTCMonth() + 1}月${d.getUTCDate()}日（${WEEKDAYS[d.getUTCDay()]}）`;
}
