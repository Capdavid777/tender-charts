import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MonthContextType {
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  availableMonths: string[];
}

const MonthContext = createContext<MonthContextType | undefined>(undefined);

export function MonthProvider({ children }: { children: ReactNode }) {
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);

  useEffect(() => {
    const fetchMonths = async () => {
      const { data } = await supabase
        .from('daily_revenue')
        .select('date')
        .is('room_type_id', null)
        .order('date', { ascending: true });

      if (data && data.length > 0) {
        const months = new Set<string>();
        data.forEach(d => {
          const date = new Date(d.date);
          const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          months.add(key);
        });
        const sorted = Array.from(months).sort().reverse();
        setAvailableMonths(sorted);
        if (!selectedMonth) {
          setSelectedMonth(sorted[0]);
        }
      }
    };
    fetchMonths();
  }, []);

  return (
    <MonthContext.Provider value={{ selectedMonth, setSelectedMonth, availableMonths }}>
      {children}
    </MonthContext.Provider>
  );
}

export function useMonth() {
  const context = useContext(MonthContext);
  if (context === undefined) {
    throw new Error('useMonth must be used within a MonthProvider');
  }
  return context;
}
