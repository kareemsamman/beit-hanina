import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function hashOtp(otp: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(otp);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { phone, code } = await req.json();
    if (!phone || !code) {
      return new Response(JSON.stringify({ error: "البيانات غير مكتملة" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let normalized = phone.trim();
    if (normalized.startsWith("0")) {
      normalized = "+972" + normalized.slice(1);
    }
    if (!normalized.startsWith("+")) {
      normalized = "+" + normalized;
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get latest unexpired, unverified OTP for this phone
    const { data: otpRecord } = await supabase
      .from("otp_codes")
      .select("*")
      .eq("phone", normalized)
      .eq("verified", false)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!otpRecord) {
      return new Response(
        JSON.stringify({ error: "انتهت صلاحية الرمز. أعد الإرسال" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check max attempts
    if (otpRecord.attempts >= 5) {
      return new Response(
        JSON.stringify({ error: "تم تجاوز عدد المحاولات. أعد إرسال رمز جديد" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify hash
    const inputHash = await hashOtp(code);
    if (inputHash !== otpRecord.code_hash) {
      // Increment attempts
      await supabase
        .from("otp_codes")
        .update({ attempts: otpRecord.attempts + 1 })
        .eq("id", otpRecord.id);

      return new Response(
        JSON.stringify({ error: "الرمز غير صحيح" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark as verified
    await supabase
      .from("otp_codes")
      .update({ verified: true })
      .eq("id", otpRecord.id);

    // Get profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("phone", normalized)
      .single();

    if (!profile) {
      return new Response(
        JSON.stringify({ error: "هذا الرقم غير مسجل في النظام" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!profile.is_active) {
      return new Response(
        JSON.stringify({ error: "تم تعطيل حسابك، تواصل مع المسؤول" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sign in the user using the auth user linked to this profile
    // We use a temporary password approach: set password then sign in
    const tempPassword = crypto.randomUUID();

    // Update the user's password
    await supabase.auth.admin.updateUserById(profile.id, {
      password: tempPassword,
    });

    // Sign in with the temporary password
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      phone: normalized,
      password: tempPassword,
    });

    if (signInError) {
      // Try with email-based approach using phone as identifier
      // Fallback: generate a custom token approach
      // Use admin generateLink or signInWithPassword with email
      const fakeEmail = `${normalized.replace(/\+/g, "")}@building5.local`;
      
      await supabase.auth.admin.updateUserById(profile.id, {
        email: fakeEmail,
        password: tempPassword,
      });

      const { data: signInData2, error: signInError2 } = await supabase.auth.signInWithPassword({
        email: fakeEmail,
        password: tempPassword,
      });

      if (signInError2) {
        return new Response(
          JSON.stringify({ error: "خطأ في تسجيل الدخول. حاول مرة أخرى" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          session: signInData2.session,
          profile: {
            id: profile.id,
            name: profile.name,
            role: profile.role,
            apartment_number: profile.apartment_number,
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        session: signInData.session,
        profile: {
          id: profile.id,
          name: profile.name,
          role: profile.role,
          apartment_number: profile.apartment_number,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: "حدث خطأ غير متوقع" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
