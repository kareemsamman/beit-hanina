import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { EmptyState } from '@/components/EmptyState';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ARABIC_MONTHS } from '@/types';
import type { Profile, SmsLog } from '@/types';
import dayjs from 'dayjs';

export default function SmsPage() {
  const [residents, setResidents] = useState<Profile[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [logs, setLogs] = useState<SmsLog[]>([]);

  // Reminder state
  const now = new Date();
  const [rMonth, setRMonth] = useState(now.getMonth() + 1);
  const [rYear, setRYear] = useState(now.getFullYear());
  const [unpaidResidents, setUnpaidResidents] = useState<{ id: string; name: string; phone: string }[]>([]);
  const [reminderMsg, setReminderMsg] = useState('');

  useEffect(() => {
    fetchResidents();
    fetchLogs();
  }, []);

  const fetchResidents = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('role', 'resident').eq('is_active', true).order('name');
    setResidents((data as Profile[]) || []);
  };

  const fetchLogs = async () => {
    const { data } = await supabase.from('sms_logs').select('*').order('created_at', { ascending: false }).limit(50);
    setLogs((data as SmsLog[]) || []);
  };

  const fetchUnpaid = async () => {
    const { data: payments } = await supabase
      .from('monthly_payments')
      .select('user_id, profiles(id, name, phone)')
      .eq('month', rMonth)
      .eq('year', rYear)
      .in('status', ['unpaid', 'partial']);

    const list = payments?.map((p: any) => ({
      id: p.profiles.id,
      name: p.profiles.name,
      phone: p.profiles.phone,
    })) || [];
    setUnpaidResidents(list);
    setReminderMsg(`تذكير: لم يتم دفع اشتراك شهر ${ARABIC_MONTHS[rMonth]} ${rYear}. يرجى الدفع.`);
  };

  useEffect(() => { fetchUnpaid(); }, [rMonth, rYear]);

  const toggleAll = () => {
    if (selectedIds.length === residents.length) setSelectedIds([]);
    else setSelectedIds(residents.map((r) => r.id));
  };

  const toggleId = (id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  };

  const handleSendManual = async () => {
    if (selectedIds.length === 0 || !message.trim()) {
      toast.error('اختر مستلمين واكتب رسالة');
      return;
    }
    setSending(true);
    const selectedResidents = residents.filter((r) => selectedIds.includes(r.id));
    await supabase.functions.invoke('send-sms', {
      body: {
        phones: selectedResidents.map((r) => r.phone),
        user_ids: selectedResidents.map((r) => r.id),
        message: message.trim(),
        type: 'manual',
      },
    });
    toast.success('تم إرسال الرسائل');
    setMessage('');
    setSelectedIds([]);
    setSending(false);
    fetchLogs();
  };

  const handleSendReminder = async () => {
    if (unpaidResidents.length === 0) { toast.info('لا يوجد غير دافعين'); return; }
    setSending(true);
    await supabase.functions.invoke('send-sms', {
      body: {
        phones: unpaidResidents.map((r) => r.phone),
        user_ids: unpaidResidents.map((r) => r.id),
        message: reminderMsg,
        type: 'reminder',
      },
    });
    toast.success(`تم إرسال تذكير لـ ${unpaidResidents.length} ساكن`);
    setSending(false);
    fetchLogs();
  };

  const typeLabels: Record<string, string> = { otp: 'رمز تحقق', reminder: 'تذكير', manual: 'يدوي' };

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-xl font-bold mb-4">الرسائل</h1>

      <Tabs defaultValue="manual" dir="rtl">
        <TabsList className="w-full mb-4">
          <TabsTrigger value="manual" className="flex-1">إرسال يدوي</TabsTrigger>
          <TabsTrigger value="reminder" className="flex-1">تذكير بالدفع</TabsTrigger>
          <TabsTrigger value="log" className="flex-1">السجل</TabsTrigger>
        </TabsList>

        <TabsContent value="manual" className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>المستلمون</Label>
            <Button variant="ghost" size="sm" onClick={toggleAll}>
              {selectedIds.length === residents.length ? 'إلغاء الكل' : 'تحديد الكل'}
            </Button>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-2 border rounded-lg p-2">
            {residents.map((r) => (
              <label key={r.id} className="flex items-center gap-2 p-2 rounded hover:bg-accent cursor-pointer">
                <Checkbox checked={selectedIds.includes(r.id)} onCheckedChange={() => toggleId(r.id)} />
                <span className="text-sm">{r.name} — شقة {r.apartment_number}</span>
              </label>
            ))}
          </div>
          <div>
            <Label>نص الرسالة</Label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} className="mt-1" rows={4} />
            <p className="text-xs text-muted-foreground mt-1">{message.length} حرف</p>
          </div>
          <Button className="w-full h-12" onClick={handleSendManual} disabled={sending}>
            {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Send className="h-4 w-4 ml-2" />إرسال</>}
          </Button>
        </TabsContent>

        <TabsContent value="reminder" className="space-y-4">
          <div className="flex gap-2">
            <Select value={String(rMonth)} onValueChange={(v) => setRMonth(Number(v))}>
              <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(ARABIC_MONTHS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="number" value={rYear} onChange={(e) => setRYear(Number(e.target.value))} className="w-24" dir="ltr" />
          </div>
          <p className="text-sm">عدد غير الدافعين: <strong>{unpaidResidents.length}</strong></p>
          <div>
            <Label>نص التذكير</Label>
            <Textarea value={reminderMsg} onChange={(e) => setReminderMsg(e.target.value)} className="mt-1" rows={3} />
          </div>
          <Button className="w-full h-12" onClick={handleSendReminder} disabled={sending || unpaidResidents.length === 0}>
            {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : `إرسال تذكير (${unpaidResidents.length})`}
          </Button>
        </TabsContent>

        <TabsContent value="log">
          {logs.length === 0 ? (
            <EmptyState icon={<MessageSquare className="h-12 w-12" />} message="لا توجد رسائل مسجلة" />
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <Card key={log.id}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{typeLabels[log.type] || log.type}</span>
                      <span className="text-xs text-muted-foreground">{dayjs(log.created_at).format('YYYY/MM/DD HH:mm')}</span>
                    </div>
                    <p className="text-sm line-clamp-2">{log.message}</p>
                    <p className="text-xs text-muted-foreground mt-1" dir="ltr">{log.phone}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
