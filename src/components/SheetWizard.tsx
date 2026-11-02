import { useState } from "react";
import type { Profile } from "../domain/profile";
import { SHEET_STEPS, visibleSheetQuestions, type SheetAnswers } from "../domain/sheet";

interface Props {
  profile: Profile;
  answers: SheetAnswers;
  onChange: (answers: SheetAnswers) => void;
  onFinish: () => void;
  onCancel: () => void;
}

export function SheetWizard({ profile, answers, onChange, onFinish, onCancel }: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const step = SHEET_STEPS[stepIndex]!;
  const questions = visibleSheetQuestions(step, profile);
  const isLast = stepIndex === SHEET_STEPS.length - 1;

  const go = (delta: number) => {
    const next = stepIndex + delta;
    if (next < 0) return onCancel();
    if (next >= SHEET_STEPS.length) return onFinish();
    setStepIndex(next);
    window.scrollTo(0, 0);
  };

  return (
    <div className="mx-auto max-w-xl py-8">
      <div className="flex items-center justify-between text-muted">
        <span className="font-semibold text-accent">不動産会社に渡すシート</span>
        <span>
          {stepIndex + 1} / {SHEET_STEPS.length}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-subtle" aria-hidden>
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${Math.round((stepIndex / SHEET_STEPS.length) * 100)}%` }}
        />
      </div>

      <h2 className="mt-8 text-2xl font-bold text-ink">{step.title}</h2>
      <p className="mt-2 text-muted">{step.lead}</p>

      <div className="mt-8 space-y-8">
        {questions.map((q) => (
          <fieldset key={q.field}>
            <legend className="text-lg font-semibold leading-snug text-ink">{q.title}</legend>
            {q.help && <p className="mt-1 text-muted">{q.help}</p>}
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {q.options.map((o) => {
                const selected = answers[q.field] === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onChange({ ...answers, [q.field]: o.value })}
                    className={`min-h-14 rounded-xl border-2 px-4 py-3 text-left font-semibold transition-colors ${
                      selected ? "border-accent bg-accent-soft text-ink" : "border-line bg-surface text-ink hover:border-accent"
                    }`}
                  >
                    {selected && <span aria-hidden>✓ </span>}
                    {o.label}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}

        {step.notes && (
          <label className="block">
            <span className="text-lg font-semibold text-ink">ほかに伝えておきたいことがあれば、書いてください</span>
            <span className="mt-1 block text-muted">
              例：隣の家と、庭の木について話し合ったことがある。冬は雪で道が通れなくなる。（書かなくても大丈夫です）
            </span>
            <textarea
              value={answers.notes}
              onChange={(e) => onChange({ ...answers, notes: e.target.value })}
              rows={4}
              className="mt-3 w-full rounded-xl border-2 border-line bg-surface p-3 text-ink focus:border-accent focus:outline-none"
            />
          </label>
        )}
      </div>

      <div className="mt-10 flex items-center justify-between gap-3">
        <button type="button" onClick={() => go(-1)} className="btn-secondary">
          ← 戻る
        </button>
        <button type="button" onClick={() => go(1)} className="btn-primary">
          {isLast ? "シートを見る" : "次へ →"}
        </button>
      </div>
      <p className="mt-4 text-center text-sm text-muted">分からない質問は、選ばずに「次へ」を押しても大丈夫です。</p>
    </div>
  );
}
