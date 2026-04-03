import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusPill } from '@/components/StatusPill';
import { EmptyState } from '@/components/EmptyState';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Users, Search, Plus, Loader2, Phone, Home as HomeIcon } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { formatPhoneDisplay } from '@/lib/phone';
import type { Profile } from '@/types';

export default function ResidentsPage() {
  const [residents, setResidents] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<Profile | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', apartment_number: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchResidents(); }, []);

  const fetchResidents = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'resident')
      .order('apartment_number');
    setResidents((data as Profile[]) || []);
    setLoading(false);
  };

  const filtered = residents.filter((r) =>
    r.name.includes(search) ||
    r.phone.includes(search) ||
    String(r.apartment_number).includes(search)
  );

  const handleAdd = async () => {
    if (!form.name || !form.phone || !form.apartment_number) {
      toast.error('جميع الحقول مطلوبة');
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-resident', {
        body: {
          name: form.name,
          phone: form.phone,
          apartment_number: parseInt(form.apartment_number),
          notes: form.notes || null,
        },
      });
      if (error || data?.error) {
        toast.error(data?.error || 'خطأ في الإضافة');
      } else {
        toast.success('تم إضافة الساكن بنجاح');
        setAddOpen(false);
        setForm({ name: '', phone: '', apartment_number: '', notes: '' });
        fetchResidents();
      }
    } catch {
      toast.error('حدث خطأ');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (resident: Profile) => {
    await supabase
      .from('profiles')
      .update({ is_active: !resident.is_active })
      .eq('id', resident.id);
    toast.success(resident.is_active ? 'تم تعطيل الحساب' : 'تم تفعيل الحساب');
    fetchResidents();
    setDetailOpen(false);
  };

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-xl font-bold mb-4">إدارة السكان</h1>

      <div className="relative mb-4">
        <Search className="absolute right-3 top-3 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="بحث بالاسم أو الهاتف أو الشقة"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pr-10 h-12 rounded-xl"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Users className="h-12 w-12" />} message="لا يوجد سكان" />
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <Card key={r.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setSelected(r); setDetailOpen(true); }}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 rounded-full p-2">
                    <HomeIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">{r.name}</p>
                    <p className="text-sm text-muted-foreground">شقة {r.apartment_number} • {formatPhoneDisplay(r.phone)}</p>
                  </div>
                </div>
                <StatusPill status={r.is_active ? 'paid' : 'unpaid'} className={r.is_active ? '' : ''} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* FAB */}
      <Button
        className="fixed bottom-20 left-4 h-14 w-14 rounded-full shadow-lg z-40"
        onClick={() => setAddOpen(true)}
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Add Sheet */}
      <Sheet open={addOpen} onOpenChange={setAddOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh] overflow-y-auto">
          <SheetHeader><SheetTitle>إضافة ساكن جديد</SheetTitle></SheetHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>الاسم الكامل</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-12 mt-1" />
            </div>
            <div>
              <Label>رقم الهاتف</Label>
              <Input type="tel" dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="h-12 mt-1" inputMode="numeric" />
            </div>
            <div>
              <Label>رقم الشقة</Label>
              <Input type="number" value={form.apartment_number} onChange={(e) => setForm({ ...form, apartment_number: e.target.value })} className="h-12 mt-1" inputMode="numeric" />
            </div>
            <div>
              <Label>ملاحظات (اختياري)</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1" />
            </div>
            <Button className="w-full h-12" onClick={handleAdd} disabled={submitting}>
              {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'إضافة'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Detail Sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          {selected && (
            <div className="py-4 space-y-4">
              <SheetHeader><SheetTitle>{selected.name}</SheetTitle></SheetHeader>
              <div className="space-y-2">
                <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /><span dir="ltr">{formatPhoneDisplay(selected.phone)}</span></div>
                <div className="flex items-center gap-2"><HomeIcon className="h-4 w-4 text-muted-foreground" /><span>شقة {selected.apartment_number}</span></div>
                {selected.notes && <p className="text-sm text-muted-foreground">{selected.notes}</p>}
              </div>
              <Button
                variant={selected.is_active ? 'destructive' : 'default'}
                className="w-full h-12"
                onClick={() => toggleActive(selected)}
              >
                {selected.is_active ? 'تعطيل الحساب' : 'تفعيل الحساب'}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
