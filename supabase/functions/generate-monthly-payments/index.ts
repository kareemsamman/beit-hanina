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

    // Optional month/year override
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // No body is fine
    }

    const now = new Date();
    const month = body?.month || now.getMonth() + 1;
    const year = body?.year || now.getFullYear();

    // Get default fee
    const { data: settings } = await supabase
      .from("settings")
      .select("default_monthly_fee")
      .eq("id", 1)
      .single();

    const fee = settings?.default_monthly_fee || 100;

    // Get all active residents
    const { data: residents } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "resident")
      .eq("is_active", true);

    if (!residents || residents.length === 0) {
      return new Response(
        JSON.stringify({ success: true, created: 0, message: "لا يوجد سكان فعالين" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert payments (ON CONFLICT DO NOTHING)
    const payments = residents.map((r) => ({
      user_id: r.id,
      month,
      year,
      amount: fee,
      status: "unpaid",
    }));

    const { data: inserted, error } = await supabase
      .from("monthly_payments")
      .upsert(payments, { onConflict: "user_id,month,year", ignoreDuplicates: true });

    return new Response(
      JSON.stringify({
        success: true,
        created: residents.length,
        month,
        year,
        fee,
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
