import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Building2, Loader2, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { OTP_LENGTH, OTP_COUNTDOWN_SECONDS } from '@/lib/constants';
import { extractFunctionErrorMessage } from '@/lib/function-errors';

export default function VerifyPage() {
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
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

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    const newOtp = Array(OTP_LENGTH).fill('');
    pasted.split('').forEach((d, i) => { newOtp[i] = d; });
    setOtp(newOtp);
    setError('');
    if (pasted.length === OTP_LENGTH) {
      handleVerify(pasted);
    } else {
      inputRefs.current[pasted.length]?.focus();
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
        setOtp(Array(OTP_LENGTH).fill(''));
        inputRefs.current[0]?.focus();
        setLoading(false);
        return;
      }

      if (data?.session) {
        setSuccess(true);
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });

        setTimeout(() => {
          const route = data.profile?.role === 'admin' ? '/admin' : '/resident';
          navigate(route, { replace: true });
        }, 600);
      }
    } catch (error) {
      setError(await extractFunctionErrorMessage(error, 'حدث خطأ غير متوقع'));
    } finally {
      if (!success) setLoading(false);
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-primary/5 to-background px-6">
      <div className="w-full max-w-sm text-center animate-fade-in">
        <div className="inline-flex rounded-2xl bg-primary/10 p-4 mb-4">
          <ShieldCheck className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-2xl font-bold mb-2">أدخل رمز التحقق</h1>
        <p className="text-muted-foreground text-sm mb-1">
          تم إرسال رمز مكون من {OTP_LENGTH} أرقام إلى
        </p>
        <p className="text-foreground font-semibold text-base mb-1" dir="ltr">{phone}</p>
        <button
          onClick={() => navigate('/login', { replace: true })}
          className="text-primary text-sm mb-8 inline-flex items-center gap-1 hover:underline"
        >
          <ArrowRight className="h-3 w-3" />
          تغيير رقم الهاتف
        </button>

        <div className="bg-card rounded-2xl p-6 shadow-sm border border-border/50 mb-6">
          <div className="flex justify-center gap-3 mb-5" dir="ltr">
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
                onPaste={i === 0 ? handlePaste : undefined}
                className={`w-14 h-16 text-center text-3xl font-bold border-2 rounded-xl bg-background transition-all duration-200 focus:outline-none ${
                  success
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : error
                    ? 'border-destructive/50'
                    : digit
                    ? 'border-primary bg-primary/5'
                    : 'border-input'
                } focus:border-primary focus:ring-2 focus:ring-primary/20`}
                disabled={loading || success}
              />
            ))}
          </div>

          {error && (
            <div className="bg-destructive/10 text-destructive text-sm py-2 px-3 rounded-lg mb-3 animate-shake">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 text-green-700 text-sm py-2 px-3 rounded-lg mb-3 flex items-center justify-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              تم التحقق بنجاح
            </div>
          )}

          {loading && !success && (
            <div className="flex justify-center mb-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
        </div>

        <div>
          {countdown > 0 ? (
            <p className="text-muted-foreground text-sm">
              إعادة إرسال بعد <span className="font-semibold text-foreground">{countdown}</span> ثانية
            </p>
          ) : (
            <Button
              variant="ghost"
              onClick={handleResend}
              disabled={resending}
              className="gap-2"
            >
              {resending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              إعادة إرسال الرمز
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
