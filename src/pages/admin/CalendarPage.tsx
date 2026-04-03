import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { ARABIC_MONTHS } from '@/types';
import { useNavigate } from 'react-router-dom';

export default function CalendarPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [monthStats, setMonthStats] = useState<Record<number, { paid: number; unpaid: number; total: number }>>({});
  const navigate = useNavigate();

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
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-xl font-bold mb-4">التقويم الشهري</h1>

      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" size="icon" onClick={() => setYear(year + 1)}><ChevronRight className="h-5 w-5" /></Button>
        <span className="text-xl font-bold">{year}</span>
        <Button variant="ghost" size="icon" onClick={() => setYear(year - 1)}><ChevronLeft className="h-5 w-5" /></Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
          const s = monthStats[m] || { paid: 0, unpaid: 0, total: 0 };
          const hasData = s.paid + s.unpaid > 0;
          const allPaid = hasData && s.unpaid === 0;
          const bgClass = !hasData ? 'bg-muted' : allPaid ? 'bg-success/10 border-success' : s.unpaid > s.paid ? 'bg-destructive/10 border-destructive' : 'bg-warning/10 border-warning';

          return (
            <Card
              key={m}
              className={`cursor-pointer hover:shadow-md transition-shadow border ${bgClass}`}
              onClick={() => navigate('/admin/payments', { state: { month: m, year } })}
            >
              <CardContent className="p-3 text-center">
                <p className="font-semibold text-sm">{AM[m]}</p>
                {hasData && (
                  <>
                    <p className="text-xs text-success mt-1">✓ {s.paid}</p>
                    <p className="text-xs text-destructive">✗ {s.unpaid}</p>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
