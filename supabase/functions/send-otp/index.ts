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

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function parseProviderResponse(raw: string | null) {
  if (!raw) {
    return { ok: false, status: null, message: null };
  }

  try {
    const parsed = JSON.parse(raw) as { status?: string | number; message?: string };
    const status = parsed.status != null ? String(parsed.status) : null;
    return {
      ok: status === "0",
      status,
      message: parsed.message ?? null,
    };
  } catch {
    const status = raw.match(/<status>([^<]+)<\/status>/i)?.[1] ?? null;
    const message = raw.match(/<message>([^<]+)<\/message>/i)?.[1] ?? null;
    return {
      ok: status === "0",
      status,
      message,
    };
  }
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

    const otp = String(Math.floor(1000 + Math.random() * 9000));
    const codeHash = await hashOtp(otp);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const smsUser = Deno.env.get("SMS_API_USER");
    const smsToken = Deno.env.get("SMS_API_TOKEN");
    const smsSource = Deno.env.get("SMS_SOURCE_PHONE");

    console.log("DEBUG SMS creds:", {
      user: smsUser ? `${smsUser.substring(0, 4)}...(${smsUser.length})` : "MISSING",
      token: smsToken ? `${smsToken.substring(0, 4)}...(${smsToken.length})` : "MISSING",
      source: smsSource || "MISSING",
    });

    if (!smsUser || !smsToken || !smsSource) {
      return new Response(JSON.stringify({ error: "إعدادات الرسائل النصية غير مكتملة" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: otpRecord, error: otpInsertError } = await supabase
      .from("otp_codes")
      .insert({
        phone: normalized,
        code_hash: codeHash,
        expires_at: expiresAt,
      })
      .select("id")
      .single();

    if (otpInsertError) {
      throw otpInsertError;
    }

    const smsPhone = normalized.startsWith("+") ? normalized.slice(1) : normalized;
    const smsMessage = `رمز التحقق الخاص بك: ${otp}`;
    const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<sms>
  <user>
    <username>${escapeXml(smsUser)}</username>
    <password>${escapeXml(smsToken)}</password>
  </user>
  <source>${escapeXml(smsSource)}</source>
  <destinations>
    <phone id="1">${escapeXml(smsPhone)}</phone>
  </destinations>
  <message>${escapeXml(smsMessage)}</message>
</sms>`;

    let smsStatus = "failed";
    let providerResponse: string | null = null;
    let providerStatus: string | null = null;
    let providerMessage: string | null = null;

    try {
      const smsRes = await fetch("https://019sms.co.il/api", {
        method: "POST",
        headers: { "Content-Type": "application/xml" },
        body: xmlBody,
      });
      providerResponse = await smsRes.text();
      const parsedProvider = parseProviderResponse(providerResponse);
      providerStatus = parsedProvider.status;
      providerMessage = parsedProvider.message;

      if (smsRes.ok && parsedProvider.ok) {
        smsStatus = "sent";
      }
    } catch (e) {
      providerResponse = String(e);
      providerMessage = "تعذر الاتصال بمزود الرسائل";
    }

    await supabase.from("sms_logs").insert({
      user_id: profile.id,
      phone: normalized,
      message: smsMessage,
      type: "otp",
      status: smsStatus,
      provider_response: {
        raw: providerResponse,
        status: providerStatus,
        message: providerMessage,
      },
    });

    if (smsStatus !== "sent") {
      await supabase.from("otp_codes").delete().eq("id", otpRecord.id);

      return new Response(
        JSON.stringify({ error: providerMessage || "تعذر إرسال رمز التحقق" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
