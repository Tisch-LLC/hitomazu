import { basicDeductionManYen, type Profile, type Tri } from "./profile";

/**
 * 最初の聞き取り。1画面に1問ずつ、できるだけ「はい／いいえ」で答えられるようにする。
 * 相続かどうかで、その後に聞く質問を変える。
 */

type TriField = {
  [K in keyof Profile]: Profile[K] extends Tri ? K : never;
}[keyof Profile];

interface BaseQuestion {
  id: string;
  section: "はじめに" | "相続のこと" | "実家のこと" | "あなたのこと";
  /** 質問文。回答済みの内容で変わる場合は関数にする */
  title: string | ((p: Profile) => string);
  help?: string;
  /** この質問を出す条件。省略すると常に出す */
  when?: (p: Profile) => boolean;
}

export interface ChoiceOption<V> {
  value: V;
  label: string;
  description?: string;
}

export type Question =
  | (BaseQuestion & { kind: "tri"; field: TriField; options: ChoiceOption<Tri>[] })
  | (BaseQuestion & { kind: "date"; field: "deathDate" | "nextVisit" })
  | (BaseQuestion & { kind: "count"; field: "heirsCount" })
  | (BaseQuestion & { kind: "text"; field: "propertyAddress" | "userResidence"; placeholder: string });

const YES_NO_UNKNOWN: ChoiceOption<Tri>[] = [
  { value: "yes", label: "はい" },
  { value: "no", label: "いいえ" },
  { value: "unknown", label: "分からない" },
];

const inherited = (p: Profile) => p.isInheritance === "yes";
const ownerAlive = (p: Profile) => p.isInheritance === "no";

export const QUESTIONS: Question[] = [
  {
    id: "isInheritance",
    section: "はじめに",
    kind: "tri",
    field: "isInheritance",
    title: "親などが亡くなり、実家を相続しましたか？",
    help: "手続きがまだでも、これから相続する予定なら「はい」を選んでください。",
    options: [
      { value: "yes", label: "はい、相続した（する予定）" },
      {
        value: "no",
        label: "いいえ、持ち主は存命",
        description: "親が施設に入った、子の家に移ったなどで、実家が空いている場合",
      },
    ],
  },
  {
    id: "ownerCanDecide",
    section: "はじめに",
    kind: "tri",
    field: "ownerCanDecide",
    when: ownerAlive,
    title: "実家の持ち主は、自分で契約などを判断できる状態ですか？",
    help: "認知症などで、自分で判断することが難しい場合は「いいえ」を選んでください。",
    options: YES_NO_UNKNOWN,
  },
  {
    id: "deathDate",
    section: "相続のこと",
    kind: "date",
    field: "deathDate",
    when: inherited,
    title: "亡くなった日はいつですか？",
    help: "相続放棄（3か月）などの期限の計算に使います。",
  },
  {
    id: "heirsCount",
    section: "相続のこと",
    kind: "count",
    field: "heirsCount",
    when: inherited,
    title: "相続人は、あなたを含めて何人ですか？",
    help: "亡くなった方の配偶者や子どもなどです。",
  },
  {
    id: "debtConcern",
    section: "相続のこと",
    kind: "tri",
    field: "debtConcern",
    when: inherited,
    title: "亡くなった方に、借金や、誰かの保証人になっている心配はありますか？",
    help: "借金が多い場合は、相続放棄を考えることになります。",
    options: YES_NO_UNKNOWN,
  },
  {
    id: "hasWill",
    section: "相続のこと",
    kind: "tri",
    field: "hasWill",
    when: inherited,
    title: "遺言書はありますか？",
    options: YES_NO_UNKNOWN,
  },
  {
    id: "deceasedHadIncome",
    section: "相続のこと",
    kind: "tri",
    field: "deceasedHadIncome",
    when: inherited,
    title: "亡くなった方は、毎年確定申告をしていましたか？",
    help: "年金が一定額以上ある、事業や不動産の収入があった、などの場合です。",
    options: YES_NO_UNKNOWN,
  },
  {
    id: "estateMayExceedBasic",
    section: "相続のこと",
    kind: "tri",
    field: "estateMayExceedBasic",
    when: inherited,
    title: (p) =>
      p.heirsCount && p.heirsCount > 0
        ? `預金や不動産などの遺産は、合計で${basicDeductionManYen(p.heirsCount).toLocaleString()}万円を超えそうですか？`
        : "預金や不動産などの遺産は、合計で「3,000万円＋600万円×相続人の数」を超えそうですか？",
    help: "超える場合は相続税の申告が必要です（相続税の基礎控除）。",
    options: YES_NO_UNKNOWN,
  },
  {
    id: "propertyAddress",
    section: "実家のこと",
    kind: "text",
    field: "propertyAddress",
    title: "実家はどこにありますか？",
    help: "市町村まででかまいません。窓口の案内に使います。",
    placeholder: "例：島根県松江市",
  },
  {
    id: "builtOld",
    section: "実家のこと",
    kind: "tri",
    field: "builtOld",
    when: inherited,
    title: "実家は、昭和56年（1981年）5月より前に建てられた家ですか？",
    help: "耐震基準が変わる前の建物です。売るときの税金の特例に関わります。",
    options: YES_NO_UNKNOWN,
  },
  {
    id: "deceasedLivedAlone",
    section: "実家のこと",
    kind: "tri",
    field: "deceasedLivedAlone",
    when: inherited,
    title: "亡くなる直前、その方は実家で一人暮らしでしたか？",
    options: YES_NO_UNKNOWN,
  },
  {
    id: "hasFarmland",
    section: "実家のこと",
    kind: "tri",
    field: "hasFarmland",
    when: inherited,
    title: "相続する土地に、田や畑は含まれますか？",
    help: "家の敷地の一部が、登記上は「畑」になっていることもあります。",
    options: YES_NO_UNKNOWN,
  },
  {
    id: "hasForest",
    section: "実家のこと",
    kind: "tri",
    field: "hasForest",
    when: inherited,
    title: "相続する土地に、山林は含まれますか？",
    options: YES_NO_UNKNOWN,
  },
  {
    id: "userResidence",
    section: "あなたのこと",
    kind: "text",
    field: "userResidence",
    title: "あなたはどこに住んでいますか？",
    placeholder: "例：東京都",
  },
  {
    id: "nextVisit",
    section: "あなたのこと",
    kind: "date",
    field: "nextVisit",
    title: "次に実家へ行く予定はいつですか？",
    help: "その日より前に期限が来る手続きを、目立つように表示します。",
  },
];

/** いまの回答で表示する質問 */
export function visibleQuestions(p: Profile): Question[] {
  return QUESTIONS.filter((q) => !q.when || q.when(p));
}

export function questionTitle(q: Question, p: Profile): string {
  return typeof q.title === "function" ? q.title(p) : q.title;
}
