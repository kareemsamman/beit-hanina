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

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "غير مصرح" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller } } = await supabase.auth.getUser(token);
    if (!caller) {
      return new Response(JSON.stringify({ error: "غير مصرح" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .single();

    if (!callerProfile || callerProfile.role !== "admin") {
      return new Response(JSON.stringify({ error: "صلاحيات غير كافية" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { phones, message, type, user_ids } = await req.json();

    if (!phones || !Array.isArray(phones) || !message || !type) {
      return new Response(JSON.stringify({ error: "البيانات غير مكتملة" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const smsUser = Deno.env.get("SMS_API_USER");
    const smsToken = Deno.env.get("SMS_API_TOKEN");
    const smsSource = Deno.env.get("SMS_SOURCE_PHONE");

    const results = [];

    for (let i = 0; i < phones.length; i++) {
      const phone = phones[i];
      // Convert +972XXXXXXXXX to 0XXXXXXXXX for 019SMS API
      const smsPhone = phone.startsWith("+972")
        ? "0" + phone.slice(4)
        : phone.startsWith("972")
        ? "0" + phone.slice(3)
        : phone;

      const smsBody = {
        sms: {
          user: { username: smsUser },
          source: smsSource,
          destinations: {
            phone: [{ _: smsPhone }],
          },
          message: message,
        },
      };

      let status = "sent";
      let providerResponse = null;

      try {
        const res = await fetch("https://019sms.co.il/api", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${smsToken}`,
          },
          body: JSON.stringify(smsBody),
        });
        providerResponse = await res.text();
        if (!res.ok) status = "failed";
      } catch (e) {
        status = "failed";
        providerResponse = String(e);
      }

      // Log
      await supabase.from("sms_logs").insert({
        user_id: user_ids?.[i] || null,
        phone,
        message,
        type,
        status,
        provider_response: { raw: providerResponse },
      });

      results.push({ phone, status });
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: "حدث خطأ غير متوقع" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
