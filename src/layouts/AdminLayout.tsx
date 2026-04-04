import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Home, Users, CreditCard, Wrench, MoreHorizontal, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { MessageSquare, Settings, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const tabs = [
  { path: '/admin', icon: Home, label: 'الرئيسية' },
  { path: '/admin/residents', icon: Users, label: 'السكان' },
  { path: '/admin/payments', icon: CreditCard, label: 'الدفعات' },
  { path: '/admin/requests', icon: Wrench, label: 'الطلبات' },
];

const moreItems = [
  { path: '/admin/sms', icon: MessageSquare, label: 'الرسائل' },
  { path: '/admin/calendar', icon: Calendar, label: 'التقويم' },
  { path: '/admin/settings', icon: Settings, label: 'الإعدادات' },
];

export function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);

  const isMoreActive = moreItems.some((item) => location.pathname === item.path);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <main className="flex-1 pb-20 overflow-y-auto">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 inset-x-0 bg-card/95 backdrop-blur-lg border-t border-border/50 z-50">
        <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
          {tabs.map((tab) => {
            const isActive = location.pathname === tab.path;
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all duration-200 relative',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {isActive && (
                  <span className="absolute top-0 inset-x-4 h-0.5 bg-primary rounded-b-full" />
                )}
                <tab.icon className={cn('h-5 w-5 transition-transform', isActive && 'scale-110')} />
                <span className={cn('text-xs', isActive ? 'font-bold' : 'font-medium')}>{tab.label}</span>
              </button>
            );
          })}
          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger asChild>
              <button className={cn(
                'flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all duration-200 relative',
                isMoreActive ? 'text-primary' : 'text-muted-foreground'
              )}>
                {isMoreActive && (
                  <span className="absolute top-0 inset-x-4 h-0.5 bg-primary rounded-b-full" />
                )}
                <MoreHorizontal className={cn('h-5 w-5 transition-transform', isMoreActive && 'scale-110')} />
                <span className={cn('text-xs', isMoreActive ? 'font-bold' : 'font-medium')}>المزيد</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-3xl">
              <div className="flex flex-col gap-1 py-4">
                {moreItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <button
                      key={item.path}
                      onClick={() => { navigate(item.path); setMoreOpen(false); }}
                      className={cn(
                        'flex items-center gap-3 p-4 rounded-xl transition-colors text-right',
                        isActive ? 'bg-primary/10 text-primary' : 'hover:bg-accent'
                      )}
                    >
                      <div className={cn('rounded-lg p-2', isActive ? 'bg-primary/10' : 'bg-muted')}>
                        <item.icon className="h-5 w-5" />
                      </div>
                      <span className="text-base font-medium">{item.label}</span>
                    </button>
                  );
                })}
                <div className="border-t border-border mt-2 pt-2">
                  <button
                    onClick={() => { logout(); setMoreOpen(false); }}
                    className="flex items-center gap-3 p-4 rounded-xl hover:bg-destructive/10 transition-colors text-right text-destructive w-full"
                  >
                    <div className="bg-destructive/10 rounded-lg p-2">
                      <LogOut className="h-5 w-5" />
                    </div>
                    <span className="text-base font-medium">تسجيل الخروج</span>
                  </button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </div>
  );
}
