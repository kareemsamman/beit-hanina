

# نظام إدارة عمارة رقم 5 — Implementation Plan

## Phase 1: Foundation & Setup
- Configure full RTL support with `dir="rtl"` and Arabic font (IBM Plex Sans Arabic from Google Fonts)
- Set up Tailwind theme with the specified color system (blue primary, green/red/orange/amber status colors, warm white background)
- Create feature-based folder structure (`features/auth`, `features/admin`, `features/resident`, etc.)
- Define all TypeScript types matching the database schema
- Install required dependencies: dayjs, @dnd-kit/core, @dnd-kit/sortable, libphonenumber-js, zustand, recharts, react-hook-form, zod

## Phase 2: Database & Security
- Create all tables: `profiles`, `otp_codes`, `monthly_payments`, `maintenance_requests`, `sms_logs`, `settings`
- Set up `updated_at` triggers on relevant tables
- Create `get_user_role()` security definer function
- Implement all RLS policies per spec (resident self-access, admin full access, otp_codes deny-all)
- Insert seed data: 1 admin, 8 residents, 3 months of payments, 6 maintenance requests, settings row, sample SMS logs

## Phase 3: Edge Functions & Auth
- **`send-otp`**: Generate 6-digit OTP, hash & store, send via 019SMS API, rate limit (3/phone/10min), log to sms_logs
- **`verify-otp`**: Verify hashed OTP, max 5 attempts, 5-min expiry, create Supabase auth session on success
- **`create-resident`**: Create auth.users + profiles entry using service_role
- **`send-sms`**: Send to multiple recipients via 019SMS, log each message
- **`generate-monthly-payments`**: Auto-create unpaid records for all active residents for current month

## Phase 4: Auth UI (Public Pages)
- **Splash screen**: Building name, icon, "تسجيل الدخول" button — clean and welcoming
- **Phone login**: Large numeric input, phone normalization (0521... ↔ +972521...), Arabic validation errors
- **OTP verification**: 6 separate digit boxes with auto-focus/auto-advance/auto-submit, 60s countdown timer, resend button
- Route to admin or resident home based on role after successful verification

## Phase 5: Shared Components
- Status pills (green/red/orange/blue) used consistently across all screens
- Arabic bottom sheet component for detail views and editing
- Skeleton loading cards, empty states with icons and Arabic messages
- Bottom tab navigation components for both admin (5 items with "المزيد" overflow) and resident (4 items)
- Route guards checking auth session + role, with redirects

## Phase 6: Admin Screens
- **Dashboard**: Large stat cards (residents, paid/unpaid counts, open requests, monthly fee) + quick action buttons
- **Residents Management**: Search bar, resident cards with status badges, FAB for adding, bottom sheet for detail/edit, active/inactive toggle
- **Monthly Payments** (primary screen): Month/year selector, filter chips (all/paid/unpaid/partial), summary bar, payment cards with tap-to-edit bottom sheet, bulk SMS reminder button
- **Monthly Calendar**: Month-by-month navigation, color-coded months, tap to navigate to payment details
- **Requests Kanban**: Grouped list by status (جديد/قيد العمل/مرفوض/تم), drag-and-drop with @dnd-kit between groups, mandatory rejection reason modal, tap-to-edit fallback for mobile
- **SMS Screen**: 3 tabs — manual send (multi-select recipients + message), payment reminder (select month, see unpaid, send), message log
- **Settings**: Single form with building info, monthly fee, reminder day, save with toast confirmation

## Phase 7: Resident Screens
- **Home**: Greeting with name, building/apartment info, current month payment status card, quick action buttons with notification badge on requests
- **My Payments**: Chronological card list (view-only), year filter, empty state
- **My Requests**: Request cards with status pills, rejection reason highlighted in red, FAB for new request form (type select + description textarea)
- **Profile**: Read-only display (name, phone, apartment), editable name field, logout button

## Phase 8: Polish & Quality
- Ensure every screen works at 375px width with no horizontal scroll
- Verify all text is Arabic with no English anywhere
- Test all loading, empty, and error states
- Confirm RTL rendering on all components (dialogs, drawers, forms, tables)
- Validate form inputs with zod and show inline Arabic errors
- Add react-query retry/stale-while-revalidate for resilience

