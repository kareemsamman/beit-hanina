import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const results: string[] = [];

    // All people from the image
    const people = [
      { name: "كريم السمان", phone: "+972525143581", apartment: 10, role: "admin", fee: 100 },
      { name: "الياس خوري", phone: "+972521000001", apartment: 1, role: "resident", fee: 0 },
      { name: "رافع شقور", phone: "+972521000002", apartment: 2, role: "resident", fee: 100 },
      { name: "نخلة عنتر", phone: "+972521000003", apartment: 3, role: "resident", fee: 100 },
      { name: "روبير سعادة", phone: "+972521000004", apartment: 4, role: "resident", fee: 100 },
      { name: "اليكس اريبب", phone: "+972521000005", apartment: 5, role: "resident", fee: 100 },
      { name: "فكتور حصري", phone: "+972521000006", apartment: 6, role: "resident", fee: 100 },
      { name: "جورج بافلوف", phone: "+972521000007", apartment: 7, role: "resident", fee: 100 },
      { name: "طارق بدر", phone: "+972521000008", apartment: 8, role: "resident", fee: 100 },
      { name: "عبدالله ابوفرحة", phone: "+972521000009", apartment: 9, role: "resident", fee: 100 },
      { name: "الياس كتوعة", phone: "+972521000011", apartment: 11, role: "resident", fee: 0 },
      { name: "موسى هريمات", phone: "+972521000012", apartment: 12, role: "resident", fee: 0 },
    ];

    // Payment data from image (year 2026, months with ✓100 = paid)
    // Format: { apartment, paidMonths: [month numbers] }
    const paymentData: Record<number, number[]> = {
      // 1: الياس خوري - no payments
      2: [1, 2],        // رافع شقور - Jan, Feb paid
      3: [1, 2],        // نخلة عنتر - Jan, Feb paid
      4: [1, 2, 3],     // روبير سعادة - Jan, Feb, Mar paid
      5: [1, 2, 3, 4],  // اليكس اريبب - Jan, Feb, Mar, Apr paid
      6: [1, 2, 3, 4],  // فكتور حصري - Jan, Feb, Mar, Apr paid
      7: [1, 3, 4],     // جورج بافلوف - Jan, Mar, Apr paid
      8: [1, 2, 3],     // طارق بدر - Jan, Feb, Mar paid
      9: [1, 2, 3],     // عبدالله ابوفرحة - Jan, Feb, Mar paid
      10: [1, 2, 3],    // كريم السمان - Jan, Feb, Mar paid
    };

    // Create users and profiles
    const userMap: Record<number, string> = {}; // apartment -> user_id

    for (const person of people) {
      const email = `apt${person.apartment}@building5.local`;
      const password = crypto.randomUUID();

      // Try to create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        phone: person.phone,
        user_metadata: { name: person.name },
      });

      if (authError) {
        // User might already exist, try to find by email
        const { data: { users } } = await supabase.auth.admin.listUsers();
        const existing = users?.find((u: any) => u.email === email);
        if (existing) {
          userMap[person.apartment] = existing.id;
          results.push(`${person.name} (شقة ${person.apartment}) - موجود مسبقاً`);
          continue;
        }
        results.push(`${person.name} - خطأ: ${authError.message}`);
        continue;
      }

      const userId = authData.user!.id;
      userMap[person.apartment] = userId;

      // Create profile
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: userId,
          name: person.name,
          phone: person.phone,
          apartment_number: person.apartment,
          role: person.role,
          is_active: true,
        }, { onConflict: "id" });

      if (profileError) {
        results.push(`${person.name} - خطأ في الملف: ${profileError.message}`);
      } else {
        results.push(`${person.name} (شقة ${person.apartment}) - تم إنشاؤه كـ ${person.role}`);
      }
    }

    // Create payment records for 2026
    // For residents with fee > 0, create records for Jan-Apr 2026
    const currentMonth = 4; // April 2026
    const payments: any[] = [];

    for (const person of people) {
      if (person.fee === 0 || !userMap[person.apartment]) continue;
      const userId = userMap[person.apartment];
      const paidMonths = paymentData[person.apartment] || [];

      for (let month = 1; month <= currentMonth; month++) {
        const isPaid = paidMonths.includes(month);
        payments.push({
          user_id: userId,
          month,
          year: 2026,
          amount: 100,
          status: isPaid ? "paid" : "unpaid",
          paid_at: isPaid ? new Date().toISOString() : null,
        });
      }
    }

    if (payments.length > 0) {
      const { error: payError } = await supabase
        .from("monthly_payments")
        .upsert(payments, { onConflict: "user_id,month,year", ignoreDuplicates: true });

      if (payError) {
        results.push(`خطأ في إدخال الدفعات: ${payError.message}`);
      } else {
        results.push(`تم إدخال ${payments.length} سجل دفعة`);
      }
    }

    // Ensure settings row exists
    await supabase
      .from("settings")
      .upsert({
        id: 1,
        building_name: "طريق حزما زقاق ٧ - ٥",
        building_number: 5,
        default_monthly_fee: 100,
        reminder_day: 5,
      }, { onConflict: "id" });

    results.push("تم تحديث الإعدادات");

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
