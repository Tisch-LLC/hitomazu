import type { Profile } from "./profile";

/**
 * デモ用の架空のプロフィール。実在の人物・物件ではない。
 * 東京に住む会社員が、松江市の実家を相続したという設定。
 */
export const SAMPLE_PROFILE: Profile = {
  isInheritance: "yes",
  ownerCanDecide: "unknown",
  deathDate: "2026-09-20",
  knownDate: null,
  heirsCount: 2,
  hasWill: "unknown",
  debtConcern: "unknown",
  deceasedHadIncome: "yes",
  estateMayExceedBasic: "unknown",
  propertyAddress: "島根県松江市（架空の住所）",
  builtOld: "yes",
  deceasedLivedAlone: "yes",
  hasFarmland: "yes",
  hasForest: "unknown",
  userResidence: "東京都",
  nextVisit: "2026-12-28",
};
