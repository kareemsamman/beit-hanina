import { type ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  message: string;
  action?: ReactNode;
}

export function EmptyState({ icon, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
      <div className="mb-4 text-muted-foreground/50 bg-muted/50 rounded-2xl p-5">{icon}</div>
      <p className="text-base text-muted-foreground mb-4">{message}</p>
      {action}
    </div>
  );
}
