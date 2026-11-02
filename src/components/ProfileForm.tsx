import type { ReactNode } from "react";
import { isISODate } from "../domain/dates";
import type { Profile, Tri } from "../domain/profile";

interface Props {
  profile: Profile;
  onChange: (profile: Profile) => void;
}

const TRI_OPTIONS: { value: Tri; label: string }[] = [
  { value: "yes", label: "はい" },
  { value: "no", label: "いいえ" },
  { value: "unknown", label: "分からない" },
];

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-ink">{label}</span>
      {hint && <span className="block text-xs text-muted mt-0.5">{hint}</span>}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function TriField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: Tri;
  onChange: (v: Tri) => void;
}) {
  return (
    <fieldset>
      <legend className="block text-sm font-medium text-ink">{label}</legend>
      {hint && <span className="block text-xs text-muted mt-0.5">{hint}</span>}
      <div className="mt-1.5 inline-flex rounded-lg border border-line bg-surface p-0.5">
        {TRI_OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={value === o.value}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              value === o.value ? "bg-accent text-white" : "text-ink hover:bg-subtle"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

const inputClass =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/40";

export function ProfileForm({ profile, onChange }: Props) {
  const set = <K extends keyof Profile>(key: K, value: Profile[K]) => onChange({ ...profile, [key]: value });
  const dateValue = (v: string) => (isISODate(v) ? v : null);
  const numberValue = (v: string) => {
    const n = Number(v);
    return v.trim() === "" || !Number.isFinite(n) ? null : Math.trunc(n);
  };

  return (
    <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
      <section className="space-y-4">
        <h3 className="text-xs font-semibold tracking-wider text-muted">相続のこと</h3>
        <Field label="亡くなった日" hint="期限の計算に使います">
          <input
            type="date"
            className={inputClass}
            value={profile.deathDate ?? ""}
            onChange={(e) => set("deathDate", dateValue(e.target.value))}
          />
        </Field>
        <Field label="相続の開始を知った日" hint="亡くなった日と違う場合だけ入力">
          <input
            type="date"
            className={inputClass}
            value={profile.knownDate ?? ""}
            onChange={(e) => set("knownDate", dateValue(e.target.value))}
          />
        </Field>
        <Field label="相続人の人数" hint="ご自身を含めた法定相続人の数">
          <input
            type="number"
            min={1}
            className={inputClass}
            value={profile.heirsCount ?? ""}
            onChange={(e) => set("heirsCount", numberValue(e.target.value))}
          />
        </Field>
        <TriField label="遺言書がある" value={profile.hasWill} onChange={(v) => set("hasWill", v)} />
        <TriField
          label="借金や保証人の心配がある"
          value={profile.debtConcern}
          onChange={(v) => set("debtConcern", v)}
        />
        <TriField
          label="亡くなった人に申告が必要な所得があった"
          hint="一定額以上の年金、事業・不動産の収入など"
          value={profile.deceasedHadIncome}
          onChange={(v) => set("deceasedHadIncome", v)}
        />
        <TriField
          label="遺産が相続税の基礎控除を超えそう"
          hint="3,000万円＋600万円×相続人の数"
          value={profile.estateMayExceedBasic}
          onChange={(v) => set("estateMayExceedBasic", v)}
        />
      </section>

      <section className="space-y-4">
        <h3 className="text-xs font-semibold tracking-wider text-muted">実家のこと</h3>
        <Field label="実家の所在地">
          <input
            type="text"
            className={inputClass}
            placeholder="例：島根県松江市"
            value={profile.propertyAddress}
            onChange={(e) => set("propertyAddress", e.target.value)}
          />
        </Field>
        <Field label="建てた年（西暦）" hint="分からなければ空欄">
          <input
            type="number"
            min={1868}
            max={2100}
            className={inputClass}
            placeholder="例：1978"
            value={profile.builtYear ?? ""}
            onChange={(e) => set("builtYear", numberValue(e.target.value))}
          />
        </Field>
        <TriField
          label="亡くなる直前は一人暮らしだった"
          value={profile.deceasedLivedAlone}
          onChange={(v) => set("deceasedLivedAlone", v)}
        />
        <TriField
          label="土地に田・畑が含まれる"
          hint="登記事項証明書の「地目」で分かります"
          value={profile.hasFarmland}
          onChange={(v) => set("hasFarmland", v)}
        />
        <TriField label="土地に山林が含まれる" value={profile.hasForest} onChange={(v) => set("hasForest", v)} />
      </section>

      <section className="space-y-4">
        <h3 className="text-xs font-semibold tracking-wider text-muted">あなたのこと</h3>
        <Field label="お住まい">
          <input
            type="text"
            className={inputClass}
            placeholder="例：東京都"
            value={profile.userResidence}
            onChange={(e) => set("userResidence", e.target.value)}
          />
        </Field>
        <Field label="次に帰省する予定の日">
          <input
            type="date"
            className={inputClass}
            value={profile.nextVisit ?? ""}
            onChange={(e) => set("nextVisit", dateValue(e.target.value))}
          />
        </Field>
      </section>
    </form>
  );
}
