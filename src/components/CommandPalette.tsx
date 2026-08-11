import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { useAuth } from '@/contexts/AuthContext';
import { QueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
} from '@/components/ui/command';
import {
  LayoutDashboard,
  BedDouble,
  TrendingUp,
  Upload,
  FileText,
  Globe,
  LogOut,
  RefreshCw,
  Sun,
  Moon,
  ScrollText,
  Command as CommandIcon,
} from 'lucide-react';

interface CommandPaletteProps {
  queryClient: QueryClient;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  adminOnly?: boolean;
  keywords?: string[];
}

const navItems: NavItem[] = [
  { label: 'Overview', href: '/dashboard', icon: LayoutDashboard, keywords: ['home', 'dashboard', 'kpi'] },
  { label: 'Room Types', href: '/room-types', icon: BedDouble, keywords: ['rooms', 'categories'] },
  { label: 'Historical', href: '/historical', icon: TrendingUp, keywords: ['history', 'trends', 'past'] },
  { label: 'Analysis', href: '/analysis', icon: FileText, keywords: ['reports', 'insights'] },
  { label: 'Website Analytics', href: '/website-analytics', icon: Globe, keywords: ['web', 'stats', 'traffic'] },
  { label: 'Upload Data', href: '/upload', icon: Upload, adminOnly: true, keywords: ['import', 'excel', 'file'] },
  { label: 'Changelog', href: '/changelog', icon: ScrollText, adminOnly: true, keywords: ['updates', 'news', 'changes'] },
];

export default function CommandPalette({ queryClient }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin, logout } = useAuth();
  const { setTheme, resolvedTheme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  // Only mount the keyboard listener and dialog for authenticated users.
  if (!isAuthenticated) return null;

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleNavigate = useCallback((href: string) => {
    setOpen(false);
    navigate(href);
  }, [navigate]);

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      window.dispatchEvent(new CustomEvent('app:refresh-data'));
      await queryClient.invalidateQueries();
      toast({ title: 'Data refreshed', description: 'Latest data loaded from the server.' });
    } catch (e) {
      toast({ title: 'Refresh failed', description: String((e as Error)?.message ?? e), variant: 'destructive' });
    } finally {
      setRefreshing(false);
      setOpen(false);
    }
  }, [queryClient, refreshing]);

  const handleThemeToggle = useCallback(() => {
    const next = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    setOpen(false);
  }, [resolvedTheme, setTheme]);

  const handleLogout = useCallback(async () => {
    await logout();
    setOpen(false);
    navigate('/');
  }, [logout, navigate]);

  const visibleNav = navItems.filter(item => !item.adminOnly || isAdmin);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search pages..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigation">
          {visibleNav.map(item => {
            const Icon = item.icon;
            return (
              <CommandItem
                key={item.href}
                onSelect={() => handleNavigate(item.href)}
                keywords={item.keywords}
              >
                <Icon className="mr-2 h-4 w-4" />
                <span>{item.label}</span>
                <CommandShortcut>Go</CommandShortcut>
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Actions">
          <CommandItem onSelect={handleRefresh} disabled={refreshing}>
            <RefreshCw className={refreshing ? 'mr-2 h-4 w-4 animate-spin' : 'mr-2 h-4 w-4'} />
            <span>Refresh dashboard data</span>
            <CommandShortcut>{refreshing ? '…' : 'Run'}</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={handleThemeToggle}>
            {resolvedTheme === 'dark' ? (
              <Sun className="mr-2 h-4 w-4" />
            ) : (
              <Moon className="mr-2 h-4 w-4" />
            )}
            <span>Toggle {resolvedTheme === 'dark' ? 'light' : 'dark'} theme</span>
            <CommandShortcut>Toggle</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
            <CommandShortcut>Run</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Tip">
          <CommandItem disabled>
            <CommandIcon className="mr-2 h-4 w-4" />
            <span>Press Cmd+K (Ctrl+K) anytime to reopen this palette</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
