import {
  addDays,
  addMonthsClamped,
  addYearsClamped,
  endOfYear,
  maxDate,
  minDate,
  yearOf,
  type ISODate,
} from "./dates";
import {
  basicDeductionManYen,
  effectiveKnownDate,
  isInherited,
  type Profile,
  type Situation,
  type Tri,
  type TriField,
} from "./profile";

/**
 * 遠方の実家を相続した人の「最低限やること」チェックリスト。
 *
 * 項目の中身は、出典を確認した固定データとして持つ（AIに項目を作らせない）。
 * 当てはまるかどうかと期限の日付は、利用者の状況（Profile）からプログラムで計算する。
 * 制度の内容は 2026-11-02 時点で確認したもの。個別の判断は専門家・窓口で確認する前提。
 */

export type Group = "deadline" | "remote" | "onsite" | "plan" | "manage";

export const GROUPS: { id: Group; title: string; description: string }[] = [
  { id: "deadline", title: "期限があるもの", description: "過ぎると選べなくなる、または過料などの対象になる手続き" },
  { id: "remote", title: "遠隔でできるもの", description: "帰省しなくても、郵送・オンライン・電話で進められること" },
  { id: "onsite", title: "次の帰省でやるもの", description: "現地でしかできないこと。限られた帰省で漏れなく済ませる" },
  { id: "plan", title: "これからの方針を考える", description: "残す・売る・貸す・解体するなど、実家をどうするかを決めるための準備" },
  { id: "manage", title: "放置しないための管理", description: "方針が決まるまでの間、実家を傷めず、税負担を増やさないために" },
];

export interface Source {
  label: string;
  url: string;
}

/** applies：対応が必要／check：入力が足りず、当てはまるか確認が必要／not_applicable：対象外 */
export type Applicability = "applies" | "check" | "not_applicable";

export interface Evaluation {
  status: Applicability;
  reason: string;
}

export interface Deadline {
  date: ISODate;
  /** 期限の根拠や注意点 */
  note: string;
}

/** リストの上で「はい・いいえ」で答えられる追加の質問 */
export interface FollowUp {
  field: TriField;
  question: string;
}

export interface ChecklistItem {
  id: string;
  group: Group;
  /** この項目を表示する状況。省略するとすべての状況で表示する */
  situations?: Situation[];
  /** 「要確認」のときに、リストの上で答えられる質問 */
  followUps?: FollowUp[];
  title: string;
  /** 何をするか、なぜ必要か */
  summary: string;
  /** 窓口・手段 */
  where?: string;
  tips?: string[];
  sources: Source[];
  evaluate(p: Profile): Evaluation;
  deadline?(p: Profile): Deadline | null;
}

const SRC = {
  minpo915: { label: "民法 第915条（e-Gov法令検索）", url: "https://laws.e-gov.go.jp/law/129AC0000000089" },
  courtHouki: {
    label: "相続の放棄の申述（裁判所）",
    url: "https://www.courts.go.jp/saiban/syurui/syurui_kazi/kazi_06_13/index.html",
  },
  ntaJunKakutei: {
    label: "No.2022 納税者が死亡したときの確定申告（準確定申告）（国税庁）",
    url: "https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/2022.htm",
  },
  ntaSouzokuzei: {
    label: "No.4205 相続税の申告と納税（国税庁）",
    url: "https://www.nta.go.jp/taxes/shiraberu/taxanswer/sozoku/4205.htm",
  },
  ntaKisoKoujo: {
    label: "No.4152 相続税の計算（国税庁）",
    url: "https://www.nta.go.jp/taxes/shiraberu/taxanswer/sozoku/4152.htm",
  },
  ntaAkiya: {
    label: "No.3306 被相続人の居住用財産（空き家）を売ったときの特例（国税庁）",
    url: "https://www.nta.go.jp/taxes/shiraberu/taxanswer/joto/3306.htm",
  },
  mojTouki: {
    label: "相続登記の申請義務化に関するQ&A（法務省）",
    url: "https://www.moj.go.jp/MINJI/minji05_00565.html",
  },
  mojKoseki: {
    label: "戸籍証明書等の広域交付（法務省）",
    url: "https://www.moj.go.jp/MINJI/minji04_00082.html",
  },
  toukiOnline: {
    label: "登記・供託オンライン申請システム（法務省）",
    url: "https://www.touki-kyoutaku-online.moj.go.jp/",
  },
  rinyaTodoke: {
    label: "森林の土地の所有者届出制度（林野庁）",
    url: "https://www.rinya.maff.go.jp/j/keikaku/todokede/index.html",
  },
  chibaNouchi: {
    label: "相続等で農地の権利を取得したときの届出（千葉市・農地法第3条の3の案内例）",
    url: "https://www.city.chiba.jp/nogyo/souzoku-todokede.html",
  },
  mlitKanriFuzen: {
    label: "空家法の改正（管理不全空家）の概要（国土交通省 近畿地方整備局）",
    url: "https://www.kkr.mlit.go.jp/kensei/jutaku/ol9a8v0000035gqj-att/ol9a8v000004n1co.pdf",
  },
  matsue: { label: "松江市 公式サイト", url: "https://www.city.matsue.lg.jp/" },
  shizuokaNouchi: {
    label: "農地法（第3条、第4条、第5条）に関する手続きのご案内（静岡市・案内例）",
    url: "https://www.city.shizuoka.lg.jp/000_006310.html",
  },
  kyotoTenyou: { label: "農地の取得・転用（京都府・案内例）", url: "https://www.pref.kyoto.jp/chutan/kichou/nouchi.html" },
  mhlwKouken: { label: "成年後見はやわかり（厚生労働省）", url: "https://guardianship.mhlw.go.jp/" },
  mhlwHouteiKouken: {
    label: "法定後見制度とは（厚生労働省）",
    url: "https://guardianship.mhlw.go.jp/personal/type/legal_guardianship/",
  },
  mhlwNiniKouken: {
    label: "任意後見制度とは（厚生労働省）",
    url: "https://guardianship.mhlw.go.jp/personal/type/optional_guardianship/",
  },
} satisfies Record<string, Source>;

