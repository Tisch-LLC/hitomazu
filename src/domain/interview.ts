import {
  isInherited,
  isOwnerAlive,
  SITUATION_LABELS,
  type Profile,
  type Situation,
  type Tri,
  type TriField,
} from "./profile";

/**
 * 最初の聞き取り。1画面に1問ずつ、できるだけ選択肢で答えられるようにする。
 * 最初に実家の状況を聞き、状況に応じて質問を変える。
 * 細かい条件（確定申告、遺産の額など）は最初には聞かず、やることリストの該当項目の上で答えてもらう。
 */

interface BaseQuestion {
  id: string;
  section: "はじめに" | "相続のこと" | "持ち主のこと" | "実家のこと" | "あなたのこと";
  title: string;
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
  | (BaseQuestion & { kind: "situation"; field: "situation"; options: ChoiceOption<Situation>[] })
  | (BaseQuestion & { kind: "tri"; field: TriField; options: ChoiceOption<Tri>[] })
  | (BaseQuestion & { kind: "date"; field: "deathDate" | "nextVisit" })
  | (BaseQuestion & { kind: "count"; field: "heirsCount" })
  | (BaseQuestion & { kind: "text"; field: "propertyAddress"; placeholder: string });

const YES_NO_UNKNOWN: ChoiceOption<Tri>[] = [
  { value: "yes", label: "はい" },
  { value: "no", label: "いいえ" },
  { value: "unknown", label: "分からない" },
];

export const QUESTIONS: Question[] = [
  {
    id: "situation",
    section: "はじめに",
    kind: "situation",
    field: "situation",
    title: "実家は、いまどんな状況ですか？",
    help: "いちばん近いものを選んでください。あとから変えられます。",
    options: [
      {
        value: "owner_moved",
        label: SITUATION_LABELS.owner_moved,
        description: "親が施設に入った、子どもの家に移った、入院が長引いているなど",
      },
      {
        value: "owner_living",
        label: SITUATION_LABELS.owner_living,
        description: "親が一人で暮らしていて、この先どうするか考えておきたい",
      },
      {
        value: "inherited",
        label: SITUATION_LABELS.inherited,
        description: "相続の手続きがまだでも、これから相続する予定ならこちら",
      },
      {
        value: "already_owned",
        label: SITUATION_LABELS.already_owned,
        description: "相続や贈与の手続きは済んでいて、使い道を考えたい",
      },
    ],
  },
  {
    id: "ownerCanDecide",
    section: "持ち主のこと",
    kind: "tri",
    field: "ownerCanDecide",
    when: isOwnerAlive,
    title: "実家の持ち主は、自分で契約などを判断できる状態ですか？",
    help: "認知症などで、自分で判断することが難しい場合は「いいえ」を選んでください。",
    options: YES_NO_UNKNOWN,
  },
  {
    id: "deathDate",
    section: "相続のこと",
    kind: "date",
    field: "deathDate",
    when: isInherited,
    title: "亡くなった日はいつですか？",
    help: "相続放棄（3か月）などの期限の計算に使います。",
  },
  {
    id: "heirsCount",
    section: "相続のこと",
    kind: "count",
    field: "heirsCount",
    when: isInherited,
    title: "相続人は、あなたを含めて何人ですか？",
    help: "亡くなった方の配偶者や子どもなどです。",
  },
  {
    id: "debtConcern",
    section: "相続のこと",
    kind: "tri",
    field: "debtConcern",
    when: isInherited,
    title: "亡くなった方に、借金や、誰かの保証人になっている心配はありますか？",
    help: "借金が多い場合は、相続放棄を考えることになります。",
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
    title: "実家は、昭和56年（1981年）5月より前に建てられた家ですか？",
    help: "今の耐震基準より前の建物かどうかで、住む・貸す・売るときの注意点が変わります。",
    options: YES_NO_UNKNOWN,
  },
  {
    id: "hasFarmland",
    section: "実家のこと",
    kind: "tri",
    field: "hasFarmland",
    title: "実家の土地に、田や畑は含まれますか？",
    help: "田畑を売る・貸す・駐車場にするには、農業委員会の許可などが必要です。家の敷地の一部が、登記上は「畑」になっていることもあります。",
    options: YES_NO_UNKNOWN,
  },
  {
    id: "hasForest",
    section: "実家のこと",
    kind: "tri",
    field: "hasForest",
    title: "実家の土地に、山林は含まれますか？",
    options: YES_NO_UNKNOWN,
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
