import { useEffect, useState } from 'react';
import { Activity, X, RotateCcw } from 'lucide-react';
import { perfRegistry, PerfSnapshot } from '@/lib/perf';
import { cn } from '@/lib/utils';

interface PerfPanelProps {
  scope: string;
}

const STORAGE_KEY = 'perf-panel-open';

export default function PerfPanel({ scope }: PerfPanelProps) {
  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem(STORAGE_KEY) === '1';
  });
  const [snap, setSnap] = useState<PerfSnapshot>(() => perfRegistry.snapshot(scope));

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, open ? '1' : '0');
  }, [open]);

  useEffect(() => {
    setSnap(perfRegistry.snapshot(scope));
    return perfRegistry.subscribe(scope, setSnap);
  }, [scope]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
        aria-label="Open performance panel"
      >
        <Activity className="w-4 h-4" />
        Perf
      </button>
    );
  }

  const memoEntries = Object.entries(snap.memos);
  const totalHits = memoEntries.reduce((s, [, m]) => s + m.hits, 0);
  const totalMisses = memoEntries.reduce((s, [, m]) => s + m.misses, 0);
  const overallHitRate = totalHits + totalMisses > 0
    ? (totalHits / (totalHits + totalMisses)) * 100
    : 0;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[340px] max-h-[70vh] rounded-lg border border-border bg-card shadow-xl flex flex-col animate-fade-in">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Performance</h3>
          <span className="text-xs text-muted-foreground">/ {scope}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => perfRegistry.reset(scope)}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Reset metrics"
            title="Reset metrics"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close performance panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="overflow-y-auto px-4 py-3 space-y-4">
        {/* Render stats */}
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Renders" value={snap.renders.toString()} />
          <Stat label="Last" value={`${snap.lastRenderMs.toFixed(2)}ms`} />
          <Stat label="Avg" value={`${snap.avgRenderMs.toFixed(2)}ms`} />
        </div>

        {/* Memo hit rate summary */}
        <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Memo Hit Rate</span>
            <span className="font-mono font-semibold text-foreground">
              {overallHitRate.toFixed(1)}%
            </span>
          </div>
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full transition-all duration-300',
                overallHitRate >= 80 ? 'bg-success' : overallHitRate >= 50 ? 'bg-warning' : 'bg-destructive'
              )}
              style={{ width: `${overallHitRate}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{totalHits} hits</span>
            <span>{totalMisses} misses</span>
          </div>
        </div>

        {/* Per-memo breakdown */}
        {memoEntries.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Memoized Derivations
            </p>
            <div className="space-y-1">
              {memoEntries
                .sort((a, b) => (b[1].hits + b[1].misses) - (a[1].hits + a[1].misses))
                .map(([key, m]) => {
                  const total = m.hits + m.misses;
                  const rate = total > 0 ? (m.hits / total) * 100 : 0;
                  return (
                    <div key={key} className="rounded border border-border/60 p-2 text-xs space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-foreground truncate">{key}</span>
                        <span className={cn(
                          'font-mono font-semibold tabular-nums shrink-0',
                          rate >= 80 ? 'text-success' : rate >= 50 ? 'text-warning' : 'text-destructive'
                        )}>
                          {rate.toFixed(0)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground tabular-nums">
                        <span>{m.hits}H / {m.misses}M</span>
                        <span>{total} calls</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {memoEntries.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">
            No memo activity recorded yet.
          </p>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 p-2 text-center">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-mono font-semibold text-foreground tabular-nums">{value}</p>
    </div>
  );
}
