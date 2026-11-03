import { AlertCircle, Inbox, WifiOff, type LucideIcon } from 'lucide-react';
import { Button } from './button';
import { cn } from '../lib/cn';

type StateMessageVariant = 'error' | 'empty' | 'offline';

interface StateMessageProps {
  variant?: StateMessageVariant;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

const icons: Record<StateMessageVariant, LucideIcon> = {
  error: AlertCircle,
  empty: Inbox,
  offline: WifiOff,
};

export function StateMessage({
  variant = 'empty',
  title,
  description,
  actionLabel,
  onAction,
  className,
}: StateMessageProps) {
  const Icon = icons[variant];
  const iconClassName = {
    error: 'bg-red-50 text-red-600',
    empty: 'bg-muted text-muted-foreground',
    offline: 'bg-amber-50 text-amber-700',
  }[variant];

  return (
    <div
      className={cn('flex min-h-64 items-center justify-center px-6 py-10', className)}
      role={variant === 'error' ? 'alert' : 'status'}
    >
      <div className="max-w-md text-center">
        <div className={cn('mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full', iconClassName)}>
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {description && <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>}
        {actionLabel && onAction && (
          <Button type="button" variant={variant === 'error' ? 'default' : 'outline'} size="sm" onClick={onAction} className="mt-5">
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
