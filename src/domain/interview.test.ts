import { expect, test } from "bun:test";
import { QUESTIONS, visibleQuestions } from "./interview";
import { EMPTY_PROFILE, type Profile } from "./profile";

const ids = (p: Profile) => visibleQuestions(p).map((q) => q.id);

test("最初の質問は、実家の状況", () => {
  expect(QUESTIONS[0]?.id).toBe("situation");
});

test("相続のときだけ、相続の質問が出る（3問）", () => {
  const p: Profile = { ...EMPTY_PROFILE, situation: "inherited" };
  expect(ids(p)).toEqual([
    "situation",
    "deathDate",
    "heirsCount",
    "debtConcern",
    "propertyAddress",
    "builtOld",
    "hasFarmland",
    "hasForest",
    "nextVisit",
  ]);
});

test("持ち主が存命なら、相続の質問は出ず、判断能力を聞く", () => {
  for (const situation of ["owner_moved", "owner_living"] as const) {
    const list = ids({ ...EMPTY_PROFILE, situation });
    expect(list).toContain("ownerCanDecide");
    expect(list).not.toContain("deathDate");
  }
});

test("すでに名義が自分のときは、実家のことだけを聞く", () => {
  expect(ids({ ...EMPTY_PROFILE, situation: "already_owned" })).toEqual([
    "situation",
    "propertyAddress",
    "builtOld",
    "hasFarmland",
    "hasForest",
    "nextVisit",
  ]);
});
