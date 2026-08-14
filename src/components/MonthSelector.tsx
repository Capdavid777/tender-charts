import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMonth } from '@/contexts/MonthContext';

interface MonthSelectorProps {
  /** Optional hook to warm data for a month before it is selected. */
  onPrefetchMonth?: (month: string) => void;
}

export default function MonthSelector({ onPrefetchMonth }: MonthSelectorProps) {
  const { selectedMonth, setSelectedMonth, availableMonths } = useMonth();

  if (availableMonths.length === 0) return null;

  const handleOpenChange = (open: boolean) => {
    if (open && onPrefetchMonth) {
      availableMonths.slice(0, 6).forEach(onPrefetchMonth);
    }
  };

  return (
    <Select value={selectedMonth} onValueChange={setSelectedMonth} onOpenChange={handleOpenChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select month" />
      </SelectTrigger>
      <SelectContent>
        {availableMonths.map(m => {
          const [year, month] = m.split('-').map(Number);
          const label = new Date(year, month - 1).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' });
          return (
            <SelectItem
              key={m}
              value={m}
              onMouseEnter={() => onPrefetchMonth?.(m)}
              onFocus={() => onPrefetchMonth?.(m)}
            >
              {label}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
