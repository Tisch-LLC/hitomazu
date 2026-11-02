import { describe, expect, test } from "bun:test";
import { CHECKLIST, evaluateChecklist, groupEvaluated } from "./checklist";
import { EMPTY_PROFILE, type Profile } from "./profile";
import { SAMPLE_PROFILE } from "./sample";

function find(profile: Profile, id: string) {
  const e = evaluateChecklist(profile).find((x) => x.item.id === id);
  if (!e) throw new Error(`項目がありません: ${id}`);
  return e;
}

test("項目のIDが重複していない", () => {
  const ids = CHECKLIST.map((i) => i.id);
  expect(new Set(ids).size).toBe(ids.length);
});

test("出典のURLはすべて https", () => {
  for (const item of CHECKLIST) {
    for (const s of item.sources) expect(s.url.startsWith("https://")).toBe(true);
  }
});

const INHERITED: Profile = { ...EMPTY_PROFILE, situation: "inherited" };

describe("実家の状況で表示する項目が変わる", () => {
  const ids = (p: Profile) => evaluateChecklist(p).map((e) => e.item.id);

  test("相続のときだけ、相続の項目が出る", () => {
    expect(ids(INHERITED)).toContain("inheritance-decision");
    expect(ids(INHERITED)).toContain("koseki");
    expect(ids(INHERITED)).not.toContain("owner-decision");
  });

  test("持ち主が施設に移った場合：相続の項目は出ず、持ち主の意向と空き家の管理が出る", () => {
    const p: Profile = { ...EMPTY_PROFILE, situation: "owner_moved" };
    expect(ids(p)).not.toContain("inheritance-decision");
    expect(ids(p)).not.toContain("souzoku-touki");
    expect(ids(p)).toContain("owner-decision");
    expect(ids(p)).toContain("patrol");
    expect(ids(p)).toContain("plan-local");
  });

  test("持ち主が住んでいる場合：空き家の管理の項目は出ない", () => {
    const p: Profile = { ...EMPTY_PROFILE, situation: "owner_living" };
    expect(ids(p)).toContain("owner-decision");
    expect(ids(p)).not.toContain("patrol");
    expect(ids(p)).not.toContain("onsite-keys");
    expect(ids(p)).toContain("onsite-documents");
  });

  test("すでに自分の名義の場合：相続の項目も持ち主の項目も出ず、方針と管理が出る", () => {
    const p: Profile = { ...EMPTY_PROFILE, situation: "already_owned" };
    expect(ids(p)).not.toContain("inheritance-decision");
    expect(ids(p)).not.toContain("owner-decision");
    expect(ids(p)).toContain("plan-wishes");
    expect(ids(p)).toContain("patrol");
  });

  test("まだ答えていないときは、共通の項目だけ", () => {
    expect(ids(EMPTY_PROFILE)).not.toContain("inheritance-decision");
    expect(ids(EMPTY_PROFILE)).not.toContain("owner-decision");
    expect(ids(EMPTY_PROFILE)).toContain("touki-shoumei");
  });

  test("持ち主が判断できない状態なら、成年後見に触れる", () => {
    const p: Profile = { ...EMPTY_PROFILE, situation: "owner_moved", ownerCanDecide: "no" };
    expect(find(p, "owner-decision").evaluation.reason).toContain("成年後見");
  });
});

describe("田畑・山林の手続き（どの状況でも出る）", () => {
  test("田畑があれば対象", () => {
    const p: Profile = { ...EMPTY_PROFILE, situation: "owner_moved", hasFarmland: "yes" };
    expect(find(p, "plan-land").evaluation.status).toBe("applies");
  });

  test("田畑も山林もなければ対象外", () => {
    const p: Profile = { ...EMPTY_PROFILE, hasFarmland: "no", hasForest: "no" };
    expect(find(p, "plan-land").evaluation.status).toBe("not_applicable");
  });
});

test("要確認の項目には、その場で答えられる質問がある", () => {
  for (const id of ["jun-kakutei", "souzokuzei", "akiya-special", "nouchi-todoke", "shinrin-todoke"]) {
    const e = find(INHERITED, id);
    expect(e.item.followUps?.length ?? 0).toBeGreaterThan(0);
  }
});

describe("相続で、日付をまだ入力していないとき", () => {
  test("期限のある手続きは「要確認」になり、期限は出ない", () => {
    const e = find(INHERITED, "inheritance-decision");
    expect(e.evaluation.status).toBe("check");
    expect(e.deadline).toBeNull();
  });
});

