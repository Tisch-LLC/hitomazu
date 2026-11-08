/**
 * 項目ごとの質問（/api/ask）の評価。実際に Claude API を呼ぶ（1件あたり数円程度）。
 *   bun evals/run-ask.ts
 *
 * 確かめること：値段・税の判断をしない、指示文を漏らさない、期限や窓口を正しく伝える。
 * 合格の条件：すべての例で、期待どおりの扱い（範囲外かどうか）と、含む／含まない語句の条件を満たす。
 */
import { SAMPLE_PROFILE } from "../src/domain/sample";
import { askAboutItem } from "../src/server/ask";
import { readClaudeConfig } from "../src/server/config";
import cases from "./ask-cases.json";

const TODAY = "2026-11-06";

interface Case {
  id: string;
  itemId: string;
  question: string;
  expectOutOfScope?: boolean;
  mustInclude?: string[];
  mustNotInclude?: string[];
  expectFacts?: { field: string; value: string }[];
  expectNoFacts?: boolean;
}

const config = readClaudeConfig();
if (!config.apiKey) {
  console.error("ANTHROPIC_API_KEY が設定されていません（.env を確認してください）");
  process.exit(1);
}

const results = await Promise.all(
  (cases as Case[]).map(async (c) => ({ c, r: await askAboutItem(c.itemId, c.question, SAMPLE_PROFILE, TODAY, config) })),
);

const failures: string[] = [];
for (const { c, r } of results) {
  const text = `${r.answer}\n${r.confirmWith}`;
  if (c.expectOutOfScope !== undefined && r.outOfScope !== c.expectOutOfScope) {
    failures.push(`${c.id}: 範囲外の扱いが ${r.outOfScope}（期待 ${c.expectOutOfScope}）`);
  }
  for (const w of c.mustInclude ?? []) if (!text.includes(w)) failures.push(`${c.id}: 「${w}」が含まれていない`);
  for (const w of c.mustNotInclude ?? []) if (text.includes(w)) failures.push(`${c.id}: 「${w}」が含まれている`);
  for (const f of c.expectFacts ?? []) {
    if (!r.updates.some((u) => u.field === f.field && u.value === f.value)) failures.push(`${c.id}: 事実 ${f.field}=${f.value} を読み取っていない`);
  }
  if (c.expectNoFacts && r.updates.length > 0) failures.push(`${c.id}: 質問の形なのに事実として読み取った（${r.updates.map((u) => u.field).join(",")}）`);
  console.log(`\n[${c.id}] ${c.question}\n→ ${r.answer}\n  確認先：${r.confirmWith}${r.updates.length ? `\n  反映候補：${r.updates.map((u) => u.label).join("、")}` : ""}`);
}

console.log(`\n例 ${results.length} 件 / モデル ${config.model}`);
if (failures.length) console.log(`外れたもの：\n- ${failures.join("\n- ")}`);
console.log(`判定：${failures.length === 0 ? "合格" : "不合格"}`);
process.exit(failures.length === 0 ? 0 : 1);
