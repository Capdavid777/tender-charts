import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, AlertTriangle, RefreshCw, Info } from 'lucide-react';
import { formatCurrency, formatPercent } from '@/lib/format';
import { supabase } from '@/integrations/supabase/client';

interface ExtrasItem {
  product_type: string;
  revenue: number;
  count: number;
}

interface ExtrasResponse {
  month: string;
  liveReservations: number;
  billsAttempted: number;
  billsRead: number;
  coverage: number;
  total: number;
  items: ExtrasItem[];
}

export const semperExtrasQueryKey = (month: string | null) =>
  ['dashboard', 'semperExtras', month || 'none'] as const;

export async function fetchSemperExtras(month: string | null): Promise<ExtrasResponse | null> {
  if (!month) return null;
  const { data, error } = await supabase.functions.invoke<ExtrasResponse>('semper-extras', {
    body: { month },
  });
  if (error) throw error;
  if (!data || (data as unknown as { error?: string }).error) {
    throw new Error((data as unknown as { error?: string })?.error || 'No data returned');
  }
  return data;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Extras captured from Semper
          </CardTitle>
          <Badge variant="outline" className="text-[11px] font-medium">Partial estimate — excl. VAT, not official</Badge>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default function SemperExtrasPanel({ month }: { month: string | null }) {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: semperExtrasQueryKey(month),
    queryFn: () => fetchSemperExtras(month),
    enabled: !!month,
    staleTime: 1000 * 60 * 30,
    retry: false,
  });

  if (isLoading) {
    return (
      <Shell>
        <div className="space-y-3" aria-busy="true" aria-live="polite">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-3/5" />
        </div>
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell>
        <div className="flex items-start justify-between gap-3 flex-wrap text-sm">
          <div className="flex items-start gap-2 text-destructive">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>Couldn't read extras from Semper: {(error as Error).message}</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => refetch()} className="gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </Button>
        </div>
      </Shell>
    );
  }

  if (!data) return null;

  const coveragePct = data.coverage * 100;

  return (
    <Shell>
      <div className="rounded-md border border-border/60 bg-muted/40 p-3 text-xs text-muted-foreground flex items-start gap-2 mb-4">
        <Info className="w-4 h-4 mt-0.5 shrink-0" />
        <p>
          Estimated from the {data.billsRead} of {data.billsAttempted} reservation bills Semper made readable
          ({formatPercent(coveragePct)} coverage) for this month. All amounts are shown <strong>excluding VAT</strong> and
          accommodation charges are excluded. This is an
          incomplete indicator only — your uploaded <strong>Additional Other Income</strong> figures remain the
          official record.
        </p>
      </div>

      {data.items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No extras were readable from Semper for this month.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Charge</TableHead>
                <TableHead className="text-right">Lines</TableHead>
                <TableHead className="text-right">Captured Revenue (excl. VAT)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((item) => (
                <TableRow key={item.product_type}>
                  <TableCell>{item.product_type}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{item.count}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.revenue)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="font-semibold">Captured total (partial, excl. VAT)</TableCell>
                <TableCell />
                <TableCell className="text-right font-semibold">{formatCurrency(data.total)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      )}

      <div className="mt-3 flex justify-end">
        <Button size="sm" variant="ghost" onClick={() => refetch()} disabled={isFetching} className="gap-1.5">
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>
    </Shell>
  );
}
