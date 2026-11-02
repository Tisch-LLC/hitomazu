import { useState } from "react";
import { GROUPS, groupEvaluated, type EvaluatedItem, type Group } from "../domain/checklist";
import { daysBetween, formatJapaneseDate, type ISODate } from "../domain/dates";
import type { Profile } from "../domain/profile";
import type { Progress } from "../storage";

interface Props {
  items: EvaluatedItem[];
  profile: Profile;
  today: ISODate;
  progress: Record<string, Progress>;
  onProgress: (id: string, value: Progress) => void;
}

const PROGRESS_OPTIONS: { value: Progress; label: string }[] = [
  { value: "todo", label: "未着手" },
  { value: "doing", label: "対応中" },
  { value: "done", label: "完了" },
];

function remainingLabel(today: ISODate, deadline: ISODate): { text: string; tone: "danger" | "warn" | "normal" } {
  const days = daysBetween(today, deadline);
  if (days < 0) return { text: `期限を${-days}日過ぎています`, tone: "danger" };
  if (days === 0) return { text: "今日が期限です", tone: "danger" };
  if (days <= 30) return { text: `あと${days}日`, tone: "danger" };
  if (days <= 90) return { text: `あと${days}日`, tone: "warn" };
  return { text: `あと${days}日`, tone: "normal" };
}

const TONE_CLASS = {
  danger: "bg-danger-soft text-danger",
  warn: "bg-warn-soft text-warn",
  normal: "bg-subtle text-muted",
} as const;

function StatusBadge({ status }: { status: EvaluatedItem["evaluation"]["status"] }) {
  if (status === "applies") return <span className="badge bg-accent-soft text-accent">要対応</span>;
  if (status === "check") return <span className="badge bg-warn-soft text-warn">要確認</span>;
  return <span className="badge bg-subtle text-muted">対象外</span>;
}

