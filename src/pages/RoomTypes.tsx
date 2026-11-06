import { useEffect, useCallback } from 'react';
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';


import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import DashboardLayout from '@/components/layout/DashboardLayout';
import KPICard from '@/components/dashboard/KPICard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Crown, Gauge, TrendingUp, TrendingDown, KeyRound, Minus } from 'lucide-react';
import { formatCurrency, formatPercent } from '@/lib/format';
import { supabase } from '@/integrations/supabase/client';
import { useMonth } from '@/contexts/MonthContext';
import MonthSelector from '@/components/MonthSelector';
import {


  Cell,
  ResponsiveContainer,
  ReferenceLine,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { axisProps, gridProps, barCursor, tooltipProps, CHART_COLORS } from '@/lib/chartTheme';

const COLORS = CHART_COLORS;

interface RoomTypeData {
  name: string;
  revenue: number;
  occupancy: number;
  adr: number;
  rooms: number;
  roomsSold: number;
  availableNights: number;
  revpar: number;
  revenueShare: number;
  keyShare: number;
  prev: { revenue: number; occupancy: number; adr: number; revpar: number } | null;
}

const ROOM_TYPES_STALE_TIME = 1000 * 60 * 5;

// Versioned so corrected historical values bypass persisted stale data.
const roomTypesQueryKey = (month: string | null) => ['roomTypes', 'summary-v3', month ?? 'latest'] as const;

const monthRange = (year: number, monthIdx: number) => {
  const m = String(monthIdx + 1).padStart(2, '0');
  const days = new Date(year, monthIdx + 1, 0).getDate();
  return { start: `${year}-${m}-01`, end: `${year}-${m}-${days}`, days };
};

async function fetchRoomTypeSummary(selectedMonth: string | null) {
  const { data: rtData } = await supabase.from('room_types').select('*').order('name');

  let year: number, monthIdx: number;
  if (selectedMonth) {
    const parts = selectedMonth.split('-').map(Number);
    year = parts[0];
    monthIdx = parts[1] - 1;
  } else {
    const { data: latestRecord } = await supabase
      .from('daily_revenue').select('date').is('room_type_id', null)
      .order('date', { ascending: false }).limit(1).maybeSingle();
    const refDate = latestRecord ? new Date(latestRecord.date + 'T00:00:00') : new Date();
    year = refDate.getFullYear();
    monthIdx = refDate.getMonth();
  }

  const cur = monthRange(year, monthIdx);
  const prevDate = new Date(year, monthIdx - 1, 1);
  const prev = monthRange(prevDate.getFullYear(), prevDate.getMonth());

  const [{ data: revenueData }, { data: rtRevenueData }, { data: target }] = await Promise.all([
    supabase.from('daily_revenue').select('revenue, rooms_sold, occupancy')
      .is('room_type_id', null).gte('date', cur.start).lte('date', cur.end),
    supabase.from('daily_revenue').select('date, room_type_id, revenue, rooms_sold, occupancy')
      .not('room_type_id', 'is', null).gte('date', prev.start).lte('date', cur.end),
    supabase.from('monthly_targets').select('room_cost_per_occupied, breakeven_rate')
      .eq('year', year).eq('month', monthIdx + 1).maybeSingle(),
  ]);

  const totalRev = revenueData?.reduce((s, d) => s + Number(d.revenue || 0), 0) || 0;
  const totalRoomsSold = revenueData?.reduce((s, d) => s + Number(d.rooms_sold || 0), 0) || 0;
  const weightedAdr = totalRoomsSold > 0 ? totalRev / totalRoomsSold : 0;
  const occDays = revenueData?.filter(d => (d.occupancy ?? 0) > 0) || [];
  const avgOccupancy = occDays.length > 0
    ? (occDays.reduce((s, d) => s + Number(d.occupancy || 0), 0) / occDays.length) * 100 : 0;

  type Agg = { revenue: number; roomsSold: number; occupancy: number };
  const curMap = new Map<string, Agg>();
  const prevMap = new Map<string, Agg>();
  rtRevenueData?.forEach(d => {
    const map = d.date >= cur.start ? curMap : prevMap;
    const e = map.get(d.room_type_id!) || { revenue: 0, roomsSold: 0, occupancy: 0 };
    e.revenue += Number(d.revenue || 0);
    e.roomsSold += Number(d.rooms_sold || 0);
    e.occupancy += Number(d.occupancy || 0);
    map.set(d.room_type_id!, e);
  });

  const valid = (rtData || []).filter(rt => rt.name && rt.name.trim() !== '');
  const totalKeys = valid.reduce((s, rt) => s + rt.total_rooms, 0);
  const rtRevenueTotal = valid.reduce((s, rt) => s + (curMap.get(rt.id)?.revenue || 0), 0);

  const roomTypes: RoomTypeData[] = valid.map(rt => {
    const c = curMap.get(rt.id);
    const p = prevMap.get(rt.id);
    const availableNights = rt.total_rooms * cur.days;
    const prevNights = rt.total_rooms * prev.days;
    const revenue = c?.revenue || 0;
    return {
      name: rt.name,
      revenue,
      occupancy: c ? Math.min(c.occupancy, 1) * 100 : 0,
      adr: c && c.roomsSold > 0 ? c.revenue / c.roomsSold : 0,
      rooms: rt.total_rooms,
      roomsSold: c?.roomsSold || 0,
      availableNights,
      revpar: availableNights > 0 ? revenue / availableNights : 0,
      revenueShare: rtRevenueTotal > 0 ? (revenue / rtRevenueTotal) * 100 : 0,
      keyShare: totalKeys > 0 ? (rt.total_rooms / totalKeys) * 100 : 0,
      prev: p ? {
        revenue: p.revenue,
        occupancy: Math.min(p.occupancy, 1) * 100,
        adr: p.roomsSold > 0 ? p.revenue / p.roomsSold : 0,
        revpar: prevNights > 0 ? p.revenue / prevNights : 0,
      } : null,
    };
  });

  const totalNights = totalKeys * cur.days;
  const rtSold = roomTypes.reduce((s, r) => s + r.roomsSold, 0);

  return {
    roomTypes,
    totalRevenue: totalRev,
    weightedAdr,
    avgOccupancy,
    totalKeys,
    totalNights,
    rtSold,
    propertyRevpar: totalNights > 0 ? rtRevenueTotal / totalNights : 0,
    roomCost: Number(target?.room_cost_per_occupied || 0),
  };
}

/** Called by nav hover preloading once this chunk is loaded — warms the current month's data. */
export function prefetchRouteData(queryClient: QueryClient, month?: string) {
  queryClient.prefetchQuery({
    queryKey: roomTypesQueryKey(month ?? null),
    queryFn: () => fetchRoomTypeSummary(month ?? null),
    staleTime: ROOM_TYPES_STALE_TIME,
  });
}


function Delta({ current, previous, suffix = '%' }: { current: number; previous?: number; suffix?: string }) {
  if (previous === undefined || previous === 0) {
    return <span className="text-xs text-muted-foreground">No prior month</span>;
  }
  const pct = ((current - previous) / previous) * 100;
  const flat = Math.abs(pct) < 0.5;
  const Icon = flat ? Minus : pct > 0 ? TrendingUp : TrendingDown;
  const tone = flat ? 'text-muted-foreground' : pct > 0 ? 'text-success' : 'text-destructive';
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium tabular-nums ${tone}`}>
      <Icon className="w-3 h-3" />
      {pct > 0 ? '+' : ''}{pct.toFixed(1)}{suffix} vs last month
    </span>
  );
}

function Metric({ label, value, children }: { label: string; value: string; children?: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-base font-semibold tabular-nums text-foreground">{value}</div>
      {children}
    </div>
  );
}

export default function RoomTypes() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const { selectedMonth, availableMonths } = useMonth();
  const queryClient = useQueryClient();

  const roomTypesQuery = useQuery({
    queryKey: roomTypesQueryKey(selectedMonth ?? null),
    queryFn: () => fetchRoomTypeSummary(selectedMonth ?? null),
    placeholderData: (prev) => prev,
    staleTime: ROOM_TYPES_STALE_TIME,
  });

  const prefetchMonth = useCallback((month: string) => {
    queryClient.prefetchQuery({
      queryKey: roomTypesQueryKey(month),
      queryFn: () => fetchRoomTypeSummary(month),
      staleTime: ROOM_TYPES_STALE_TIME,
    });
  }, [queryClient]);

  useEffect(() => {
    if (!selectedMonth || availableMonths.length === 0) return;
    const idx = availableMonths.indexOf(selectedMonth);
    if (idx === -1) return;
    [availableMonths[idx - 1], availableMonths[idx + 1]]
      .filter((m): m is string => Boolean(m))
      .forEach(prefetchMonth);
  }, [selectedMonth, availableMonths, prefetchMonth]);

  const d = roomTypesQuery.data;
  const roomTypes = d?.roomTypes ?? [];
  const isSwitching = roomTypesQuery.isPlaceholderData;
  const hasData = roomTypes.some(r => r.revenue > 0);

  const topRevenue = hasData ? [...roomTypes].sort((a, b) => b.revenue - a.revenue)[0] : null;
  const topYield = hasData ? [...roomTypes].sort((a, b) => b.revpar - a.revpar)[0] : null;
  const roomCost = d?.roomCost ?? 0;
  const adrMargin = d && roomCost > 0 ? d.weightedAdr - roomCost : null;
  const utilization = d && d.totalNights > 0 ? (d.rtSold / d.totalNights) * 100 : 0;

  const shareData = roomTypes.map(r => ({
    name: r.name.replace(' Apartment', ''),
    'Revenue share': Number(r.revenueShare.toFixed(1)),
    'Share of rooms': Number(r.keyShare.toFixed(1)),
  }));
  const revparData = [...roomTypes].sort((a, b) => b.revpar - a.revpar).map(r => ({
    name: r.name.replace(' Apartment', ''),
    revpar: Number(r.revpar.toFixed(2)),
  }));

  const anim = (i: number) => prefersReducedMotion
    ? undefined
    : { animationDelay: `${Math.min(i * 60, 300)}ms`, animationFillMode: 'both' as const };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Room Types</h2>
            <p className="text-muted-foreground">How each room category earns its keep</p>
          </div>
          <MonthSelector onPrefetchMonth={prefetchMonth} />
        </div>

        <div className={`space-y-6 transition-opacity duration-200 ${isSwitching && !prefersReducedMotion ? 'opacity-60' : ''}`}>
          {/* Strategic summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="Top Revenue Earner"
              value={topRevenue ? topRevenue.name : '—'}
              subtitle={topRevenue ? `${formatCurrency(topRevenue.revenue)} · ${topRevenue.revenueShare.toFixed(1)}% of room revenue` : 'No data yet'}
              icon={<Crown className="w-5 h-5 text-primary" />}
              variant="success"
            />
            <KPICard
              title="Best Earner per Room"
              value={topYield ? topYield.name : '—'}
              subtitle={topYield ? `${formatCurrency(topYield.revpar)} per room per night (RevPAR)` : 'No data yet'}
              icon={<KeyRound className="w-5 h-5 text-primary" />}
            />
            <KPICard
              title="Weighted ADR"
              value={formatCurrency(d?.weightedAdr ?? 0)}
              subtitle={adrMargin === null
                ? 'Revenue ÷ rooms sold'
                : `${adrMargin >= 0 ? '+' : ''}${formatCurrency(adrMargin)} vs ${formatCurrency(roomCost)} room cost`}
              icon={<TrendingUp className="w-5 h-5 text-primary" />}
              variant={adrMargin === null ? 'default' : adrMargin >= 0 ? 'success' : 'danger'}
            />
            <KPICard
              title="Room Nights Sold"
              value={`${d?.rtSold ?? 0} / ${d?.totalNights ?? 0}`}
              subtitle={`${formatPercent(utilization)} of available nights · ${d?.totalKeys ?? 0} rooms`}
              icon={<Gauge className="w-5 h-5 text-primary" />}
            />
          </div>

          {/* Category cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {roomTypes.map((r, i) => {
              const color = COLORS[i % COLORS.length];
              const aboveCost = roomCost > 0 && r.adr > 0 ? r.adr >= roomCost : null;
              return (
                <Card
                  key={r.name}
                  className={`overflow-hidden ${prefersReducedMotion ? '' : 'animate-fade-in'}`}
                  style={{ ...anim(i), borderTop: `3px solid ${color}` }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{r.name}</CardTitle>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground whitespace-nowrap">
                        {r.rooms} rooms · {r.keyShare.toFixed(0)}%
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="text-2xl font-bold tabular-nums text-foreground">{formatCurrency(r.revenue)}</div>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-xs text-muted-foreground">{r.revenueShare.toFixed(1)}% of room revenue</span>
                        <Delta current={r.revenue} previous={r.prev?.revenue} />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Occupancy</span>
                        <span className="font-semibold tabular-nums text-foreground">{formatPercent(r.occupancy)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${Math.min(r.occupancy, 100)}%`, background: color }}
                        />
                      </div>
                      <div className="text-[11px] text-muted-foreground tabular-nums">
                        {r.roomsSold} of {r.availableNights} nights sold
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 border-t pt-3">
                      <Metric label="ADR" value={formatCurrency(r.adr)}>
                        {aboveCost !== null && (
                          <span className={`text-[11px] ${aboveCost ? 'text-success' : 'text-destructive'}`}>
                            {aboveCost ? 'Above' : 'Below'} room cost
                          </span>
                        )}
                      </Metric>
                      <Metric label="RevPAR" value={formatCurrency(r.revpar)}>
                        <Delta current={r.revpar} previous={r.prev?.revpar} />
                      </Metric>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Share vs Share of Rooms</CardTitle>
                <p className="text-sm text-muted-foreground">A revenue bar taller than its rooms bar means that category punches above its weight.</p>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {hasData ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={shareData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid {...gridProps} />
                        <XAxis dataKey="name" {...axisProps} />
                        <YAxis {...axisProps} unit="%" />
                        <Tooltip {...tooltipProps} cursor={barCursor} formatter={(v: number) => `${v}%`} />
                        <Bar dataKey="Revenue share" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} isAnimationActive={!prefersReducedMotion} />
                        <Bar dataKey="Share of rooms" fill="hsl(var(--muted-foreground) / 0.45)" radius={[4, 4, 0, 0]} isAnimationActive={!prefersReducedMotion} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="h-full flex items-center justify-center text-sm text-muted-foreground">No room-type revenue for this month</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Earnings per Available Room (RevPAR)</CardTitle>
                <p className="text-sm text-muted-foreground">Revenue ÷ every room night on offer. Dashed line = property average.</p>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {hasData ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={revparData} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                        <CartesianGrid {...gridProps} />
                        <XAxis type="number" {...axisProps} tickFormatter={(v) => `R${v}`} />
                        <YAxis type="category" dataKey="name" {...axisProps} width={90} />
                        <Tooltip {...tooltipProps} cursor={barCursor} formatter={(v: number) => [formatCurrency(v), 'RevPAR']} />
                        <ReferenceLine x={Number((d?.propertyRevpar ?? 0).toFixed(2))} stroke="hsl(var(--primary))" strokeDasharray="4 4" />
                        <Bar dataKey="revpar" radius={[0, 4, 4, 0]} isAnimationActive={!prefersReducedMotion}>
                          {revparData.map((entry) => (
                            <Cell key={entry.name} fill={COLORS[roomTypes.findIndex(r => r.name.replace(' Apartment', '') === entry.name) % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="h-full flex items-center justify-center text-sm text-muted-foreground">No room-type revenue for this month</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detail table */}
          <Card>
            <CardHeader>
              <CardTitle>Full Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[760px]">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left py-3 px-3 font-medium">Room Type</th>
                      <th className="text-right py-3 px-3 font-medium">Rooms</th>
                      <th className="text-right py-3 px-3 font-medium">Nights Sold</th>
                      <th className="text-right py-3 px-3 font-medium">Occupancy</th>
                      <th className="text-right py-3 px-3 font-medium">ADR</th>
                      <th className="text-right py-3 px-3 font-medium">RevPAR</th>
                      <th className="text-right py-3 px-3 font-medium">Revenue</th>
                      <th className="text-right py-3 px-3 font-medium">Share</th>
                      <th className="text-right py-3 px-3 font-medium">vs Last Month</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roomTypes.map((r, i) => (
                      <tr key={r.name} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="py-3 px-3 font-medium">
                          <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ background: COLORS[i % COLORS.length] }} />
                          {r.name}
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums">{r.rooms}</td>
                        <td className="py-3 px-3 text-right tabular-nums">{r.roomsSold} / {r.availableNights}</td>
                        <td className="py-3 px-3 text-right tabular-nums">{formatPercent(r.occupancy)}</td>
                        <td className="py-3 px-3 text-right tabular-nums">{formatCurrency(r.adr)}</td>
                        <td className="py-3 px-3 text-right tabular-nums">{formatCurrency(r.revpar)}</td>
                        <td className="py-3 px-3 text-right tabular-nums font-semibold">{formatCurrency(r.revenue)}</td>
                        <td className="py-3 px-3 text-right tabular-nums">{r.revenueShare.toFixed(1)}%</td>
                        <td className="py-3 px-3 text-right"><Delta current={r.revenue} previous={r.prev?.revenue} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
