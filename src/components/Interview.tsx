import { useEffect, useState } from "react";
import { formatJapaneseDate, isISODate } from "../domain/dates";
import { visibleQuestions, type Question } from "../domain/interview";
import type { Profile } from "../domain/profile";

interface Props {
  profile: Profile;
  onChange: (profile: Profile) => void;
  onFinish: () => void;
  onCancel: () => void;
}

const COUNT_CHOICES = [1, 2, 3, 4, 5];

function TextOrDateInput({
  question,
  initial,
  onSubmit,
}: {
  question: Extract<Question, { kind: "date" | "text" }>;
  initial: string;
  onSubmit: (value: string) => void;
}) {
  const [value, setValue] = useState(initial);
  useEffect(() => setValue(initial), [question.id, initial]);
  const valid = question.kind === "date" ? isISODate(value) : value.trim() !== "";

  return (
    <form
      className="flex flex-wrap gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSubmit(value.trim());
      }}
    >
      <input
        autoFocus
        type={question.kind === "date" ? "date" : "text"}
        placeholder={question.kind === "text" ? question.placeholder : undefined}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-4 py-3 text-lg text-ink focus:outline-none focus:ring-2 focus:ring-accent/40"
      />
      <button type="submit" disabled={!valid} className="btn-primary disabled:opacity-40">
        次へ
      </button>
      {question.kind === "date" && isISODate(value) && (
        <p className="w-full text-sm text-muted">{formatJapaneseDate(value)}</p>
      )}
    </form>
  );
}

export function Interview({ profile, onChange, onFinish, onCancel }: Props) {
  const [index, setIndex] = useState(0);
  const questions = visibleQuestions(profile);
  const q = questions[Math.min(index, questions.length - 1)];
  if (!q) return null;

  const next = (updated: Profile) => {
    onChange(updated);
    const nextList = visibleQuestions(updated);
    const pos = nextList.findIndex((x) => x.id === q.id);
    if (pos + 1 >= nextList.length) onFinish();
    else setIndex(pos + 1);
  };
  const back = () => (index === 0 ? onCancel() : setIndex(index - 1));
  const skip = () => (index + 1 >= questions.length ? onFinish() : setIndex(index + 1));

  const progress = Math.round((index / questions.length) * 100);
  const current = profile[q.field];

  return (
    <div className="mx-auto max-w-xl py-8 sm:py-12">
      <div className="flex items-center justify-between text-sm text-muted">
        <span className="font-semibold text-accent">{q.section}</span>
        <span>{profile.situation === null ? `質問 ${index + 1}` : `${index + 1} / ${questions.length}`}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-subtle" aria-hidden>
        <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progress}%` }} />
      </div>

      <h2 className="mt-8 text-2xl font-bold leading-snug text-ink">{q.title}</h2>
      {q.help && <p className="mt-2 text-muted">{q.help}</p>}

      <div className="mt-8">
        {(q.kind === "tri" || q.kind === "situation") && (
          <div className="grid gap-3">
            {(q.options as { value: string; label: string; description?: string }[]).map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => next({ ...profile, [q.field]: o.value })}
                className={`rounded-xl border px-5 py-4 text-left transition-colors ${
                  current === o.value
                    ? "border-accent bg-accent-soft"
                    : "border-line bg-surface hover:border-accent hover:bg-accent-soft"
                }`}
              >
                <span className="block text-lg font-semibold text-ink">{o.label}</span>
                {o.description && <span className="mt-1 block text-sm text-muted">{o.description}</span>}
              </button>
            ))}
          </div>
        )}

        {q.kind === "count" && (
          <div className="flex flex-wrap gap-3">
            {COUNT_CHOICES.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => next({ ...profile, heirsCount: n })}
                className={`h-14 w-20 rounded-xl border text-lg font-semibold text-ink transition-colors ${
                  profile.heirsCount === n ? "border-accent bg-accent-soft" : "border-line bg-surface hover:border-accent"
                }`}
              >
                {n === 5 ? "5人以上" : `${n}人`}
              </button>
            ))}
            <button
              type="button"
              onClick={() => next({ ...profile, heirsCount: null })}
              className="h-14 rounded-xl border border-line bg-surface px-5 text-ink hover:border-accent"
            >
              分からない
            </button>
          </div>
        )}

        {(q.kind === "date" || q.kind === "text") && (
          <TextOrDateInput
            question={q}
            initial={typeof current === "string" ? current : ""}
            onSubmit={(v) => next({ ...profile, [q.field]: v })}
          />
        )}
      </div>

      <div className="mt-10 flex items-center justify-between">
        <button type="button" onClick={back} className="text-sm text-muted hover:text-ink">
          ← 戻る
        </button>
        {q.field !== "situation" && (
          <button type="button" onClick={skip} className="text-sm text-muted hover:text-ink">
            分からないので、あとで答える →
          </button>
        )}
      </div>
    </div>
  );
}
