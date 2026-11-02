import { formatJapaneseDate, type ISODate } from "./dates";
import { isInherited, isOwnerAlive, SITUATION_LABELS, type Profile, type Tri } from "./profile";

/**
 * 不動産会社に渡す「ご相談シート」。
 *
 * 項目は、売主が書く「物件状況報告書（告知書）」「付帯設備表」と、査定のときに使われる書類を参考にした。
 * 地方の空き家で問題になりやすい点（前の道路、排水、境界、家財）を加えている。
 * 分からない項目は「分からない」と書くことで、不動産会社が何を調べればよいか分かるようにする。
 * 氏名・電話番号は保存せず、印刷したシートに手書きしてもらう。
 */

export type Choice<V extends string> = V | null;

export interface SheetAnswers {
  wish: Choice<"sell" | "rent" | "consult" | "manage">;
  timing: Choice<"soon" | "within_year" | "undecided">;
  cleanupHelp: Tri;
  propertyType: Choice<"land_building" | "land_only" | "unknown">;
  registration: Choice<"done" | "not_yet" | "unknown">;
  coOwnersAgree: Choice<"agree" | "discussing" | "unknown">;
  renovated: Tri;
  leak: Tri;
  termite: Tri;
  tilt: Tri;
  equipmentBroken: Tri;
  road: Choice<"car_ok" | "narrow" | "unknown">;
  parking: Tri;
  boundary: Tri;
  water: Choice<"public" | "well" | "unknown">;
  sewage: Choice<"sewer" | "septic" | "pit" | "unknown">;
  gas: Choice<"city" | "propane" | "none" | "unknown">;
  docDeed: Tri;
  docTaxNotice: Tri;
  docRegistry: Tri;
  docSurvey: Tri;
  docDrawings: Tri;
  belongings: Choice<"few" | "some" | "full" | "unknown">;
  keys: Choice<"me" | "relative" | "unknown">;
  photos: Tri;
  notes: string;
}

export const EMPTY_SHEET: SheetAnswers = {
  wish: null,
  timing: null,
  cleanupHelp: "unknown",
  propertyType: null,
  registration: null,
  coOwnersAgree: null,
  renovated: "unknown",
  leak: "unknown",
  termite: "unknown",
  tilt: "unknown",
  equipmentBroken: "unknown",
  road: null,
  parking: "unknown",
  boundary: "unknown",
  water: null,
  sewage: null,
  gas: null,
  docDeed: "unknown",
  docTaxNotice: "unknown",
  docRegistry: "unknown",
  docSurvey: "unknown",
  docDrawings: "unknown",
  belongings: null,
  keys: null,
  photos: "unknown",
  notes: "",
};

type ChoiceField = Exclude<keyof SheetAnswers, "notes">;

export interface SheetOption {
  value: string;
  label: string;
}

export interface SheetQuestion {
  field: ChoiceField;
  title: string;
  help?: string;
  options: SheetOption[];
  when?: (p: Profile) => boolean;
}

export interface SheetStep {
  id: string;
  title: string;
  lead: string;
  questions: SheetQuestion[];
  /** 自由に書ける欄を出すか */
  notes?: boolean;
}

const ARU: SheetOption[] = [
  { value: "yes", label: "ある" },
  { value: "no", label: "ない" },
  { value: "unknown", label: "分からない" },
];

const HAI: SheetOption[] = [
  { value: "yes", label: "はい" },
  { value: "no", label: "いいえ" },
  { value: "unknown", label: "分からない" },
];

