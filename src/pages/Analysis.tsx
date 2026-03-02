import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '@/components/layout/DashboardLayout';
import MonthSelector from '@/components/MonthSelector';
import { useMonth } from '@/contexts/MonthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Edit3, Save, X, Calendar } from 'lucide-react';
import RichTextEditor from '@/components/analysis/RichTextEditor';
import { toast } from 'sonner';

const MONTH_NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function Analysis() {
  const { selectedMonth } = useMonth();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const queryClient = useQueryClient();

  const [year, month] = selectedMonth.split('-').map(Number);
  const monthLabel = `${MONTH_NAMES[month]} ${year}`;

  const { data: analysis, isLoading } = useQuery({
    queryKey: ['monthly-analysis', selectedMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('monthly_analyses')
        .select('*')
        .eq('year', year)
        .eq('month', month)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { year, month, title, summary, content, updated_at: new Date().toISOString() };
      if (analysis?.id) {
        const { error } = await supabase.from('monthly_analyses').update(payload).eq('id', analysis.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('monthly_analyses').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthly-analysis'] });
      setEditing(false);
      toast.success('Analysis saved');
    },
    onError: () => toast.error('Failed to save analysis'),
  });

  const startEditing = () => {
    setTitle(analysis?.title || `${monthLabel} Performance Analysis`);
    setSummary(analysis?.summary || '');
    setContent(analysis?.content || '');
    setEditing(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Monthly Analysis</h2>
            <p className="text-muted-foreground">Performance review and strategic insights</p>
          </div>
          <div className="flex items-center gap-2">
            <MonthSelector />
            {!editing && (
              <Button onClick={startEditing} variant="outline" size="sm" className="gap-2">
                <Edit3 className="w-4 h-4" />
                {analysis ? 'Edit' : 'Add Analysis'}
              </Button>
            )}
          </div>
        </div>

        {/* Editor */}
        {editing ? (
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {analysis ? 'Edit' : 'New'} Analysis — {monthLabel}
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Title</label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. February 2026 Performance Analysis" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Summary (shown on dashboard)</label>
                <Textarea value={summary} onChange={e => setSummary(e.target.value)} placeholder="A brief 2-3 sentence summary..." rows={3} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">
                  Full Analysis <span className="text-muted-foreground font-normal">(paste your content below — formatting is preserved)</span>
                </label>
                <RichTextEditor content={content} onChange={setContent} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="gap-2">
                  <Save className="w-4 h-4" />
                  {saveMutation.isPending ? 'Saving...' : 'Save Analysis'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">Loading...</CardContent></Card>
        ) : analysis ? (
          <Card>
            <CardContent className="py-5 px-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{analysis.title}</h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3" />
                      Last updated {new Date(analysis.updated_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
              {analysis.summary && (
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed border-l-2 border-accent pl-3">
                  {analysis.summary}
                </p>
              )}
              <div
                className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground prose-strong:text-foreground prose-td:text-foreground prose-th:text-foreground prose-a:text-primary prose-table:text-sm prose-th:text-left prose-th:py-2 prose-th:px-3 prose-th:border-b prose-th:border-border prose-td:py-2 prose-td:px-3 prose-td:border-b prose-td:border-border [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1"
                dangerouslySetInnerHTML={{ __html: analysis.content }}
              />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-1">No analysis for {monthLabel}</h3>
              <p className="text-muted-foreground mb-4">Add a monthly performance review to share insights with the team.</p>
              <Button onClick={startEditing} className="gap-2">
                <Edit3 className="w-4 h-4" />
                Add Analysis
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
