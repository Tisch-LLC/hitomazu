import { useState } from "react";
import type { Profile } from "../domain/profile";

interface Props {
  itemId: string;
  profile: Profile;
}

interface Answer {
  answer: string;
  sources: { label: string; url: string }[];
  confirmWith: string;
}

const SUGGESTIONS = ["何を準備すればいい？", "遠くに住んでいても、できる？", "家族に代わりに頼める？", "費用はかかる？"];

/** やることリストの1項目について、AIに質問する欄 */
export function AskBox({ itemId, profile }: Props) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answer, setAnswer] = useState<Answer | null>(null);

  const ask = async (q: string) => {
    if (!q.trim()) return;
    setQuestion(q);
    setLoading(true);
    setError(null);
    setAnswer(null);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ itemId, question: q, profile }),
      });
      const data = (await res.json()) as Partial<Answer> & { error?: string };
      if (!res.ok || !data.answer) setError(data.error ?? "うまく答えられませんでした。");
      else setAnswer({ answer: data.answer, sources: data.sources ?? [], confirmWith: data.confirmWith ?? "" });
    } catch {
      setError("インターネットにつながっていないようです。つながる場所で、もう一度試してください。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3 rounded-xl bg-subtle/60 p-4">
      <p className="font-semibold text-ink">この項目について、AIに質問する</p>
      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            disabled={loading}
            onClick={() => ask(s)}
            className="rounded-full border-2 border-line bg-surface px-3 py-1.5 text-sm font-semibold text-ink hover:border-accent disabled:opacity-40"
          >
            {s}
          </button>
        ))}
      </div>
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
      >
        <input
          type="text"
          value={question}
          maxLength={300}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="例：仏壇はどうすればいい？"
          disabled={loading}
          className="min-w-0 flex-1 rounded-lg border-2 border-line bg-surface px-3 py-2 text-ink focus:border-accent focus:outline-none"
        />
        <button type="submit" disabled={loading || !question.trim()} className="btn-primary disabled:opacity-40">
          {loading ? "考えています…" : "質問する"}
        </button>
      </form>

      {error && (
        <p role="alert" className="rounded-lg bg-danger-soft p-3 font-semibold text-danger">
          {error}
        </p>
      )}
      {answer && (
        <div className="space-y-2 rounded-lg bg-surface p-4" aria-live="polite">
          <p className="leading-relaxed text-ink">{answer.answer}</p>
          {answer.sources.length > 0 && (
            <p className="text-sm text-muted">
              根拠：
              {answer.sources.map((s, i) => (
                <span key={s.url}>
                  {i > 0 && "、"}
                  <a href={s.url} target="_blank" rel="noreferrer" className="text-accent underline">
                    {s.label}
                  </a>
                </span>
              ))}
            </p>
          )}
          {answer.confirmWith && <p className="text-sm font-semibold text-ink">最終的な確認先：{answer.confirmWith}</p>}
          <p className="text-xs text-muted">AIの回答です。間違いがあるかもしれません。大事なことは、必ず窓口や専門家に確かめてください。</p>
        </div>
      )}
    </div>
  );
}