function ItemCard({
  e,
  today,
  nextVisit,
  progress,
  onProgress,
}: {
  e: EvaluatedItem;
  today: ISODate;
  nextVisit: ISODate | null;
  progress: Progress;
  onProgress: (value: Progress) => void;
}) {
  const [open, setOpen] = useState(false);
  const { item, evaluation, deadline } = e;
  const done = progress === "done";
  const remaining = deadline && !done ? remainingLabel(today, deadline.date) : null;
  const beforeVisit = deadline && nextVisit && deadline.date < nextVisit && !done && deadline.date >= today;

  return (
    <li className={`card ${done ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
        <div className="flex-1 min-w-[14rem]">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={evaluation.status} />
            {remaining && <span className={`badge ${TONE_CLASS[remaining.tone]}`}>{remaining.text}</span>}
            {beforeVisit && <span className="badge bg-danger-soft text-danger">次の帰省より前が期限</span>}
          </div>
          <h4 className={`mt-2 font-semibold text-ink leading-snug ${done ? "line-through" : ""}`}>{item.title}</h4>
          {deadline && (
            <p className="mt-1 text-sm text-ink">
              期限：<span className="font-semibold">{formatJapaneseDate(deadline.date)}</span>
              <span className="text-muted">（{deadline.note}）</span>
            </p>
          )}
          <p className="mt-1 text-sm text-muted">{evaluation.reason}</p>
        </div>
        <select
          aria-label={`${item.title}の進み具合`}
          value={progress}
          onChange={(ev) => onProgress(ev.target.value as Progress)}
          className="rounded-lg border border-line bg-surface px-2 py-1 text-sm text-ink"
        >
          {PROGRESS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="mt-3 text-sm font-medium text-accent hover:underline"
      >
        {open ? "詳しい説明を閉じる" : "何をするか・どこで・根拠"}
      </button>

      {open && (
        <div className="mt-3 space-y-3 border-t border-line pt-3 text-sm text-ink">
          <p>{item.summary}</p>
          {item.where && (
            <p>
              <span className="font-semibold">窓口・手段：</span>
              {item.where}
            </p>
          )}
          {item.tips && item.tips.length > 0 && (
            <ul className="list-disc space-y-1 pl-5 text-muted">
              {item.tips.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          )}
          {item.sources.length > 0 && (
            <div>
              <p className="font-semibold">根拠</p>
              <ul className="mt-1 space-y-1">
                {item.sources.map((s) => (
                  <li key={s.url}>
                    <a href={s.url} target="_blank" rel="noreferrer" className="text-accent underline break-all">
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function GroupSection({
  group,
  items,
  props,
}: {
  group: (typeof GROUPS)[number];
  items: EvaluatedItem[];
  props: Props;
}) {
  const [showNA, setShowNA] = useState(false);
  const active = items.filter((e) => e.evaluation.status !== "not_applicable");
  const na = items.filter((e) => e.evaluation.status === "not_applicable");
  const doneCount = active.filter((e) => props.progress[e.item.id] === "done").length;

  return (
    <section id={`group-${group.id}`} className="scroll-mt-24">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-bold text-ink">{group.title}</h3>
        <span className="text-sm text-muted">
          {doneCount} / {active.length} 完了
        </span>
      </div>
      <p className="mt-1 text-sm text-muted">{group.description}</p>
      <ul className="mt-4 space-y-3">
        {active.map((e) => (
          <ItemCard
            key={e.item.id}
            e={e}
            today={props.today}
            nextVisit={props.profile.nextVisit}
            progress={props.progress[e.item.id] ?? "todo"}
            onProgress={(v) => props.onProgress(e.item.id, v)}
          />
        ))}
      </ul>
      {na.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowNA(!showNA)}
            aria-expanded={showNA}
            className="text-sm text-muted hover:text-ink"
          >
            {showNA ? "▾" : "▸"} 対象外の項目（{na.length}件）
          </button>
          {showNA && (
            <ul className="mt-2 space-y-1 text-sm text-muted">
              {na.map((e) => (
                <li key={e.item.id}>
                  <span className="text-ink">{e.item.title}</span>：{e.evaluation.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

export function ChecklistView(props: Props) {
  const grouped = groupEvaluated(props.items);
  const upcoming = props.items
    .filter(
      (e) =>
        e.deadline &&
        e.evaluation.status !== "not_applicable" &&
        props.progress[e.item.id] !== "done" &&
        e.deadline.date >= props.today,
    )
    .sort((a, b) => a.deadline!.date.localeCompare(b.deadline!.date));
  const next = upcoming[0];
  const checkCount = props.items.filter((e) => e.evaluation.status === "check").length;

  return (
    <div className="space-y-10">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card sm:col-span-2">
          <p className="text-xs font-semibold tracking-wider text-muted">いちばん近い期限</p>
          {next?.deadline ? (
            <>
              <p className="mt-1 text-lg font-bold text-ink">{next.item.title}</p>
              <p className="mt-1 text-sm text-ink">
                {formatJapaneseDate(next.deadline.date)}
                <span className={`badge ml-2 ${TONE_CLASS[remainingLabel(props.today, next.deadline.date).tone]}`}>
                  {remainingLabel(props.today, next.deadline.date).text}
                </span>
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm text-muted">亡くなった日を入力すると、期限を計算します。</p>
          )}
        </div>
        <div className="card">
          <p className="text-xs font-semibold tracking-wider text-muted">確認が必要な項目</p>
          <p className="mt-1 text-2xl font-bold text-warn">{checkCount}件</p>
          <p className="text-xs text-muted">分からない項目が分かると、対象かどうかが決まります</p>
        </div>
      </div>

      <nav aria-label="グループ" className="flex flex-wrap gap-2">
        {GROUPS.map((g) => (
          <a key={g.id} href={`#group-${g.id}`} className="rounded-full border border-line bg-surface px-3 py-1 text-sm text-ink hover:bg-subtle">
            {g.title}
          </a>
        ))}
      </nav>

      {GROUPS.map((g) => (
        <GroupSection key={g.id} group={g} items={grouped[g.id as Group]} props={props} />
      ))}

      <p className="text-xs text-muted">
        期限が土日祝日にあたる場合の扱いや、個別の事情による例外は、各窓口や専門家（司法書士・税理士・弁護士）に確認してください。
        このリストは手続きの漏れを防ぐためのもので、法律・税務の判断を代わりに行うものではありません。
      </p>
    </div>
  );
}
