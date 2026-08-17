import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface MonthContextType {
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  availableMonths: string[];
  refetchMonths: () => void;
}

const MonthContext = createContext<MonthContextType | undefined>(undefined);

const MONTHS_QUERY_KEY = ['months'] as const;
const MONTHS_STALE_TIME = 1000 * 60 * 5;

async function fetchMonthDates(): Promise<string[]> {
  const { data, error } = await supabase
    .from('daily_revenue')
    .select('date')
    .is('room_type_id', null)
    .order('date', { ascending: true });
  if (error) throw error;
  return (data || []).map(d => d.date as string);
}

export function MonthProvider({ children }: { children: ReactNode }) {
  const [selectedMonth, setSelectedMonthState] = useState<string>(() => {
    return sessionStorage.getItem('selectedMonth') || '';
  });
  const queryClient = useQueryClient();

  const setSelectedMonth = useCallback((month: string) => {
    setSelectedMonthState(month);
    sessionStorage.setItem('selectedMonth', month);
  }, []);

  // Shared, cached and persisted — deduplicates with any other consumer of the month list.
  const monthsQuery = useQuery({
    queryKey: MONTHS_QUERY_KEY,
    queryFn: fetchMonthDates,
    staleTime: MONTHS_STALE_TIME,
  });

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    (monthsQuery.data || []).forEach(dateStr => {
      const date = new Date(dateStr);
      months.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
    });
    return Array.from(months).sort().reverse();
  }, [monthsQuery.data]);

  useEffect(() => {
    if (availableMonths.length === 0) return;
    if (!selectedMonth || !availableMonths.includes(selectedMonth)) {
      setSelectedMonth(availableMonths[0]);
    }
  }, [availableMonths, selectedMonth, setSelectedMonth]);

  const refetchMonths = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: MONTHS_QUERY_KEY });
  }, [queryClient]);

  const value = useMemo(
    () => ({ selectedMonth, setSelectedMonth, availableMonths, refetchMonths }),
    [selectedMonth, setSelectedMonth, availableMonths, refetchMonths],
  );

  return <MonthContext.Provider value={value}>{children}</MonthContext.Provider>;
}

export function useMonth() {
  const context = useContext(MonthContext);
  if (context === undefined) {
    throw new Error('useMonth must be used within a MonthProvider');
  }
  return context;
}
