import { useEffect, useMemo, useState } from "react";
import { ChecklistView } from "./components/ChecklistView";
import { FreeText } from "./components/FreeText";
import { Interview } from "./components/Interview";
import { RiskPanel } from "./components/RiskPanel";
import { SheetPreview } from "./components/SheetPreview";
import { SheetWizard } from "./components/SheetWizard";
import { evaluateChecklist } from "./domain/checklist";
import { formatJapaneseDate, todayISO } from "./domain/dates";
import { EMPTY_PROFILE, SITUATION_LABELS, type Profile } from "./domain/profile";
import { SAMPLE_PROFILE, SAMPLE_SHEET } from "./domain/sample";
import { findRisks } from "./domain/risks";
import { buildSheet, EMPTY_SHEET, type SheetAnswers } from "./domain/sheet";
import { clearState, loadState, saveState, type Progress, type Stage } from "./storage";
import "./index.css";

export const APP_NAME = "実家のこれから";

function Intro({
  claudeReady,
  onStart,
  onFreeText,
  onSample,
}: {
  claudeReady: boolean;
  onStart: () => void;
  onFreeText: () => void;
  onSample: () => void;
}) {
  return (
    <div className="mx-auto max-w-2xl py-10 sm:py-14">
      <p className="font-semibold text-accent">離れて暮らす実家のための手続きナビ</p>
      <h1 className="mt-3 text-3xl font-bold leading-tight text-ink sm:text-4xl">
        実家のこと、
        <br />
        何を、いつまでに？
      </h1>
      <p className="mt-5 text-lg leading-relaxed text-ink">
        親が施設に入った。親が亡くなった。親が一人で暮らしていて、この先が心配。
        でも自分は遠くに住んでいて、帰れるのは年に数回だけ――。
      </p>
      <p className="mt-3 leading-relaxed text-ink">
        質問に答えると、あなたの状況で<strong>最低限やること</strong>と<strong>期限</strong>が分かります。
        不動産会社に渡す「ご相談シート」も作れます。
      </p>

      <div className="mt-8 grid gap-3">
        <button type="button" onClick={onStart} className="rounded-2xl border-2 border-accent bg-accent p-5 text-left text-white hover:opacity-90">
          <span className="block text-xl font-bold">質問に答えて始める</span>
          <span className="mt-1 block opacity-90">ボタンを押すだけ。2分ほどで終わります</span>
        </button>
        {claudeReady && (
          <button type="button" onClick={onFreeText} className="rounded-2xl border-2 border-line bg-surface p-5 text-left hover:border-accent">
            <span className="block text-xl font-bold text-ink">自分の言葉で書いて始める</span>
            <span className="mt-1 block text-muted">状況を文章で書くと、AIが読み取ります。スマホなら話して入力もできます</span>
          </button>
        )}
      </div>
      <button type="button" onClick={onSample} className="mt-5 font-semibold text-accent underline underline-offset-4">
        まず見てみる（架空の「松江の実家」のサンプル）
      </button>

      <div className="mt-10 card">
        <p className="font-semibold text-ink">島根県では、使われていない空き家の割合が全国の約2倍です</p>
        <p className="mt-1 text-muted">
          売りにも貸しにも出されていない空き家の割合は、全国 5.9％に対して島根県 11.3％（2023年）。
          空き家が増える一番の理由は、親世代が亡くなることだとされています。
        </p>
        <p className="mt-2 text-xs text-muted">出典：日本総合研究所「2040年代の全国・都道府県別空き家数・空き家率の推計」（2025年3月）</p>
      </div>

      <p className="mt-6 text-sm text-muted">
        回答は、このブラウザの中だけに保存されます。このアプリは手続きの漏れを防ぐためのもので、法律・税金・価格の判断は専門家に確認してください。
      </p>
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
  const [claudeReady, setClaudeReady] = useState(false);
  const [resume, setResume] = useState(false);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((d: { claude?: { configured?: boolean } }) => setClaudeReady(d.claude?.configured === true))
      .catch(() => setClaudeReady(false));
  }, []);
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
            claudeReady={claudeReady}
            onStart={() => {
              setProfile(EMPTY_PROFILE);
              setSheet(EMPTY_SHEET);
              setResume(false);
              setStage("interview");
            }}
            onFreeText={() => {
              setProfile(EMPTY_PROFILE);
              setSheet(EMPTY_SHEET);
              setStage("freeText");
            }}
            onSample={() => {
              setProfile(SAMPLE_PROFILE);
              setSheet(SAMPLE_SHEET);
              setStage("result");
            }}
          />
        )}
        {stage === "freeText" && (
          <FreeText
            onApply={(updates) => {
              const next = { ...EMPTY_PROFILE };
              for (const u of updates) Object.assign(next, { [u.field]: u.value });
              setProfile(next);
              setResume(true);
              setStage("interview");
            }}
            onUseQuestions={() => {
              setResume(false);
              setStage("interview");
            }}
          />
        )}
        {stage === "interview" && (
          <Interview
            key={resume ? "resume" : "start"}
            resume={resume}
            profile={profile}
            onChange={setProfile}
            onFinish={() => setStage("result")}
            onCancel={() => setStage(profile.situation === null ? "intro" : "result")}
          />
        )}
        {stage === "result" && (
          <div className="space-y-8 pt-6">
            <SituationSummary
              profile={profile}
              onEdit={() => {
                setResume(false);
                setStage("interview");
              }} onSheet={() => setStage("sheet")} />
            <RiskPanel
              risks={findRisks(profile, sheet)}
              sheetEmpty={JSON.stringify(sheet) === JSON.stringify(EMPTY_SHEET)}
              onSheet={() => setStage("sheet")}
            />
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
