import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/EmptyState';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Users, Search, Plus, Loader2, Phone, Home as HomeIcon, Pencil, UserCheck, UserX, MessageSquare } from 'lucide-react';
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
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

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

  const searched = residents.filter((r) =>
    r.name.includes(search) ||
    r.phone.includes(search) ||
    String(r.apartment_number).includes(search)
  );

  const filtered = statusFilter === 'all'
    ? searched
    : statusFilter === 'active'
    ? searched.filter((r) => r.is_active)
    : searched.filter((r) => !r.is_active);

  const activeCount = residents.filter((r) => r.is_active).length;
  const inactiveCount = residents.filter((r) => !r.is_active).length;

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

  const statusFilters = [
    { key: 'all' as const, label: 'الكل', count: residents.length },
    { key: 'active' as const, label: 'نشط', count: activeCount },
    { key: 'inactive' as const, label: 'معطّل', count: inactiveCount },
  ];

  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">إدارة السكان</h1>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-green-50 text-green-700 px-2.5 py-1 rounded-full font-medium">{activeCount} نشط</span>
          {inactiveCount > 0 && (
            <span className="text-xs bg-red-50 text-red-700 px-2.5 py-1 rounded-full font-medium">{inactiveCount} معطّل</span>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-3 animate-scale-in">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="بحث بالاسم أو الهاتف أو الشقة"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pr-10 h-12 rounded-2xl shadow-sm border-0 bg-card focus-visible:ring-primary/30"
        />
      </div>

      {/* Status filter */}
      <div className="flex gap-2 mb-4">
        {statusFilters.map((f) => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
              statusFilter === f.key
                ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25 scale-105'
                : 'bg-card text-muted-foreground shadow-sm hover:shadow-md active:scale-95'
            }`}
          >
            {f.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              statusFilter === f.key ? 'bg-white/20' : 'bg-muted'
            }`}>{f.count}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Users className="h-12 w-12" />} message={search ? 'لا توجد نتائج' : 'لا يوجد سكان'} />
      ) : (
        <div className="space-y-2 animate-stagger">
          {filtered.map((r) => (
            <Card
              key={r.id}
              className={`border-0 border-r-[3px] shadow-sm cursor-pointer hover:shadow-md active:scale-[0.98] transition-all duration-200 ${
                r.is_active ? 'border-r-green-500' : 'border-r-destructive opacity-75'
              }`}
              onClick={() => { setSelected(r); setEditing(false); setDetailOpen(true); }}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`rounded-xl h-12 w-12 flex items-center justify-center ${
                    r.is_active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                  }`}>
                    <span className="font-bold text-lg">{r.apartment_number}</span>
                  </div>
                  <div>
                    <p className="font-semibold">{r.name}</p>
                    <p className="text-sm text-muted-foreground" dir="ltr">{formatPhoneDisplay(r.phone)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {r.notes && <MessageSquare className="h-3.5 w-3.5 text-muted-foreground/50" />}
                  <div className={`h-2.5 w-2.5 rounded-full ${r.is_active ? 'bg-success animate-pulse' : 'bg-destructive'}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* FAB */}
      <Button
        className="fixed bottom-20 left-4 h-14 w-14 rounded-2xl shadow-lg shadow-primary/25 z-40 active:scale-90 transition-transform"
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
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-12 mt-1.5 rounded-xl" placeholder="مثال: أحمد محمد" />
            </div>
            <div>
              <Label className="text-sm font-medium">رقم الهاتف</Label>
              <Input type="tel" dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="h-12 mt-1.5 rounded-xl" inputMode="numeric" placeholder="05X XXX XXXX" />
            </div>
            <div>
              <Label className="text-sm font-medium">رقم الشقة</Label>
              <Input type="number" value={form.apartment_number} onChange={(e) => setForm({ ...form, apartment_number: e.target.value })} className="h-12 mt-1.5 rounded-xl" inputMode="numeric" placeholder="1" />
            </div>
            <div>
              <Label className="text-sm font-medium">ملاحظات (اختياري)</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1.5 rounded-xl" placeholder="أي ملاحظات إضافية..." />
            </div>
            <Button className="w-full h-12 rounded-xl shadow-md shadow-primary/20" onClick={handleAdd} disabled={submitting}>
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
              {/* Profile header */}
              <div className="flex items-center gap-4">
                <div className={`rounded-2xl h-18 w-18 flex items-center justify-center p-4 ${
                  selected.is_active ? 'bg-gradient-to-br from-primary/20 to-primary/5' : 'bg-muted'
                }`}>
                  <span className={`text-3xl font-bold ${selected.is_active ? 'text-primary' : 'text-muted-foreground'}`}>{selected.apartment_number}</span>
                </div>
                <div className="flex-1">
                  <SheetTitle className="text-right text-lg">{selected.name}</SheetTitle>
                  <div className="flex items-center gap-1.5 mt-1">
                    {selected.is_active ? (
                      <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <UserCheck className="h-3 w-3" /> نشط
                      </span>
                    ) : (
                      <span className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <UserX className="h-3 w-3" /> معطّل
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Info cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-card rounded-xl p-3 shadow-sm border border-border/30">
                  <Phone className="h-4 w-4 text-primary mb-1.5" />
                  <p className="text-xs text-muted-foreground">الهاتف</p>
                  <p className="text-sm font-medium mt-0.5" dir="ltr">{formatPhoneDisplay(selected.phone)}</p>
                </div>
                <div className="bg-card rounded-xl p-3 shadow-sm border border-border/30">
                  <HomeIcon className="h-4 w-4 text-primary mb-1.5" />
                  <p className="text-xs text-muted-foreground">الشقة</p>
                  <p className="text-sm font-medium mt-0.5">رقم {selected.apartment_number}</p>
                </div>
              </div>

              {selected.notes && (
                <div className="bg-amber-50/50 rounded-xl p-3 border border-amber-200/30">
                  <p className="text-xs text-muted-foreground mb-1">ملاحظات</p>
                  <p className="text-sm">{selected.notes}</p>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-2.5">
                <Button
                  variant="outline"
                  className="w-full h-12 rounded-xl gap-2 hover:bg-primary/5 hover:border-primary/30"
                  onClick={startEdit}
                >
                  <Pencil className="h-4 w-4" />
                  تعديل البيانات
                </Button>
                <Button
                  variant={selected.is_active ? 'destructive' : 'default'}
                  className="w-full h-12 rounded-xl gap-2"
                  onClick={() => toggleActive(selected)}
                >
                  {selected.is_active ? (
                    <><UserX className="h-4 w-4" /> تعطيل الحساب</>
                  ) : (
                    <><UserCheck className="h-4 w-4" /> تفعيل الحساب</>
                  )}
                </Button>
              </div>
            </div>
          )}
          {selected && editing && (
            <div className="py-4 space-y-4">
              <SheetHeader>
                <SheetTitle>تعديل بيانات {selected.name}</SheetTitle>
              </SheetHeader>
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
                <Button className="flex-1 h-12 rounded-xl shadow-md shadow-primary/20" onClick={handleEditSave} disabled={editSaving}>
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
