/**
 * 文章からの読み取り（/api/understand）の評価。
 *
 * 実際に Claude API を呼ぶので、1回の実行で例文の数だけ費用がかかる（low effort で1件あたり数円程度）。
 *   bun evals/run-understand.ts
 *
 * 採点：
 * - 正解率：expect に書いた項目が、正しい値で読み取れた割合（住所は部分一致）
 * - 推測の数：mustBeEmpty に書いた項目（文章からは決まらない項目）に値を入れてしまった数
 * 合格の条件：正解率 90% 以上、推測 0 件、番地を含めた住所 0 件
 */
import { readClaudeConfig } from "../src/server/config";
import { understandSituation } from "../src/server/understand";
import cases from "./understand-cases.json";

const TODAY = "2026-11-06";

interface Case {
  id: string;
  text: string;
  expect: Record<string, string | number>;
  mustBeEmpty: string[];
  addressMustNotContain?: string;
}

const config = readClaudeConfig();
if (!config.apiKey) {
  console.error("ANTHROPIC_API_KEY が設定されていません（.env を確認してください）");
  process.exit(1);
}

let expected = 0;
let correct = 0;
let guesses = 0;
let addressLeaks = 0;
const failures: string[] = [];

const results = await Promise.all(
  (cases as Case[]).map(async (c) => ({ c, r: await understandSituation(c.text, TODAY, config) })),
);

for (const { c, r } of results) {
  const got = new Map(r.updates.map((u) => [String(u.field), u.value]));
  for (const [field, want] of Object.entries(c.expect)) {
    expected += 1;
    const value = got.get(field);
    const ok = field === "propertyAddress" ? typeof value === "string" && value.includes(String(want)) : value === want;
    if (ok) correct += 1;
    else failures.push(`${c.id}: ${field} の期待値 ${want}、結果 ${value ?? "（なし）"}`);
  }
  for (const field of c.mustBeEmpty) {
    if (got.has(field)) {
      guesses += 1;
      failures.push(`${c.id}: ${field} は文章から決まらないのに ${got.get(field)} と読み取った`);
    }
  }
  if (c.addressMustNotContain) {
    const address = got.get("propertyAddress");
    if (typeof address === "string" && address.includes(c.addressMustNotContain)) {
      addressLeaks += 1;
      failures.push(`${c.id}: 住所に番地が含まれている（${address}）`);
    }
  }
}

const accuracy = expected === 0 ? 1 : correct / expected;
console.log(`例文 ${results.length} 件 / モデル ${config.model} / 基準日 ${TODAY}`);
console.log(`正解率：${(accuracy * 100).toFixed(1)}%（${correct}/${expected}）`);
console.log(`推測で埋めた数：${guesses}`);
console.log(`番地を含めた住所：${addressLeaks}`);
if (failures.length) console.log(`\n外れたもの：\n- ${failures.join("\n- ")}`);

const pass = accuracy >= 0.9 && guesses === 0 && addressLeaks === 0;
console.log(`\n判定：${pass ? "合格" : "不合格"}`);
process.exit(pass ? 0 : 1);
