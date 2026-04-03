import { useNavigate } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BUILDING_NAME, SYSTEM_NAME } from '@/lib/constants';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';
import { LoadingScreen } from '@/components/LoadingScreen';

export default function SplashPage() {
  const navigate = useNavigate();
  const { session, profile, loading } = useAuth();

  useEffect(() => {
    if (!loading && session && profile) {
      navigate(profile.role === 'admin' ? '/admin' : '/resident', { replace: true });
    }
  }, [loading, session, profile, navigate]);

  if (loading) return <LoadingScreen />;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-6 text-center">
      <div className="mb-8 rounded-full bg-primary/10 p-6">
        <Building2 className="h-16 w-16 text-primary" />
      </div>
      <h1 className="text-2xl font-bold text-foreground mb-2">{BUILDING_NAME}</h1>
      <p className="text-muted-foreground text-lg mb-12">{SYSTEM_NAME}</p>
      <Button
        size="lg"
        className="w-full max-w-sm h-14 text-lg rounded-xl"
        onClick={() => navigate('/login')}
      >
        تسجيل الدخول
      </Button>
    </div>
  );
}
