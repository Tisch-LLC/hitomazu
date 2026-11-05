import { useState } from "react";
import type { Profile } from "../domain/profile";

interface Update {
  field: keyof Profile;
  value: Profile[keyof Profile];
  label: string;
  quote: string | null;
}

interface Props {
  onApply: (updates: Pick<Update, "field" | "value">[]) => void;
  onUseQuestions: () => void;
}

const EXAMPLE =
  "東京に住んでいます。松江市の実家に母が一人で住んでいましたが、今年の春に施設に入りました。家は古く、裏に小さな畑があります。兄が一人いて、お正月に一緒に帰る予定です。";

type Phase = { kind: "input" } | { kind: "loading" } | { kind: "result"; updates: Update[]; unclear: string[] } | { kind: "error"; message: string };

export function FreeText({ onApply, onUseQuestions }: Props) {
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<Phase>({ kind: "input" });
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const submit = async () => {
    setPhase({ kind: "loading" });
    try {
      const res = await fetch("/api/understand", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = (await res.json()) as { updates?: Update[]; unclear?: string[]; error?: string };
      if (!res.ok || !data.updates) {
        setPhase({ kind: "error", message: data.error ?? "うまく読み取れませんでした。" });
        return;
      }
      setSelected(new Set(data.updates.map((u) => String(u.field))));
      setPhase({ kind: "result", updates: data.updates, unclear: data.unclear ?? [] });
    } catch {
      setPhase({ kind: "error", message: "インターネットにつながっていないようです。つながる場所で、もう一度試してください。" });
    }
  };

  if (phase.kind === "result") {
    const toggle = (field: string) =>
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(field)) next.delete(field);
        else next.add(field);
        return next;
      });
    return (
      <div className="mx-auto max-w-xl space-y-6 py-8">
        <h2 className="text-2xl font-bold text-ink">こう読み取りました</h2>
        {phase.updates.length === 0 ? (
          <p className="text-ink">読み取れる内容がありませんでした。質問に答えて進んでください。</p>
        ) : (
          <>
            <p className="text-muted">違うものがあれば、押してチェックを外してください。</p>
            <ul className="space-y-2">
              {phase.updates.map((u) => {
                const on = selected.has(String(u.field));
                return (
                  <li key={String(u.field)}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggle(String(u.field))}
                      className={`flex w-full items-start gap-3 rounded-xl border-2 p-4 text-left ${
                        on ? "border-accent bg-accent-soft" : "border-line bg-surface opacity-60"
                      }`}
                    >
                      <span aria-hidden className="mt-0.5 text-xl font-bold text-accent">
                        {on ? "✓" : "　"}
                      </span>
                      <span>
                        <span className="block font-semibold text-ink">{u.label}</span>
                        {u.quote && <span className="mt-1 block text-sm text-muted">「{u.quote}」より</span>}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
        {phase.unclear.length > 0 && (
          <div className="card">
            <p className="font-semibold text-ink">はっきりしなかったこと（このあと質問で確かめます）</p>
            <ul className="mt-2 list-disc space-y-1 pl-6 text-ink">
              {phase.unclear.map((u) => (
                <li key={u}>{u}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="btn-primary"
            onClick={() => onApply(phase.updates.filter((u) => selected.has(String(u.field))))}
          >
            この内容で進む →
          </button>
          <button type="button" className="btn-secondary" onClick={() => setPhase({ kind: "input" })}>
            書き直す
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-5 py-8">
      <h2 className="text-2xl font-bold leading-snug text-ink">いまの状況を、自分の言葉で書いてください</h2>
      <p className="text-ink">
        話すように書いて大丈夫です。AI（Claude）が読み取って、このあとの質問の答えを埋めます。分からないことは書かなくて大丈夫です。
      </p>
      <div className="card bg-subtle/60">
        <p className="text-sm font-semibold text-muted">書き方の例</p>
        <p className="mt-1 text-ink">{EXAMPLE}</p>
        <button type="button" className="mt-2 font-semibold text-accent underline" onClick={() => setText(EXAMPLE)}>
          この例をそのまま使って試す
        </button>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={7}
        maxLength={2000}
        placeholder="ここに書いてください"
        disabled={phase.kind === "loading"}
        className="w-full rounded-xl border-2 border-line bg-surface p-4 text-lg text-ink focus:border-accent focus:outline-none"
      />
      <p className="text-sm text-muted">
        スマホでは、キーボードのマイクのボタンを押すと、話して入力できます。名前や番地は書かないでください。書いた文章は、読み取りのためにAIに送られます。
      </p>
      {phase.kind === "error" && (
        <p role="alert" className="rounded-xl bg-danger-soft p-4 font-semibold text-danger">
          {phase.message}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="btn-primary disabled:opacity-40"
          disabled={text.trim() === "" || phase.kind === "loading"}
          onClick={submit}
        >
          {phase.kind === "loading" ? "読み取っています…（10秒ほど）" : "読み取る"}
        </button>
        <button type="button" className="btn-secondary" onClick={onUseQuestions}>
          質問に答えて進む
        </button>
      </div>
    </div>
  );
}
