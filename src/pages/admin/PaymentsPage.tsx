import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/StatusPill';
import { EmptyState } from '@/components/EmptyState';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronRight, ChevronLeft, CreditCard, Loader2, Send, TrendingUp, CheckCircle2, XCircle, CircleDot } from 'lucide-react';
import { ARABIC_MONTHS, PAYMENT_STATUS_LABELS } from '@/types';
import { CURRENCY } from '@/lib/constants';
import type { MonthlyPayment, PaymentStatus, Profile } from '@/types';
import { toast } from 'sonner';

export default function PaymentsPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [payments, setPayments] = useState<(MonthlyPayment & { profiles: Pick<Profile, 'name' | 'apartment_number'> })[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [editForm, setEditForm] = useState({ status: '', amount: '', notes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchPayments(); }, [month, year]);

  const fetchPayments = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('monthly_payments')
      .select('*, profiles(name, apartment_number)')
      .eq('month', month)
      .eq('year', year)
      .order('created_at');
    setPayments(data as any || []);
    setLoading(false);
  };

  const filtered = filter === 'all' ? payments : payments.filter((p) => p.status === filter);
  const paidCount = payments.filter((p) => p.status === 'paid').length;
  const unpaidCount = payments.filter((p) => p.status === 'unpaid').length;
  const partialCount = payments.filter((p) => p.status === 'partial').length;
  const totalCollected = payments.filter((p) => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0);
  const paidPercent = payments.length > 0 ? Math.round((paidCount / payments.length) * 100) : 0;

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(year - 1); }
    else setMonth(month - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(year + 1); }
    else setMonth(month + 1);
  };

  const openEdit = (p: any) => {
    setSelected(p);
    setEditForm({ status: p.status, amount: String(p.amount), notes: p.notes || '' });
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    const update: any = {
      status: editForm.status,
      amount: parseFloat(editForm.amount),
      notes: editForm.notes || null,
    };
    if (editForm.status === 'paid' && selected.status !== 'paid') {
      update.paid_at = new Date().toISOString();
    }
    await supabase.from('monthly_payments').update(update).eq('id', selected.id);
    toast.success('تم تحديث الدفعة');
    setSaving(false);
    setEditOpen(false);
    fetchPayments();
  };

  const handleReminder = async () => {
    const unpaid = payments.filter((p) => p.status === 'unpaid' || p.status === 'partial');
    if (unpaid.length === 0) { toast.info('لا يوجد غير دافعين'); return; }

    const phones = [];
    const userIds = [];
    for (const p of unpaid) {
      const { data: profile } = await supabase.from('profiles').select('phone, id').eq('id', p.user_id).single();
      if (profile) { phones.push(profile.phone); userIds.push(profile.id); }
    }

    await supabase.functions.invoke('send-sms', {
      body: {
        phones,
        user_ids: userIds,
        message: `تذكير: لم يتم دفع اشتراك شهر ${ARABIC_MONTHS[month]} ${year}. يرجى الدفع في أقرب وقت.`,
        type: 'reminder',
      },
    });
    toast.success(`تم إرسال تذكير لـ ${phones.length} ساكن`);
  };

  const filters = [
    { key: 'all', label: 'الكل', count: payments.length, icon: null },
    { key: 'paid', label: 'دفع', count: paidCount, icon: CheckCircle2 },
    { key: 'unpaid', label: 'لم يدفع', count: unpaidCount, icon: XCircle },
    { key: 'partial', label: 'جزئي', count: partialCount, icon: CircleDot },
  ];

  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in">
      <h1 className="text-xl font-bold mb-4">الدفعات الشهرية</h1>

      {/* Month selector */}
      <div className="flex items-center justify-between bg-card rounded-2xl p-3 mb-5 shadow-sm animate-scale-in">
        <Button variant="ghost" size="icon" className="rounded-xl hover:bg-primary/10" onClick={prevMonth}><ChevronRight className="h-5 w-5" /></Button>
        <span className="font-bold text-lg">{ARABIC_MONTHS[month]} {year}</span>
        <Button variant="ghost" size="icon" className="rounded-xl hover:bg-primary/10" onClick={nextMonth}><ChevronLeft className="h-5 w-5" /></Button>
      </div>

      {/* Progress card */}
      <Card className="border-0 shadow-sm mb-5 overflow-hidden animate-slide-up">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground">نسبة التحصيل</p>
              <p className="text-3xl font-bold animate-count-up">{paidPercent}%</p>
            </div>
            <div className="text-left">
              <p className="text-sm text-muted-foreground">المحصّل</p>
              <p className="text-xl font-bold">{totalCollected} <span className="text-sm text-muted-foreground">{CURRENCY}</span></p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-l from-green-400 to-green-500 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${paidPercent}%` }}
            />
          </div>
          <div className="flex justify-between mt-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
              <span className="text-muted-foreground">دفعوا ({paidCount})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-destructive" />
              <span className="text-muted-foreground">لم يدفعوا ({unpaidCount})</span>
            </div>
            {partialCount > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-warning" />
                <span className="text-muted-foreground">جزئي ({partialCount})</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-none">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2.5 rounded-2xl text-sm font-medium transition-all duration-200 whitespace-nowrap flex items-center gap-1.5 ${
              filter === f.key
                ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25 scale-105'
                : 'bg-card text-muted-foreground shadow-sm hover:shadow-md active:scale-95'
            }`}
          >
            {f.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              filter === f.key ? 'bg-white/20' : 'bg-muted'
            }`}>{f.count}</span>
          </button>
        ))}
      </div>

      {/* Reminder button */}
      {unpaidCount > 0 && (
        <Button variant="outline" className="w-full mb-4 rounded-xl border-dashed border-2 h-11 animate-slide-up" onClick={handleReminder}>
          <Send className="h-4 w-4 ml-2" />
          إرسال تذكير لغير الدافعين ({unpaidCount})
        </Button>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<CreditCard className="h-12 w-12" />} message="لا توجد دفعات" />
      ) : (
        <div className="space-y-2 animate-stagger">
          {filtered.map((p) => {
            const statusBorder = p.status === 'paid' ? 'border-r-green-500' : p.status === 'unpaid' ? 'border-r-destructive' : 'border-r-warning';
            return (
              <Card key={p.id} className={`border-0 border-r-[3px] ${statusBorder} shadow-sm cursor-pointer hover:shadow-md active:scale-[0.98] transition-all duration-200`} onClick={() => openEdit(p)}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-xl h-11 w-11 flex items-center justify-center ${
                      p.status === 'paid' ? 'bg-green-50 text-green-700' : p.status === 'unpaid' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      <span className="font-bold text-sm">{(p as any).profiles?.apartment_number}</span>
                    </div>
                    <div>
                      <p className="font-semibold">{(p as any).profiles?.name}</p>
                      <p className="text-sm text-muted-foreground">{p.amount} {CURRENCY}</p>
                    </div>
                  </div>
                  <StatusPill status={p.status} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Sheet */}
      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[80vh] overflow-y-auto">
          {selected && (
            <>
              <SheetHeader><SheetTitle>تعديل الدفعة</SheetTitle></SheetHeader>
              <div className="space-y-4 py-4">
                <div className="bg-muted/50 rounded-xl p-4 flex items-center gap-3">
                  <div className="bg-primary/10 rounded-xl h-12 w-12 flex items-center justify-center">
                    <span className="text-primary font-bold">{(selected as any).profiles?.apartment_number}</span>
                  </div>
                  <div>
                    <p className="font-semibold">{(selected as any).profiles?.name}</p>
                    <p className="text-sm text-muted-foreground">شقة {(selected as any).profiles?.apartment_number}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">الحالة</Label>
                  <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                    <SelectTrigger className="h-12 mt-1.5 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid">مدفوع</SelectItem>
                      <SelectItem value="unpaid">غير مدفوع</SelectItem>
                      <SelectItem value="partial">دفع جزئي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium">المبلغ</Label>
                  <Input type="number" value={editForm.amount} onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })} className="h-12 mt-1.5 rounded-xl" dir="ltr" />
                </div>
                <div>
                  <Label className="text-sm font-medium">ملاحظات</Label>
                  <Textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} className="mt-1.5 rounded-xl" />
                </div>
                <Button className="w-full h-12 rounded-xl shadow-md shadow-primary/20" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : 'حفظ'}
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