/** 期限の計算に必要な日付が入っていないときの共通の扱い */
function needsDate(p: Profile): Evaluation | null {
  if (!effectiveKnownDate(p)) {
    return { status: "check", reason: "亡くなった日を入力すると、期限の日付を計算できます。" };
  }
  return null;
}

function triEvaluate(
  value: Tri,
  texts: { yes: string; no: string; unknown: string },
): Evaluation {
  if (value === "yes") return { status: "applies", reason: texts.yes };
  if (value === "no") return { status: "not_applicable", reason: texts.no };
  return { status: "check", reason: texts.unknown };
}

const INHERITED: Situation[] = ["inherited"];
const OWNER_ALIVE: Situation[] = ["owner_moved", "owner_living"];
/** 実家に誰も住んでいない状況 */
const VACANT: Situation[] = ["inherited", "owner_moved", "already_owned"];

/** 相続登記の義務化（2024年4月1日施行）より前に開始した相続の猶予期限 */
const TOUKI_TRANSITION_DEADLINE: ISODate = "2027-03-31";
const TOUKI_ENFORCEMENT_DATE: ISODate = "2024-04-01";
/** 空き家特例の適用期限（令和9年12月31日までの譲渡） */
const AKIYA_SPECIAL_END: ISODate = "2027-12-31";

