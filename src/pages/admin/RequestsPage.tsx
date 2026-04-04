import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/StatusPill';
import { EmptyState } from '@/components/EmptyState';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Wrench, Loader2, Clock, Plus } from 'lucide-react';
import { REQUEST_TYPE_LABELS, REQUEST_STATUS_LABELS } from '@/types';
import type { MaintenanceRequest, Profile, RequestStatus, RequestType } from '@/types';
import { toast } from 'sonner';
import dayjs from 'dayjs';

export default function RequestsPage() {
  const [requests, setRequests] = useState<(MaintenanceRequest & { profiles: Pick<Profile, 'name' | 'apartment_number'> })[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [editStatus, setEditStatus] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [residents, setResidents] = useState<Profile[]>([]);
  const [newForm, setNewForm] = useState({ user_id: '', type: '' as string, description: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchRequests(); fetchResidents(); }, []);

  const fetchResidents = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('role', 'resident').eq('is_active', true).order('apartment_number');
    setResidents((data as Profile[]) || []);
  };

  const fetchRequests = async () => {
    const { data } = await supabase
      .from('maintenance_requests')
      .select('*, profiles(name, apartment_number)')
      .order('created_at', { ascending: false });
    setRequests(data as any || []);
    setLoading(false);
  };

  const statusGroups: RequestStatus[] = ['new', 'in_progress', 'rejected', 'done'];

  const openDetail = (r: any) => {
    setSelected(r);
    setEditStatus(r.status);
    setRejectionReason(r.rejection_reason || '');
    setAdminNote(r.admin_note || '');
    setDetailOpen(true);
  };

  const handleSave = async () => {
    if (!selected) return;
    if (editStatus === 'rejected' && !rejectionReason.trim()) {
      toast.error('يجب إدخال سبب الرفض');
      return;
    }
    setSaving(true);
    await supabase.from('maintenance_requests').update({
      status: editStatus,
      rejection_reason: editStatus === 'rejected' ? rejectionReason : null,
      admin_note: adminNote || null,
    }).eq('id', selected.id);
    toast.success('تم تحديث الطلب');
    setSaving(false);
    setDetailOpen(false);
    fetchRequests();
  };

  const handleAddRequest = async () => {
    if (!newForm.user_id || !newForm.type || !newForm.description.trim()) {
      toast.error('جميع الحقول مطلوبة');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('maintenance_requests').insert({
      user_id: newForm.user_id,
      type: newForm.type,
      description: newForm.description.trim(),
      status: 'new',
    });
    if (error) {
      toast.error('خطأ في إضافة الطلب');
    } else {
      toast.success('تم إضافة الطلب');
      setAddOpen(false);
      setNewForm({ user_id: '', type: '', description: '' });
      fetchRequests();
    }
    setSubmitting(false);
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">إدارة الطلبات</h1>
        <span className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full">{requests.length} طلب</span>
      </div>

      {requests.length === 0 ? (
        <EmptyState icon={<Wrench className="h-12 w-12" />} message="لا توجد طلبات" />
      ) : (
        statusGroups.map((status) => {
          const group = requests.filter((r) => r.status === status);
          if (group.length === 0) return null;
          return (
            <div key={status} className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <StatusPill status={status} />
                <span className="text-sm text-muted-foreground">({group.length})</span>
              </div>
              <div className="space-y-2">
                {group.map((r) => (
                  <Card key={r.id} className="border-0 shadow-sm cursor-pointer hover:shadow-md active:scale-[0.99] transition-all" onClick={() => openDetail(r)}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="bg-muted rounded-lg h-9 w-9 flex items-center justify-center">
                            <span className="font-bold text-xs">{(r as any).profiles?.apartment_number}</span>
                          </div>
                          <span className="font-semibold">{(r as any).profiles?.name}</span>
                        </div>
                        <span className="text-xs bg-muted px-2 py-1 rounded-lg">{REQUEST_TYPE_LABELS[r.type]}</span>
                      </div>
                      <p className="text-sm line-clamp-2 text-muted-foreground">{r.description}</p>
                      <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {dayjs(r.created_at).format('YYYY/MM/DD')}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })
      )}

      {/* FAB */}
      <Button
        className="fixed bottom-20 left-4 h-14 w-14 rounded-2xl shadow-lg shadow-primary/25 z-40"
        onClick={() => setAddOpen(true)}
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Add Request Sheet */}
      <Sheet open={addOpen} onOpenChange={setAddOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[80vh] overflow-y-auto">
          <SheetHeader><SheetTitle>إضافة طلب جديد</SheetTitle></SheetHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-medium">الساكن</Label>
              <Select value={newForm.user_id} onValueChange={(v) => setNewForm({ ...newForm, user_id: v })}>
                <SelectTrigger className="h-12 mt-1.5 rounded-xl"><SelectValue placeholder="اختر الساكن" /></SelectTrigger>
                <SelectContent>
                  {residents.map((r) => (
                    <SelectItem key={r.id} value={r.id}>شقة {r.apartment_number} — {r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium">نوع الطلب</Label>
              <Select value={newForm.type} onValueChange={(v) => setNewForm({ ...newForm, type: v })}>
                <SelectTrigger className="h-12 mt-1.5 rounded-xl"><SelectValue placeholder="اختر النوع" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(REQUEST_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium">الوصف</Label>
              <Textarea value={newForm.description} onChange={(e) => setNewForm({ ...newForm, description: e.target.value })} className="mt-1.5 rounded-xl" rows={4} placeholder="وصف المشكلة أو الطلب..." />
            </div>
            <Button className="w-full h-12 rounded-xl" onClick={handleAddRequest} disabled={submitting}>
              {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'إضافة الطلب'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
          {selected && (
            <>
              <SheetHeader><SheetTitle>تفاصيل الطلب</SheetTitle></SheetHeader>
              <div className="space-y-4 py-4">
                <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground">مقدم الطلب</p>
                    <p className="font-semibold">{(selected as any).profiles?.name} — شقة {(selected as any).profiles?.apartment_number}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">النوع</p>
                    <p className="text-sm">{REQUEST_TYPE_LABELS[selected.type]}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">الوصف</p>
                    <p className="text-sm">{selected.description}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">الحالة</Label>
                  <Select value={editStatus} onValueChange={setEditStatus}>
                    <SelectTrigger className="h-12 mt-1.5 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">جديد</SelectItem>
                      <SelectItem value="in_progress">قيد العمل</SelectItem>
                      <SelectItem value="rejected">مرفوض</SelectItem>
                      <SelectItem value="done">تم</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {editStatus === 'rejected' && (
                  <div>
                    <Label className="text-sm font-medium">سبب الرفض (مطلوب)</Label>
                    <Textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} className="mt-1.5 rounded-xl" />
                  </div>
                )}
                <div>
                  <Label className="text-sm font-medium">ملاحظة المسؤول</Label>
                  <Textarea value={adminNote} onChange={(e) => setAdminNote(e.target.value)} className="mt-1.5 rounded-xl" />
                </div>
                <Button className="w-full h-12 rounded-xl" onClick={handleSave} disabled={saving}>
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
