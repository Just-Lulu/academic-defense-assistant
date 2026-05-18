import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const userId = "6221d1ab-c4ba-4458-b635-d0ab4c8e0660";
  const password = "Stud3nt!Chakara2026";
  const { data: u } = await admin.auth.admin.getUserById(userId);
  const { error } = await admin.auth.admin.updateUserById(userId, { password, email_confirm: true });
  return new Response(JSON.stringify({ email: u?.user?.email, password, error: error?.message }, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
