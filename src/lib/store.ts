import { useSyncExternalStore } from "react";
import { ASSESS, keysForQuestions, type Component } from "@/data/sehra";
import { api } from "./api";

/**
 * Reactive answer store.
 * Answers live in memory, mirror to localStorage as a crash backup, and — once
 * server sync is enabled by the school app — autosave to the server in
 * debounced batches via PUT /api/assessment.
 */

const KEY = "sehra_scoping_v3";

function loadLocal(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
}

let data: Record<string, string> = loadLocal();
const listeners = new Set<() => void>();

export type SaveState = "idle" | "saving" | "saved" | "error";
let saveState: SaveState = "idle";
let syncEnabled = false;
let dirty: Record<string, string> = {};
let flushTimer: ReturnType<typeof setTimeout> | undefined;
let inflight: Promise<void> | null = null;

function emit() { listeners.forEach((l) => l()); }

function setSaveState(s: SaveState) {
  if (saveState !== s) { saveState = s; emit(); }
}

function mirrorLocal() {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* full/blocked */ }
}

async function flush(): Promise<void> {
  if (!syncEnabled || Object.keys(dirty).length === 0) return;
  const patch = dirty;
  dirty = {};
  setSaveState("saving");
  try {
    await api.put("/api/assessment", { patch });
    setSaveState(Object.keys(dirty).length ? "saving" : "saved");
  } catch {
    dirty = { ...patch, ...dirty }; // retry on next change
    setSaveState("error");
  }
}

function scheduleFlush() {
  clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    inflight = flush().finally(() => { inflight = null; });
  }, 800);
}

/** Force-save everything pending (used right before submit). */
export async function flushNow(): Promise<void> {
  clearTimeout(flushTimer);
  if (inflight) await inflight;
  await flush();
}

/** Replace the store with server answers (school app on load). */
export function hydrate(answers: Record<string, string>) {
  data = { ...answers };
  dirty = {};
  mirrorLocal();
  emit();
}

/** Turn on server autosave (school app only; never the public landing page). */
export function enableServerSync() { syncEnabled = true; }
export function disableServerSync() { syncEnabled = false; }

export function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getField(k: string): string { return data[k] ?? ""; }

export function setField(k: string, v: string) {
  data = { ...data, [k]: v };
  dirty[k] = v;
  mirrorLocal();
  if (syncEnabled) scheduleFlush();
  emit();
}

export function getAll() { return data; }

export function useField(k: string): string {
  return useSyncExternalStore(subscribe, () => data[k] ?? "");
}

export function useSaveState(): SaveState {
  return useSyncExternalStore(subscribe, () => saveState);
}

/** Re-render helper that fires whenever any field changes. */
export function useStoreVersion(): number {
  return useSyncExternalStore(subscribe, () => versionRef.value);
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
