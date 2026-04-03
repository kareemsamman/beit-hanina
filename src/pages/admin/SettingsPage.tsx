import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
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
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-xl font-bold mb-6">الإعدادات</h1>
      <div className="space-y-5">
        <div>
          <Label>اسم العمارة</Label>
          <Input value={settings?.building_name || ''} onChange={(e) => setSettings(s => s ? { ...s, building_name: e.target.value } : s)} className="h-12 mt-1" />
        </div>
        <div>
          <Label>رقم العمارة</Label>
          <Input type="number" value={settings?.building_number || ''} onChange={(e) => setSettings(s => s ? { ...s, building_number: Number(e.target.value) } : s)} className="h-12 mt-1" />
        </div>
        <div>
          <Label>رسوم الاشتراك الشهري (₪)</Label>
          <Input type="number" value={settings?.default_monthly_fee || ''} onChange={(e) => setSettings(s => s ? { ...s, default_monthly_fee: Number(e.target.value) } : s)} className="h-12 mt-1" dir="ltr" />
        </div>
        <div>
          <Label>يوم إرسال التذكير (1-28)</Label>
          <Input type="number" min={1} max={28} value={settings?.reminder_day || ''} onChange={(e) => setSettings(s => s ? { ...s, reminder_day: Number(e.target.value) } : s)} className="h-12 mt-1" />
        </div>
        <div>
          <Label>مزود الرسائل</Label>
          <Input value="019SMS" disabled className="h-12 mt-1 bg-muted" />
        </div>
      </div>
      <div className="sticky bottom-20 mt-8">
        <Button className="w-full h-12" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : 'حفظ الإعدادات'}
        </Button>
      </div>
    </div>
  );
}
