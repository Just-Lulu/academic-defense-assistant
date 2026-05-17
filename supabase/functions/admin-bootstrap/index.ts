import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const accounts = [
    { email: "supervisor.adeyemi@orpts.app", password: "Sup3rV!sor#Adey2026", full_name: "Dr. Adeyemi Okonkwo", role: "admin" },
    { email: "supervisor.balogun@orpts.app", password: "Sup3rV!sor#Balo2026", full_name: "Dr. Folake Balogun", role: "supervisor" },
    { email: "supervisor.eze@orpts.app", password: "Sup3rV!sor#Eze!2026", full_name: "Prof. Chidi Eze", role: "supervisor" },
  ];

  const results: any[] = [];
  for (const a of accounts) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: a.email,
      password: a.password,
      email_confirm: true,
      user_metadata: { full_name: a.full_name, role: "supervisor" },
    });
    if (error) { results.push({ email: a.email, error: error.message }); continue; }
    const uid = data.user!.id;
    // Replace default 'student' role from trigger with desired role(s)
    await supabase.from("user_roles").delete().eq("user_id", uid);
    await supabase.from("user_roles").insert({ user_id: uid, role: "supervisor" });
    if (a.role === "admin") {
      await supabase.from("user_roles").insert({ user_id: uid, role: "admin" });
    }
    results.push({ email: a.email, password: a.password, user_id: uid, roles: a.role === "admin" ? ["supervisor", "admin"] : ["supervisor"] });
  }

  // Demote shimacollins93@gmail.com to supervisor-only
  const { data: list } = await supabase.auth.admin.listUsers();
  const shima = list?.users.find((u) => u.email === "shimacollins93@gmail.com");
  if (shima) {
    await supabase.from("user_roles").delete().eq("user_id", shima.id);
    await supabase.from("user_roles").insert({ user_id: shima.id, role: "supervisor" });
    results.push({ email: shima.email, action: "demoted_to_supervisor", user_id: shima.id });
  } else {
    results.push({ email: "shimacollins93@gmail.com", error: "not found" });
  }

  return new Response(JSON.stringify({ results }, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
