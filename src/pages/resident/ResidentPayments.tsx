import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { StatusPill } from '@/components/StatusPill';
import { EmptyState } from '@/components/EmptyState';
import { CreditCard, Loader2 } from 'lucide-react';
import { ARABIC_MONTHS } from '@/types';
import { CURRENCY } from '@/lib/constants';
import type { MonthlyPayment } from '@/types';

export default function ResidentPayments() {
  const { profile } = useAuth();
  const [payments, setPayments] = useState<MonthlyPayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    supabase
      .from('monthly_payments')
      .select('*')
      .eq('user_id', profile.id)
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .then(({ data }) => {
        setPayments((data as MonthlyPayment[]) || []);
        setLoading(false);
      });
  }, [profile]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-xl font-bold mb-4">سجل الدفعات</h1>
      {payments.length === 0 ? (
        <EmptyState icon={<CreditCard className="h-12 w-12" />} message="لا توجد دفعات مسجلة بعد" />
      ) : (
        <div className="space-y-3">
          {payments.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold">{ARABIC_MONTHS[p.month]} {p.year}</p>
                  <p className="text-sm text-muted-foreground">{p.amount} {CURRENCY}</p>
                  {p.notes && <p className="text-xs text-muted-foreground mt-1">{p.notes}</p>}
                </div>
                <StatusPill status={p.status} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
