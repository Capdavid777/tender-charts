import { useMemo, useRef } from 'react';

export interface MemoStats {
  hits: number;
  misses: number;
}

export interface PerfSnapshot {
  renders: number;
  lastRenderMs: number;
  avgRenderMs: number;
  totalRenderMs: number;
  memos: Record<string, MemoStats>;
}

type Listener = (snap: PerfSnapshot) => void;

class PerfRegistry {
  private scopes = new Map<string, PerfSnapshot>();
  private listeners = new Map<string, Set<Listener>>();

  ensure(scope: string): PerfSnapshot {
    let s = this.scopes.get(scope);
    if (!s) {
      s = { renders: 0, lastRenderMs: 0, avgRenderMs: 0, totalRenderMs: 0, memos: {} };
      this.scopes.set(scope, s);
    }
    return s;
  }

  recordRender(scope: string, ms: number) {
    const s = this.ensure(scope);
    s.renders += 1;
    s.lastRenderMs = ms;
    s.totalRenderMs += ms;
    s.avgRenderMs = s.totalRenderMs / s.renders;
    this.emit(scope);
  }

  recordMemo(scope: string, key: string, hit: boolean) {
    const s = this.ensure(scope);
    const m = s.memos[key] ?? { hits: 0, misses: 0 };
    if (hit) m.hits += 1; else m.misses += 1;
    s.memos[key] = m;
  }

  flush(scope: string) {
    this.emit(scope);
  }

  reset(scope: string) {
    this.scopes.delete(scope);
    this.emit(scope);
  }

  subscribe(scope: string, fn: Listener): () => void {
    let set = this.listeners.get(scope);
    if (!set) {
      set = new Set();
      this.listeners.set(scope, set);
    }
    set.add(fn);
    return () => set!.delete(fn);
  }

  snapshot(scope: string): PerfSnapshot {
    const s = this.ensure(scope);
    return { ...s, memos: { ...s.memos } };
  }

  private emit(scope: string) {
    const set = this.listeners.get(scope);
    if (!set) return;
    const snap = this.snapshot(scope);
    set.forEach(fn => fn(snap));
  }
}

export const perfRegistry = new PerfRegistry();

/**
 * Drop-in useMemo replacement that tracks hits (cached) vs misses (recomputed).
 * A "hit" means React reused the previous value; a "miss" means deps changed
 * and the factory ran.
 */
export function useMemoTracked<T>(
  factory: () => T,
  deps: React.DependencyList,
  scope: string,
  key: string,
): T {
  const lastDeps = useRef<React.DependencyList | null>(null);
  const value = useMemo(() => {
    const prev = lastDeps.current;
    const changed =
      !prev ||
      prev.length !== deps.length ||
      prev.some((d, i) => !Object.is(d, deps[i]));
    perfRegistry.recordMemo(scope, key, !changed);
    lastDeps.current = deps;
    return factory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return value;
}