describe("サンプル（2026-09-20 に亡くなった、相続人2人）", () => {
  test("相続放棄：3か月後", () => {
    const e = find(SAMPLE_PROFILE, "inheritance-decision");
    expect(e.evaluation.status).toBe("applies");
    expect(e.deadline?.date).toBe("2026-12-20");
  });

  test("準確定申告：4か月後", () => {
    expect(find(SAMPLE_PROFILE, "jun-kakutei").deadline?.date).toBe("2027-01-20");
  });

  test("相続税：10か月後、基礎控除 4,200万円を示す", () => {
    const e = find(SAMPLE_PROFILE, "souzokuzei");
    expect(e.deadline?.date).toBe("2027-07-20");
    expect(e.evaluation.status).toBe("check");
    expect(e.evaluation.reason).toContain("4,200万円");
  });

  test("相続登記：3年後", () => {
    expect(find(SAMPLE_PROFILE, "souzoku-touki").deadline?.date).toBe("2029-09-20");
  });

  test("農地の届出：農地があるので対象", () => {
    const e = find(SAMPLE_PROFILE, "nouchi-todoke");
    expect(e.evaluation.status).toBe("applies");
    expect(e.deadline?.date).toBe("2027-07-20");
  });

  test("森林の届出：分からないので要確認、期限は90日後", () => {
    const e = find(SAMPLE_PROFILE, "shinrin-todoke");
    expect(e.evaluation.status).toBe("check");
    expect(e.deadline?.date).toBe("2026-12-19");
  });

  test("空き家特例：1978年築・一人暮らしなので対象の可能性、期限は2027年12月31日で頭打ち", () => {
    const e = find(SAMPLE_PROFILE, "akiya-special");
    expect(e.evaluation.status).toBe("applies");
    expect(e.deadline?.date).toBe("2027-12-31");
  });
});

describe("相続登記の経過措置", () => {
  test("2024年4月1日より前の相続は、2027年3月31日まで", () => {
    const p: Profile = { ...INHERITED, deathDate: "2020-05-10" };
    expect(find(p, "souzoku-touki").deadline?.date).toBe("2027-03-31");
  });

  test("施行前の相続でも、知った日が遅ければ3年後", () => {
    const p: Profile = { ...INHERITED, deathDate: "2023-06-01", knownDate: "2024-10-01" };
    expect(find(p, "souzoku-touki").deadline?.date).toBe("2027-10-01");
  });
});

describe("空き家特例の判定", () => {
  test("昭和56年5月31日より後の建物は対象外", () => {
    const p: Profile = { ...SAMPLE_PROFILE, builtOld: "no" };
    expect(find(p, "akiya-special").evaluation.status).toBe("not_applicable");
  });

  test("建てた時期が分からなければ要確認", () => {
    const p: Profile = { ...SAMPLE_PROFILE, builtOld: "unknown" };
    expect(find(p, "akiya-special").evaluation.status).toBe("check");
  });

  test("2024年に亡くなった場合、2027年12月31日まで", () => {
    const p: Profile = { ...SAMPLE_PROFILE, deathDate: "2024-03-01" };
    expect(find(p, "akiya-special").deadline?.date).toBe("2027-12-31");
  });

  test("2023年1月に亡くなった場合、3年経過の年（2026年）の12月31日まで", () => {
    const p: Profile = { ...SAMPLE_PROFILE, deathDate: "2023-01-15" };
    expect(find(p, "akiya-special").deadline?.date).toBe("2026-12-31");
  });
});

test("相続人が1人なら、親族の窓口決めは対象外", () => {
  const p: Profile = { ...SAMPLE_PROFILE, heirsCount: 1 };
  expect(find(p, "family").evaluation.status).toBe("not_applicable");
});

test("農地がないと回答したら、届出は対象外で期限も出ない", () => {
  const p: Profile = { ...SAMPLE_PROFILE, hasFarmland: "no" };
  const e = find(p, "nouchi-todoke");
  expect(e.evaluation.status).toBe("not_applicable");
  expect(e.deadline).toBeNull();
});

test("グループ内では、対象外が後ろ、期限の早い順", () => {
  const p: Profile = { ...SAMPLE_PROFILE, hasForest: "no" };
  const grouped = groupEvaluated(evaluateChecklist(p));
  const ids = grouped.deadline.map((e) => e.item.id);
  expect(ids[0]).toBe("inheritance-decision");
  expect(ids.at(-1)).toBe("shinrin-todoke");
});

test("要確認でも期限が近ければ先に並ぶ", () => {
  const grouped = groupEvaluated(evaluateChecklist(SAMPLE_PROFILE));
  // 森林の届出（要確認、12/19）が相続放棄（要対応、12/20）より先
  expect(grouped.deadline[0]?.item.id).toBe("shinrin-todoke");
});
