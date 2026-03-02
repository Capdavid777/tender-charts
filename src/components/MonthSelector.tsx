import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMonth } from '@/contexts/MonthContext';

export default function MonthSelector() {
  const { selectedMonth, setSelectedMonth, availableMonths } = useMonth();

  if (availableMonths.length === 0) return null;

  return (
    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select month" />
      </SelectTrigger>
      <SelectContent>
        {availableMonths.map(m => {
          const [year, month] = m.split('-').map(Number);
          const label = new Date(year, month - 1).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' });
          return <SelectItem key={m} value={m}>{label}</SelectItem>;
        })}
      </SelectContent>
    </Select>
  );
}
