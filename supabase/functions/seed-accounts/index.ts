import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const results: any[] = [];
  const { data: list } = await admin.auth.admin.listUsers();

  // Aisha
  const aishaEmail = "student.demo@orpts.test";
  const aishaPassword = "Stud3nt!Aisha2026";
  const aisha = list?.users.find((u) => u.email === aishaEmail);
  if (aisha) {
    const { error } = await admin.auth.admin.updateUserById(aisha.id, { password: aishaPassword, email_confirm: true });
    results.push({ email: aishaEmail, password: aishaPassword, error: error?.message });
  }

  // Talia
  const taliaEmail = "student.talia@orpts.app";
  const taliaPassword = "Stud3nt!Talia2026";
  const talia = list?.users.find((u) => u.email === taliaEmail);
  let taliaId = talia?.id;
  if (talia) {
    const { error } = await admin.auth.admin.updateUserById(talia.id, { password: taliaPassword, email_confirm: true });
    results.push({ email: taliaEmail, password: taliaPassword, error: error?.message });
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: taliaEmail, password: taliaPassword, email_confirm: true,
      user_metadata: { full_name: "Talia Okafor", role: "student" },
    });
    if (!error) taliaId = data.user!.id;
    results.push({ email: taliaEmail, password: taliaPassword, error: error?.message });
  }
  if (taliaId) {
    await admin.from("user_roles").delete().eq("user_id", taliaId);
    await admin.from("user_roles").insert({ user_id: taliaId, role: "student" });
  }

  // Chakara — reset by user_id
  const chakaraId = "6221d1ab-c4ba-4458-b635-d0ab4c8e0660";
  const chakaraPassword = "Stud3nt!Chakara2026";
  const chakara = list?.users.find((u) => u.id === chakaraId);
  if (chakara) {
    const { error } = await admin.auth.admin.updateUserById(chakaraId, { password: chakaraPassword, email_confirm: true });
    results.push({ email: chakara.email, password: chakaraPassword, error: error?.message });
  } else {
    results.push({ user_id: chakaraId, error: "not_found" });
  }

  return new Response(JSON.stringify({ results }, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
