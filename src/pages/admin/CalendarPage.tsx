import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronLeft, CheckCircle2, XCircle } from 'lucide-react';
import { ARABIC_MONTHS } from '@/types';
import { CURRENCY } from '@/lib/constants';
import { useNavigate } from 'react-router-dom';

export default function CalendarPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [monthStats, setMonthStats] = useState<Record<number, { paid: number; unpaid: number; total: number }>>({});
  const navigate = useNavigate();
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  useEffect(() => { fetchYear(); }, [year]);

  const fetchYear = async () => {
    const { data } = await supabase
      .from('monthly_payments')
      .select('month, status, amount')
      .eq('year', year);

    const stats: Record<number, { paid: number; unpaid: number; total: number }> = {};
    for (let m = 1; m <= 12; m++) stats[m] = { paid: 0, unpaid: 0, total: 0 };

    data?.forEach((p) => {
      if (p.status === 'paid') {
        stats[p.month].paid++;
        stats[p.month].total += Number(p.amount);
      } else {
        stats[p.month].unpaid++;
      }
    });

    setMonthStats(stats);
  };

  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in">
      <h1 className="text-xl font-bold mb-4">التقويم الشهري</h1>

      <div className="flex items-center justify-between bg-card rounded-2xl p-3 mb-6 shadow-sm">
        <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => setYear(year - 1)}><ChevronRight className="h-5 w-5" /></Button>
        <span className="text-xl font-bold">{year}</span>
        <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => setYear(year + 1)}><ChevronLeft className="h-5 w-5" /></Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
          const s = monthStats[m] || { paid: 0, unpaid: 0, total: 0 };
          const hasData = s.paid + s.unpaid > 0;
          const allPaid = hasData && s.unpaid === 0;
          const isCurrent = m === currentMonth && year === currentYear;

          return (
            <Card
              key={m}
              className={`border-0 shadow-sm cursor-pointer hover:shadow-md active:scale-[0.97] transition-all ${
                isCurrent ? 'ring-2 ring-primary' : ''
              } ${
                !hasData ? '' : allPaid ? 'bg-green-50' : s.unpaid > s.paid ? 'bg-red-50' : 'bg-amber-50'
              }`}
              onClick={() => navigate('/admin/payments', { state: { month: m, year } })}
            >
              <CardContent className="p-3 text-center">
                <p className="font-bold text-sm mb-2">{ARABIC_MONTHS[m]}</p>
                {hasData ? (
                  <div className="space-y-1">
                    <div className="flex items-center justify-center gap-1 text-xs text-success">
                      <CheckCircle2 className="h-3 w-3" /> {s.paid}
                    </div>
                    {s.unpaid > 0 && (
                      <div className="flex items-center justify-center gap-1 text-xs text-destructive">
                        <XCircle className="h-3 w-3" /> {s.unpaid}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">{s.total} {CURRENCY}</p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">لا بيانات</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
