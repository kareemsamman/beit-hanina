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
import { ChevronRight, ChevronLeft, CreditCard, Loader2, Send } from 'lucide-react';
import { ARABIC_MONTHS, CURRENCY, PAYMENT_STATUS_LABELS } from '@/types';
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
    { key: 'all', label: 'الكل' },
    { key: 'paid', label: 'دفع' },
    { key: 'unpaid', label: 'لم يدفع' },
    { key: 'partial', label: 'جزئي' },
  ];

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-xl font-bold mb-4">الدفعات الشهرية</h1>

      {/* Month selector */}
      <div className="flex items-center justify-between bg-card rounded-xl p-3 mb-4 border">
        <Button variant="ghost" size="icon" onClick={nextMonth}><ChevronRight className="h-5 w-5" /></Button>
        <span className="font-semibold text-lg">{ARABIC_MONTHS[month]} {year}</span>
        <Button variant="ghost" size="icon" onClick={prevMonth}><ChevronLeft className="h-5 w-5" /></Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-2 mb-4 text-center">
        <div className="bg-card rounded-lg p-2 border">
          <p className="text-lg font-bold">{payments.length}</p>
          <p className="text-xs text-muted-foreground">الكل</p>
        </div>
        <div className="bg-card rounded-lg p-2 border">
          <p className="text-lg font-bold text-success">{paidCount}</p>
          <p className="text-xs text-muted-foreground">دفع</p>
        </div>
        <div className="bg-card rounded-lg p-2 border">
          <p className="text-lg font-bold text-destructive">{unpaidCount}</p>
          <p className="text-xs text-muted-foreground">لم يدفع</p>
        </div>
        <div className="bg-card rounded-lg p-2 border">
          <p className="text-lg font-bold text-warning">{partialCount}</p>
          <p className="text-xs text-muted-foreground">جزئي</p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-4">إجمالي المحصّل: {totalCollected} {CURRENCY}</p>

      {/* Filters */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {filters.map((f) => (
          <Button
            key={f.key}
            variant={filter === f.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f.key)}
            className="rounded-full"
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* Reminder button */}
      <Button variant="outline" className="w-full mb-4" onClick={handleReminder}>
        <Send className="h-4 w-4 ml-2" />
        إرسال تذكير لغير الدافعين
      </Button>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<CreditCard className="h-12 w-12" />} message="لا توجد دفعات" />
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => (
            <Card key={p.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openEdit(p)}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold">{(p as any).profiles?.name}</p>
                  <p className="text-sm text-muted-foreground">شقة {(p as any).profiles?.apartment_number} • {p.amount} {CURRENCY}</p>
                </div>
                <StatusPill status={p.status} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Sheet */}
      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh] overflow-y-auto">
          <SheetHeader><SheetTitle>تعديل الدفعة</SheetTitle></SheetHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>الحالة</Label>
              <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                <SelectTrigger className="h-12 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">مدفوع</SelectItem>
                  <SelectItem value="unpaid">غير مدفوع</SelectItem>
                  <SelectItem value="partial">دفع جزئي</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>المبلغ</Label>
              <Input type="number" value={editForm.amount} onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })} className="h-12 mt-1" dir="ltr" />
            </div>
            <div>
              <Label>ملاحظات</Label>
              <Textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} className="mt-1" />
            </div>
            <Button className="w-full h-12" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : 'حفظ'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
