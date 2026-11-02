import { useEffect, useMemo, useState } from "react";
import { ChecklistView } from "./components/ChecklistView";
import { ProfileForm } from "./components/ProfileForm";
import { evaluateChecklist } from "./domain/checklist";
import { todayISO } from "./domain/dates";
import { EMPTY_PROFILE, type Profile } from "./domain/profile";
import { SAMPLE_PROFILE } from "./domain/sample";
import { clearState, loadState, saveState, type Progress } from "./storage";
import "./index.css";

export const APP_NAME = "実家のこれから";

function Intro({ onStart, onSample }: { onStart: () => void; onSample: () => void }) {
  return (
    <div className="mx-auto max-w-2xl py-10 sm:py-16">
      <p className="text-sm font-semibold text-accent">遠方の実家を相続した人のための手続きナビ</p>
      <h1 className="mt-3 text-3xl font-bold leading-tight text-ink sm:text-4xl">
        何から始めればいいか、
        <br />
        期限の近い順に分かる。
      </h1>
      <p className="mt-5 text-ink leading-relaxed">
        親が亡くなり、地方の実家を相続した。でも自分は都会に住んでいて、帰省できるのは年に数回だけ。
        相続放棄や相続登記には期限があり、農地や山林があれば届出も必要です。
      </p>
      <p className="mt-3 text-ink leading-relaxed">
        いくつかの質問に答えると、あなたの状況で<strong>最低限やること</strong>を、
        「期限があるもの」「遠隔でできるもの」「次の帰省でやるもの」に分けて示します。各項目には国や自治体の根拠を付けています。
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <button type="button" onClick={onStart} className="btn-primary">
          自分の状況を入力する
        </button>
        <button type="button" onClick={onSample} className="btn-secondary">
          サンプル（架空の松江の実家）で試す
        </button>
      </div>
      <p className="mt-6 text-sm text-muted">入力した内容は、このブラウザの中だけに保存されます。</p>
    </div>
  );
}

export function App() {
  const [initial] = useState(() => loadState());
  const [started, setStarted] = useState(initial !== null);
  const [profile, setProfile] = useState<Profile>(initial?.profile ?? EMPTY_PROFILE);
  const [progress, setProgress] = useState<Record<string, Progress>>(initial?.progress ?? {});
  const today = todayISO();

  useEffect(() => {
    if (started) saveState({ profile, progress });
  }, [started, profile, progress]);

  const items = useMemo(() => evaluateChecklist(profile), [profile]);

  const reset = () => {
    if (!confirm("入力した内容と進み具合をすべて消去します。よろしいですか？")) return;
    clearState();
    setProfile(EMPTY_PROFILE);
    setProgress({});
    setStarted(false);
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-line bg-page/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <span className="font-bold text-ink">{APP_NAME}</span>
          {started && (
            <button type="button" onClick={reset} className="text-sm text-muted hover:text-ink">
              最初からやり直す
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16">
        {!started ? (
          <Intro
            onStart={() => setStarted(true)}
            onSample={() => {
              setProfile(SAMPLE_PROFILE);
              setStarted(true);
            }}
          />
        ) : (
          <div className="grid gap-8 pt-6 lg:grid-cols-[20rem_1fr]">
            <aside className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
              <details open className="card group">
                <summary className="cursor-pointer list-none font-bold text-ink">
                  あなたの状況
                  <span className="ml-2 text-xs font-normal text-muted group-open:hidden">（開く）</span>
                </summary>
                <p className="mt-1 text-xs text-muted">分からない項目は空欄・「分からない」のままで大丈夫です。</p>
                <div className="mt-4">
                  <ProfileForm profile={profile} onChange={setProfile} />
                </div>
              </details>
            </aside>
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
