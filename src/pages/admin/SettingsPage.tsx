import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Building2, CreditCard, Bell, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import type { Settings } from '@/types';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('settings').select('*').eq('id', 1).single().then(({ data }) => {
      setSettings(data as Settings);
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    await supabase.from('settings').update({
      building_name: settings.building_name,
      building_number: settings.building_number,
      default_monthly_fee: settings.default_monthly_fee,
      reminder_day: settings.reminder_day,
    }).eq('id', 1);
    toast.success('تم حفظ الإعدادات');
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in">
      <h1 className="text-xl font-bold mb-6">الإعدادات</h1>

      <div className="space-y-4">
        {/* Building info */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2 text-primary mb-1">
              <Building2 className="h-5 w-5" />
              <span className="font-semibold">معلومات العمارة</span>
            </div>
            <div>
              <Label className="text-sm font-medium">اسم العمارة</Label>
              <Input value={settings?.building_name || ''} onChange={(e) => setSettings(s => s ? { ...s, building_name: e.target.value } : s)} className="h-12 mt-1.5 rounded-xl" />
            </div>
            <div>
              <Label className="text-sm font-medium">رقم العمارة</Label>
              <Input type="number" value={settings?.building_number || ''} onChange={(e) => setSettings(s => s ? { ...s, building_number: Number(e.target.value) } : s)} className="h-12 mt-1.5 rounded-xl" />
            </div>
          </CardContent>
        </Card>

        {/* Payment settings */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2 text-success mb-1">
              <CreditCard className="h-5 w-5" />
              <span className="font-semibold text-foreground">إعدادات الدفع</span>
            </div>
            <div>
              <Label className="text-sm font-medium">رسوم الاشتراك الشهري (₪)</Label>
              <Input type="number" value={settings?.default_monthly_fee || ''} onChange={(e) => setSettings(s => s ? { ...s, default_monthly_fee: Number(e.target.value) } : s)} className="h-12 mt-1.5 rounded-xl" dir="ltr" />
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2 text-warning mb-1">
              <Bell className="h-5 w-5" />
              <span className="font-semibold text-foreground">التنبيهات</span>
            </div>
            <div>
              <Label className="text-sm font-medium">يوم إرسال التذكير (1-28)</Label>
              <Input type="number" min={1} max={28} value={settings?.reminder_day || ''} onChange={(e) => setSettings(s => s ? { ...s, reminder_day: Number(e.target.value) } : s)} className="h-12 mt-1.5 rounded-xl" />
            </div>
          </CardContent>
        </Card>

        {/* SMS Provider */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-info mb-3">
              <MessageSquare className="h-5 w-5" />
              <span className="font-semibold text-foreground">مزود الرسائل</span>
            </div>
            <div className="bg-muted/50 rounded-xl p-3 text-center">
              <span className="font-semibold">019SMS</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="sticky bottom-20 mt-6">
        <Button className="w-full h-12 rounded-xl shadow-md shadow-primary/20" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : 'حفظ الإعدادات'}
        </Button>
      </div>
    </div>
  );
}
