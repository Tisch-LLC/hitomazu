import { expect, test } from "bun:test";
import { QUESTIONS, questionTitle, visibleQuestions } from "./interview";
import { EMPTY_PROFILE, type Profile } from "./profile";

const ids = (p: Profile) => visibleQuestions(p).map((q) => q.id);

test("最初の質問は、相続かどうか", () => {
  expect(QUESTIONS[0]?.id).toBe("isInheritance");
});

test("相続のときは相続の質問が出て、持ち主の判断能力は聞かない", () => {
  const p: Profile = { ...EMPTY_PROFILE, isInheritance: "yes" };
  expect(ids(p)).toContain("deathDate");
  expect(ids(p)).toContain("hasFarmland");
  expect(ids(p)).not.toContain("ownerCanDecide");
});

test("相続でないときは、相続の質問を出さない", () => {
  const p: Profile = { ...EMPTY_PROFILE, isInheritance: "no" };
  expect(ids(p)).toEqual(["isInheritance", "ownerCanDecide", "propertyAddress", "userResidence", "nextVisit"]);
});

test("遺産の質問は、相続人の人数から基礎控除の額を示す", () => {
  const q = QUESTIONS.find((x) => x.id === "estateMayExceedBasic")!;
  expect(questionTitle(q, { ...EMPTY_PROFILE, heirsCount: 3 })).toContain("4,800万円");
});
