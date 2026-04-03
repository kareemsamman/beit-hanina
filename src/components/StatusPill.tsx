import { cn } from '@/lib/utils';
import type { PaymentStatus, RequestStatus } from '@/types';
import { PAYMENT_STATUS_LABELS, REQUEST_STATUS_LABELS } from '@/types';

interface StatusPillProps {
  status: PaymentStatus | RequestStatus | string;
  className?: string;
}

const statusColors: Record<string, string> = {
  paid: 'bg-success text-success-foreground',
  done: 'bg-success text-success-foreground',
  unpaid: 'bg-destructive text-destructive-foreground',
  rejected: 'bg-destructive text-destructive-foreground',
  partial: 'bg-warning text-warning-foreground',
  in_progress: 'bg-warning text-warning-foreground',
  new: 'bg-info text-info-foreground',
};

const allLabels: Record<string, string> = {
  ...PAYMENT_STATUS_LABELS,
  ...REQUEST_STATUS_LABELS,
};

export function StatusPill({ status, className }: StatusPillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
        statusColors[status] || 'bg-muted text-muted-foreground',
        className
      )}
    >
      {allLabels[status] || status}
    </span>
  );
}