export const CHECKLIST: ChecklistItem[] = [
  // ───────────── 期限があるもの ─────────────
  {
    id: "inheritance-decision",
    situations: INHERITED,
    followUps: [{ field: "debtConcern", question: "亡くなった方に、借金や保証人になっている心配はありますか？" }],
    group: "deadline",
    title: "相続するか、放棄するかを決める",
    summary:
      "借金も含めて一切を引き継がない「相続放棄」は、家庭裁判所への申述が必要です。期限内に何もしないと、原則として財産も借金もすべて引き継ぐことになります。実家を引き継ぎたくない場合も、この期限が判断の締め切りです。",
    where: "亡くなった人の最後の住所地を管轄する家庭裁判所（郵送で申述できます）",
    tips: [
      "財産の調査が間に合わないときは、期限内に「相続の承認又は放棄の期間の伸長」を申し立てられます。",
      "預金の引き出しや家財の処分をすると、相続を認めたとみなされる場合があります。放棄を考えているなら、先に専門家へ相談してください。",
    ],
    sources: [SRC.courtHouki, SRC.minpo915],
    evaluate(p) {
      const missing = needsDate(p);
      if (missing) return missing;
      if (p.debtConcern === "yes") {
        return { status: "applies", reason: "借金や保証の心配があるため、期限までに放棄するかを判断する必要があります。" };
      }
      if (p.debtConcern === "unknown") {
        return {
          status: "applies",
          reason: "借金の有無がまだ分かっていません。期限までに財産と借金を調べて判断する必要があります。",
        };
      }
      return {
        status: "applies",
        reason: "借金の心配がなくても、実家を引き継がない選択肢を残すなら、この期限が締め切りです。",
      };
    },
    deadline(p) {
      const known = effectiveKnownDate(p);
      if (!known) return null;
      return { date: addMonthsClamped(known, 3), note: "相続の開始を知った時から3か月以内" };
    },
  },
  {
    id: "jun-kakutei",
    situations: INHERITED,
    followUps: [{ field: "deceasedHadIncome", question: "亡くなった方は、毎年確定申告をしていましたか？" }],
    group: "deadline",
    title: "亡くなった人の所得税の申告（準確定申告）",
    summary:
      "亡くなった年の1月1日から亡くなった日までの所得について、相続人が代わりに申告・納税します。年金が一定額を超える人や、事業・不動産収入があった人が対象になります。",
    where: "亡くなった人の住所地を管轄する税務署（郵送・e-Taxも可）",
    tips: ["医療費控除などで税金が戻ってくる場合もあります。"],
    sources: [SRC.ntaJunKakutei],
    evaluate(p) {
      const missing = needsDate(p);
      if (missing) return missing;
      return triEvaluate(p.deceasedHadIncome, {
        yes: "申告が必要な所得があったため、相続人が申告します。",
        no: "申告が必要な所得はなかったと回答されています。",
        unknown: "申告が必要な所得があったか分かっていません。源泉徴収票や年金の通知を確認してください。",
      });
    },
    deadline(p) {
      const known = effectiveKnownDate(p);
      if (!known) return null;
      return { date: addMonthsClamped(known, 4), note: "相続の開始があったことを知った日の翌日から4か月以内" };
    },
  },
  {
    id: "souzokuzei",
    situations: INHERITED,
    followUps: [{ field: "estateMayExceedBasic", question: "預金や不動産などの遺産は、合計で基礎控除を超えそうですか？" }],
    group: "deadline",
    title: "相続税の申告",
    summary:
      "遺産の合計が基礎控除（3,000万円＋600万円×法定相続人の数）を超える場合に、申告と納税が必要です。超えなければ申告は不要です。",
    where: "亡くなった人の住所地を管轄する税務署。税理士に依頼することが多い手続きです",
    sources: [SRC.ntaSouzokuzei, SRC.ntaKisoKoujo],
    evaluate(p) {
      const missing = needsDate(p);
      if (missing) return missing;
      const deduction =
        p.heirsCount && p.heirsCount > 0
          ? `基礎控除は ${basicDeductionManYen(p.heirsCount).toLocaleString()}万円（相続人${p.heirsCount}人の場合）です。`
          : "相続人の人数を入力すると、基礎控除の額を計算できます。";
      return triEvaluate(p.estateMayExceedBasic, {
        yes: `遺産が基礎控除を超えそうなため、申告が必要です。${deduction}`,
        no: `遺産は基礎控除を超えないと回答されています。${deduction}`,
        unknown: `遺産の合計がまだ分かっていません。${deduction}`,
      });
    },
    deadline(p) {
      const known = effectiveKnownDate(p);
      if (!known) return null;
      return { date: addMonthsClamped(known, 10), note: "相続の開始があったことを知った日の翌日から10か月以内" };
    },
  },
  {
    id: "souzoku-touki",
    situations: INHERITED,
    group: "deadline",
    title: "相続登記（実家の名義を変える）",
    summary:
      "不動産を相続した人は、名義を変える登記が義務になりました（2024年4月1日から）。正当な理由なく怠ると10万円以下の過料の対象になります。売る・貸す・解体するときにも名義の変更が前提になります。",
    where: "実家のある地域を管轄する法務局（オンライン申請・郵送も可）。司法書士に依頼することもできます",
    tips: [
      "遺産分割の話し合いがまとまらないときは、一人でできる「相続人申告登記」で義務を果たしたとみなされます。",
    ],
    sources: [SRC.mojTouki],
    evaluate(p) {
      const missing = needsDate(p);
      if (missing) return missing;
      return { status: "applies", reason: "不動産を相続したすべての人に義務があります。" };
    },
    deadline(p) {
      const known = effectiveKnownDate(p);
      if (!known || !p.deathDate) return null;
      const normal = addYearsClamped(known, 3);
      if (p.deathDate < TOUKI_ENFORCEMENT_DATE) {
        return {
          date: maxDate(normal, TOUKI_TRANSITION_DEADLINE),
          note: "2024年4月1日より前の相続は、2027年3月31日まで（取得を知った日から3年の方が遅ければそちら）",
        };
      }
      return { date: normal, note: "相続で取得したことを知った日から3年以内" };
    },
  },
  {
    id: "nouchi-todoke",
    situations: INHERITED,
    followUps: [{ field: "hasFarmland", question: "実家の土地に、田や畑は含まれますか？" }],
    group: "deadline",
    title: "農地を相続したときの届出",
    summary:
      "相続で田・畑を取得した人は、農業委員会への届出が必要です（農地法第3条の3）。相続そのものに許可は要りませんが、売る・貸す・駐車場などに転用するときは、別に許可や届出が必要になります。",
    where: "農地がある市町村の農業委員会",
    tips: ["期限の数え方は自治体の案内で表現が異なります（「知った日から」「相続発生日から」）。早めに窓口へ確認してください。"],
    sources: [SRC.chibaNouchi],
    evaluate(p) {
      return triEvaluate(p.hasFarmland, {
        yes: "相続した土地に田・畑が含まれるため、届出が必要です。",
        no: "田・畑は含まれないと回答されています。",
        unknown: "登記事項証明書の「地目」に田・畑がないか確認してください。実家の敷地の一部が畑のこともあります。",
      });
    },
    deadline(p) {
      const known = effectiveKnownDate(p);
      if (!known || p.hasFarmland === "no") return null;
      return { date: addMonthsClamped(known, 10), note: "おおむね10か月以内（自治体の案内による目安）" };
    },
  },
  {
    id: "shinrin-todoke",
    situations: INHERITED,
    followUps: [{ field: "hasForest", question: "実家の土地に、山林は含まれますか？" }],
    group: "deadline",
    title: "森林の土地の所有者届出",
    summary:
      "相続などで森林の土地の所有者になった人は、面積にかかわらず市町村長への届出が必要です（地域森林計画の対象の森林）。",
    where: "森林がある市町村の林務担当窓口",
    tips: ["遺産分割の前でも届出の対象になる場合があります。数え始める日は市町村の窓口で確認してください。"],
    sources: [SRC.rinyaTodoke],
    evaluate(p) {
      return triEvaluate(p.hasForest, {
        yes: "相続した土地に山林が含まれるため、届出が必要です。",
        no: "山林は含まれないと回答されています。",
        unknown: "登記事項証明書の「地目」に山林がないか確認してください。",
      });
    },
    deadline(p) {
      if (!p.deathDate || p.hasForest === "no") return null;
      return { date: addDays(p.deathDate, 90), note: "所有者になった日から90日以内。相続では原則として亡くなった日に所有者になるため、その日から数えています" };
    },
  },
  {
    id: "akiya-special",
    situations: INHERITED,
    followUps: [
      { field: "builtOld", question: "昭和56年（1981年）5月より前に建てられた家ですか？" },
      { field: "deceasedLivedAlone", question: "亡くなる直前、その方は実家で一人暮らしでしたか？" },
    ],
    group: "deadline",
    title: "実家を売るなら：空き家の3,000万円特別控除の期限",
    summary:
      "一定の要件を満たす実家（または解体後の土地）を売ると、売却益から最大3,000万円（相続人が3人以上なら2,000万円）を控除できます。主な要件は、昭和56年5月31日以前に建てられたこと、亡くなる直前に一人暮らしだったこと、売却代金が1億円以下であることなどです。",
    where: "税務署（確定申告）。実家のある市町村で「被相続人居住用家屋等確認書」の発行が必要です",
    tips: ["耐震改修か解体が必要です。売った年の翌年2月15日までに買主が行う場合も対象になります。"],
    sources: [SRC.ntaAkiya],
    evaluate(p) {
      if (!p.deathDate) {
        return { status: "check", reason: "亡くなった日を入力すると、売却の期限を計算できます。" };
      }
      if (p.builtOld === "no") {
        return { status: "not_applicable", reason: "昭和56年5月31日より後に建てられた家のため、対象外です。" };
      }
      if (p.deceasedLivedAlone === "no") {
        return { status: "not_applicable", reason: "亡くなる直前に一人暮らしではなかったため、原則として対象外です（老人ホーム入所などの例外あり）。" };
      }
      if (p.builtOld === "unknown" || p.deceasedLivedAlone === "unknown") {
        return {
          status: "check",
          reason: "建てた時期（昭和56年5月31日以前か）と、一人暮らしだったかが分かると、対象かどうか判断できます。",
        };
      }
      return { status: "applies", reason: "昭和56年5月31日以前の建物で、一人暮らしだったため、対象になる可能性があります。" };
    },
    deadline(p) {
      if (!p.deathDate) return null;
      const threeYears = addYearsClamped(p.deathDate, 3);
      return {
        date: minDate(endOfYear(yearOf(threeYears)), AKIYA_SPECIAL_END),
        note: "相続開始から3年を経過する日の属する年の12月31日まで、かつ2027年12月31日までに売る",
      };
    },
  },

  // ───────────── 遠隔でできるもの ─────────────
  {
    id: "owner-decision",
    situations: OWNER_ALIVE,
    followUps: [{ field: "ownerCanDecide", question: "持ち主は、自分で契約などを判断できる状態ですか？" }],
    group: "remote",
    title: "持ち主の意向を確かめ、判断できるうちに方針を話し合う",
    summary:
      "実家を売る・貸す・解体するには、原則として名義人（持ち主）本人の意思で契約します。認知症などで判断能力が低下すると、本人に代わって契約するには成年後見制度を使う必要があり、時間と手間がかかります。持ち主が元気なうちに、実家をどうしたいかを聞いておくことが大切です。",
    where: "家族での話し合い。制度の相談は、市町村の地域包括支援センターや成年後見の相談窓口",
    tips: [
      "判断能力があるうちなら、将来に備えて代理人を決めておく「任意後見」という方法もあります。",
      "成年後見人が本人の住まいだった家を売るには、家庭裁判所の許可が必要です。",
    ],
    sources: [SRC.mhlwKouken, SRC.mhlwHouteiKouken, SRC.mhlwNiniKouken],
    evaluate(p) {
      if (p.ownerCanDecide === "yes") {
        return { status: "applies", reason: "持ち主が自分で判断できるうちに、売る・貸す・残すの意向を聞いておきましょう。" };
      }
      if (p.ownerCanDecide === "no") {
        return {
          status: "applies",
          reason: "持ち主が自分で判断することが難しいため、実家の契約には成年後見制度の利用が必要になる可能性があります。",
        };
      }
      return { status: "check", reason: "持ち主が自分で契約などを判断できる状態か、確認してください。" };
    },
  },
  {
    id: "will",
    situations: INHERITED,
    group: "remote",
    title: "遺言書があるか確認する",
    summary: "遺言書があるかどうかで、誰が実家を相続するかの決め方が変わります。自宅での保管のほか、公証役場や法務局に保管されている場合があります。",
    where: "公正証書遺言は公証役場で検索、自筆証書遺言は法務局の保管制度を照会",
    tips: ["自宅で見つかった封をした遺言書は、勝手に開けず家庭裁判所の検認を受けます。"],
    sources: [],
    evaluate(p) {
      if (p.hasWill === "yes") return { status: "applies", reason: "遺言書があると回答されています。内容に沿って手続きを進めます。" };
      return { status: "applies", reason: "遺言書の有無が分かると、相続人どうしの話し合いの範囲が決まります。" };
    },
  },
  {
    id: "koseki",
    situations: INHERITED,
    group: "remote",
    title: "戸籍を集めて、相続人を確定する",
    summary:
      "亡くなった人の出生から死亡までの戸籍を集め、相続人を確定します。相続登記や預金の手続きで必要になります。2024年3月1日から、本籍地以外の市区町村の窓口でもまとめて請求できるようになりました（広域交付）。",
    where: "自分の住まいの近くの市区町村窓口（本人・配偶者・直系の親族が請求。代理人は不可）",
    sources: [SRC.mojKoseki],
    evaluate() {
      return { status: "applies", reason: "相続登記などすべての手続きの前提になります。" };
    },
  },
  {
    id: "touki-shoumei",
    group: "remote",
    title: "実家の登記事項証明書を取る",
    summary:
      "土地と建物の名義人、範囲（筆）、地目（宅地・田・畑・山林など）、抵当権の有無を確認します。農地や山林が含まれていないか、ここで初めて分かることがあります。",
    where: "登記・供託オンライン申請システムで請求し、郵送で受け取れます",
    tips: ["固定資産税の納税通知書に載っている「所在・地番」を手がかりにすると、請求する土地を特定しやすくなります。"],
    sources: [SRC.toukiOnline],
    evaluate() {
      return { status: "applies", reason: "実家の範囲と地目を知ることが、すべての判断の出発点になります。" };
    },
  },
  {
    id: "assets-debts",
    situations: INHERITED,
    group: "remote",
    title: "財産と借金の全体をつかむ",
    summary: "預金・不動産・有価証券と、ローン・借金・保証人になっていないかを調べます。相続放棄や相続税の判断材料になります。",
    where: "金融機関、信用情報機関（借入の有無）、郵便物・通帳の記録",
    sources: [],
    evaluate(p) {
      if (p.debtConcern === "yes" || p.debtConcern === "unknown") {
        return { status: "applies", reason: "借金の有無が相続放棄の判断に直結します。放棄の期限より前に済ませてください。" };
      }
      return { status: "applies", reason: "相続税の申告が必要かどうかの判断にも使います。" };
    },
  },
  {
    id: "tax-notice",
    situations: ["inherited", "owner_moved"],
    group: "remote",
    title: "固定資産税の納税通知書が、確実に届くようにする",
    summary:
      "実家の固定資産税の通知が届かないと、納め忘れや、市町村からの連絡（空き家の管理に関する通知など）を見落とす原因になります。相続の場合、相続登記が済むまでの間は相続人の代表者を届け出ることが多いです。持ち主が施設に入った場合は、送り先の変更を届け出ます。",
    where: "実家のある市町村の資産税担当窓口（郵送で届け出られることが多い）",
    sources: [SRC.matsue],
    evaluate(p) {
      if (isInherited(p)) {
        return { status: "applies", reason: "亡くなった人宛ての通知は、相続人が受け取れるように届け出る必要があります。" };
      }
      return { status: "applies", reason: "持ち主が実家に住んでいないと、通知が誰にも読まれないまま届き続けます。" };
    },
  },
  {
    id: "mail",
    situations: VACANT,
    group: "remote",
    title: "実家に届く郵便物の受け取り方を決める",
    summary: "請求書や契約の通知が実家に届き続けると、気づかないうちに滞納や契約の自動更新が起きます。各契約先に送付先の変更を依頼します。",
    where: "各契約先（公共料金・保険・金融機関など）。郵便局の転送サービスが使えるかは窓口で確認",
    sources: [],
    evaluate() {
      return { status: "applies", reason: "遠方に住む相続人は、実家の郵便物を直接確認できません。" };
    },
  },
  {
    id: "utilities",
    situations: VACANT,
    group: "remote",
    title: "電気・ガス・水道・電話の契約を見直す",
    summary:
      "止めるか、名義を変えて続けるかを決めます。見回りや片付けで使うなら電気と水道は残す選択もあります。冬に水道管が凍って破裂しないよう、水抜きや元栓の扱いも確認します。",
    where: "各事業者。水道は実家のある市町村の水道局",
    sources: [],
    evaluate() {
      return { status: "applies", reason: "使っていない契約の料金を払い続けないために必要です。" };
    },
  },
  {
    id: "insurance",
    situations: VACANT,
    group: "remote",
    title: "火災保険の契約者と内容を確認する",
    summary: "空き家になると、保険の条件が変わったり、契約を続けられなかったりする場合があります。契約者の変更と、空き家としての補償内容を保険会社に確認します。",
    where: "契約している保険会社・代理店",
    sources: [],
    evaluate() {
      return { status: "applies", reason: "火事や台風の被害で、近所に損害を与えたときの備えにもなります。" };
    },
  },
  {
    id: "family",
    group: "remote",
    title: "家族の間で、実家の窓口になる人を決める",
    summary: "市町村・業者・近所からの連絡を誰が受けるか、費用を誰がどう負担するかを決めます。相続の場合は、遺産分割の話し合いの前でも窓口だけは決めておくと手続きが止まりません。",
    sources: [],
    evaluate(p) {
      if (!isInherited(p)) {
        return { status: "applies", reason: "持ち主に代わって連絡を受ける人を決めておくと、何かあったときにすぐ動けます。" };
      }
      if (p.heirsCount === 1) return { status: "not_applicable", reason: "相続人が1人のため、窓口はご自身です。" };
      if (p.heirsCount === null) return { status: "check", reason: "相続人の人数が分かると、話し合いが必要か判断できます。" };
      return { status: "applies", reason: `相続人が${p.heirsCount}人いるため、連絡の窓口と費用の分担を決めておく必要があります。` };
    },
  },
  // ───────────── 次の帰省でやるもの ─────────────
  {
    id: "onsite-documents",
    group: "onsite",
    title: "大事な書類の場所を確認する",
    summary:
      "持ち主が住んでいる場合は、保管場所を一緒に確認しておきます。空き家なら探して持ち帰ります。権利証（登記識別情報）、固定資産税の納税通知書、建物を建てたときの書類（確認済証・図面）、測量図・境界の書類、保険証券、ローンや借金の書類、通帳・印鑑を探します。",
    tips: ["見つけた場所も記録しておくと、親族と共有しやすくなります。", "建てた年が分かる書類は、空き家特例の判断に使えます。"],
    sources: [],
    evaluate() {
      return { status: "applies", reason: "現地でしか探せず、多くの手続きの材料になります。" };
    },
  },
  {
    id: "onsite-photos",
    group: "onsite",
    title: "建物と土地の写真を撮る",
    summary:
      "外観の四方、各部屋、台所・浴室・トイレの水回り、屋根・外壁・雨漏りの跡、境界の杭、前面の道路を撮ります。業者に相談するときに、そのまま資料として使えます。",
    sources: [],
    evaluate() {
      return { status: "applies", reason: "遠方からでも業者や親族に状態を正確に伝えられるようになります。" };
    },
  },
  {
    id: "onsite-keys",
    situations: VACANT,
    group: "onsite",
    title: "鍵の本数を確認し、誰が持つか決める",
    summary: "玄関・勝手口・倉庫などの鍵を数えます。見回りを頼む人や業者に預ける場合に備えます。",
    sources: [],
    evaluate() {
      return { status: "applies", reason: "管理を人に頼むときに必要になります。" };
    },
  },
  {
    id: "onsite-belongings",
    group: "onsite",
    title: "家財の量を把握し、貴重品と思い出の品を取り分ける",
    summary: "残っている家具・家電・衣類などの量をざっと把握します。片付けの費用の見積もりに使います。貴重品や思い出の品は、先に取り分けて持ち帰ります。",
    tips: ["相続放棄を考えている場合は、家財を処分する前に専門家へ相談してください。"],
    sources: [],
    evaluate() {
      return { status: "applies", reason: "売る・貸す・解体のどれを選んでも、片付けは必要になります。" };
    },
  },
  {
    id: "onsite-neighbors",
    situations: VACANT,
    group: "onsite",
    title: "近所・自治会に挨拶し、連絡先を伝える",
    summary: "何かあったとき（倒木、雨漏り、不審者など）に連絡をもらえるよう、連絡先を伝えます。自治会費や地域の共有地の扱いも確認します。",
    sources: [],
    evaluate() {
      return { status: "applies", reason: "遠方に住んでいると、異変に最初に気づくのは近所の人です。" };
    },
  },
  {
    id: "onsite-shutdown",
    situations: VACANT,
    group: "onsite",
    title: "帰る前に戸締まりと設備を確認する",
    summary: "ブレーカー、水道の元栓（冬は水抜き）、ガスの元栓、窓・雨戸の施錠を確認します。冷蔵庫の中身など、傷む物を残さないようにします。",
    sources: [],
    evaluate() {
      return { status: "applies", reason: "次の帰省まで、事故や劣化を防ぐために必要です。" };
    },
  },

  // ───────────── これからの方針を考える ─────────────
  {
    id: "plan-wishes",
    situations: ["inherited", "already_owned"],
    group: "plan",
    title: "家族で、実家をどうしたいかを話し合う",
    summary:
      "自分や親族が使う、売る、貸す、空き家バンクに登録する、解体する、管理を続けるなどの選択肢があります。仏壇やお墓、思い出の品の扱いも含めて、家族の希望を先に整理しておくと、業者や窓口に相談するときに話が早く進みます。",
    sources: [],
    evaluate() {
      return { status: "applies", reason: "方針が決まらないまま時間がたつと、管理の負担と建物の傷みが増えていきます。" };
    },
  },
  {
    id: "plan-condition",
    group: "plan",
    title: "建物の状態から、使い続けられるかの目安をつける",
    summary:
      "住む・貸す・売るのどれが現実的かは、建物の状態で大きく変わります。雨漏り、床や柱の傷み、シロアリ、水回りの故障などを確認します。昭和56年（1981年）5月以前に建てられた家は、今の耐震基準より前の建物です。",
    where: "実家のある市町村の建築・住宅担当（耐震診断や改修の補助がある場合があります）",
    followUps: [{ field: "builtOld", question: "昭和56年（1981年）5月より前に建てられた家ですか？" }],
    sources: [],
    evaluate(p) {
      if (p.builtOld === "yes") {
        return {
          status: "applies",
          reason: "今の耐震基準より前の建物です。住む・貸す場合は、耐震診断や改修の補助がないか市町村に確認してください。",
        };
      }
      if (p.builtOld === "no") {
        return { status: "applies", reason: "今の耐震基準の建物です。傷みの程度を確認して、使い続けられるか判断します。" };
      }
      return { status: "check", reason: "建てた時期が分かると、耐震面の注意点が分かります。" };
    },
  },
  {
    id: "plan-land",
    group: "plan",
    title: "田畑・山林がある場合の手続きを確認する",
    summary:
      "田や畑を、農地のまま売る・貸すには農業委員会の許可が必要です（農地法第3条）。駐車場や宅地にするには、転用の許可が必要です（第4条・第5条。市街化区域では届出）。山林を売る・活用する場合も、市町村への届出などが関わります。",
    where: "土地がある市町村の農業委員会、林務担当",
    followUps: [
      { field: "hasFarmland", question: "実家の土地に、田や畑は含まれますか？" },
      { field: "hasForest", question: "実家の土地に、山林は含まれますか？" },
    ],
    sources: [SRC.shizuokaNouchi, SRC.kyotoTenyou, SRC.rinyaTodoke],
    evaluate(p) {
      if (p.hasFarmland === "yes" || p.hasForest === "yes") {
        const kinds = [p.hasFarmland === "yes" ? "田・畑" : null, p.hasForest === "yes" ? "山林" : null].filter(Boolean);
        return {
          status: "applies",
          reason: `${kinds.join("と")}が含まれるため、建物とは別に、売る・貸す・転用するときの手続きが必要です。`,
        };
      }
      if (p.hasFarmland === "no" && p.hasForest === "no") {
        return { status: "not_applicable", reason: "田・畑や山林は含まれないと回答されています。" };
      }
      return { status: "check", reason: "登記事項証明書の「地目」で、田・畑や山林が含まれるか確認できます。" };
    },
  },
  {
    id: "plan-local",
    group: "plan",
    title: "地元の相談先を見つける",
    summary:
      "実家のある市町村の空き家相談窓口、空き家バンク、地元の不動産業者などに相談します。1か所だけでなく2〜3か所に同じ情報（写真・登記の内容・希望）で相談すると、提案の違いを比べられます。解体や改修の補助金がある市町村も多くあります。",
    where: "実家のある市町村の空き家対策担当、地元の不動産業者",
    tips: ["帰省の前に電話で相談の予約をしておくと、現地での時間を有効に使えます。"],
    sources: [SRC.matsue],
    evaluate() {
      return { status: "applies", reason: "遠方からでは地元の事情が分かりにくいため、地元に詳しい相談先が必要です。" };
    },
  },

  // ───────────── 放置しないための管理 ─────────────
  {
    id: "patrol",
    situations: VACANT,
    group: "manage",
    title: "定期的に見回る方法を決める",
    summary: "自分の帰省、親族、近所の人、空き家管理サービスなどの中から、誰がどのくらいの頻度で見回るかを決めます。換気・通水・郵便物の回収・庭木の手入れが主な作業です。",
    sources: [],
    evaluate() {
      return { status: "applies", reason: "人が住まない家は傷みが早く、近所への影響も出やすくなります。" };
    },
  },
  {
    id: "kanri-fuzen",
    situations: VACANT,
    group: "manage",
    title: "「管理不全空家」にならないようにする",
    summary:
      "管理が不十分な空き家は、市町村から「管理不全空家」として指導・勧告を受けることがあります。勧告を受けると固定資産税の住宅用地特例が外れ、土地の税額が最大で約6倍になり得ます（2023年12月施行の空家法改正）。",
    where: "実家のある市町村の空き家対策担当",
    sources: [SRC.mlitKanriFuzen],
    evaluate() {
      return { status: "applies", reason: "方針が決まるまでの間に、税負担が増えるのを防ぐためです。" };
    },
  },
];

