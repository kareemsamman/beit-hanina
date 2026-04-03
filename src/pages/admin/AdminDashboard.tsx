import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, CreditCard, Wrench, MessageSquare, UserPlus, CalendarPlus, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BUILDING_NAME, CURRENCY } from '@/lib/constants';
import { toast } from 'sonner';

export default function AdminDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalResidents: 0,
    paidThisMonth: 0,
    unpaidThisMonth: 0,
    openRequests: 0,
    monthlyFee: 100,
  });
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const [residents, payments, requests, settings] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'resident').eq('is_active', true),
      supabase.from('monthly_payments').select('status').eq('month', month).eq('year', year),
      supabase.from('maintenance_requests').select('id', { count: 'exact' }).in('status', ['new', 'in_progress']),
      supabase.from('settings').select('default_monthly_fee').eq('id', 1).single(),
    ]);

    const paid = payments.data?.filter((p) => p.status === 'paid').length || 0;
    const unpaid = payments.data?.filter((p) => p.status === 'unpaid').length || 0;

    setStats({
      totalResidents: residents.count || 0,
      paidThisMonth: paid,
      unpaidThisMonth: unpaid,
      openRequests: requests.count || 0,
      monthlyFee: settings.data?.default_monthly_fee || 100,
    });
    setLoading(false);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-monthly-payments', {
        body: {},
      });
      if (error || data?.error) {
        toast.error(data?.error || 'خطأ في التوليد');
      } else {
        toast.success(`تم توليد دفعات الشهر (${data?.created} ساكن)`);
        fetchStats();
      }
    } catch {
      toast.error('حدث خطأ');
    } finally {
      setGenerating(false);
    }
  };

  const statCards = [
    { label: 'عدد السكان', value: stats.totalResidents, icon: Users, color: 'text-primary' },
    { label: 'دفعوا هذا الشهر', value: stats.paidThisMonth, icon: CreditCard, color: 'text-success' },
    { label: 'لم يدفعوا', value: stats.unpaidThisMonth, icon: CreditCard, color: 'text-destructive' },
    { label: 'طلبات مفتوحة', value: stats.openRequests, icon: Wrench, color: 'text-warning' },
    { label: 'الاشتراك الشهري', value: `${stats.monthlyFee} ${CURRENCY}`, icon: CreditCard, color: 'text-primary' },
  ];

  const quickActions = [
    { label: 'إضافة ساكن', icon: UserPlus, onClick: () => navigate('/admin/residents') },
    { label: 'تسجيل دفعة', icon: CreditCard, onClick: () => navigate('/admin/payments') },
    { label: 'الطلبات', icon: Wrench, onClick: () => navigate('/admin/requests') },
    { label: 'إرسال رسالة', icon: MessageSquare, onClick: () => navigate('/admin/sms') },
    { label: 'توليد دفعات الشهر', icon: CalendarPlus, onClick: handleGenerate, loading: generating },
  ];

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold">مرحباً، {profile?.name}</h1>
        <p className="text-muted-foreground text-sm">{BUILDING_NAME}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-8">
        {statCards.map((stat, i) => (
          <Card key={i} className={i === statCards.length - 1 ? 'col-span-2' : ''}>
            <CardContent className="p-4 flex items-center gap-3">
              <stat.icon className={`h-8 w-8 ${stat.color}`} />
              <div>
                <p className="text-2xl font-bold">{loading ? '...' : stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <h2 className="text-lg font-semibold mb-3">إجراءات سريعة</h2>
      <div className="grid grid-cols-2 gap-3">
        {quickActions.map((action, i) => (
          <Button
            key={i}
            variant="outline"
            className={`h-20 flex flex-col items-center justify-center gap-2 ${i === quickActions.length - 1 ? 'col-span-2' : ''}`}
            onClick={action.onClick}
            disabled={action.loading}
          >
            {action.loading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <action.icon className="h-6 w-6" />
            )}
            <span className="text-sm">{action.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