export const SHEET_STEPS: SheetStep[] = [
  {
    id: "wish",
    title: "ご相談したいこと",
    lead: "不動産会社に、何を相談したいかを伝えます。",
    questions: [
      {
        field: "wish",
        title: "実家をどうしたいですか？",
        options: [
          { value: "sell", label: "売りたい" },
          { value: "rent", label: "貸したい" },
          { value: "consult", label: "売るか貸すか、相談して決めたい" },
          { value: "manage", label: "しばらく持っておきたい（管理の相談）" },
        ],
      },
      {
        field: "timing",
        title: "いつごろまでに決めたいですか？",
        options: [
          { value: "soon", label: "なるべく早く" },
          { value: "within_year", label: "1年以内" },
          { value: "undecided", label: "まだ決めていない" },
        ],
      },
      { field: "cleanupHelp", title: "家財の片付けも、あわせて相談したいですか？", options: HAI },
    ],
  },
  {
    id: "rights",
    title: "持ち主と名義のこと",
    lead: "誰が売ったり貸したりできるかは、不動産会社が最初に確かめる点です。",
    questions: [
      {
        field: "propertyType",
        title: "相談したいのは、どれですか？",
        options: [
          { value: "land_building", label: "土地と建物" },
          { value: "land_only", label: "土地だけ（建物はない）" },
          { value: "unknown", label: "分からない" },
        ],
      },
      {
        field: "registration",
        title: "名義を、相続した人に変える手続き（相続登記）は済んでいますか？",
        help: "済んでいないと、売ることはできません。不動産会社が司法書士を紹介してくれることもあります。",
        when: isInherited,
        options: [
          { value: "done", label: "済んでいる" },
          { value: "not_yet", label: "まだ" },
          { value: "unknown", label: "分からない" },
        ],
      },
      {
        field: "coOwnersAgree",
        title: "ほかの相続人も、売ったり貸したりすることに賛成していますか？",
        when: (p) => isInherited(p) && p.heirsCount !== 1,
        options: [
          { value: "agree", label: "賛成している" },
          { value: "discussing", label: "話し合っている途中" },
          { value: "unknown", label: "分からない" },
        ],
      },
    ],
  },
  {
    id: "building",
    title: "建物の状態",
    lead: "分かる範囲で大丈夫です。「分からない」も大事な情報になります。",
    questions: [
      { field: "renovated", title: "増築やリフォームをしたことはありますか？", options: ARU },
      { field: "leak", title: "雨もりや、天井のしみはありますか？", help: "今はなくても、以前あった場合は「ある」を選んでください。", options: ARU },
      { field: "termite", title: "シロアリの被害はありますか？", options: ARU },
      { field: "tilt", title: "家の傾きや、床のきしみ・沈みはありますか？", options: ARU },
      { field: "equipmentBroken", title: "給湯器・トイレ・お風呂など、壊れている設備はありますか？", options: ARU },
    ],
  },
  {
    id: "land",
    title: "土地と周りのこと",
    lead: "建て替えができるか、車で来られるかは、値段や借り手に大きく関わります。",
    questions: [
      {
        field: "road",
        title: "家の前の道は、車が通れますか？",
        options: [
          { value: "car_ok", label: "車が通れる" },
          { value: "narrow", label: "細い道・車は入れない" },
          { value: "unknown", label: "分からない" },
        ],
      },
      { field: "parking", title: "敷地の中に、車を止める場所はありますか？", options: ARU },
      {
        field: "boundary",
        title: "隣の土地との境目に、杭（くい）や、境目を示した図面はありますか？",
        help: "境目がはっきりしないと、売るときに測量が必要になることがあります。",
        options: ARU,
      },
    ],
  },
  {
    id: "utilities",
    title: "水道・トイレ・ガス",
    lead: "地方の家では、井戸や浄化槽、くみ取り式のトイレのこともあります。",
    questions: [
      {
        field: "water",
        title: "水道は、どれですか？",
        options: [
          { value: "public", label: "水道（市町村の水道）" },
          { value: "well", label: "井戸" },
          { value: "unknown", label: "分からない" },
        ],
      },
      {
        field: "sewage",
        title: "トイレ・台所の排水は、どれですか？",
        options: [
          { value: "sewer", label: "下水道" },
          { value: "septic", label: "浄化槽" },
          { value: "pit", label: "くみ取り" },
          { value: "unknown", label: "分からない" },
        ],
      },
      {
        field: "gas",
        title: "ガスは、どれですか？",
        options: [
          { value: "city", label: "都市ガス" },
          { value: "propane", label: "プロパンガス（ボンベ）" },
          { value: "none", label: "ガスはない（オール電化など）" },
          { value: "unknown", label: "分からない" },
        ],
      },
    ],
  },
  {
    id: "documents",
    title: "手元にある書類",
    lead: "持っている書類を伝えると、不動産会社が調べる手間が減り、話が早く進みます。",
    questions: [
      { field: "docTaxNotice", title: "固定資産税の「納税通知書」はありますか？", help: "毎年春ごろ市町村から届く書類です。", options: ARU },
      { field: "docDeed", title: "権利証（登記済証・登記識別情報）はありますか？", options: ARU },
      { field: "docRegistry", title: "法務局で取った「登記事項証明書」はありますか？", options: ARU },
      { field: "docSurvey", title: "土地の測量図はありますか？", options: ARU },
      { field: "docDrawings", title: "建物の図面や、建てたときの書類（確認済証など）はありますか？", options: ARU },
    ],
  },
  {
    id: "visit",
    title: "家財と、現地の案内",
    lead: "不動産会社が家の中を見に来るときに必要なことです。",
    questions: [
      {
        field: "belongings",
        title: "家の中に、家具や荷物はどのくらい残っていますか？",
        options: [
          { value: "few", label: "ほとんどない" },
          { value: "some", label: "一部の部屋に残っている" },
          { value: "full", label: "家じゅうに残っている" },
          { value: "unknown", label: "分からない" },
        ],
      },
      {
        field: "keys",
        title: "家の鍵は、誰が持っていますか？",
        options: [
          { value: "me", label: "自分" },
          { value: "relative", label: "親族や近所の人に預けている" },
          { value: "unknown", label: "分からない" },
        ],
      },
      { field: "photos", title: "家の中や外の写真はありますか？", help: "スマホの写真を見せるだけでも、話が早く進みます。", options: ARU },
    ],
    notes: true,
  },
];

