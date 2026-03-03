import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency, formatPercent } from '@/lib/format';
import { CalendarDays } from 'lucide-react';

interface DailyRecord {
  date: string;
  revenue: number;
  occupancy: number | null;
  average_rate: number | null;
  rooms_sold: number | null;
}

interface DailyDataTableProps {
  data: DailyRecord[];
}

export default function DailyDataTable({ data }: DailyDataTableProps) {
  if (data.length === 0) return null;

  // Only show days with actual data, sorted ascending
  const sorted = [...data]
    .filter(d => d.revenue > 0 || (d.rooms_sold ?? 0) > 0 || (d.occupancy ?? 0) > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  // Totals / averages
  const totalRevenue = sorted.reduce((s, d) => s + d.revenue, 0);
  const daysWithOcc = sorted.filter(d => (d.occupancy ?? 0) > 0);
  const avgOccupancy = daysWithOcc.length > 0
    ? daysWithOcc.reduce((s, d) => s + (d.occupancy || 0), 0) / daysWithOcc.length
    : 0;
  const daysWithRate = sorted.filter(d => (d.average_rate ?? 0) > 0);
  const avgRate = daysWithRate.length > 0
    ? daysWithRate.reduce((s, d) => s + (d.average_rate || 0), 0) / daysWithRate.length
    : 0;
  const totalRoomsSold = sorted.reduce((s, d) => s + (d.rooms_sold || 0), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-primary" />
          Daily Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-h-[400px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Rooms Sold</TableHead>
                <TableHead className="text-right">Occupancy</TableHead>
                <TableHead className="text-right">ADR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((d) => {
                const dateLabel = new Date(d.date).toLocaleDateString('en-ZA', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                });
                const occ = d.occupancy != null && d.occupancy > 0 ? d.occupancy * 100 : null;

                return (
                  <TableRow key={d.date}>
                    <TableCell className="font-medium">{dateLabel}</TableCell>
                    <TableCell className="text-right">{formatCurrency(d.revenue)}</TableCell>
                    <TableCell className="text-right">{d.rooms_sold ?? '—'}</TableCell>
                    <TableCell className="text-right">
                      {occ != null ? formatPercent(occ) : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {(d.average_rate ?? 0) > 0 ? formatCurrency(d.average_rate!) : '—'}
                    </TableCell>
                  </TableRow>
                );
              })}
              {/* Summary row */}
              <TableRow className="border-t-2 font-semibold bg-muted/50">
                <TableCell>Total / Avg</TableCell>
                <TableCell className="text-right">{formatCurrency(totalRevenue)}</TableCell>
                <TableCell className="text-right">{totalRoomsSold}</TableCell>
                <TableCell className="text-right">
                  {avgOccupancy > 0 ? formatPercent(avgOccupancy * 100) : '—'}
                </TableCell>
                <TableCell className="text-right">
                  {avgRate > 0 ? formatCurrency(Math.round(avgRate)) : '—'}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
