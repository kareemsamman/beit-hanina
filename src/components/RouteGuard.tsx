import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LoadingScreen } from '@/components/LoadingScreen';
import type { UserRole } from '@/types';

interface RouteGuardProps {
  children: React.ReactNode;
  allowedRole?: UserRole;
}

export function RouteGuard({ children, allowedRole }: RouteGuardProps) {
  const { session, profile, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  if (!session) return <Navigate to="/" replace />;

  if (!profile) return <LoadingScreen />;

  if (allowedRole && profile.role !== allowedRole) {
    const redirect = profile.role === 'admin' ? '/admin' : '/resident';
    return <Navigate to={redirect} replace />;
  }

  return <>{children}</>;
}
