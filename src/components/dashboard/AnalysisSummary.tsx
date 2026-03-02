import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useMonth } from '@/contexts/MonthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, ArrowRight } from 'lucide-react';

const MONTH_NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function AnalysisSummary() {
  const { selectedMonth } = useMonth();
  const [year, month] = selectedMonth.split('-').map(Number);

  const { data: analysis } = useQuery({
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
