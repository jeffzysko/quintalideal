import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.0";

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  
  const body = await req.json();
  const { data, error } = await adminClient.auth.admin.updateUserById(body.user_id, { password: body.password });
  
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { "Content-Type": "application/json" } });
  return new Response(JSON.stringify({ ok: true, email: data.user.email }), { headers: { "Content-Type": "application/json" } });
});
