import type { ISODate } from "./dates";

/** はい／いいえ／分からない */
export type Tri = "yes" | "no" | "unknown";

/**
 * 実家のいまの状況。
 * - inherited：親などが亡くなり、相続した（する予定）
 * - owner_moved：持ち主（親など）は存命だが、施設や子の家に移って実家が空いている
 * - owner_living：持ち主がまだ実家に住んでいて、将来に備えたい
 * - already_owned：すでに自分や家族の名義になっていて、実家が空いている
 */
export type Situation = "inherited" | "owner_moved" | "owner_living" | "already_owned";

export const SITUATION_LABELS: Record<Situation, string> = {
  inherited: "親などが亡くなり、相続した（する予定）",
  owner_moved: "持ち主は存命だが、施設などに移って空いている",
  owner_living: "持ち主がまだ住んでいて、将来に備えたい",
  already_owned: "すでに自分や家族の名義で、空いている",
};

/**
 * 利用者の状況。分からない項目は null か "unknown" のままにし、チェックリスト側で「要確認」として扱う。
 */
export interface Profile {
  /** 実家のいまの状況。まだ答えていなければ null */
  situation: Situation | null;
  /** 持ち主が存命の場合：自分で契約などを判断できる状態か */
  ownerCanDecide: Tri;
  /** 亡くなった日（相続開始日） */
  deathDate: ISODate | null;
  /** 相続の開始を知った日。空なら亡くなった日と同じとみなす */
  knownDate: ISODate | null;
  /** 相続人の人数（法定相続人） */
  heirsCount: number | null;
  /** 遺言書があるか */
  hasWill: Tri;
  /** 借金や保証人の心配があるか */
  debtConcern: Tri;
  /** 亡くなった人に、確定申告が必要な所得があったか（年金が一定額以上、事業・不動産収入など） */
  deceasedHadIncome: Tri;
  /** 遺産の合計が相続税の基礎控除を超えそうか */
  estateMayExceedBasic: Tri;
  /** 実家の所在地 */
  propertyAddress: string;
  /** 実家が昭和56年（1981年）5月31日以前に建てられたか（空き家特例・耐震の目安） */
  builtOld: Tri;
  /** 亡くなる直前、実家で一人暮らしだったか（空き家特例の要件の一つ） */
  deceasedLivedAlone: Tri;
  /** 実家の土地に田・畑が含まれるか */
  hasFarmland: Tri;
  /** 実家の土地に山林が含まれるか */
  hasForest: Tri;
  /** 自分の住まい（都道府県・市区町村） */
  userResidence: string;
  /** 次に帰省する予定の日 */
  nextVisit: ISODate | null;
}

export const EMPTY_PROFILE: Profile = {
  situation: null,
  ownerCanDecide: "unknown",
  deathDate: null,
  knownDate: null,
  heirsCount: null,
  hasWill: "unknown",
  debtConcern: "unknown",
  deceasedHadIncome: "unknown",
  estateMayExceedBasic: "unknown",
  propertyAddress: "",
  builtOld: "unknown",
  deceasedLivedAlone: "unknown",
  hasFarmland: "unknown",
  hasForest: "unknown",
  userResidence: "",
  nextVisit: null,
};

/** はい／いいえ／分からないで答える項目の名前 */
export type TriField = {
  [K in keyof Profile]: Profile[K] extends Tri ? K : never;
}[keyof Profile];

export function isInherited(p: Profile): boolean {
  return p.situation === "inherited";
}

/** 持ち主が存命か（相続ではない） */
export function isOwnerAlive(p: Profile): boolean {
  return p.situation === "owner_moved" || p.situation === "owner_living";
}

/** 実家に誰も住んでいないか */
export function isVacant(p: Profile): boolean {
  return p.situation === "inherited" || p.situation === "owner_moved" || p.situation === "already_owned";
}

/** 相続の開始を知った日。入力がなければ亡くなった日を使う。 */
export function effectiveKnownDate(p: Profile): ISODate | null {
  return p.knownDate ?? p.deathDate;
}

/** 相続税の基礎控除額（万円）：3,000万円 ＋ 600万円 × 法定相続人の数 */
export function basicDeductionManYen(heirsCount: number): number {
  return 3000 + 600 * heirsCount;
}
