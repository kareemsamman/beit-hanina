import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, CreditCard, Wrench, MessageSquare, UserPlus, CalendarPlus, Loader2, Building2, ChevronLeft, CheckCircle2, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BUILDING_NAME, BUILDING_SHORT, CURRENCY } from '@/lib/constants';
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

  useEffect(() => { fetchStats(); }, []);

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

  const total = stats.paidThisMonth + stats.unpaidThisMonth;
  const paidPercent = total > 0 ? Math.round((stats.paidThisMonth / total) * 100) : 0;
  const collected = stats.paidThisMonth * stats.monthlyFee;

  const quickActions = [
    { label: 'إضافة ساكن', icon: UserPlus, onClick: () => navigate('/admin/residents'), bg: 'from-blue-500 to-blue-600', iconBg: 'bg-white/20' },
    { label: 'تسجيل دفعة', icon: CreditCard, onClick: () => navigate('/admin/payments'), bg: 'from-emerald-500 to-emerald-600', iconBg: 'bg-white/20' },
    { label: 'الطلبات', icon: Wrench, onClick: () => navigate('/admin/requests'), bg: 'from-amber-500 to-amber-600', iconBg: 'bg-white/20' },
    { label: 'إرسال رسالة', icon: MessageSquare, onClick: () => navigate('/admin/sms'), bg: 'from-violet-500 to-violet-600', iconBg: 'bg-white/20' },
  ];

  return (
    <div className="max-w-lg mx-auto pb-4">
      {/* Hero */}
      <div className="relative bg-gradient-to-bl from-primary via-primary to-blue-700 px-5 pt-6 pb-16 animate-fade-in">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-white/60 text-sm mb-0.5">مرحباً</p>
            <h1 className="text-2xl font-bold text-white">{profile?.name}</h1>
            <p className="text-white/40 text-xs mt-2">{BUILDING_NAME}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3.5 border border-white/10">
            <Building2 className="h-7 w-7 text-white" />
          </div>
        </div>
      </div>

      <div className="px-4 -mt-10">
        {/* Stats cards */}
        <div className="grid grid-cols-3 gap-2.5 mb-5 animate-slide-up">
          <Card className="border-0 shadow-lg cursor-pointer hover:shadow-xl active:scale-[0.96] transition-all" onClick={() => navigate('/admin/residents')}>
            <CardContent className="p-3.5 text-center">
              <div className="bg-blue-50 rounded-xl p-2 w-fit mx-auto mb-2">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <p className="text-2xl font-bold">{loading ? '—' : stats.totalResidents}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">السكان</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg cursor-pointer hover:shadow-xl active:scale-[0.96] transition-all" onClick={() => navigate('/admin/payments')}>
            <CardContent className="p-3.5 text-center">
              <div className="bg-green-50 rounded-xl p-2 w-fit mx-auto mb-2">
                <CreditCard className="h-5 w-5 text-green-600" />
              </div>
              <p className="text-2xl font-bold">{loading ? '—' : `${stats.monthlyFee}`}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">الاشتراك {CURRENCY}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg cursor-pointer hover:shadow-xl active:scale-[0.96] transition-all" onClick={() => navigate('/admin/requests')}>
            <CardContent className="p-3.5 text-center">
              <div className="bg-amber-50 rounded-xl p-2 w-fit mx-auto mb-2">
                <Wrench className="h-5 w-5 text-amber-600" />
              </div>
              <p className="text-2xl font-bold">{loading ? '—' : stats.openRequests}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">طلبات</p>
            </CardContent>
          </Card>
        </div>

        {/* Collection card */}
        <Card className="border-0 shadow-md mb-5 overflow-hidden cursor-pointer hover:shadow-lg active:scale-[0.99] transition-all animate-scale-in" onClick={() => navigate('/admin/payments')}>
          <CardContent className="p-0">
            <div className="p-5 pb-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold">تحصيل شهر {currentMonth}</p>
                <ChevronLeft className="h-4 w-4 text-muted-foreground/30" />
              </div>

              {/* Circular-style display */}
              <div className="flex items-center gap-5">
                <div className="relative h-20 w-20 flex-shrink-0">
                  <svg className="h-20 w-20 -rotate-90" viewBox="0 0 36 36">
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke={paidPercent === 100 ? '#22c55e' : paidPercent > 50 ? '#3b82f6' : '#f59e0b'}
                      strokeWidth="3"
                      strokeDasharray={`${paidPercent}, 100`}
                      strokeLinecap="round"
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold">{loading ? '—' : `${paidPercent}%`}</span>
                  </div>
                </div>

                <div className="flex-1 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-sm">دفعوا</span>
                    </div>
                    <span className="text-sm font-bold">{stats.paidThisMonth}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <XCircle className="h-4 w-4 text-red-400" />
                      <span className="text-sm">لم يدفعوا</span>
                    </div>
                    <span className="text-sm font-bold">{stats.unpaidThisMonth}</span>
                  </div>
                  <div className="border-t pt-2 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">المحصّل</span>
                    <span className="text-sm font-bold">{collected} {CURRENCY}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom bar */}
            <div className="h-1.5 bg-muted">
              <div
                className="h-full transition-all duration-1000 ease-out"
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
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <h2 className="text-base font-bold mb-3">إجراءات سريعة</h2>
        <div className="grid grid-cols-4 gap-2.5 mb-5 animate-stagger">
          {quickActions.map((action, i) => (
            <button
              key={i}
              onClick={action.onClick}
              className={`bg-gradient-to-b ${action.bg} rounded-2xl p-3 flex flex-col items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-[0.93] transition-all duration-200 h-[88px]`}
            >
              <div className={`${action.iconBg} rounded-xl p-2`}>
                <action.icon className="h-5 w-5 text-white" />
              </div>
              <span className="text-[11px] font-medium text-white leading-tight">{action.label}</span>
            </button>
          ))}
        </div>

        <Button
          variant="outline"
          className="w-full h-12 rounded-xl border-dashed border-2 hover:bg-primary/5 hover:border-primary/30 transition-all"
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
