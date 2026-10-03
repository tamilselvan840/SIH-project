import { useCallback, useEffect, useState } from "react";
import { loadState, saveState, storageEvent } from "../services/storage/localStore";
import type { AppState } from "../types";

export function useAppState() {
  const [state, setLocal] = useState(loadState);
  useEffect(() => {
    const sync = () => setLocal(loadState());
    window.addEventListener(storageEvent, sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(storageEvent, sync); window.removeEventListener("storage", sync); };
  }, []);
  const setState = useCallback((next: AppState | ((value: AppState) => AppState)) => {
    setLocal((current) => {
      const value = typeof next === "function" ? next(current) : next;
      saveState(value); return value;
    });
  }, []);
  return [state, setState] as const;
}
