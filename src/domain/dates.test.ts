import { describe, expect, test } from "bun:test";
import { addDays, addMonthsClamped, addYearsClamped, daysBetween, formatJapaneseDate, isISODate } from "./dates";

describe("addMonthsClamped（nか月以内の期限）", () => {
  test("同じ日付の nか月後になる", () => {
    expect(addMonthsClamped("2026-11-01", 3)).toBe("2027-02-01");
    expect(addMonthsClamped("2026-09-20", 10)).toBe("2027-07-20");
  });

  test("応当する日がない月は、その月の末日になる", () => {
    expect(addMonthsClamped("2026-11-30", 3)).toBe("2027-02-28");
    expect(addMonthsClamped("2027-11-30", 3)).toBe("2028-02-29"); // うるう年
    expect(addMonthsClamped("2026-01-31", 1)).toBe("2026-02-28");
  });

  test("年をまたぐ", () => {
    expect(addMonthsClamped("2026-12-15", 4)).toBe("2027-04-15");
  });
});

test("addYearsClamped：2月29日の3年後は2月28日", () => {
  expect(addYearsClamped("2028-02-29", 3)).toBe("2031-02-28");
});

test("addDays：90日以内", () => {
  expect(addDays("2026-09-20", 90)).toBe("2026-12-19");
});

test("daysBetween", () => {
  expect(daysBetween("2026-11-02", "2026-12-20")).toBe(48);
  expect(daysBetween("2026-11-02", "2026-11-01")).toBe(-1);
});

test("isISODate", () => {
  expect(isISODate("2026-02-28")).toBe(true);
  expect(isISODate("2026-02-30")).toBe(false);
  expect(isISODate("2026/02/01")).toBe(false);
  expect(isISODate(null)).toBe(false);
});

test("formatJapaneseDate", () => {
  expect(formatJapaneseDate("2027-02-01")).toBe("2027年2月1日（月）");
});
