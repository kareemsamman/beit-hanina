import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Home, CreditCard, Wrench, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { path: '/resident', icon: Home, label: 'الرئيسية' },
  { path: '/resident/payments', icon: CreditCard, label: 'الدفعات' },
  { path: '/resident/requests', icon: Wrench, label: 'الطلبات' },
  { path: '/resident/profile', icon: User, label: 'حسابي' },
];

export function ResidentLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <main className="flex-1 pb-20 overflow-y-auto">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 inset-x-0 bg-card border-t border-border z-50">
        <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
          {tabs.map((tab) => {
            const isActive = location.pathname === tab.path;
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <tab.icon className="h-5 w-5" />
                <span className="text-xs font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
