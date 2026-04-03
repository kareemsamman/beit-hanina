import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Home, Users, CreditCard, Wrench, MoreHorizontal } from 'lucide-react';
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
  { path: '/admin/calendar', icon: CreditCard, label: 'التقويم' },
  { path: '/admin/settings', icon: Settings, label: 'الإعدادات' },
];

export function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);

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
          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger asChild>
              <button className="flex flex-col items-center justify-center gap-1 flex-1 h-full text-muted-foreground">
                <MoreHorizontal className="h-5 w-5" />
                <span className="text-xs font-medium">المزيد</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl">
              <div className="flex flex-col gap-2 py-4">
                {moreItems.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => { navigate(item.path); setMoreOpen(false); }}
                    className="flex items-center gap-3 p-4 rounded-lg hover:bg-accent transition-colors text-right"
                  >
                    <item.icon className="h-5 w-5 text-primary" />
                    <span className="text-base font-medium">{item.label}</span>
                  </button>
                ))}
                <button
                  onClick={() => { logout(); setMoreOpen(false); }}
                  className="flex items-center gap-3 p-4 rounded-lg hover:bg-destructive/10 transition-colors text-right text-destructive"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="text-base font-medium">تسجيل الخروج</span>
                </button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </div>
  );
}
