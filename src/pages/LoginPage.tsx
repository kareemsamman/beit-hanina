import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Building2, Loader2 } from 'lucide-react';
import { BUILDING_SHORT } from '@/lib/constants';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSend = async () => {
    if (!phone.trim()) {
      setError('أدخل رقم الهاتف');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error: fnError } = await supabase.functions.invoke('send-otp', {
        body: { phone: phone.trim() },
      });

      if (fnError) {
        setError('حدث خطأ في الإرسال');
        return;
      }

      if (data?.error) {
        setError(data.error);
        return;
      }

      toast.success('تم إرسال رمز التحقق');
      navigate('/verify', { state: { phone: phone.trim() } });
    } catch {
      setError('حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <Building2 className="h-12 w-12 text-primary mx-auto mb-3" />
          <h1 className="text-xl font-bold text-foreground">{BUILDING_SHORT}</h1>
          <p className="text-muted-foreground mt-1">أدخل رقم هاتفك لتسجيل الدخول</p>
        </div>

        <div className="space-y-4">
          <Input
            type="tel"
            placeholder="أدخل رقم الهاتف"
            value={phone}
            onChange={(e) => { setPhone(e.target.value); setError(''); }}
            className="h-14 text-lg text-center rounded-xl"
            inputMode="numeric"
            dir="ltr"
          />
          {error && <p className="text-destructive text-sm text-center">{error}</p>}
          <Button
            size="lg"
            className="w-full h-14 text-lg rounded-xl"
            onClick={handleSend}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'إرسال رمز التحقق'}
          </Button>
        </div>
      </div>
    </div>
  );
}
