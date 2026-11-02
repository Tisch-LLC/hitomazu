import { EMPTY_PROFILE, type Profile } from "./domain/profile";

/**
 * 利用者のデータはこのブラウザの中（localStorage）だけに保存する。
 * プライベートブラウズなどで使えない場合でも、画面は動くようにする。
 */

export type Progress = "todo" | "doing" | "done";

export type Stage = "intro" | "interview" | "result";

export interface SavedState {
  stage: Stage;
  profile: Profile;
  progress: Record<string, Progress>;
}

const KEY = "jikka-checklist:v2";
const STAGES: Stage[] = ["intro", "interview", "result"];

export function loadState(): SavedState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedState>;
    return {
      stage: parsed.stage && STAGES.includes(parsed.stage) ? parsed.stage : "intro",
      profile: { ...EMPTY_PROFILE, ...(parsed.profile ?? {}) },
      progress: parsed.progress ?? {},
    };
  } catch {
    return null;
  }
}

export function saveState(state: SavedState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // 保存できなくても画面の操作は続けられる
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // 何もしない
  }
}
