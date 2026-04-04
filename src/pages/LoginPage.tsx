import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Building2, Loader2, Phone } from 'lucide-react';
import { BUILDING_SHORT } from '@/lib/constants';
import { extractFunctionErrorMessage } from '@/lib/function-errors';
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
        setError(await extractFunctionErrorMessage(fnError, 'حدث خطأ في الإرسال'));
        return;
      }

      if (data?.error) {
        setError(data.error);
        return;
      }

      toast.success('تم إرسال رمز التحقق');
      navigate('/verify', { state: { phone: phone.trim() } });
    } catch (error) {
      setError(await extractFunctionErrorMessage(error, 'حدث خطأ غير متوقع'));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleSend();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-primary/5 to-background px-6">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="text-center mb-10">
          <div className="inline-flex rounded-2xl bg-primary/10 p-4 mb-4">
            <Building2 className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{BUILDING_SHORT}</h1>
          <p className="text-muted-foreground mt-2">أدخل رقم هاتفك لتسجيل الدخول</p>
        </div>

        <div className="bg-card rounded-2xl p-6 shadow-sm border border-border/50">
          <div className="relative mb-4">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="tel"
              placeholder="05X XXX XXXX"
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setError(''); }}
              onKeyDown={handleKeyDown}
              className="h-14 text-lg text-center rounded-xl pl-10 border-2 focus:border-primary transition-colors"
              inputMode="numeric"
              dir="ltr"
              autoFocus
            />
          </div>

          {error && (
            <div className="bg-destructive/10 text-destructive text-sm text-center py-2 px-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <Button
            size="lg"
            className="w-full h-14 text-lg rounded-xl shadow-md shadow-primary/20 active:scale-[0.98] transition-transform"
            onClick={handleSend}
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                جاري الإرسال...
              </span>
            ) : (
              'إرسال رمز التحقق'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
