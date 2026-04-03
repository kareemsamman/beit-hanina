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
import { Wrench, Loader2 } from 'lucide-react';
import { REQUEST_TYPE_LABELS, REQUEST_STATUS_LABELS } from '@/types';
import type { MaintenanceRequest, Profile, RequestStatus } from '@/types';
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

  useEffect(() => { fetchRequests(); }, []);

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

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-xl font-bold mb-4">إدارة الطلبات</h1>

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
              <div className="space-y-3">
                {group.map((r) => (
                  <Card key={r.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openDetail(r)}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">{(r as any).profiles?.name}</span>
                        <span className="text-xs text-muted-foreground">شقة {(r as any).profiles?.apartment_number}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">{REQUEST_TYPE_LABELS[r.type]}</p>
                      <p className="text-sm line-clamp-2">{r.description}</p>
                      <p className="text-xs text-muted-foreground mt-2">{dayjs(r.created_at).format('YYYY/MM/DD')}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })
      )}

      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
          {selected && (
            <>
              <SheetHeader><SheetTitle>تفاصيل الطلب</SheetTitle></SheetHeader>
              <div className="space-y-4 py-4">
                <div>
                  <p className="text-sm text-muted-foreground">مقدم الطلب</p>
                  <p className="font-semibold">{(selected as any).profiles?.name} — شقة {(selected as any).profiles?.apartment_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">النوع</p>
                  <p>{REQUEST_TYPE_LABELS[selected.type]}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">الوصف</p>
                  <p>{selected.description}</p>
                </div>
                <div>
                  <Label>الحالة</Label>
                  <Select value={editStatus} onValueChange={setEditStatus}>
                    <SelectTrigger className="h-12 mt-1"><SelectValue /></SelectTrigger>
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
                    <Label>سبب الرفض (مطلوب)</Label>
                    <Textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} className="mt-1" />
                  </div>
                )}
                <div>
                  <Label>ملاحظة المسؤول</Label>
                  <Textarea value={adminNote} onChange={(e) => setAdminNote(e.target.value)} className="mt-1" />
                </div>
                <Button className="w-full h-12" onClick={handleSave} disabled={saving}>
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
