import { createSeedState } from "../../data/seed";
import type { AppState } from "../../types";

const KEY = "stcm:state:v2";
const EVENT = "stcm:changed";

export function loadState(): AppState {
  try {
    const value = localStorage.getItem(KEY);
    if (!value) return createSeedState();
    const parsed = JSON.parse(value) as AppState;
    if (parsed.version !== 2) return createSeedState();
    return { ...parsed, settings: { ...parsed.settings, expectedTrainees: parsed.settings.expectedTrainees ?? 20 } };
  } catch {
    return createSeedState();
  }
}
export function saveState(state: AppState) {
  localStorage.setItem(KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent(EVENT));
}
export function updateState(updater: (state: AppState) => AppState) {
  const next = updater(loadState());
  saveState(next);
  return next;
}
export function resetState() { const state = createSeedState(); saveState(state); return state; }
export const storageEvent = EVENT;
