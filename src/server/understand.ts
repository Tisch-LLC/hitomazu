import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { isISODate, type ISODate } from "../domain/dates";
import { SITUATION_LABELS, type Profile, type Situation, type Tri, type TriField } from "../domain/profile";
import { fallbackParams, toUserFacingError, UserFacingError } from "./claude";
import type { ClaudeConfig } from "./config";

/**
 * 利用者が自分の言葉で書いた状況を読み取り、最初の質問の答えに変換する。
 *
 * Claude には「書かれていることだけ」を読み取らせ、推測した値は入れさせない。
 * 返ってきた値はサーバー側でもう一度検証してから画面に返す（日付の形式、人数の範囲など）。
 * 画面では、読み取った内容を利用者に確認してもらってから反映する。
 */

export const MAX_TEXT_LENGTH = 2000;

const TRI = z.enum(["yes", "no", "unknown"]).nullable();

/** Claude に返してもらう形。null は「文章に書かれていない」 */
export const UnderstandSchema = z.object({
  situation: z.enum(["inherited", "owner_moved", "owner_living", "already_owned"]).nullable(),
  ownerCanDecide: TRI,
  deathDate: z.string().nullable().describe("YYYY-MM-DD。日付がはっきり書かれている場合だけ"),
  heirsCount: z.number().int().nullable(),
  debtConcern: TRI,
  hasWill: TRI,
  deceasedHadIncome: TRI,
  estateMayExceedBasic: TRI,
  propertyAddress: z.string().nullable().describe("市区町村まで。番地は含めない"),
  builtOld: TRI,
  deceasedLivedAlone: TRI,
  hasFarmland: TRI,
  hasForest: TRI,
  nextVisit: z.string().nullable().describe("YYYY-MM-DD。日付がはっきり書かれている場合だけ"),
  evidence: z
    .array(z.object({ field: z.string(), quote: z.string() }))
    .describe("読み取った各項目の根拠になった、利用者の文章からの短い引用"),
  unclear: z.array(z.string()).describe("書かれていたが、はっきりしなかったこと（最大3つ、やさしい日本語で）"),
});

export type UnderstandOutput = z.infer<typeof UnderstandSchema>;

const SYSTEM_PROMPT = `あなたは、離れて暮らす実家について困っている人の話を聞く、ていねいな相談員です。
利用者が自分の言葉で書いた文章から、決められた項目だけを読み取ってください。

# 守ること
- 文章にはっきり書かれていることだけを読み取る。推測や一般論で値を埋めない。書かれていない項目は null にする。
- 「分からない」「覚えていない」とはっきり書かれている項目は "unknown" にする。
- 日付は、年月日が特定できる場合だけ YYYY-MM-DD で入れる。「今年の9月20日」のように年が省略されていても、今日の日付から一つに決まる場合は入れてよい。「先月」「秋ごろ」のように日が決まらない場合は null にして unclear に書く。
- 住所は市区町村までにする。番地や個人名は入れない。
- 相続人の人数は、利用者本人を含めた人数。兄弟の人数などから一つに決まらない場合は null にする。
- evidence には、値を入れた各項目について、根拠になった文章の一部をそのまま短く引用する。
- unclear には、相談に関係しそうだが、はっきりしなかったことを最大3つ、やさしい日本語で書く。

# 項目の意味
- situation：実家のいまの状況
  - owner_moved：${SITUATION_LABELS.owner_moved}（施設入所、子の家に転居、長期入院など）
  - owner_living：${SITUATION_LABELS.owner_living}
  - inherited：${SITUATION_LABELS.inherited}
  - already_owned：${SITUATION_LABELS.already_owned}
- ownerCanDecide：持ち主（存命）が自分で契約などを判断できるか。認知症で判断が難しい場合は no
- deathDate：亡くなった日（相続の場合）
- heirsCount：相続人の人数
- debtConcern：亡くなった人に借金や保証人の心配があるか
- hasWill：遺言書があるか
- deceasedHadIncome：亡くなった人が毎年確定申告をしていたか
- estateMayExceedBasic：遺産の合計が相続税の基礎控除（3,000万円＋600万円×相続人の数）を超えそうか
- propertyAddress：実家の所在地（市区町村まで）
- builtOld：昭和56年（1981年）5月より前に建てられたか。「築50年」など建てた年が分かる書き方なら判断してよい
- deceasedLivedAlone：亡くなる直前、実家で一人暮らしだったか
- hasFarmland：実家の土地に田・畑が含まれるか
- hasForest：実家の土地に山林が含まれるか
- nextVisit：次に実家へ行く予定の日`;

// ───────────── 検証（Claude の出力をそのまま信じない） ─────────────

export interface ProfileUpdate {
  field: keyof Profile;
  value: Profile[keyof Profile];
  /** 画面に出す説明（例：「状況：持ち主は存命だが…」） */
  label: string;
  /** 根拠になった利用者の文章 */
  quote: string | null;
}

