import { expect, test } from "bun:test";
import { EMPTY_PROFILE, type Profile } from "./profile";
import { findRisks } from "./risks";
import { SAMPLE_PROFILE, SAMPLE_SHEET } from "./sample";
import { EMPTY_SHEET } from "./sheet";

const ids = (p: Profile, a = EMPTY_SHEET) => findRisks(p, a).map((r) => r.id);

test("何も答えていなければ、何も出さない", () => {
  expect(ids(EMPTY_PROFILE)).toEqual([]);
});

test("サンプルでは、共有・登記・道・農地・傷み・家財が出る", () => {
  const list = ids(SAMPLE_PROFILE, { ...SAMPLE_SHEET, coOwnersAgree: "discussing" });
  expect(list).toEqual(["co-ownership", "registration", "road", "land", "damage", "belongings"]);
});

test("相続人の考えがそろっていれば、共有の点は出さない", () => {
  expect(ids(SAMPLE_PROFILE, SAMPLE_SHEET)).not.toContain("co-ownership");
});

test("持ち主が判断できないときは、最初に出す", () => {
  const p: Profile = { ...EMPTY_PROFILE, situation: "owner_moved", ownerCanDecide: "no", nextVisit: "2026-12-28" };
  expect(ids(p)[0]).toBe("owner-capacity");
});

test("持ち主が存命なら、境目が分からないだけでも早めの確認を勧める", () => {
  const p: Profile = { ...EMPTY_PROFILE, situation: "owner_living" };
  expect(ids(p, { ...EMPTY_SHEET, boundary: "unknown" })).toContain("boundary");
  expect(ids({ ...EMPTY_PROFILE, situation: "inherited" }, { ...EMPTY_SHEET, boundary: "unknown" })).not.toContain("boundary");
});

test("空き家で、次の帰省が決まっていなければ見回りを勧める", () => {
  expect(ids({ ...EMPTY_PROFILE, situation: "owner_moved" })).toContain("no-visit");
  expect(ids({ ...EMPTY_PROFILE, situation: "owner_living" })).not.toContain("no-visit");
});
