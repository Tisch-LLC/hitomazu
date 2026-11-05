import type { Risk } from "../domain/risks";

interface Props {
  risks: Risk[];
  /** ご相談シートの質問にまだ答えていないか */
  sheetEmpty: boolean;
  onSheet: () => void;
}

export function RiskPanel({ risks, sheetEmpty, onSheet }: Props) {
  return (
    <section className="card border-2 border-warn/40">
      <h2 className="text-xl font-bold text-ink">「負動産」にしないために</h2>
      <p className="mt-1 text-muted">
        売る・貸す・解体するときに、時間や費用がかかりやすい点です。早めに手を打つほど楽になります。値段の良し悪しを判断するものではありません。
      </p>

      {risks.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {risks.map((r) => (
            <li key={r.id} className="rounded-xl bg-warn-soft/50 p-4">
              <p className="font-bold text-ink">{r.title}</p>
              <p className="mt-1 text-ink">{r.why}</p>
              <p className="mt-2 font-semibold text-accent">→ {r.action}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 font-semibold text-ink">いまの回答では、特に気になる点は見つかりませんでした。</p>
      )}

      {sheetEmpty && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <p className="text-muted">「ご相談シート」の質問に答えると、家の前の道や境目、建物の傷みも確かめられます。</p>
          <button type="button" onClick={onSheet} className="btn-secondary">
            ご相談シートの質問に答える
          </button>
        </div>
      )}
    </section>
  );
}
