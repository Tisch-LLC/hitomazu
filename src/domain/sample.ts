import type { Profile } from "./profile";
import { EMPTY_SHEET, type SheetAnswers } from "./sheet";

/**
 * デモ用の架空のプロフィール。実在の人物・物件ではない。
 * 東京に住む会社員が、松江市の実家を相続したという設定。
 */
export const SAMPLE_PROFILE: Profile = {
  situation: "inherited",
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

/** デモ用の架空のシートの回答 */
export const SAMPLE_SHEET: SheetAnswers = {
  ...EMPTY_SHEET,
  wish: "consult",
  timing: "within_year",
  cleanupHelp: "yes",
  propertyType: "land_building",
  registration: "not_yet",
  coOwnersAgree: "agree",
  renovated: "yes",
  leak: "yes",
  termite: "unknown",
  tilt: "no",
  equipmentBroken: "yes",
  road: "narrow",
  parking: "no",
  boundary: "unknown",
  water: "public",
  sewage: "septic",
  gas: "propane",
  docDeed: "unknown",
  docTaxNotice: "yes",
  docRegistry: "no",
  docSurvey: "unknown",
  docDrawings: "no",
  belongings: "full",
  keys: "relative",
  photos: "yes",
  notes: "台所の天井に雨もりの跡があります（10年ほど前に一度修理）。冬は家の前の坂道が凍ることがあります。",
};
