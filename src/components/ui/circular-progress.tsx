import { cn } from '@/lib/utils';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

interface CircularProgressProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  showLabel?: boolean;
  className?: string;
}

const variantColors: Record<NonNullable<CircularProgressProps['variant']>, string> = {
  default: 'hsl(var(--primary))',
  success: 'hsl(var(--success))',
  warning: 'hsl(var(--warning))',
  danger: 'hsl(var(--destructive))',
};

export default function CircularProgress({
  value,
  size = 52,
  strokeWidth = 5,
  variant = 'default',
  showLabel = false,
  className,
}: CircularProgressProps) {
  const prefersReduced = usePrefersReducedMotion();
  const clamped = Math.min(Math.max(value, 0), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn('overflow-visible', className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="hsl(var(--muted-foreground) / 0.25)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={variantColors[variant]}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{
          transition: prefersReduced ? 'none' : 'stroke-dashoffset 800ms ease-out',
          transformOrigin: 'center',
        }}
      />
      {showLabel && (
        <foreignObject x="0" y="0" width={size} height={size}>
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-[10px] font-semibold text-foreground tabular-nums leading-none">
              {Math.round(clamped)}%
            </span>
          </div>
        </foreignObject>
      )}
    </svg>
  );
}
