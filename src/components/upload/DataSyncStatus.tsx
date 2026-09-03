import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, CloudDownload, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SyncRun {
  status: string;
  window_start: string | null;
  window_end: string | null;
  rows_written: number;
  dates_skipped: number;
  error_message: string | null;
  started_at: string;
  finished_at: string | null;
}

const fmtDateTime = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })
    : '—';

const fmtDate = (iso: string | null) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' }) : '—';

function StatusBadge({ status }: { status: string }) {
  if (status === 'success') {
    return (
      <Badge className="gap-1 bg-success/15 text-success border-success/30" variant="outline">
        <CheckCircle2 className="w-3.5 h-3.5" /> Success
      </Badge>
    );
  }
  if (status === 'running') {
    return (
      <Badge variant="outline" className="gap-1">
        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Running
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 bg-destructive/15 text-destructive border-destructive/30">
      <AlertTriangle className="w-3.5 h-3.5" /> {status === 'paused' ? 'Paused' : 'Failed'}
    </Badge>
  );
}

export default function DataSyncStatus() {
  const [run, setRun] = useState<SyncRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('sync_runs')
      .select('status,window_start,window_end,rows_written,dates_skipped,error_message,started_at,finished_at')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setRun((data as SyncRun) ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const syncNow = async () => {
    setSyncing(true);
    try {
      const { error } = await supabase.functions.invoke('sync-semper-daily', { body: {} });
      if (error) throw error;
      toast({ title: 'Sync complete', description: 'Latest figures pulled from Semper.' });
      await load();
      queryClient.invalidateQueries();
    } catch (e) {
      toast({
        title: 'Sync failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
      await load();
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <CloudDownload className="w-5 h-5 text-primary" />
              Automatic Data Sync
            </CardTitle>
            <CardDescription>
              Runs nightly at 03:00 — pulls rooms sold, revenue and occupancy from Semper. Manual uploads
              are never overwritten.
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={syncNow} disabled={syncing} className="gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing…' : 'Sync now'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        ) : !run ? (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Clock className="w-4 h-4" /> No sync has run yet.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Status</p>
                <div className="mt-1"><StatusBadge status={run.status} /></div>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Last run</p>
                <p className="mt-1 font-medium">{fmtDateTime(run.finished_at ?? run.started_at)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Window covered</p>
                <p className="mt-1 font-medium">
                  {fmtDate(run.window_start)} – {fmtDate(run.window_end)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Rows written</p>
                <p className="mt-1 font-medium">
                  {run.rows_written}
                  {run.dates_skipped > 0 && (
                    <span className="text-muted-foreground font-normal"> · {run.dates_skipped} manual days kept</span>
                  )}
                </p>
              </div>
            </div>
            {run.error_message && (
              <p className="text-sm text-destructive flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                {run.error_message}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
