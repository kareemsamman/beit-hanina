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
    const { phone } = await req.json();
    if (!phone || typeof phone !== "string") {
      return new Response(JSON.stringify({ error: "رقم الهاتف مطلوب" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normalize phone
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

    // Rate limit: max 3 OTP requests per phone per 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: recentOtps } = await supabase
      .from("otp_codes")
      .select("id")
      .eq("phone", normalized)
      .gte("created_at", tenMinutesAgo);

    if (recentOtps && recentOtps.length >= 3) {
      return new Response(
        JSON.stringify({ error: "تم تجاوز الحد الأقصى للمحاولات. حاول بعد 10 دقائق" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if phone exists in profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, is_active")
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

    // Generate 4-digit OTP
    const otp = String(Math.floor(1000 + Math.random() * 9000));
    const codeHash = await hashOtp(otp);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Store OTP
    await supabase.from("otp_codes").insert({
      phone: normalized,
      code_hash: codeHash,
      expires_at: expiresAt,
    });

    // Send SMS via 019SMS
    const smsUser = Deno.env.get("SMS_API_USER");
    const smsToken = Deno.env.get("SMS_API_TOKEN");
    const smsSource = Deno.env.get("SMS_SOURCE_PHONE");
    console.log("SMS credentials:", { user: smsUser ? `${smsUser.substring(0, 3)}***` : "MISSING", token: smsToken ? `${smsToken.substring(0, 3)}***` : "MISSING", source: smsSource || "MISSING" });

    // Format phone for SMS (remove + prefix if present)
    const smsPhone = normalized.startsWith("+") ? normalized.slice(1) : normalized;

    const msgId = crypto.randomUUID();
    const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<sms>
  <user>
    <username>${smsUser}</username>
    <password>${smsToken}</password>
  </user>
  <source>${smsSource}</source>
  <destinations>
    <phone id="1">${smsPhone}</phone>
  </destinations>
  <message>رمز التحقق الخاص بك: ${otp}</message>
</sms>`;

    let smsStatus = "sent";
    let providerResponse = null;

    try {
      const smsRes = await fetch("https://019sms.co.il/api", {
        method: "POST",
        headers: {
          "Content-Type": "application/xml",
        },
        body: xmlBody,
      });
      providerResponse = await smsRes.text();
      if (!smsRes.ok) {
        smsStatus = "failed";
      }
    } catch (e) {
      smsStatus = "failed";
      providerResponse = String(e);
    }

    // Log SMS
    await supabase.from("sms_logs").insert({
      user_id: profile.id,
      phone: normalized,
      message: `رمز التحقق الخاص بك: ${otp}`,
      type: "otp",
      status: smsStatus,
      provider_response: { raw: providerResponse },
    });

    return new Response(
      JSON.stringify({ success: true, message: "تم إرسال رمز التحقق" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: "حدث خطأ غير متوقع" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
