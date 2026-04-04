import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, CreditCard, Wrench, MessageSquare, UserPlus, CalendarPlus, Loader2, TrendingUp } from 'lucide-react';
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
    { label: 'عدد السكان', value: stats.totalResidents, icon: Users, bg: 'bg-primary/10', color: 'text-primary' },
    { label: 'دفعوا هذا الشهر', value: stats.paidThisMonth, icon: CreditCard, bg: 'bg-green-50', color: 'text-success' },
    { label: 'لم يدفعوا', value: stats.unpaidThisMonth, icon: CreditCard, bg: 'bg-red-50', color: 'text-destructive' },
    { label: 'طلبات مفتوحة', value: stats.openRequests, icon: Wrench, bg: 'bg-amber-50', color: 'text-warning' },
  ];

  const quickActions = [
    { label: 'إضافة ساكن', icon: UserPlus, onClick: () => navigate('/admin/residents'), color: 'text-primary' },
    { label: 'تسجيل دفعة', icon: CreditCard, onClick: () => navigate('/admin/payments'), color: 'text-success' },
    { label: 'الطلبات', icon: Wrench, onClick: () => navigate('/admin/requests'), color: 'text-warning' },
    { label: 'إرسال رسالة', icon: MessageSquare, onClick: () => navigate('/admin/sms'), color: 'text-info' },
  ];

  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-l from-primary/10 to-primary/5 rounded-2xl p-5 mb-6">
        <p className="text-muted-foreground text-sm">مرحباً</p>
        <h1 className="text-2xl font-bold text-foreground">{profile?.name}</h1>
        <p className="text-muted-foreground text-xs mt-1">{BUILDING_NAME}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {statCards.map((stat, i) => (
          <Card key={i} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className={`inline-flex rounded-xl p-2.5 mb-3 ${stat.bg}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <p className="text-2xl font-bold">{loading ? '...' : stat.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Monthly fee banner */}
      <Card className="border-0 shadow-sm bg-gradient-to-l from-primary/5 to-card mb-6">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">الاشتراك الشهري</p>
            <p className="text-2xl font-bold">{loading ? '...' : `${stats.monthlyFee} ${CURRENCY}`}</p>
          </div>
          <div className="bg-primary/10 rounded-xl p-3">
            <TrendingUp className="h-6 w-6 text-primary" />
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <h2 className="text-lg font-bold mb-3">إجراءات سريعة</h2>
      <div className="grid grid-cols-2 gap-3 mb-4">
        {quickActions.map((action, i) => (
          <button
            key={i}
            onClick={action.onClick}
            className="bg-card rounded-2xl p-4 flex flex-col items-center justify-center gap-2.5 shadow-sm border border-border/50 hover:shadow-md active:scale-[0.97] transition-all h-24"
          >
            <action.icon className={`h-6 w-6 ${action.color}`} />
            <span className="text-sm font-medium">{action.label}</span>
          </button>
        ))}
      </div>

      <Button
        variant="outline"
        className="w-full h-12 rounded-xl border-dashed border-2"
        onClick={handleGenerate}
        disabled={generating}
      >
        {generating ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <span className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5" />
            توليد دفعات الشهر
          </span>
        )}
      </Button>
    </div>
  );
}
