import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusPill } from '@/components/StatusPill';
import { EmptyState } from '@/components/EmptyState';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Users, Search, Plus, Loader2, Phone, Home as HomeIcon, Pencil } from 'lucide-react';
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
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone: '', apartment_number: '', notes: '' });
  const [editSaving, setEditSaving] = useState(false);

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

  const startEdit = () => {
    if (!selected) return;
    setEditForm({
      name: selected.name,
      phone: selected.phone,
      apartment_number: String(selected.apartment_number),
      notes: selected.notes || '',
    });
    setEditing(true);
  };

  const handleEditSave = async () => {
    if (!selected || !editForm.name || !editForm.phone || !editForm.apartment_number) {
      toast.error('جميع الحقول مطلوبة');
      return;
    }
    setEditSaving(true);
    await supabase.from('profiles').update({
      name: editForm.name,
      phone: editForm.phone,
      apartment_number: parseInt(editForm.apartment_number),
      notes: editForm.notes || null,
    }).eq('id', selected.id);
    toast.success('تم تحديث بيانات الساكن');
    setEditSaving(false);
    setEditing(false);
    setDetailOpen(false);
    fetchResidents();
  };

  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">إدارة السكان</h1>
        <span className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full">{residents.length} ساكن</span>
      </div>

      <div className="relative mb-4">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="بحث بالاسم أو الهاتف أو الشقة"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pr-10 h-12 rounded-xl border-2 focus:border-primary transition-colors"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Users className="h-12 w-12" />} message="لا يوجد سكان" />
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => (
            <Card key={r.id} className="border-0 shadow-sm cursor-pointer hover:shadow-md active:scale-[0.99] transition-all" onClick={() => { setSelected(r); setDetailOpen(true); }}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 rounded-xl h-11 w-11 flex items-center justify-center">
                    <span className="text-primary font-bold">{r.apartment_number}</span>
                  </div>
                  <div>
                    <p className="font-semibold">{r.name}</p>
                    <p className="text-sm text-muted-foreground" dir="ltr">{formatPhoneDisplay(r.phone)}</p>
                  </div>
                </div>
                <div className={`h-2.5 w-2.5 rounded-full ${r.is_active ? 'bg-success' : 'bg-destructive'}`} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* FAB */}
      <Button
        className="fixed bottom-20 left-4 h-14 w-14 rounded-2xl shadow-lg shadow-primary/25 z-40"
        onClick={() => setAddOpen(true)}
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Add Sheet */}
      <Sheet open={addOpen} onOpenChange={setAddOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[80vh] overflow-y-auto">
          <SheetHeader><SheetTitle>إضافة ساكن جديد</SheetTitle></SheetHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-medium">الاسم الكامل</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-12 mt-1.5 rounded-xl" />
            </div>
            <div>
              <Label className="text-sm font-medium">رقم الهاتف</Label>
              <Input type="tel" dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="h-12 mt-1.5 rounded-xl" inputMode="numeric" placeholder="05X XXX XXXX" />
            </div>
            <div>
              <Label className="text-sm font-medium">رقم الشقة</Label>
              <Input type="number" value={form.apartment_number} onChange={(e) => setForm({ ...form, apartment_number: e.target.value })} className="h-12 mt-1.5 rounded-xl" inputMode="numeric" />
            </div>
            <div>
              <Label className="text-sm font-medium">ملاحظات (اختياري)</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1.5 rounded-xl" />
            </div>
            <Button className="w-full h-12 rounded-xl" onClick={handleAdd} disabled={submitting}>
              {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'إضافة'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Detail Sheet */}
      <Sheet open={detailOpen} onOpenChange={(open) => { setDetailOpen(open); if (!open) setEditing(false); }}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
          {selected && !editing && (
            <div className="py-4 space-y-5">
              <div className="flex items-center gap-4">
                <div className="bg-primary/10 rounded-2xl h-16 w-16 flex items-center justify-center">
                  <span className="text-primary text-2xl font-bold">{selected.apartment_number}</span>
                </div>
                <div>
                  <SheetTitle className="text-right">{selected.name}</SheetTitle>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className={`h-2 w-2 rounded-full ${selected.is_active ? 'bg-success' : 'bg-destructive'}`} />
                    <span className="text-sm text-muted-foreground">{selected.is_active ? 'نشط' : 'معطّل'}</span>
                  </div>
                </div>
              </div>
              <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /><span dir="ltr" className="text-sm">{formatPhoneDisplay(selected.phone)}</span></div>
                <div className="flex items-center gap-2"><HomeIcon className="h-4 w-4 text-muted-foreground" /><span className="text-sm">شقة {selected.apartment_number}</span></div>
                {selected.notes && <p className="text-sm text-muted-foreground pt-1 border-t">{selected.notes}</p>}
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 h-12 rounded-xl gap-2"
                  onClick={startEdit}
                >
                  <Pencil className="h-4 w-4" />
                  تعديل البيانات
                </Button>
                <Button
                  variant={selected.is_active ? 'destructive' : 'default'}
                  className="flex-1 h-12 rounded-xl"
                  onClick={() => toggleActive(selected)}
                >
                  {selected.is_active ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                </Button>
              </div>
            </div>
          )}
          {selected && editing && (
            <div className="py-4 space-y-4">
              <SheetHeader><SheetTitle>تعديل بيانات {selected.name}</SheetTitle></SheetHeader>
              <div>
                <Label className="text-sm font-medium">الاسم الكامل</Label>
                <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="h-12 mt-1.5 rounded-xl" />
              </div>
              <div>
                <Label className="text-sm font-medium">رقم الهاتف</Label>
                <Input type="tel" dir="ltr" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="h-12 mt-1.5 rounded-xl" inputMode="numeric" />
              </div>
              <div>
                <Label className="text-sm font-medium">رقم الشقة</Label>
                <Input type="number" value={editForm.apartment_number} onChange={(e) => setEditForm({ ...editForm, apartment_number: e.target.value })} className="h-12 mt-1.5 rounded-xl" inputMode="numeric" />
              </div>
              <div>
                <Label className="text-sm font-medium">ملاحظات (اختياري)</Label>
                <Textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} className="mt-1.5 rounded-xl" />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={() => setEditing(false)}>
                  إلغاء
                </Button>
                <Button className="flex-1 h-12 rounded-xl" onClick={handleEditSave} disabled={editSaving}>
                  {editSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : 'حفظ'}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
