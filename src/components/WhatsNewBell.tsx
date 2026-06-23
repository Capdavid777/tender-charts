import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface ChangelogEntry {
  id: string;
  title: string;
  body: string;
  published_at: string;
}

const LAST_SEEN_KEY = 'whatsnew:lastSeen';

export default function WhatsNewBell() {
  const { isAdmin } = useAuth();
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [lastSeen, setLastSeen] = useState<string>(
    () => localStorage.getItem(LAST_SEEN_KEY) ?? '1970-01-01T00:00:00Z',
  );
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data, error } = await supabase
        .from('changelog_entries')
        .select('id, title, body, published_at')
        .order('published_at', { ascending: false })
        .limit(50);
      if (!cancelled && !error && data) setEntries(data as ChangelogEntry[]);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const unreadCount = useMemo(
    () => entries.filter((e) => e.published_at > lastSeen).length,
    [entries, lastSeen],
  );

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next && entries.length > 0) {
      const newest = entries[0].published_at;
      localStorage.setItem(LAST_SEEN_KEY, newest);
      setLastSeen(newest);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9"
          aria-label={`What's new${unreadCount > 0 ? ` (${unreadCount} new)` : ''}`}
          title="What's new"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <div className="flex items-center justify-between gap-2">
            <SheetTitle>What's New</SheetTitle>
            {isAdmin && (
              <Button asChild variant="outline" size="sm" className="gap-1.5" onClick={() => setOpen(false)}>
                <Link to="/changelog">
                  <Settings2 className="w-3.5 h-3.5" />
                  Manage
                </Link>
              </Button>
            )}
          </div>
          <SheetDescription>
            Updates and improvements to the dashboard.
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-1 mt-4 -mx-6 px-6">
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No updates yet.
            </p>
          ) : (
            <ul className="space-y-5 pb-6">
              {entries.map((entry) => {
                const isNew = entry.published_at > lastSeen;
                return (
                  <li key={entry.id} className={cn('border-l-2 pl-4', isNew ? 'border-primary' : 'border-border')}>
                    <div className="flex items-baseline justify-between gap-2 flex-wrap">
                      <h3 className="font-medium text-sm">{entry.title}</h3>
                      {isNew && <Badge variant="default" className="text-[10px] h-4 px-1.5">New</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(entry.published_at).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                    <p className="text-sm mt-2 whitespace-pre-wrap text-foreground/90 leading-relaxed">
                      {entry.body}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
