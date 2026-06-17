import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Banknote, AlertTriangle, RefreshCw } from 'lucide-react';
import { formatCurrency } from '@/lib/format';


export interface OtherIncomeItem {
  product_type: string;
  revenue: number;
}

interface OtherIncomeSummaryProps {
  items: OtherIncomeItem[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

function SectionShell({ children }: { children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Banknote className="w-5 h-5 text-primary" />
          Additional Other Income
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default function OtherIncomeSummary({ items, loading = false, error = null, onRetry }: OtherIncomeSummaryProps) {
  const total = useMemo(() => items.reduce((sum, i) => sum + Number(i.revenue), 0), [items]);

  if (loading) {
    return (
      <SectionShell>
        <div className="space-y-3" aria-busy="true" aria-live="polite">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </SectionShell>
    );
  }

  if (error) {
    return (
      <SectionShell>
        <div className="flex items-start justify-between gap-3 flex-wrap text-sm">
          <div className="flex items-start gap-2 text-destructive">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>Couldn't load other income: {error}</span>
          </div>
          {onRetry && (
            <Button size="sm" variant="outline" onClick={onRetry} className="gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </Button>
          )}
        </div>
      </SectionShell>
    );
  }

  if (items.length === 0) return null;

  return (
    <SectionShell>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product Type</TableHead>
              <TableHead className="text-right">Revenue (Excl.)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.product_type}>
                <TableCell>{item.product_type}</TableCell>
                <TableCell className="text-right">{formatCurrency(Number(item.revenue))}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className="font-semibold">Total</TableCell>
              <TableCell className="text-right font-semibold">{formatCurrency(total)}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </SectionShell>
  );
}
