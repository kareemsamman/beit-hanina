import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Building2, Loader2, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { OTP_LENGTH, OTP_COUNTDOWN_SECONDS } from '@/lib/constants';
import { extractFunctionErrorMessage } from '@/lib/function-errors';

export default function VerifyPage() {
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(OTP_COUNTDOWN_SECONDS);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
  const phone = location.state?.phone;
  const { setSession, setProfile } = useAuth();

  useEffect(() => {
    if (!phone) {
      navigate('/login', { replace: true });
      return;
    }
    inputRefs.current[0]?.focus();
  }, [phone, navigate]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setError('');

    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit on last digit
    if (value && index === OTP_LENGTH - 1) {
      const code = newOtp.join('');
      if (code.length === OTP_LENGTH) {
        handleVerify(code);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (code?: string) => {
    const otpCode = code || otp.join('');
    if (otpCode.length !== OTP_LENGTH) {
      setError('أدخل الرمز كاملاً');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error: fnError } = await supabase.functions.invoke('verify-otp', {
        body: { phone, code: otpCode },
      });

      if (fnError || data?.error) {
        const errorMsg = data?.error || await extractFunctionErrorMessage(fnError, 'خطأ في التحقق');
        setError(errorMsg);
        setLoading(false);
        return;
      }

      if (data?.session) {
        // Set the session in the client
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });

        const route = data.profile?.role === 'admin' ? '/admin' : '/resident';
        navigate(route, { replace: true });
      }
    } catch (error) {
      setError(await extractFunctionErrorMessage(error, 'حدث خطأ غير متوقع'));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError('');
    try {
      const { data, error: fnError } = await supabase.functions.invoke('send-otp', {
        body: { phone },
      });

      if (fnError || data?.error) {
        setError(data?.error || await extractFunctionErrorMessage(fnError, 'فشل في إعادة الإرسال'));
        return;
      }

      setCountdown(OTP_COUNTDOWN_SECONDS);
      setOtp(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } catch (error) {
      setError(await extractFunctionErrorMessage(error, 'فشل في إعادة الإرسال'));
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-6">
      <div className="w-full max-w-sm text-center">
        <Building2 className="h-10 w-10 text-primary mx-auto mb-4" />
        <h1 className="text-xl font-bold mb-2">أدخل رمز التحقق</h1>
        <p className="text-muted-foreground text-sm mb-2">
          تم إرسال رمز إلى {phone}
        </p>
        <button
          onClick={() => navigate('/login', { replace: true })}
          className="text-primary text-sm mb-6 inline-flex items-center gap-1 hover:underline"
        >
          <ArrowRight className="h-3 w-3" />
          تغيير رقم الهاتف
        </button>

        <div className="flex justify-center gap-2 mb-6" dir="ltr">
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className="w-12 h-14 text-center text-2xl font-bold border-2 border-input rounded-xl bg-card focus:border-primary focus:outline-none transition-colors"
              disabled={loading}
            />
          ))}
        </div>

        {error && <p className="text-destructive text-sm mb-4">{error}</p>}

        {loading && (
          <div className="flex justify-center mb-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        <div className="mt-6">
          {countdown > 0 ? (
            <p className="text-muted-foreground text-sm">
              إعادة إرسال بعد {countdown} ثانية
            </p>
          ) : (
            <Button
              variant="ghost"
              onClick={handleResend}
              disabled={resending}
            >
              {resending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'إعادة إرسال'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
