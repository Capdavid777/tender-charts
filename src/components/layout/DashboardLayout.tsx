import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  BedDouble,
  TrendingUp,
  Upload,
  FileText,
  LogOut,
  Clock,
  RefreshCw
} from 'lucide-react';
import rsLogo from '@/assets/rs-logo.png';

import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: ReactNode;
  lastUpdated?: string;
}

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard, adminOnly: false },
  { href: '/room-types', label: 'Room Types', icon: BedDouble, adminOnly: false },
  { href: '/historical', label: 'Historical', icon: TrendingUp, adminOnly: false },
  { href: '/analysis', label: 'Analysis', icon: FileText, adminOnly: false },
  { href: '/upload', label: 'Upload Data', icon: Upload, adminOnly: true },
];

export default function DashboardLayout({ children, lastUpdated }: DashboardLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, isAdmin } = useAuth();
  const [logoErrored, setLogoErrored] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleRefresh = async () => {
    // Unregister service workers and clear caches
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(r => r.unregister()));
    }
    if ('caches' in window) {
      const names = await caches.keys();
      await Promise.all(names.map(name => caches.delete(name)));
    }
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-muted ring-1 ring-border">
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
              <div>
                <h1 className="font-semibold text-foreground">Reserved Suites Illovo</h1>
                <p className="text-xs text-muted-foreground">Revenue Dashboard</p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.filter(item => !item.adminOnly || isAdmin).map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <Link key={item.href} to={item.href}>
                    <Button
                      variant={isActive ? 'secondary' : 'ghost'}
                      size="sm"
                      className={cn(
                        'gap-2',
                        isActive && 'bg-secondary font-medium'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-4">
              {lastUpdated && (
                <div className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>Updated: {lastUpdated}</span>
                </div>
              )}
              <div className="hidden lg:flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground/60 font-mono">v{APP_VERSION}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh}
                  className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  title="Force refresh to get the latest version"
                >
                  <RefreshCw className="w-3 h-3" />
                  Refresh
                </Button>
              </div>
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
            <nav className="flex items-center gap-1 py-2 overflow-x-auto">
              {navItems.filter(item => !item.adminOnly || isAdmin).map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <Link key={item.href} to={item.href}>
                    <Button
                      variant={isActive ? 'secondary' : 'ghost'}
                      size="sm"
                      className={cn(
                        'gap-2 shrink-0',
                        isActive && 'bg-secondary font-medium'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
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