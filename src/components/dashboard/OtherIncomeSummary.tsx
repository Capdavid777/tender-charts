import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Banknote } from 'lucide-react';
import { formatCurrency } from '@/lib/format';


export interface OtherIncomeItem {
  product_type: string;
  revenue: number;
}

interface OtherIncomeSummaryProps {
  items: OtherIncomeItem[];
}

export default function OtherIncomeSummary({ items }: OtherIncomeSummaryProps) {
  const total = useMemo(() => items.reduce((sum, i) => sum + Number(i.revenue), 0), [items]);

  if (items.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Banknote className="w-5 h-5 text-primary" />
          Additional Other Income
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product Type</TableHead>
                <TableHead className="text-right">Revenue (Excl.)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.product_type}>
                  <TableCell>{item.product_type}</TableCell>
                  <TableCell className="text-right">{formatCurrency(Number(item.revenue))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="font-semibold">Total</TableCell>
                <TableCell className="text-right font-semibold">{formatCurrency(total)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
