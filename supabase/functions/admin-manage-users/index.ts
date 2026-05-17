import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Role = "admin" | "supervisor" | "student";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // --- Verify caller is admin ---
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return json({ error: "Missing auth token" }, 401);

    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "Invalid token" }, 401);

    const callerId = userData.user.id;
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId);
    const isAdmin = (roles || []).some((r: any) => r.role === "admin");
    if (!isAdmin) return json({ error: "Forbidden: admin only" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    // --- CREATE USER ---
    if (action === "create_user") {
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");
      const full_name = String(body.full_name || "").trim();
      const requestedRoles: Role[] = Array.isArray(body.roles) && body.roles.length
        ? body.roles
        : ["supervisor"];

      if (!email || !password || password.length < 8) {
        return json({ error: "Email and password (min 8 chars) required" }, 400);
      }

      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: full_name || email, role: "supervisor" },
      });
      if (createErr) return json({ error: createErr.message }, 400);

      const uid = created.user!.id;
      // Replace default 'student' role from trigger with requested roles
      await admin.from("user_roles").delete().eq("user_id", uid);
      const rows = Array.from(new Set(requestedRoles)).map((r) => ({ user_id: uid, role: r }));
      const { error: insErr } = await admin.from("user_roles").insert(rows);
      if (insErr) return json({ error: insErr.message }, 400);

      return json({ ok: true, user_id: uid, email, roles: rows.map((r) => r.role) });
    }

    // --- SET ROLES (multi-role aware, preserves supervisor when granting admin) ---
    if (action === "set_roles") {
      const target = String(body.user_id || "");
      const newRoles: Role[] = Array.isArray(body.roles) ? body.roles : [];
      if (!target) return json({ error: "user_id required" }, 400);

      // Safety: an account must always end up with at least one role; default to student
      const finalRoles: Role[] = newRoles.length ? newRoles : ["student"];

      // Prevent the caller from removing their own last admin role (lockout protection)
      if (target === callerId && !finalRoles.includes("admin")) {
        return json({ error: "You cannot remove your own admin role" }, 400);
      }

      await admin.from("user_roles").delete().eq("user_id", target);
      const rows = Array.from(new Set(finalRoles)).map((r) => ({ user_id: target, role: r }));
      const { error: insErr } = await admin.from("user_roles").insert(rows);
      if (insErr) return json({ error: insErr.message }, 400);

      return json({ ok: true, user_id: target, roles: rows.map((r) => r.role) });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
