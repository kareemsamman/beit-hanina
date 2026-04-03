
-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ==================== PROFILES ====================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'resident')) DEFAULT 'resident',
  apartment_number INTEGER,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_profiles_phone ON public.profiles(phone);
CREATE INDEX idx_profiles_role ON public.profiles(role);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Now create role check helper function (after profiles table exists)
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- Profiles RLS policies
CREATE POLICY "Residents can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR public.get_user_role() = 'admin');

CREATE POLICY "Residents can update own name and notes"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR public.get_user_role() = 'admin')
  WITH CHECK (auth.uid() = id OR public.get_user_role() = 'admin');

CREATE POLICY "Admin can insert profiles"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (public.get_user_role() = 'admin');

-- ==================== OTP_CODES ====================
CREATE TABLE public.otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN DEFAULT false,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_otp_phone ON public.otp_codes(phone, created_at DESC);
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

-- ==================== MONTHLY_PAYMENTS ====================
CREATE TABLE public.monthly_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('paid', 'unpaid', 'partial')) DEFAULT 'unpaid',
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, month, year)
);

CREATE INDEX idx_payments_user ON public.monthly_payments(user_id);
CREATE INDEX idx_payments_period ON public.monthly_payments(year, month);
CREATE INDEX idx_payments_status ON public.monthly_payments(status);
ALTER TABLE public.monthly_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Residents can view own payments"
  ON public.monthly_payments FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.get_user_role() = 'admin');

CREATE POLICY "Admin can insert payments"
  ON public.monthly_payments FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY "Admin can update payments"
  ON public.monthly_payments FOR UPDATE TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.monthly_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==================== MAINTENANCE_REQUESTS ====================
CREATE TABLE public.maintenance_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('cleaning', 'elevator_repair', 'other')),
  description TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('new', 'in_progress', 'rejected', 'done')) DEFAULT 'new',
  rejection_reason TEXT,
  admin_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_requests_user ON public.maintenance_requests(user_id);
CREATE INDEX idx_requests_status ON public.maintenance_requests(status);
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Residents can view own requests"
  ON public.maintenance_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.get_user_role() = 'admin');

CREATE POLICY "Residents can create own requests"
  ON public.maintenance_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admin can update requests"
  ON public.maintenance_requests FOR UPDATE TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

CREATE TRIGGER update_requests_updated_at
  BEFORE UPDATE ON public.maintenance_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==================== SMS_LOGS ====================
CREATE TABLE public.sms_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id),
  phone TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('otp', 'reminder', 'manual')),
  status TEXT DEFAULT 'pending',
  provider_response JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sms_logs_user ON public.sms_logs(user_id);
CREATE INDEX idx_sms_logs_type ON public.sms_logs(type);
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view sms logs"
  ON public.sms_logs FOR SELECT TO authenticated
  USING (public.get_user_role() = 'admin');

CREATE POLICY "Admin can insert sms logs"
  ON public.sms_logs FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() = 'admin');

-- ==================== SETTINGS ====================
CREATE TABLE public.settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  building_name TEXT DEFAULT 'طريق حزما زقاق ٧ - ٥',
  building_number INTEGER DEFAULT 5,
  default_monthly_fee NUMERIC(10,2) DEFAULT 100,
  reminder_day INTEGER DEFAULT 5 CHECK (reminder_day BETWEEN 1 AND 28),
  sms_provider TEXT DEFAULT '019sms',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read settings"
  ON public.settings FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin can update settings"
  ON public.settings FOR UPDATE TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.settings (id, building_name, building_number, default_monthly_fee, reminder_day)
VALUES (1, 'طريق حزما زقاق ٧ - ٥', 5, 100, 5);
