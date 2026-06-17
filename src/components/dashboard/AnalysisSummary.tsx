import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useMonth } from '@/contexts/MonthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, ArrowRight, AlertTriangle, RefreshCw } from 'lucide-react';

const MONTH_NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function AnalysisSummary() {
  const { selectedMonth } = useMonth();
  const [year, month] = selectedMonth.split('-').map(Number);

  const { data: analysis, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['monthly-analysis', selectedMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('monthly_analyses')
        .select('title, summary, updated_at')
        .eq('year', year)
        .eq('month', month)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            Loading monthly analysis…
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-2" aria-busy="true" aria-live="polite">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-11/12" />
          <Skeleton className="h-3 w-2/3" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            Monthly Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 flex items-start justify-between gap-3 flex-wrap text-sm">
          <div className="flex items-start gap-2 text-destructive">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>Couldn't load the analysis summary: {(error as Error)?.message || 'Unknown error'}</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching} className="gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} /> Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            {analysis.title || `${MONTH_NAMES[month]} ${year} Analysis`}
          </CardTitle>
          <Link to="/analysis">
            <Button variant="ghost" size="sm" className="gap-1 text-primary">
              Read full analysis <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      {analysis.summary && (
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground leading-relaxed">{analysis.summary}</p>
        </CardContent>
      )}
    </Card>
  );
}