export interface EvaluatedItem {
  item: ChecklistItem;
  evaluation: Evaluation;
  deadline: Deadline | null;
}

/** 実家の状況に合わせて、表示する項目を選ぶ。状況が未回答なら、すべての状況に共通の項目だけ。 */
export function isInScope(item: ChecklistItem, p: Profile): boolean {
  if (!item.situations) return true;
  return p.situation !== null && item.situations.includes(p.situation);
}

export function evaluateChecklist(profile: Profile): EvaluatedItem[] {
  return CHECKLIST.filter((item) => isInScope(item, profile)).map((item) => ({
    item,
    evaluation: item.evaluate(profile),
    deadline: item.deadline?.(profile) ?? null,
  }));
}

/** 要対応と要確認は同じ順位にして、期限の近さを優先する。対象外は後ろに回す。 */
const STATUS_ORDER: Record<Applicability, number> = { applies: 0, check: 0, not_applicable: 1 };

/** グループごとに、対象外を後ろに、期限の早い順に並べる。 */
export function groupEvaluated(items: EvaluatedItem[]): Record<Group, EvaluatedItem[]> {
  const result: Record<Group, EvaluatedItem[]> = { deadline: [], remote: [], onsite: [], plan: [], manage: [] };
  for (const e of items) result[e.item.group].push(e);
  for (const group of Object.keys(result) as Group[]) {
    result[group].sort((a, b) => {
      const s = STATUS_ORDER[a.evaluation.status] - STATUS_ORDER[b.evaluation.status];
      if (s !== 0) return s;
      if (a.deadline && b.deadline) return a.deadline.date.localeCompare(b.deadline.date);
      if (a.deadline) return -1;
      if (b.deadline) return 1;
      return 0;
    });
  }
  return result;
}
