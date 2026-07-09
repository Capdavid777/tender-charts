import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Pencil, Trash2, Plus, X, Save, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SyncStatus {
  at: string;
  status: 'succeeded' | 'failed';
  message?: string;
  inserted?: number;
  scanned?: number;
  hardSkipped?: number;
  aiSkipped?: number;
}

interface ChangelogEntry {
  id: string;
  title: string;
  body: string;
  published_at: string;
}

export default function Changelog() {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);

  const loadSyncStatus = async () => {
    const { data } = await supabase
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'changelog_last_sync')
      .maybeSingle();
    if (data?.setting_value) {
      try {
        setSyncStatus(JSON.parse(data.setting_value) as SyncStatus);
      } catch { /* ignore */ }
    }
  };

  const syncFromGithub = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-changelog-from-github');
      if (error) throw error;
      const inserted = (data as { inserted?: number } | null)?.inserted ?? 0;
      if (inserted > 0) {
        toast.success(`Imported ${inserted} new update${inserted === 1 ? '' : 's'} from GitHub`);
        load();
      } else {
        toast.info('No new commits to import');
      }
    } catch (e) {
      toast.error('Sync failed', { description: (e as Error).message });
    } finally {
      setSyncing(false);
      loadSyncStatus();
    }
  };

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('changelog_entries')
      .select('id, title, body, published_at')
      .order('published_at', { ascending: false });
    if (error) {
      toast.error('Failed to load changelog', { description: error.message });
    } else {
      setEntries((data ?? []) as ChangelogEntry[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    loadSyncStatus();
  }, []);

  const startNew = () => {
    setEditingId('new');
    setTitle('');
    setBody('');
  };

  const startEdit = (entry: ChangelogEntry) => {
    setEditingId(entry.id);
    setTitle(entry.title);
    setBody(entry.body);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setTitle('');
    setBody('');
  };

  const save = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error('Title and body are required');
      return;
    }
    setSaving(true);
    if (editingId === 'new') {
      const { error } = await supabase
        .from('changelog_entries')
        .insert({ title: title.trim(), body: body.trim() });
      if (error) {
        toast.error('Failed to publish', { description: error.message });
        setSaving(false);
        return;
      }
      toast.success('Update published');
    } else if (editingId) {
      const { error } = await supabase
        .from('changelog_entries')
        .update({ title: title.trim(), body: body.trim() })
        .eq('id', editingId);
      if (error) {
        toast.error('Failed to save', { description: error.message });
        setSaving(false);
        return;
      }
      toast.success('Update saved');
    }
    setSaving(false);
    cancelEdit();
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this changelog entry?')) return;
    const { error } = await supabase.from('changelog_entries').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete', { description: error.message });
      return;
    }
    toast.success('Entry deleted');
    load();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold">What's New — Manage</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Publish dashboard updates and improvements. All logged-in users will see a notification badge.
            </p>
          </div>
          {editingId === null && (
            <div className="flex gap-2">
              <Button onClick={syncFromGithub} disabled={syncing} variant="outline" className="gap-2">
                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing…' : 'Sync from GitHub'}
              </Button>
              <Button onClick={startNew} className="gap-2">
                <Plus className="w-4 h-4" />
                New update
              </Button>
            </div>
          )}
        </div>

        {syncStatus && (
          <div
            className={`flex items-start gap-2.5 rounded-md border px-3 py-2 text-sm ${
              syncStatus.status === 'succeeded'
                ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400'
                : 'border-destructive/30 bg-destructive/5 text-destructive'
            }`}
          >
            {syncStatus.status === 'succeeded' ? (
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <div className="font-medium">
                Last sync {syncStatus.status === 'succeeded' ? 'succeeded' : 'failed'} —{' '}
                <span className="font-normal text-foreground/80">
                  {new Date(syncStatus.at).toLocaleString()}
                </span>
              </div>
              <div className="text-xs mt-0.5 text-foreground/70">
                {syncStatus.status === 'succeeded'
                  ? `Scanned ${syncStatus.scanned ?? 0} commit${syncStatus.scanned === 1 ? '' : 's'}, imported ${syncStatus.inserted ?? 0}, skipped ${(syncStatus.hardSkipped ?? 0) + (syncStatus.aiSkipped ?? 0)}.`
                  : syncStatus.message ?? 'Unknown error'}
              </div>
            </div>
          </div>
        )}


        {editingId !== null && (
          <Card>
            <CardHeader>
              <CardTitle>{editingId === 'new' ? 'New update' : 'Edit update'}</CardTitle>
              <CardDescription>
                Visible to all logged-in users under the bell icon in the header.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="cl-title">Title</Label>
                <Input
                  id="cl-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Forecast charts now show month-end projection"
                  maxLength={200}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cl-body">Details</Label>
                <Textarea
                  id="cl-body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Describe what changed, why it matters, and any actions users should take."
                  rows={6}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={cancelEdit} disabled={saving} className="gap-1.5">
                  <X className="w-4 h-4" /> Cancel
                </Button>
                <Button onClick={save} disabled={saving} className="gap-1.5">
                  <Save className="w-4 h-4" /> {saving ? 'Saving…' : editingId === 'new' ? 'Publish' : 'Save'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Published updates</CardTitle>
            <CardDescription>{entries.length} entr{entries.length === 1 ? 'y' : 'ies'}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : entries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No updates yet. Click "New update" to publish the first one.</p>
            ) : (
              <ul className="divide-y">
                {entries.map((entry) => (
                  <li key={entry.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-sm">{entry.title}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(entry.published_at).toLocaleString()}
                        </p>
                        <p className="text-sm mt-2 whitespace-pre-wrap text-foreground/90 leading-relaxed line-clamp-4">
                          {entry.body}
                        </p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" onClick={() => startEdit(entry)} aria-label="Edit">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(entry.id)}
                          aria-label="Delete"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
