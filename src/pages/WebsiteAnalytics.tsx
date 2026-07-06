import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { formatCurrency, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import {
  Users, Eye, Clock, TrendingDown, CalendarCheck, Wallet, Receipt, Target,
  Smartphone, Monitor, Tablet, Globe, CreditCard, Tag, Sparkles, Copy, MapPin,
} from 'lucide-react';
import {
  ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend, LabelList,
} from 'recharts';

interface Report {
  id: string;
  month: string;
  generated_on: string;
  executive_summary: string | null;
  summary: any;
  daily_traffic: Array<{ day: number; visitors: number; pageviews: number; bounce: number; session_min: number }>;
  top_pages: Array<{ path: string; pageviews: number }>;
  traffic_sources: Array<{ source: string; visitors: number }>;
  device_mix: { desktop: number; mobile: number; tablet: number };
  visitor_countries: Array<{ code: string; visitors: number }>;
  revenue_by_room_type: Array<{ room: string; bookings: number; revenue: number; share: number }>;
  revenue_by_payment: Array<{ method: string; bookings: number; revenue: number }>;
  bookings_by_country: Array<{ code: string; bookings: number }>;
  daily_revenue: Array<{ date: string; revenue: number }>;
  promotions_note: string | null;
  insights: string[];
}

const COUNTRY_NAMES: Record<string, string> = {
  ZA: 'South Africa', CN: 'China', US: 'United States', BW: 'Botswana',
  GB: 'United Kingdom', MZ: 'Mozambique', NL: 'Netherlands', NA: 'Namibia',
  ZM: 'Zambia', Unknown: 'Unknown',
};

const monthLabel = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' });

export default function WebsiteAnalytics() {
  const reducedMotion = usePrefersReducedMotion();
  const anim = reducedMotion ? 0 : 900;

  const [reports, setReports] = useState<Report[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [highlightRoom, setHighlightRoom] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('website_analytics_reports')
        .select('*')
        .order('month', { ascending: false });
      if (error) {
        toast({ title: 'Failed to load reports', description: error.message, variant: 'destructive' });
      } else if (data) {
        setReports(data as any);
        if (data.length) setSelected(data[0].month);
      }
      setLoading(false);
    })();
  }, []);

  const report = useMemo(() => reports.find(r => r.month === selected), [reports, selected]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-72" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
          </div>
          <Skeleton className="h-80" />
        </div>
      </DashboardLayout>
    );
  }

  if (!report) {
    return (
      <DashboardLayout>
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          No website analytics reports available yet.
        </CardContent></Card>
      </DashboardLayout>
    );
  }

  const s = report.summary;
  const kpis = [
    { title: 'Visitors', value: s.visitors?.toLocaleString('en-ZA'), icon: <Users className="w-5 h-5 text-primary" /> },
    { title: 'Pageviews', value: s.pageviews?.toLocaleString('en-ZA'), icon: <Eye className="w-5 h-5 text-primary" /> },
    { title: 'Avg session', value: `${s.avg_session_min} min`, icon: <Clock className="w-5 h-5 text-primary" /> },
    { title: 'Bounce rate', value: `${s.bounce_rate}%`, icon: <TrendingDown className="w-5 h-5 text-primary" /> },
    { title: 'Bookings', value: s.bookings, icon: <CalendarCheck className="w-5 h-5 text-accent" /> },
    { title: 'Gross revenue', value: formatCurrency(s.gross_revenue), icon: <Wallet className="w-5 h-5 text-accent" /> },
    { title: 'Avg booking value', value: formatCurrency(s.avg_booking_value), icon: <Receipt className="w-5 h-5 text-accent" /> },
    { title: 'Visitor conversion', value: `${s.visitor_conversion}%`, icon: <Target className="w-5 h-5 text-accent" /> },
  ];

  const deviceData = [
    { name: 'Mobile', value: report.device_mix.mobile, icon: Smartphone },
    { name: 'Desktop', value: report.device_mix.desktop, icon: Monitor },
    { name: 'Tablet', value: report.device_mix.tablet, icon: Tablet },
  ].filter(d => d.value > 0);

  const chartColors = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  const monthShort = new Date(report.month + 'T00:00:00').toLocaleString('en-ZA', { month: 'short' });
  const traffic = report.daily_traffic.map(d => ({
    day: `${monthShort} ${String(d.day).padStart(2, '0')}`,
    visitors: d.visitors,
    pageviews: d.pageviews,
    bounce: d.bounce,
    session_min: d.session_min,
  }));

  const maxSrc = Math.max(...report.traffic_sources.map(t => t.visitors));
  const maxPage = Math.max(...report.top_pages.map(t => t.pageviews));
  const maxCountry = Math.max(...report.visitor_countries.map(c => c.visitors));
  const totalBookings = report.bookings_by_country.reduce((a, b) => a + b.bookings, 0);

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied', description: text });
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in-up">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Website Analytics</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {monthLabel(report.month)} · Generated {new Date(report.generated_on + 'T00:00:00').toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>
          <div className="w-full md:w-64">
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {reports.map(r => (
                  <SelectItem key={r.month} value={r.month}>{monthLabel(r.month)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* KPI grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {kpis.map((k, i) => (
            <Card
              key={k.title}
              className="border-l-4 border-l-primary hover:-translate-y-1 hover:shadow-card-hover transition-all animate-fade-in-up"
              style={{ animationDelay: reducedMotion ? '0ms' : `${i * 60}ms`, animationFillMode: 'backwards' }}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{k.title}</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{k.value}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-secondary shrink-0">{k.icon}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Executive summary */}
        {report.executive_summary && (
          <Card className="border-l-4 border-l-accent">
            <CardHeader className="pb-2"><CardTitle className="text-lg flex items-center gap-2"><Sparkles className="w-5 h-5 text-accent" /> Executive summary</CardTitle></CardHeader>
            <CardContent><p className="text-sm leading-relaxed text-foreground">{report.executive_summary}</p></CardContent>
          </Card>
        )}

        {/* Traffic chart */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Daily visitors & pageviews</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={traffic}>
                  <defs>
                    <linearGradient id="visGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="pvGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" fontSize={11} stroke="hsl(var(--muted-foreground))" interval="preserveStartEnd" />
                  <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip labelFormatter={(v: string) => `${v}, ${new Date(report.month + 'T00:00:00').getFullYear()}`} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                  <Legend />
                  <Area type="monotone" dataKey="pageviews" stroke="hsl(var(--accent))" fill="url(#pvGrad)" strokeWidth={2} animationDuration={anim} />
                  <Area type="monotone" dataKey="visitors" stroke="hsl(var(--primary))" fill="url(#visGrad)" strokeWidth={2} animationDuration={anim} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Bounce + session */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Bounce rate & session length</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={traffic}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" fontSize={11} stroke="hsl(var(--muted-foreground))" interval="preserveStartEnd" />
                  <YAxis yAxisId="left" fontSize={11} stroke="hsl(var(--muted-foreground))" unit="%" />
                  <YAxis yAxisId="right" orientation="right" fontSize={11} stroke="hsl(var(--muted-foreground))" unit="m" />
                  <Tooltip labelFormatter={(v: string) => `${v}, ${new Date(report.month + 'T00:00:00').getFullYear()}`} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="bounce" name="Bounce %" fill="hsl(var(--primary))" opacity={0.7} radius={[4, 4, 0, 0]} animationDuration={anim} />
                  <Line yAxisId="right" type="monotone" dataKey="session_min" name="Session (min)" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ r: 3 }} animationDuration={anim} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Booking revenue block */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Booking revenue</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: 'Bookings', value: s.bookings },
                { label: 'Gross revenue', value: formatCurrency(s.gross_revenue) },
                { label: 'Net after discounts', value: formatCurrency(s.net_revenue) },
                { label: 'Avg booking value', value: formatCurrency(s.avg_booking_value) },
                { label: 'Avg length of stay', value: `${s.avg_length_of_stay} nights` },
                { label: 'Discounts given', value: formatCurrency(s.discounts) },
              ].map((m, i) => (
                <div
                  key={m.label}
                  className="rounded-lg bg-secondary/60 p-3 animate-fade-in-up"
                  style={{ animationDelay: reducedMotion ? '0ms' : `${i * 50}ms`, animationFillMode: 'backwards' }}
                >
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{m.label}</p>
                  <p className="text-base font-semibold text-foreground mt-1">{m.value}</p>
                </div>
              ))}
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={report.daily_revenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    fontSize={11}
                    stroke="hsl(var(--muted-foreground))"
                    tickFormatter={(v: string) => new Date(v + 'T00:00:00').toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' })}
                  />
                  <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `R${v}`} />
                  <Tooltip
                    formatter={(v: number) => formatCurrency(v)}
                    labelFormatter={(v: string) => new Date(v + 'T00:00:00').toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })}
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                  />
                  <Bar dataKey="revenue" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} animationDuration={anim}>
                    <LabelList dataKey="revenue" position="top" formatter={(v: number) => `R${v.toLocaleString('en-ZA')}`} fontSize={11} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Device mix + Revenue by room */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-lg">Device mix</CardTitle></CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={deviceData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                      animationDuration={anim}
                      label={(entry) => `${entry.name} ${entry.value}%`}
                    >
                      {deviceData.map((_, i) => <Cell key={i} fill={chartColors[i]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => `${v}%`} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 mt-2">
                {deviceData.map((d, i) => {
                  const Icon = d.icon;
                  return (
                    <div key={d.name} className="flex items-center gap-2 text-sm">
                      <Icon className="w-4 h-4" style={{ color: chartColors[i] }} />
                      <span className="text-muted-foreground">{d.name}</span>
                      <span className="font-semibold">{d.value}%</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Revenue by room type</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {report.revenue_by_room_type.map((r, i) => {
                const active = highlightRoom === r.room;
                return (
                  <button
                    key={r.room}
                    onClick={() => setHighlightRoom(active ? null : r.room)}
                    className={cn(
                      'w-full text-left rounded-lg border p-3 transition-all hover:shadow-card-hover animate-fade-in-up',
                      active ? 'border-accent bg-accent/5' : 'border-border'
                    )}
                    style={{ animationDelay: reducedMotion ? '0ms' : `${i * 100}ms`, animationFillMode: 'backwards' }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{r.room}</p>
                        <p className="text-xs text-muted-foreground">{r.bookings} booking{r.bookings !== 1 && 's'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-foreground">{formatCurrency(r.revenue)}</p>
                        <p className="text-xs text-accent font-medium">{r.share}% share</p>
                      </div>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all"
                        style={{ width: reducedMotion ? `${r.share}%` : '0%', animation: reducedMotion ? undefined : `progress-fill 900ms ease-out ${i * 100 + 200}ms forwards`, ['--progress-target' as any]: `${r.share}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Top pages + traffic sources */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-lg">Top pages</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {report.top_pages.map((p, i) => (
                <button
                  key={p.path}
                  onClick={() => copy(p.path)}
                  className="w-full relative overflow-hidden rounded-md border border-border px-3 py-2 text-left group hover:border-primary/50 hover:shadow-sm transition-all animate-fade-in-up"
                  style={{ animationDelay: reducedMotion ? '0ms' : `${i * 40}ms`, animationFillMode: 'backwards' }}
                >
                  <div
                    className="absolute inset-y-0 left-0 bg-primary/10 group-hover:bg-primary/15 transition-colors"
                    style={{ width: `${(p.pageviews / maxPage) * 100}%` }}
                  />
                  <div className="relative flex items-center justify-between gap-3">
                    <span className="text-sm font-mono text-foreground truncate">{p.path}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-semibold">{p.pageviews.toLocaleString('en-ZA')}</span>
                      <Copy className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Top traffic sources</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {report.traffic_sources.map((t, i) => (
                <button
                  key={t.source}
                  onClick={() => copy(t.source)}
                  className="w-full relative overflow-hidden rounded-md border border-border px-3 py-2 text-left group hover:border-accent/50 hover:shadow-sm transition-all animate-fade-in-up"
                  style={{ animationDelay: reducedMotion ? '0ms' : `${i * 40}ms`, animationFillMode: 'backwards' }}
                >
                  <div
                    className="absolute inset-y-0 left-0 bg-accent/15 group-hover:bg-accent/20 transition-colors"
                    style={{ width: `${(t.visitors / maxSrc) * 100}%` }}
                  />
                  <div className="relative flex items-center justify-between gap-3">
                    <span className="text-sm text-foreground truncate">{t.source}</span>
                    <span className="text-sm font-semibold shrink-0">{t.visitors.toLocaleString('en-ZA')}</span>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Geography */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Globe className="w-5 h-5" /> Visitor countries</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {report.visitor_countries.map((c, i) => (
                <div
                  key={c.code}
                  className="relative overflow-hidden rounded-md bg-secondary/40 px-3 py-2 animate-fade-in-up"
                  style={{ animationDelay: reducedMotion ? '0ms' : `${i * 30}ms`, animationFillMode: 'backwards' }}
                >
                  <div
                    className="absolute inset-y-0 left-0 bg-primary/15"
                    style={{ width: `${(c.visitors / maxCountry) * 100}%` }}
                  />
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs">{c.code}</Badge>
                      <span className="text-sm text-muted-foreground">{COUNTRY_NAMES[c.code] || c.code}</span>
                    </div>
                    <span className="text-sm font-semibold">{c.visitors.toLocaleString('en-ZA')}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><MapPin className="w-5 h-5" /> Bookings by guest country</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {report.bookings_by_country.map((c, i) => (
                <div
                  key={c.code}
                  className="relative overflow-hidden rounded-md bg-secondary/40 px-3 py-2 animate-fade-in-up"
                  style={{ animationDelay: reducedMotion ? '0ms' : `${i * 80}ms`, animationFillMode: 'backwards' }}
                >
                  <div
                    className="absolute inset-y-0 left-0 bg-accent/20"
                    style={{ width: `${(c.bookings / totalBookings) * 100}%` }}
                  />
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs">{c.code}</Badge>
                      <span className="text-sm text-muted-foreground">{COUNTRY_NAMES[c.code] || c.code}</span>
                    </div>
                    <span className="text-sm font-semibold">{c.bookings} booking{c.bookings !== 1 && 's'}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Payment methods + Promotions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><CreditCard className="w-5 h-5" /> Payment methods</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {report.revenue_by_payment.map((p, i) => (
                <div
                  key={p.method}
                  className="flex items-center justify-between rounded-lg border border-border p-3 hover:shadow-card-hover transition-shadow animate-fade-in-up"
                  style={{ animationDelay: reducedMotion ? '0ms' : `${i * 80}ms`, animationFillMode: 'backwards' }}
                >
                  <div>
                    <p className="text-sm font-semibold">{p.method}</p>
                    <p className="text-xs text-muted-foreground">{p.bookings} booking{p.bookings !== 1 && 's'}</p>
                  </div>
                  <p className="text-base font-bold text-accent">{formatCurrency(p.revenue)}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-accent">
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Tag className="w-5 h-5 text-accent" /> Promotions & coupons</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-foreground leading-relaxed">{report.promotions_note}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="secondary">Discounts: {formatCurrency(s.discounts)}</Badge>
                <Badge variant="secondary">Rev/visitor: {formatCurrency(s.revenue_per_visitor)}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Insights */}
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Sparkles className="w-5 h-5 text-accent" /> Insights for the team</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {report.insights.map((insight, i) => (
                <div
                  key={i}
                  className="flex gap-3 rounded-lg border border-border bg-card p-4 hover:border-accent/50 hover:shadow-card-hover transition-all animate-fade-in-up"
                  style={{ animationDelay: reducedMotion ? '0ms' : `${i * 90}ms`, animationFillMode: 'backwards' }}
                >
                  <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-accent/10 text-accent font-bold text-sm">
                    {i + 1}
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{insight}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
