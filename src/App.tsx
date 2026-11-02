import { useEffect, useMemo, useState } from "react";
import { ChecklistView } from "./components/ChecklistView";
import { Interview } from "./components/Interview";
import { SheetPreview } from "./components/SheetPreview";
import { SheetWizard } from "./components/SheetWizard";
import { evaluateChecklist } from "./domain/checklist";
import { formatJapaneseDate, todayISO } from "./domain/dates";
import { EMPTY_PROFILE, SITUATION_LABELS, type Profile } from "./domain/profile";
import { SAMPLE_PROFILE, SAMPLE_SHEET } from "./domain/sample";
import { buildSheet, EMPTY_SHEET, type SheetAnswers } from "./domain/sheet";
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
        親が施設に入って、実家が空いた。親が一人で暮らしていて、この先が気になる。親が亡くなり、実家を相続した。
        でも自分は遠くに住んでいて、帰れるのは年に数回だけ。
      </p>
      <p className="mt-3 leading-relaxed text-ink">
        いくつかの質問に答えると、あなたの状況で<strong>最低限やること</strong>を、
        「遠くからできること」「次の帰省でやること」「これからの方針」に分けて示します。期限のある手続きがあれば、期限の近い順に並べます。
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

function SituationSummary({
  profile,
  onEdit,
  onSheet,
}: {
  profile: Profile;
  onEdit: () => void;
  onSheet: () => void;
}) {
  const facts: string[] = [];
  if (profile.situation) facts.push(SITUATION_LABELS[profile.situation]);
  if (profile.situation === "inherited" && profile.deathDate) {
    facts.push(`${formatJapaneseDate(profile.deathDate)}に相続が開始`);
  }
  if (profile.propertyAddress) facts.push(`実家：${profile.propertyAddress}`);
  if (profile.nextVisit) facts.push(`次の帰省：${formatJapaneseDate(profile.nextVisit)}`);

  return (
    <div className="space-y-4 border-b border-line pb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">あなたのやることリスト</h1>
          <p className="mt-1 text-muted">{facts.join("　／　")}</p>
        </div>
        <button type="button" onClick={onEdit} className="btn-secondary">
          質問に答え直す
        </button>
      </div>
      <div className="card space-y-2 bg-accent-soft/40">
        <p className="font-bold text-ink">使い方</p>
        <ol className="list-decimal space-y-1 pl-6 text-ink">
          <li>上から順に見ていきます。期限が近いものほど上にあります。</li>
          <li>終わったら、右の「済んだら押す」を押します。</li>
          <li>「確認が必要」の項目は、下の質問に「はい・いいえ」で答えると、やるかどうかが決まります。</li>
        </ol>
      </div>
      <div className="card flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-bold text-ink">不動産会社に相談するときは</p>
          <p className="text-muted">家の状態や手元の書類をまとめた「ご相談シート」を作って、印刷・PDFで渡せます。</p>
        </div>
        <button type="button" onClick={onSheet} className="btn-primary">
          ご相談シートを作る
        </button>
      </div>
    </div>
  );
}

export function App() {
  const [initial] = useState(() => loadState());
  const [stage, setStage] = useState<Stage>(initial?.stage ?? "intro");
  const [profile, setProfile] = useState<Profile>(initial?.profile ?? EMPTY_PROFILE);
  const [progress, setProgress] = useState<Record<string, Progress>>(initial?.progress ?? {});
  const [sheet, setSheet] = useState<SheetAnswers>(initial?.sheet ?? EMPTY_SHEET);
  const today = todayISO();

  useEffect(() => {
    if (stage !== "intro") saveState({ stage, profile, progress, sheet });
  }, [stage, profile, progress, sheet]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [stage]);

  const items = useMemo(() => evaluateChecklist(profile), [profile]);

  const reset = () => {
    if (!confirm("回答と進み具合をすべて消去します。よろしいですか？")) return;
    clearState();
    setProfile(EMPTY_PROFILE);
    setProgress({});
    setSheet(EMPTY_SHEET);
    setStage("intro");
  };

  return (
    <div className="min-h-screen">
      <header className="app-header sticky top-0 z-10 border-b border-line bg-page/90 backdrop-blur">
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
              setSheet(EMPTY_SHEET);
              setStage("interview");
            }}
            onSample={() => {
              setProfile(SAMPLE_PROFILE);
              setSheet(SAMPLE_SHEET);
              setStage("result");
            }}
          />
        )}
        {stage === "interview" && (
          <Interview
            profile={profile}
            onChange={setProfile}
            onFinish={() => setStage("result")}
            onCancel={() => setStage(profile.situation === null ? "intro" : "result")}
          />
        )}
        {stage === "result" && (
          <div className="space-y-8 pt-6">
            <SituationSummary profile={profile} onEdit={() => setStage("interview")} onSheet={() => setStage("sheet")} />
            <ChecklistView
              items={items}
              profile={profile}
              today={today}
              progress={progress}
              onProgress={(id, v) => setProgress((prev) => ({ ...prev, [id]: v }))}
              onAnswer={(field, value) => setProfile((prev) => ({ ...prev, [field]: value }))}
            />
          </div>
        )}
        {stage === "sheet" && (
          <SheetWizard
            profile={profile}
            answers={sheet}
            onChange={setSheet}
            onFinish={() => setStage("sheetPreview")}
            onCancel={() => setStage("result")}
          />
        )}
        {stage === "sheetPreview" && (
          <SheetPreview
            sheet={buildSheet(profile, sheet, today)}
            appName={APP_NAME}
            onEdit={() => setStage("sheet")}
            onBack={() => setStage("result")}
          />
        )}
      </main>
    </div>
  );
}

export default App;
