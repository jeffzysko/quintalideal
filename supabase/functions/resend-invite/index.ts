import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.0";

Deno.serve(async (req) => {
  const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
    const email = "eai@mindsc.com.br";

    const { data: linkData } = await admin.auth.admin.generateLink({
      type: "recovery", email,
      options: { redirectTo: "https://quintalideal.com.br/reset-password" },
    });

    const recoveryLink = linkData?.properties?.action_link || "";
    console.log("Recovery link:", recoveryLink);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Quintal Ideal Splash <noreply@hallow.com.br>",
        to: [email],
        subject: "🏊 Seu acesso ao Quintal Ideal",
        html: `<p>Olá! Clique para definir sua senha: <a href="${recoveryLink}">${recoveryLink}</a></p>`,
      }),
    });
    const data = await res.json();
    console.log("Resend:", res.status, JSON.stringify(data));

    return new Response(JSON.stringify({ resend_status: res.status, resend_data: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
