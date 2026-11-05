import { expect, test } from "bun:test";
import { toProfileUpdates, type UnderstandOutput } from "./understand";

const EMPTY: UnderstandOutput = {
  situation: null,
  ownerCanDecide: null,
  deathDate: null,
  heirsCount: null,
  debtConcern: null,
  hasWill: null,
  deceasedHadIncome: null,
  estateMayExceedBasic: null,
  propertyAddress: null,
  builtOld: null,
  deceasedLivedAlone: null,
  hasFarmland: null,
  hasForest: null,
  nextVisit: null,
  evidence: [],
  unclear: [],
};

const TODAY = "2026-11-05";

test("書かれていない項目は反映しない", () => {
  expect(toProfileUpdates(EMPTY, TODAY).updates).toEqual([]);
});

test("読み取った項目と根拠の引用を返す", () => {
  const r = toProfileUpdates(
    {
      ...EMPTY,
      situation: "owner_moved",
      ownerCanDecide: "no",
      propertyAddress: "島根県松江市",
      hasFarmland: "yes",
      evidence: [{ field: "situation", quote: "母が施設に入って" }],
    },
    TODAY,
  );
  expect(r.updates.map((u) => [u.field, u.value])).toEqual([
    ["situation", "owner_moved"],
    ["propertyAddress", "島根県松江市"],
    ["ownerCanDecide", "no"],
    ["hasFarmland", "yes"],
  ]);
  expect(r.updates[0]?.quote).toBe("母が施設に入って");
});

test("ありえない日付や人数は捨てる", () => {
  const r = toProfileUpdates(
    { ...EMPTY, deathDate: "2027-01-01", nextVisit: "2026-02-30", heirsCount: 0 },
    TODAY,
  );
  expect(r.updates).toEqual([]);
});

test("過去の相続開始日と、これからの帰省日は受け付ける", () => {
  const r = toProfileUpdates({ ...EMPTY, deathDate: "2026-09-20", nextVisit: "2026-12-28" }, TODAY);
  expect(r.updates.map((u) => u.field)).toEqual(["deathDate", "nextVisit"]);
});

test("はっきりしなかったことは3つまで", () => {
  const r = toProfileUpdates({ ...EMPTY, unclear: ["a", "b", "c", "d"] }, TODAY);
  expect(r.unclear).toEqual(["a", "b", "c"]);
});
