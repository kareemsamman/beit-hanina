import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { User, Phone, Home as HomeIcon, LogOut } from 'lucide-react';
import { formatPhoneDisplay } from '@/lib/phone';

export default function ResidentProfile() {
  const { profile, logout } = useAuth();

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-xl font-bold mb-6">حسابي</h1>

      <Card className="mb-6">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">الاسم</p>
              <p className="font-semibold">{profile?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Phone className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">رقم الهاتف</p>
              <p className="font-semibold" dir="ltr">{formatPhoneDisplay(profile?.phone || '')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <HomeIcon className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">رقم الشقة</p>
              <p className="font-semibold">{profile?.apartment_number}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button
        variant="destructive"
        className="w-full h-12"
        onClick={logout}
      >
        <LogOut className="h-5 w-5 ml-2" />
        تسجيل الخروج
      </Button>
    </div>
  );
}
