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

  // 1) Reset Aisha Bello's password
  const aishaEmail = "student.demo@orpts.test";
  const aishaPassword = "Stud3nt!Aisha2026";
  const { data: list } = await admin.auth.admin.listUsers();
  const aisha = list?.users.find((u) => u.email === aishaEmail);
  if (aisha) {
    const { error } = await admin.auth.admin.updateUserById(aisha.id, {
      password: aishaPassword,
      email_confirm: true,
    });
    results.push({ email: aishaEmail, action: error ? "reset_failed" : "password_reset", password: aishaPassword, error: error?.message });
  } else {
    results.push({ email: aishaEmail, error: "not_found" });
  }

  // 2) Create Talia Okafor (student)
  const taliaEmail = "student.talia@orpts.app";
  const taliaPassword = "Stud3nt!Talia2026";
  const existingTalia = list?.users.find((u) => u.email === taliaEmail);
  let taliaId = existingTalia?.id;
  if (existingTalia) {
    const { error } = await admin.auth.admin.updateUserById(existingTalia.id, {
      password: taliaPassword, email_confirm: true,
    });
    results.push({ email: taliaEmail, action: "password_reset", password: taliaPassword, error: error?.message });
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: taliaEmail,
      password: taliaPassword,
      email_confirm: true,
      user_metadata: { full_name: "Talia Okafor", role: "student" },
    });
    if (error) { results.push({ email: taliaEmail, error: error.message }); }
    else {
      taliaId = data.user!.id;
      results.push({ email: taliaEmail, action: "created", password: taliaPassword, user_id: taliaId });
    }
  }
  if (taliaId) {
    await admin.from("user_roles").delete().eq("user_id", taliaId);
    await admin.from("user_roles").insert({ user_id: taliaId, role: "student" });
  }

  return new Response(JSON.stringify({ results }, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
