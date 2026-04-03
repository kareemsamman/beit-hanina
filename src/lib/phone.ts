import { parsePhoneNumberFromString } from 'libphonenumber-js';

export function normalizePhone(phone: string): string {
  // Try parsing with IL country code
  const parsed = parsePhoneNumberFromString(phone, 'IL');
  if (parsed && parsed.isValid()) {
    return parsed.format('E.164'); // +972521234567
  }
  // If starts with 0, try prepending +972
  if (phone.startsWith('0')) {
    const withCode = '+972' + phone.slice(1);
    const parsed2 = parsePhoneNumberFromString(withCode, 'IL');
    if (parsed2 && parsed2.isValid()) {
      return parsed2.format('E.164');
    }
  }
  return phone;
}

export function formatPhoneDisplay(phone: string): string {
  const parsed = parsePhoneNumberFromString(phone, 'IL');
  if (parsed) {
    return parsed.formatNational();
  }
  return phone;
}
