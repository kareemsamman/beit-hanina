import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/StatusPill';
import { CreditCard, Wrench, User, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BUILDING_SHORT, CURRENCY } from '@/lib/constants';
import { ARABIC_MONTHS } from '@/types';
import type { MonthlyPayment } from '@/types';

export default function ResidentHome() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [currentPayment, setCurrentPayment] = useState<MonthlyPayment | null>(null);

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  useEffect(() => {
    if (!profile) return;
    supabase
      .from('monthly_payments')
      .select('*')
      .eq('user_id', profile.id)
      .eq('month', month)
      .eq('year', year)
      .single()
      .then(({ data }) => setCurrentPayment(data as MonthlyPayment | null));
  }, [profile, month, year]);

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold">مرحباً، {profile?.name}</h1>
        <p className="text-muted-foreground text-sm">{BUILDING_SHORT} • شقة {profile?.apartment_number}</p>
      </div>

      {/* Current month card */}
      <Card className="mb-6">
        <CardContent className="p-5 text-center">
          <p className="text-muted-foreground text-sm mb-2">{ARABIC_MONTHS[month]} {year}</p>
          {currentPayment ? (
            <>
              <StatusPill status={currentPayment.status} className="text-base px-4 py-1.5 mb-3" />
              <p className="text-2xl font-bold mt-2">{currentPayment.amount} {CURRENCY}</p>
              {currentPayment.paid_at && (
                <p className="text-xs text-muted-foreground mt-1">
                  تاريخ الدفع: {new Date(currentPayment.paid_at).toLocaleDateString('ar')}
                </p>
              )}
            </>
          ) : (
            <p className="text-muted-foreground">لا توجد دفعة مسجلة لهذا الشهر</p>
          )}
        </CardContent>
      </Card>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-3">
        <Button variant="outline" className="h-20 flex flex-col gap-2" onClick={() => navigate('/resident/payments')}>
          <CreditCard className="h-6 w-6" />
          <span className="text-sm">الدفعات</span>
        </Button>
        <Button variant="outline" className="h-20 flex flex-col gap-2" onClick={() => navigate('/resident/requests')}>
          <Wrench className="h-6 w-6" />
          <span className="text-sm">الطلبات</span>
        </Button>
        <Button variant="outline" className="h-20 flex flex-col gap-2" onClick={() => navigate('/resident/profile')}>
          <User className="h-6 w-6" />
          <span className="text-sm">حسابي</span>
        </Button>
      </div>
    </div>
  );
}
