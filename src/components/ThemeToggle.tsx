import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun, MonitorCog } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const ORDER = ['light', 'dark', 'system'] as const;
type Mode = (typeof ORDER)[number];

const LABELS: Record<Mode, string> = {
  light: 'Light theme',
  dark: 'Dark theme',
  system: 'System theme',
};

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const current: Mode = (ORDER as readonly string[]).includes(theme ?? '')
    ? (theme as Mode)
    : 'system';

  const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];

  const Icon = current === 'dark' ? Moon : current === 'light' ? Sun : MonitorCog;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          aria-label={`${LABELS[current]}. Switch to ${LABELS[next].toLowerCase()}`}
          onClick={() => setTheme(next)}
        >
          {mounted ? <Icon className="h-4 w-4" /> : <span className="h-4 w-4" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {mounted ? `${LABELS[current]} — click for ${LABELS[next].toLowerCase()}` : 'Theme'}
      </TooltipContent>
    </Tooltip>
  );
}