export function visibleSheetQuestions(step: SheetStep, p: Profile): SheetQuestion[] {
  return step.questions.filter((q) => !q.when || q.when(p));
}

// ───────────── シートの組み立て ─────────────

export interface SheetRow {
  label: string;
  value: string;
  /** 分からない・未回答なら true（シートで目立たせる） */
  unknown: boolean;
}

export interface SheetSection {
  title: string;
  rows: SheetRow[];
}

export interface SheetDocument {
  createdOn: ISODate;
  sections: SheetSection[];
  /** 不動産会社に確認したいこと */
  questionsForAgent: string[];
}

const UNKNOWN_TEXT = "分からない（確認をお願いしたい）";

function labelOf(field: ChoiceField, value: string | null): string | null {
  if (value === null || value === "unknown") return null;
  for (const step of SHEET_STEPS) {
    const q = step.questions.find((x) => x.field === field);
    const o = q?.options.find((x) => x.value === value);
    if (o) return o.label;
  }
  return value;
}

function row(label: string, value: string | null): SheetRow {
  return value === null ? { label, value: UNKNOWN_TEXT, unknown: true } : { label, value, unknown: false };
}

function triText(value: Tri, yes: string, no: string): string | null {
  if (value === "yes") return yes;
  if (value === "no") return no;
  return null;
}

/** 回答から、不動産会社に確認したいことを作る。 */
export function questionsForAgent(p: Profile, a: SheetAnswers): string[] {
  const list: string[] = [];
  list.push("査定額の根拠（近くの取引事例や、価格に影響する点）を、書面で教えてください。");
  list.push("仲介手数料と、その他にかかる費用の見込みを、事前に教えてください（800万円以下の物件の特例を含む）。");
  if (a.wish === "consult" || a.wish === null) list.push("売る・貸す・解体するなど、どの方法が合っているか、理由と一緒に教えてください。");
  if (a.wish === "manage") list.push("しばらく持っておく場合の管理の方法と、費用の目安を教えてください。");
  if (a.road !== "car_ok") list.push("前の道との接し方から、建て替えができる土地かどうかを調べてください。");
  if (a.boundary !== "yes") list.push("隣の土地との境目について、測量が必要かどうかを教えてください。");
  if (isInherited(p) && a.registration !== "done") {
    list.push("相続登記がまだ（または不明）です。手続きの進め方や、司法書士の紹介をお願いできますか。");
  }
  if (isOwnerAlive(p) && p.ownerCanDecide !== "yes") {
    list.push("持ち主本人が判断することが難しい場合の進め方（成年後見など）について、相談先を教えてください。");
  }
  if (p.hasFarmland !== "no") list.push("田や畑が含まれる場合（または不明な場合）、売る・貸す・転用するときの手続きを教えてください。");
  if (p.hasForest === "yes") list.push("山林の部分の扱い（売れるか、手続き）を教えてください。");
  if (a.cleanupHelp === "yes" || a.belongings === "full") list.push("家財の片付けの方法と、費用の目安を教えてください。");
  if (isInherited(p) && p.builtOld !== "no") {
    list.push("空き家を売ったときの税金の特例（3,000万円控除）が使えそうか、気をつける点を教えてください（最終的な確認は税務署・税理士に行います）。");
  }
  return list;
}

