export type UserRole = 'admin' | 'resident';

export interface Profile {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  apartment_number: number | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type PaymentStatus = 'paid' | 'unpaid' | 'partial';

export interface MonthlyPayment {
  id: string;
  user_id: string;
  month: number;
  year: number;
  amount: number;
  status: PaymentStatus;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type RequestType = 'cleaning' | 'elevator_repair' | 'other';
export type RequestStatus = 'new' | 'in_progress' | 'rejected' | 'done';

export interface MaintenanceRequest {
  id: string;
  user_id: string;
  type: RequestType;
  description: string;
  status: RequestStatus;
  rejection_reason: string | null;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
}

export type SmsType = 'otp' | 'reminder' | 'manual';

export interface SmsLog {
  id: string;
  user_id: string | null;
  phone: string;
  message: string;
  type: SmsType;
  status: string;
  provider_response: Record<string, unknown> | null;
  created_at: string;
}

export interface Settings {
  id: number;
  building_name: string;
  building_number: number;
  default_monthly_fee: number;
  reminder_day: number;
  sms_provider: string;
  created_at: string;
  updated_at: string;
}

// UI helpers
export const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  cleaning: 'طلب تنظيف',
  elevator_repair: 'طلب تصليح المصعد',
  other: 'أخرى',
};

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  new: 'جديد',
  in_progress: 'قيد العمل',
  rejected: 'مرفوض',
  done: 'تم',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  paid: 'مدفوع',
  unpaid: 'غير مدفوع',
  partial: 'دفع جزئي',
};

export const ARABIC_MONTHS: Record<number, string> = {
  1: 'يناير', 2: 'فبراير', 3: 'مارس', 4: 'أبريل',
  5: 'مايو', 6: 'يونيو', 7: 'يوليو', 8: 'أغسطس',
  9: 'سبتمبر', 10: 'أكتوبر', 11: 'نوفمبر', 12: 'ديسمبر',
};
