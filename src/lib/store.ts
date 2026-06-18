import { useSyncExternalStore } from "react";
import { ASSESS, keysForQuestions, type Component } from "@/data/sehra";

const KEY = "sehra_scoping_v3";

function load(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
}

let data: Record<string, string> = load();
const listeners = new Set<() => void>();

let saveTimer: ReturnType<typeof setTimeout> | undefined;
function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => localStorage.setItem(KEY, JSON.stringify(data)), 150);
}
function emit() { listeners.forEach((l) => l()); }

export function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getField(k: string): string { return data[k] ?? ""; }
export function setField(k: string, v: string) {
  data = { ...data, [k]: v };
  persist();
  emit();
}
export function getAll() { return data; }
export function resetAll() { data = {}; localStorage.removeItem(KEY); emit(); }

export function useField(k: string): string {
  return useSyncExternalStore(subscribe, () => data[k] ?? "");
}

/** Re-render helper that fires whenever any field changes. */
export function useStoreVersion(): number {
  return useSyncExternalStore(
    subscribe,
    () => versionRef.value
  );
}
const versionRef = { value: 0 };
listeners.add(() => { versionRef.value++; });

export function filled(k: string): boolean {
  const v = data[k];
  return v !== undefined && String(v).trim() !== "";
}

export function componentDone(c: Component): boolean {
  return keysForQuestions(c.subsections.flatMap((s) => s.questions)).some(filled);
}

export function completionPct(): number {
  let total = 0, done = 0;
  ASSESS.forEach((c) => {
    const keys = keysForQuestions(c.subsections.flatMap((s) => s.questions));
    total += keys.length;
    done += keys.filter(filled).length;
  });
  return total ? Math.round((done / total) * 100) : 0;
}

export function subStatus(questions: { length: number } & any) {
  const keys = keysForQuestions(questions);
  if (!keys.length) return { done: 0, total: 0, state: "" as "" | "partial" | "complete" };
  const done = keys.filter(filled).length;
  return {
    done,
    total: keys.length,
    state: (done === 0 ? "" : done === keys.length ? "complete" : "partial") as "" | "partial" | "complete",
  };
}
