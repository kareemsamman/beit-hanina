import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, CreditCard, Wrench, MessageSquare, UserPlus, CalendarPlus, Loader2, TrendingUp, Building2, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BUILDING_NAME, CURRENCY } from '@/lib/constants';
import { ARABIC_MONTHS } from '@/types';
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

  const now = new Date();
  const currentMonth = ARABIC_MONTHS[now.getMonth() + 1];

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
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

  const paidPercent = stats.totalResidents > 0
    ? Math.round((stats.paidThisMonth / (stats.paidThisMonth + stats.unpaidThisMonth || 1)) * 100)
    : 0;

  const quickActions = [
    { label: 'إضافة ساكن', icon: UserPlus, onClick: () => navigate('/admin/residents'), bg: 'bg-blue-50', color: 'text-blue-600' },
    { label: 'تسجيل دفعة', icon: CreditCard, onClick: () => navigate('/admin/payments'), bg: 'bg-green-50', color: 'text-green-600' },
    { label: 'الطلبات', icon: Wrench, onClick: () => navigate('/admin/requests'), bg: 'bg-amber-50', color: 'text-amber-600' },
    { label: 'إرسال رسالة', icon: MessageSquare, onClick: () => navigate('/admin/sms'), bg: 'bg-purple-50', color: 'text-purple-600' },
  ];

  return (
    <div className="max-w-lg mx-auto">
      {/* Hero header */}
      <div className="bg-gradient-to-bl from-primary via-primary to-primary/90 rounded-b-[2rem] px-5 pt-6 pb-8 mb-5 animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-primary-foreground/70 text-sm">مرحباً</p>
            <h1 className="text-2xl font-bold text-primary-foreground">{profile?.name}</h1>
          </div>
          <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-3">
            <Building2 className="h-7 w-7 text-primary-foreground" />
          </div>
        </div>
        <p className="text-primary-foreground/60 text-xs">{BUILDING_NAME}</p>
      </div>

      <div className="px-4">
        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3 mb-5 -mt-6 animate-slide-up">
          <Card className="border-0 shadow-md cursor-pointer hover:shadow-lg active:scale-[0.97] transition-all" onClick={() => navigate('/admin/residents')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="bg-blue-50 rounded-xl p-2">
                  <Users className="h-4.5 w-4.5 text-blue-600" />
                </div>
                <ChevronLeft className="h-4 w-4 text-muted-foreground/40" />
              </div>
              <p className="text-3xl font-bold animate-count-up">{loading ? '—' : stats.totalResidents}</p>
              <p className="text-xs text-muted-foreground mt-0.5">عدد السكان</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md cursor-pointer hover:shadow-lg active:scale-[0.97] transition-all" onClick={() => navigate('/admin/requests')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="bg-amber-50 rounded-xl p-2">
                  <Wrench className="h-4.5 w-4.5 text-amber-600" />
                </div>
                <ChevronLeft className="h-4 w-4 text-muted-foreground/40" />
              </div>
              <p className="text-3xl font-bold animate-count-up">{loading ? '—' : stats.openRequests}</p>
              <p className="text-xs text-muted-foreground mt-0.5">طلبات مفتوحة</p>
            </CardContent>
          </Card>
        </div>

        {/* Payment progress card */}
        <Card className="border-0 shadow-md mb-5 overflow-hidden cursor-pointer hover:shadow-lg active:scale-[0.99] transition-all animate-scale-in" onClick={() => navigate('/admin/payments')}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-semibold">تحصيل {currentMonth}</p>
              <ChevronLeft className="h-4 w-4 text-muted-foreground/40" />
            </div>
            <div className="flex items-end justify-between mb-4">
              <div>
                <span className="text-4xl font-bold">{loading ? '—' : paidPercent}</span>
                <span className="text-lg text-muted-foreground mr-0.5">%</span>
              </div>
              <div className="text-left">
                <p className="text-xs text-muted-foreground">المحصّل</p>
                <p className="text-lg font-bold">{loading ? '—' : `${stats.paidThisMonth * stats.monthlyFee}`} <span className="text-xs text-muted-foreground">{CURRENCY}</span></p>
              </div>
            </div>
            {/* Progress bar */}
            <div className="h-3 bg-muted rounded-full overflow-hidden mb-3">
              <div
                className="h-full rounded-full transition-all duration-1000 ease-out"
                style={{
                  width: `${paidPercent}%`,
                  background: paidPercent === 100
                    ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                    : paidPercent > 50
                    ? 'linear-gradient(90deg, #3b82f6, #2563eb)'
                    : 'linear-gradient(90deg, #f59e0b, #d97706)',
                }}
              />
            </div>
            <div className="flex justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-muted-foreground">دفعوا <span className="font-semibold text-foreground">{stats.paidThisMonth}</span></span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-destructive" />
                <span className="text-muted-foreground">لم يدفعوا <span className="font-semibold text-foreground">{stats.unpaidThisMonth}</span></span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monthly fee */}
        <Card className="border-0 shadow-sm bg-gradient-to-l from-primary/5 to-card mb-5 animate-slide-up">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">الاشتراك الشهري</p>
              <p className="text-2xl font-bold">{loading ? '—' : `${stats.monthlyFee}`} <span className="text-sm text-muted-foreground">{CURRENCY}</span></p>
            </div>
            <div className="bg-primary/10 rounded-xl p-3">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <h2 className="text-lg font-bold mb-3">إجراءات سريعة</h2>
        <div className="grid grid-cols-2 gap-3 mb-4 animate-stagger">
          {quickActions.map((action, i) => (
            <button
              key={i}
              onClick={action.onClick}
              className="bg-card rounded-2xl p-4 flex flex-col items-center justify-center gap-3 shadow-sm hover:shadow-lg active:scale-[0.95] transition-all duration-200 h-24 group"
            >
              <div className={`${action.bg} rounded-xl p-2.5 group-hover:scale-110 transition-transform duration-200`}>
                <action.icon className={`h-5 w-5 ${action.color}`} />
              </div>
              <span className="text-sm font-medium">{action.label}</span>
            </button>
          ))}
        </div>

        <Button
          variant="outline"
          className="w-full h-12 rounded-xl border-dashed border-2 mb-4 hover:bg-primary/5 hover:border-primary/30 transition-all"
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
    </div>
  );
}
