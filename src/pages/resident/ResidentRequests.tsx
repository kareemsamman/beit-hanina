import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/StatusPill';
import { EmptyState } from '@/components/EmptyState';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Wrench, Plus, Loader2, AlertTriangle } from 'lucide-react';
import { REQUEST_TYPE_LABELS, REQUEST_STATUS_LABELS } from '@/types';
import type { MaintenanceRequest, RequestType } from '@/types';
import { toast } from 'sonner';
import dayjs from 'dayjs';

export default function ResidentRequests() {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ type: '' as RequestType | '', description: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!profile) return;
    fetchRequests();
  }, [profile]);

  const fetchRequests = async () => {
    const { data } = await supabase
      .from('maintenance_requests')
      .select('*')
      .eq('user_id', profile!.id)
      .order('created_at', { ascending: false });
    setRequests((data as MaintenanceRequest[]) || []);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!form.type || !form.description.trim()) {
      toast.error('جميع الحقول مطلوبة');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('maintenance_requests').insert({
      user_id: profile!.id,
      type: form.type,
      description: form.description.trim(),
    });
    if (error) {
      toast.error('خطأ في الإرسال');
    } else {
      toast.success('تم إرسال طلبك بنجاح');
      setAddOpen(false);
      setForm({ type: '', description: '' });
      fetchRequests();
    }
    setSubmitting(false);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-xl font-bold mb-4">طلباتي</h1>

      {requests.length === 0 ? (
        <EmptyState
          icon={<Wrench className="h-12 w-12" />}
          message="لا توجد طلبات بعد"
          action={<Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 ml-1" />طلب جديد</Button>}
        />
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{REQUEST_TYPE_LABELS[r.type]}</span>
                  <StatusPill status={r.status} />
                </div>
                <p className="text-sm">{r.description}</p>
                {r.status === 'rejected' && r.rejection_reason && (
                  <div className="mt-2 p-2 bg-destructive/10 rounded-lg flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                    <p className="text-sm text-destructive">{r.rejection_reason}</p>
                  </div>
                )}
                {r.admin_note && (
                  <p className="text-xs text-muted-foreground mt-2">ملاحظة: {r.admin_note}</p>
                )}
                <p className="text-xs text-muted-foreground mt-2">{dayjs(r.created_at).format('YYYY/MM/DD')}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Button
        className="fixed bottom-20 left-4 h-14 w-14 rounded-full shadow-lg z-40"
        onClick={() => setAddOpen(true)}
      >
        <Plus className="h-6 w-6" />
      </Button>

      <Sheet open={addOpen} onOpenChange={setAddOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader><SheetTitle>طلب جديد</SheetTitle></SheetHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>نوع الطلب</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as RequestType })}>
                <SelectTrigger className="h-12 mt-1"><SelectValue placeholder="اختر نوع الطلب" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cleaning">طلب تنظيف</SelectItem>
                  <SelectItem value="elevator_repair">طلب تصليح المصعد</SelectItem>
                  <SelectItem value="other">أخرى</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>الوصف</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="mt-1"
                rows={4}
                placeholder="اكتب تفاصيل الطلب..."
              />
            </div>
            <Button className="w-full h-12" onClick={handleSubmit} disabled={submitting}>
              {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'إرسال الطلب'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