export interface UnderstandResult {
  updates: ProfileUpdate[];
  unclear: string[];
}

const TRI_FIELDS: { field: TriField; name: string; yes: string; no: string }[] = [
  { field: "ownerCanDecide", name: "持ち主の判断", yes: "自分で判断できる", no: "自分で判断するのは難しい" },
  { field: "debtConcern", name: "借金の心配", yes: "ある", no: "ない" },
  { field: "hasWill", name: "遺言書", yes: "ある", no: "ない" },
  { field: "deceasedHadIncome", name: "確定申告", yes: "していた", no: "していなかった" },
  { field: "estateMayExceedBasic", name: "遺産の額", yes: "基礎控除を超えそう", no: "基礎控除を超えない" },
  { field: "builtOld", name: "建てた時期", yes: "昭和56年5月より前", no: "昭和56年6月以降" },
  { field: "deceasedLivedAlone", name: "亡くなる前の暮らし", yes: "一人暮らし", no: "一人暮らしではない" },
  { field: "hasFarmland", name: "田・畑", yes: "含まれる", no: "含まれない" },
  { field: "hasForest", name: "山林", yes: "含まれる", no: "含まれない" },
];

const TRI_UNKNOWN_LABEL = "分からない";

function triLabel(value: Tri, yes: string, no: string): string {
  return value === "yes" ? yes : value === "no" ? no : TRI_UNKNOWN_LABEL;
}

function plausibleDate(value: string | null, today: ISODate, range: "past" | "future"): ISODate | null {
  if (!value || !isISODate(value)) return null;
  // 相続の開始は過去10年以内、帰省の予定は今日から2年以内に限る
  const year = Number(value.slice(0, 4));
  const thisYear = Number(today.slice(0, 4));
  if (range === "past" && (value > today || year < thisYear - 10)) return null;
  if (range === "future" && (value < today || year > thisYear + 2)) return null;
  return value;
}

export function toProfileUpdates(out: UnderstandOutput, today: ISODate): UnderstandResult {
  const quoteFor = (field: string) => out.evidence.find((e) => e.field === field)?.quote?.slice(0, 120) ?? null;
  const updates: ProfileUpdate[] = [];

  if (out.situation) {
    const situation: Situation = out.situation;
    updates.push({ field: "situation", value: situation, label: `状況：${SITUATION_LABELS[situation]}`, quote: quoteFor("situation") });
  }

  const death = plausibleDate(out.deathDate, today, "past");
  if (death) updates.push({ field: "deathDate", value: death, label: `亡くなった日：${death}`, quote: quoteFor("deathDate") });

  if (out.heirsCount !== null && out.heirsCount >= 1 && out.heirsCount <= 20) {
    updates.push({ field: "heirsCount", value: out.heirsCount, label: `相続人：${out.heirsCount}人`, quote: quoteFor("heirsCount") });
  }

  if (out.propertyAddress) {
    const address = out.propertyAddress.trim().slice(0, 60);
    if (address) updates.push({ field: "propertyAddress", value: address, label: `実家の場所：${address}`, quote: quoteFor("propertyAddress") });
  }

  for (const t of TRI_FIELDS) {
    const v = out[t.field as keyof UnderstandOutput] as Tri | null;
    if (v === null || v === undefined) continue;
    updates.push({ field: t.field, value: v, label: `${t.name}：${triLabel(v, t.yes, t.no)}`, quote: quoteFor(t.field) });
  }

  const visit = plausibleDate(out.nextVisit, today, "future");
  if (visit) updates.push({ field: "nextVisit", value: visit, label: `次の帰省：${visit}`, quote: quoteFor("nextVisit") });

  return { updates, unclear: out.unclear.slice(0, 3).map((s) => s.slice(0, 120)) };
}

// ───────────── Claude の呼び出し ─────────────

export async function understandSituation(text: string, today: ISODate, config: ClaudeConfig): Promise<UnderstandResult> {
  if (!config.apiKey) throw new UserFacingError("API key is not configured", "いまは文章の読み取りが使えません。質問に答えて進んでください。");
  const client = new Anthropic({ apiKey: config.apiKey });

  try {
    const response = await client.beta.messages.parse({
      model: config.model,
      max_tokens: 4000,
      ...fallbackParams(),
      output_config: { effort: "low", format: betaZodOutputFormat(UnderstandSchema) },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `今日の日付：${today}\n\n<利用者の文章>\n${text}\n</利用者の文章>`,
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      throw new UserFacingError("refused", "この文章は読み取れませんでした。質問に答えて進んでください。");
    }
    if (!response.parsed_output) {
      throw new UserFacingError(`no parsed output (stop_reason: ${response.stop_reason})`, "うまく読み取れませんでした。もう一度試すか、質問に答えて進んでください。");
    }
    return toProfileUpdates(response.parsed_output, today);
  } catch (error) {
    throw toUserFacingError(error, "うまく読み取れませんでした。もう一度試すか、質問に答えて進んでください。");
  }
}
