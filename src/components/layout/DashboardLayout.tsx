import { ReactNode, useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import {
  LayoutDashboard,
  BedDouble,
  TrendingUp,
  Upload,
  FileText,
  Globe,
  LogOut,
  Clock,
  RefreshCw
} from 'lucide-react';
import rsLogo from '@/assets/rs-logo.png';
import WhatsNewBell from '@/components/WhatsNewBell';
import ThemeToggle from '@/components/ThemeToggle';
import { preloadRoute } from '@/lib/routePreload';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { useMonth } from '@/contexts/MonthContext';

import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: ReactNode;
  lastUpdated?: string;
}

const APP_VERSION = '1.0.0';

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard, adminOnly: false },
  { href: '/room-types', label: 'Room Types', icon: BedDouble, adminOnly: false },
  { href: '/historical', label: 'Historical', icon: TrendingUp, adminOnly: false },
  { href: '/analysis', label: 'Analysis', icon: FileText, adminOnly: false },
  { href: '/website-analytics', label: 'Website', icon: Globe, adminOnly: false },
  { href: '/upload', label: 'Upload Data', icon: Upload, adminOnly: true },
];

type NavItem = (typeof navItems)[number];

/** Nav row with a single accent indicator that slides between the active items. */
function NavTabs({
  items,
  activeHref,
  onPreload,
  className,
  scrollActiveIntoView = false,
}: {
  items: NavItem[];
  activeHref: string;
  onPreload: (href: string) => void;
  className?: string;
  scrollActiveIntoView?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  const measure = useCallback(() => {
    const container = containerRef.current;
    const el = itemRefs.current[activeHref];
    if (!container || !el) {
      setIndicator(null);
      return;
    }
    setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
  }, [activeHref]);

  useLayoutEffect(() => {
    measure();
  }, [measure, items.length]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(container);
    return () => ro.disconnect();
  }, [measure]);

  useEffect(() => {
    if (!scrollActiveIntoView) return;
    itemRefs.current[activeHref]?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  }, [activeHref, scrollActiveIntoView, prefersReducedMotion]);

  return (
    <div ref={containerRef} className={cn('relative flex items-center gap-1', className)}>
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeHref === item.href;
        return (
          <Link
            key={item.href}
            to={item.href}
            ref={(el) => { itemRefs.current[item.href] = el; }}
            onMouseEnter={() => onPreload(item.href)}
            onFocus={() => onPreload(item.href)}
            onTouchStart={() => onPreload(item.href)}
            className="shrink-0"
          >
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'gap-2 shrink-0 transition-colors',
                isActive ? 'font-medium text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Button>
          </Link>
        );
      })}
      {indicator && (
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute bottom-0 left-0 h-0.5 rounded-full bg-primary',
            !prefersReducedMotion && 'transition-transform transition-[width] duration-300 ease-out',
          )}
          style={{ width: indicator.width, transform: `translateX(${indicator.left}px)` }}
        />
      )}
    </div>
  );
}


export default function DashboardLayout({ children, lastUpdated }: DashboardLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, isAdmin } = useAuth();
  const [logoErrored, setLogoErrored] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const handleRefresh = async () => {
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
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3 min-w-0 shrink-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted ring-1 ring-border">
                {logoErrored ? (
                  <span className="text-xs font-semibold text-foreground">RS</span>
                ) : (
                  <img
                    src={rsLogo}
                    alt="Reserved Suites logo"
                    className="h-10 w-10 object-contain"
                    width={40}
                    height={40}
                    loading="eager"
                    decoding="async"
                    onError={() => setLogoErrored(true)}
                  />
                )}
              </div>
              <div className="min-w-0">
                <h1 className="font-semibold text-foreground whitespace-nowrap text-sm lg:text-base">Reserved Suites</h1>
                <p className="text-[11px] lg:text-xs text-muted-foreground whitespace-nowrap">Revenue Dashboard</p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center self-stretch">
              <NavTabs
                items={visibleNavItems}
                activeHref={location.pathname}
                onPreload={handlePreload}
                className="h-16"
              />
            </nav>


            {/* Right side */}
            <div className="flex items-center gap-2 lg:gap-4 min-w-0">
              {lastUpdated && (
              <div className="hidden md:flex items-center gap-1.5 text-xs lg:text-sm text-muted-foreground whitespace-nowrap">
                  <Clock className="w-4 h-4 shrink-0" />
                  <span><span className="hidden lg:inline">Updated: </span>{lastUpdated}</span>
                </div>
              )}
              <div className="hidden xl:flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground/60 font-mono">v{APP_VERSION}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  title="Refetch dashboard data"
                >
                  <RefreshCw className={cn('w-3 h-3', refreshing && 'animate-spin')} />
                  {refreshing ? 'Refreshing…' : 'Refresh'}
                </Button>
                <kbd className="hidden 2xl:inline-flex items-center gap-0.5 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                  <span className="text-[9px]">⌘</span>K
                </kbd>
              </div>
              <ThemeToggle />
              <WhatsNewBell />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLogout}
                className="gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile navigation */}
        <div className="md:hidden border-t">
          <div className="container mx-auto px-4">
            <nav className="py-2 overflow-x-auto">
              <NavTabs
                items={visibleNavItems}
                activeHref={location.pathname}
                onPreload={handlePreload}
                scrollActiveIntoView
                className="pb-1 w-max"
              />
            </nav>
          </div>

        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}