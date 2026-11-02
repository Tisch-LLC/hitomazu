import { useEffect, useMemo, useState } from "react";
import { ChecklistView } from "./components/ChecklistView";
import { Interview } from "./components/Interview";
import { evaluateChecklist } from "./domain/checklist";
import { formatJapaneseDate, todayISO } from "./domain/dates";
import { EMPTY_PROFILE, type Profile } from "./domain/profile";
import { SAMPLE_PROFILE } from "./domain/sample";
import { clearState, loadState, saveState, type Progress, type Stage } from "./storage";
import "./index.css";

export const APP_NAME = "実家のこれから";

function Intro({ onStart, onSample }: { onStart: () => void; onSample: () => void }) {
  return (
    <div className="mx-auto max-w-2xl py-10 sm:py-16">
      <p className="text-sm font-semibold text-accent">離れて暮らす実家のための手続きナビ</p>
      <h1 className="mt-3 text-3xl font-bold leading-tight text-ink sm:text-4xl">
        実家のこと、
        <br />
        何から始めればいい？
      </h1>
      <p className="mt-5 leading-relaxed text-ink">
        親が亡くなって実家を相続した。親が施設に入って実家が空いた。でも自分は遠くに住んでいて、帰れるのは年に数回だけ。
      </p>
      <p className="mt-3 leading-relaxed text-ink">
        いくつかの質問に「はい・いいえ」で答えると、あなたの状況で<strong>最低限やること</strong>を、期限の近い順に示します。
        各項目には、国や自治体の案内を根拠として付けています。
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <button type="button" onClick={onStart} className="btn-primary">
          質問に答えて始める（約2分）
        </button>
        <button type="button" onClick={onSample} className="btn-secondary">
          サンプル（架空の松江の実家）を見る
        </button>
      </div>
      <p className="mt-6 text-sm text-muted">回答は、このブラウザの中だけに保存されます。</p>
    </div>
  );
}

function SituationSummary({ profile, onEdit }: { profile: Profile; onEdit: () => void }) {
  const facts: string[] = [];
  if (profile.isInheritance === "yes") {
    facts.push(profile.deathDate ? `${formatJapaneseDate(profile.deathDate)}に相続が開始` : "相続あり（亡くなった日は未回答）");
    if (profile.heirsCount) facts.push(`相続人${profile.heirsCount}人`);
  } else if (profile.isInheritance === "no") {
    facts.push("持ち主は存命");
  }
  if (profile.propertyAddress) facts.push(`実家：${profile.propertyAddress}`);
  if (profile.nextVisit) facts.push(`次の帰省：${formatJapaneseDate(profile.nextVisit)}`);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-5">
      <div>
        <h1 className="text-2xl font-bold text-ink">あなたのやることリスト</h1>
        <p className="mt-1 text-sm text-muted">{facts.join("　／　")}</p>
      </div>
      <button type="button" onClick={onEdit} className="btn-secondary text-sm">
        回答を見直す
      </button>
    </div>
  );
}

export function App() {
  const [initial] = useState(() => loadState());
  const [stage, setStage] = useState<Stage>(initial?.stage ?? "intro");
  const [profile, setProfile] = useState<Profile>(initial?.profile ?? EMPTY_PROFILE);
  const [progress, setProgress] = useState<Record<string, Progress>>(initial?.progress ?? {});
  const today = todayISO();

  useEffect(() => {
    if (stage !== "intro") saveState({ stage, profile, progress });
  }, [stage, profile, progress]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [stage]);

  const items = useMemo(() => evaluateChecklist(profile), [profile]);

  const reset = () => {
    if (!confirm("回答と進み具合をすべて消去します。よろしいですか？")) return;
    clearState();
    setProfile(EMPTY_PROFILE);
    setProgress({});
    setStage("intro");
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-line bg-page/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
          <span className="font-bold text-ink">{APP_NAME}</span>
          {stage !== "intro" && (
            <button type="button" onClick={reset} className="text-sm text-muted hover:text-ink">
              最初からやり直す
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-16">
        {stage === "intro" && (
          <Intro
            onStart={() => {
              setProfile(EMPTY_PROFILE);
              setStage("interview");
            }}
            onSample={() => {
              setProfile(SAMPLE_PROFILE);
              setStage("result");
            }}
          />
        )}
        {stage === "interview" && (
          <Interview
            profile={profile}
            onChange={setProfile}
            onFinish={() => setStage("result")}
            onCancel={() => setStage(profile.isInheritance === "unknown" ? "intro" : "result")}
          />
        )}
        {stage === "result" && (
          <div className="space-y-8 pt-6">
            <SituationSummary profile={profile} onEdit={() => setStage("interview")} />
            <ChecklistView
              items={items}
              profile={profile}
              today={today}
              progress={progress}
              onProgress={(id, v) => setProgress((prev) => ({ ...prev, [id]: v }))}
            />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
