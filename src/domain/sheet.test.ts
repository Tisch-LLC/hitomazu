import { describe, expect, test } from "bun:test";
import { EMPTY_PROFILE, type Profile } from "./profile";
import { SAMPLE_PROFILE } from "./sample";
import { buildSheet, EMPTY_SHEET, questionsForAgent, SHEET_STEPS, visibleSheetQuestions, type SheetAnswers } from "./sheet";

const rowsOf = (p: Profile, a: SheetAnswers) =>
  buildSheet(p, a, "2026-11-02").sections.flatMap((s) => s.rows.map((r) => [r.label, r.value] as const));

test("質問の field が重複していない", () => {
  const fields = SHEET_STEPS.flatMap((s) => s.questions.map((q) => q.field));
  expect(new Set(fields).size).toBe(fields.length);
});

describe("相続かどうかで聞く内容が変わる", () => {
  const rights = SHEET_STEPS.find((s) => s.id === "rights")!;
  test("相続なら相続登記を聞く", () => {
    const ids = visibleSheetQuestions(rights, SAMPLE_PROFILE).map((q) => q.field);
    expect(ids).toContain("registration");
    expect(ids).toContain("coOwnersAgree");
  });
  test("持ち主が存命なら聞かない", () => {
    const ids = visibleSheetQuestions(rights, { ...EMPTY_PROFILE, situation: "owner_moved" }).map((q) => q.field);
    expect(ids).toEqual(["propertyType"]);
  });
});

test("答えていない項目は「分からない」と表示する", () => {
  const sheet = buildSheet(EMPTY_PROFILE, EMPTY_SHEET, "2026-11-02");
  const all = sheet.sections.flatMap((s) => s.rows);
  expect(all.every((r) => r.unknown)).toBe(true);
  expect(all[0]?.value).toContain("分からない");
});

test("回答がシートに反映される", () => {
  const a: SheetAnswers = { ...EMPTY_SHEET, wish: "sell", sewage: "septic", leak: "yes", registration: "not_yet" };
  const rows = rowsOf(SAMPLE_PROFILE, a);
  expect(rows).toContainEqual(["希望", "売りたい"]);
  expect(rows).toContainEqual(["排水", "浄化槽"]);
  expect(rows).toContainEqual(["雨もり・天井のしみ", "あり（過去を含む）"]);
  expect(rows).toContainEqual(["相続人の人数", "2人"]);
  expect(rows).toContainEqual(["所在地", "島根県松江市（架空の住所）"]);
});

describe("不動産会社に確認したいこと", () => {
  test("査定の根拠と費用は、いつも聞く", () => {
    const q = questionsForAgent(EMPTY_PROFILE, EMPTY_SHEET);
    expect(q[0]).toContain("根拠");
    expect(q[1]).toContain("仲介手数料");
  });

  test("相続登記がまだなら、司法書士の紹介を聞く", () => {
    const q = questionsForAgent(SAMPLE_PROFILE, { ...EMPTY_SHEET, registration: "not_yet" });
    expect(q.some((x) => x.includes("司法書士"))).toBe(true);
  });

  test("道が車で通れて、境界も分かれば、接道と測量は聞かない", () => {
    const q = questionsForAgent(SAMPLE_PROFILE, { ...EMPTY_SHEET, road: "car_ok", boundary: "yes" });
    expect(q.some((x) => x.includes("建て替え"))).toBe(false);
    expect(q.some((x) => x.includes("測量"))).toBe(false);
  });

  test("持ち主が判断できないなら、成年後見の相談先を聞く", () => {
    const p: Profile = { ...EMPTY_PROFILE, situation: "owner_moved", ownerCanDecide: "no" };
    expect(questionsForAgent(p, EMPTY_SHEET).some((x) => x.includes("成年後見"))).toBe(true);
  });
});