export function buildSheet(p: Profile, a: SheetAnswers, today: ISODate): SheetDocument {
  const sections: SheetSection[] = [];

  sections.push({
    title: "ご相談したいこと",
    rows: [
      row("希望", labelOf("wish", a.wish)),
      row("時期", labelOf("timing", a.timing)),
      row("家財の片付けの相談", triText(a.cleanupHelp, "あわせて相談したい", "不要")),
    ],
  });

  const land: string[] = [];
  if (p.hasFarmland === "yes") land.push("田・畑を含む");
  if (p.hasForest === "yes") land.push("山林を含む");
  if (p.hasFarmland === "no" && p.hasForest === "no") land.push("田・畑、山林は含まない");
  sections.push({
    title: "物件",
    rows: [
      row("所在地", p.propertyAddress.trim() || null),
      row("種類", labelOf("propertyType", a.propertyType)),
      row("田・畑、山林", land.length > 0 ? land.join("、") : null),
    ],
  });

  const rights: SheetRow[] = [row("いまの状況", p.situation ? SITUATION_LABELS[p.situation] : null)];
  if (isInherited(p)) {
    if (p.deathDate) rights.push(row("相続の開始", formatJapaneseDate(p.deathDate)));
    rights.push(row("相続人の人数", p.heirsCount ? `${p.heirsCount}人` : null));
    rights.push(row("相続登記", labelOf("registration", a.registration)));
    if (p.heirsCount !== 1) rights.push(row("ほかの相続人の考え", labelOf("coOwnersAgree", a.coOwnersAgree)));
  }
  if (isOwnerAlive(p)) {
    rights.push(
      row(
        "持ち主の判断",
        triText(p.ownerCanDecide, "持ち主が自分で判断できる", "持ち主が自分で判断することは難しい"),
      ),
    );
  }
  sections.push({ title: "持ち主と名義", rows: rights });

  sections.push({
    title: "建物の状態（所有者が把握している範囲）",
    rows: [
      row("建てた時期", triText(p.builtOld, "昭和56年（1981年）5月より前", "昭和56年（1981年）6月以降")),
      row("増築・リフォーム", triText(a.renovated, "あり", "なし")),
      row("雨もり・天井のしみ", triText(a.leak, "あり（過去を含む）", "なし")),
      row("シロアリの被害", triText(a.termite, "あり", "なし")),
      row("傾き・床のきしみ", triText(a.tilt, "あり", "なし")),
      row("壊れている設備", triText(a.equipmentBroken, "あり", "なし")),
    ],
  });

  sections.push({
    title: "土地と周り",
    rows: [
      row("前の道", labelOf("road", a.road)),
      row("敷地内の駐車場所", triText(a.parking, "あり", "なし")),
      row("境界の杭・図面", triText(a.boundary, "あり", "なし")),
    ],
  });

  sections.push({
    title: "水道・排水・ガス",
    rows: [
      row("水道", labelOf("water", a.water)),
      row("排水", labelOf("sewage", a.sewage)),
      row("ガス", labelOf("gas", a.gas)),
    ],
  });

  const docText = (v: Tri) => triText(v, "あり", "なし");
  sections.push({
    title: "手元にある書類",
    rows: [
      row("固定資産税の納税通知書", docText(a.docTaxNotice)),
      row("権利証（登記済証・登記識別情報）", docText(a.docDeed)),
      row("登記事項証明書", docText(a.docRegistry)),
      row("測量図", docText(a.docSurvey)),
      row("建物の図面・確認済証", docText(a.docDrawings)),
    ],
  });

  sections.push({
    title: "家財と、現地の案内",
    rows: [
      row("残っている家財", labelOf("belongings", a.belongings)),
      row("鍵", labelOf("keys", a.keys)),
      row("写真", triText(a.photos, "あり（見せられます）", "なし")),
      row("現地に行ける日", p.nextVisit ? `${formatJapaneseDate(p.nextVisit)}ごろ` : null),
    ],
  });

  if (a.notes.trim()) {
    sections.push({ title: "伝えておきたいこと", rows: [{ label: "", value: a.notes.trim(), unknown: false }] });
  }

  return { createdOn: today, sections, questionsForAgent: questionsForAgent(p, a) };
}
