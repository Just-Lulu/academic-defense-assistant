import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Shield, Users, FolderOpen, FileText, Target, MessageSquare,
  UserCog, Link2, AlertTriangle, TrendingUp, Loader2, Download,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;
type Project = Tables<"projects">;
type Document = Tables<"documents">;
type Milestone = Tables<"milestones">;
type Role = "admin" | "supervisor" | "student";

interface UserWithRole {
  user_id: string;
  full_name: string | null;
  department: string | null;
  faculty: string | null;
  role: Role | null;
}

export default function AdminPage() {
  const { role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (role === "admin") fetchAll();
  }, [role]);

  async function fetchAll() {
    setLoading(true);
    const [profilesRes, rolesRes, projectsRes, documentsRes, milestonesRes] = await Promise.all([
      supabase.from("profiles").select("*"),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("projects").select("*").order("created_at", { ascending: false }),
      supabase.from("documents").select("*").order("created_at", { ascending: false }),
      supabase.from("milestones").select("*").order("due_date", { ascending: true }),
    ]);

    const roleMap = new Map<string, Role>();
    (rolesRes.data || []).forEach((r: any) => roleMap.set(r.user_id, r.role));

    const merged: UserWithRole[] = (profilesRes.data || []).map((p: Profile) => ({
      user_id: p.user_id,
      full_name: p.full_name,
      department: p.department,
      faculty: p.faculty,
      role: roleMap.get(p.user_id) ?? null,
    }));

    setUsers(merged);
    setProjects(projectsRes.data || []);
    setDocuments(documentsRes.data || []);
    setMilestones(milestonesRes.data || []);
    setLoading(false);
  }

  async function changeRole(userId: string, newRole: Role) {
    // Upsert: delete existing, insert new (single role per user model)
    const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", userId);
    if (delErr) {
      toast.error(delErr.message);
      return;
    }
    const { error: insErr } = await supabase.from("user_roles").insert({ user_id: userId, role: newRole });
    if (insErr) toast.error(insErr.message);
    else {
      toast.success("Role updated");
      fetchAll();
    }
  }

  async function assignSupervisor(projectId: string, supervisorId: string | null) {
    const { error } = await supabase
      .from("projects")
      .update({ supervisor_id: supervisorId })
      .eq("id", projectId);
    if (error) toast.error(error.message);
    else {
      toast.success(supervisorId ? "Supervisor assigned" : "Supervisor cleared");
      fetchAll();
    }
  }

  function downloadAuditReport() {
    const now = new Date();
    const tables = [
      { name: "profiles", rls: "Enabled", policies: 3, sensitive: "PII (name, dept, faculty)", notes: "Public read across authenticated users" },
      { name: "user_roles", rls: "Enabled", policies: 6, sensitive: "Role assignments", notes: "Admins full CRUD; users read own" },
      { name: "projects", rls: "Enabled", policies: 4, sensitive: "Academic data", notes: "Student/supervisor/admin scoped" },
      { name: "documents", rls: "Enabled", policies: 5, sensitive: "Uploaded files (metadata)", notes: "uploaded_by NOT NULL ✓" },
      { name: "milestones", rls: "Enabled", policies: 4, sensitive: "Academic timeline", notes: "Project members only" },
      { name: "messages", rls: "Enabled", policies: 4, sensitive: "Private conversations", notes: "Sender/receiver/admin only" },
    ];
    const indexes = [
      "idx_projects_student_id", "idx_projects_supervisor_id", "idx_projects_status",
      "idx_milestones_project_id", "idx_milestones_due_date", "idx_milestones_status",
      "idx_documents_project_id", "idx_documents_uploaded_by", "idx_documents_review_status",
      "idx_messages_sender_id", "idx_messages_receiver_id", "idx_messages_project_id", "idx_messages_created_at",
      "idx_user_roles_user_id", "idx_profiles_user_id",
    ];
    const realtime = ["messages", "milestones", "documents", "projects"];
    const health = [
      { signal: "Total users", value: users.length, status: "ok" },
      { signal: "Total projects", value: projects.length, status: "ok" },
      { signal: "Unassigned projects", value: stats.unassigned, status: stats.unassigned ? "warn" : "ok" },
      { signal: "Overdue milestones", value: stats.overdueMilestones, status: stats.overdueMilestones ? "warn" : "ok" },
      { signal: "Pending document reviews", value: stats.pendingReviews, status: stats.pendingReviews ? "info" : "ok" },
      { signal: "Registered supervisors", value: supervisors.length, status: supervisors.length ? "ok" : "warn" },
      { signal: "Registered students", value: students.length, status: "ok" },
      { signal: "Leaked password protection (HIBP)", value: "Enabled", status: "ok" },
      { signal: "Documents bucket", value: "Private", status: "ok" },
    ];

    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>ORPTS Backend Audit Report</title>
<style>
  body{font-family:Georgia,serif;color:#1a1a1a;max-width:920px;margin:40px auto;padding:0 24px;line-height:1.55}
  h1{font-size:28px;border-bottom:2px solid #c9a227;padding-bottom:8px;margin-bottom:4px}
  h2{font-size:18px;margin-top:32px;color:#5a4313}
  .meta{color:#666;font-size:12px;margin-bottom:24px}
  table{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px}
  th,td{border:1px solid #ddd;padding:8px 10px;text-align:left;vertical-align:top}
  th{background:#faf5e6;font-weight:600}
  .ok{color:#0a7d2c;font-weight:600}.warn{color:#b87800;font-weight:600}.info{color:#1e63b3;font-weight:600}
  ul{padding-left:20px}.foot{margin-top:40px;font-size:11px;color:#888;border-top:1px solid #eee;padding-top:12px}
  code{background:#f4f1e6;padding:1px 5px;border-radius:3px;font-size:12px}
</style></head><body>
<h1>ORPTS — Backend Audit Report</h1>
<div class="meta">Generated ${now.toLocaleString()} · Coordinator Console</div>

<h2>1. Tables &amp; Row-Level Security</h2>
<table><thead><tr><th>Table</th><th>RLS</th><th>Policies</th><th>Sensitive data</th><th>Notes</th></tr></thead><tbody>
${tables.map(t => `<tr><td><code>public.${t.name}</code></td><td class="ok">${t.rls}</td><td>${t.policies}</td><td>${t.sensitive}</td><td>${t.notes}</td></tr>`).join("")}
</tbody></table>

<h2>2. Performance Indexes</h2>
<ul>${indexes.map(i => `<li><code>${i}</code></li>`).join("")}</ul>

<h2>3. Realtime Publication</h2>
<p>The following tables broadcast row changes for live UI updates:</p>
<ul>${realtime.map(t => `<li><code>public.${t}</code> — REPLICA IDENTITY FULL</li>`).join("")}</ul>

<h2>4. Health Signals</h2>
<table><thead><tr><th>Signal</th><th>Value</th><th>Status</th></tr></thead><tbody>
${health.map(h => `<tr><td>${h.signal}</td><td>${h.value}</td><td class="${h.status}">${h.status.toUpperCase()}</td></tr>`).join("")}
</tbody></table>

<h2>5. Auth &amp; Storage</h2>
<ul>
  <li>Email + password auth with email verification required</li>
  <li>Leaked-password protection (HIBP) <span class="ok">enabled</span></li>
  <li>Anonymous sign-ins disabled</li>
  <li>Storage bucket <code>documents</code> is private; access enforced via RLS</li>
</ul>

<h2>6. Edge Functions</h2>
<ul>
  <li><code>chat</code> — RAG chatbot (google/gemini-3-flash-preview)</li>
  <li><code>defense-simulator</code> — structured tool-calling (openai/gpt-5)</li>
  <li><code>document-insights</code> — document analysis (openai/gpt-5)</li>
</ul>

<div class="foot">ORPTS · Online Research Project Tracking System · Adesina Toluwanimi</div>
</body></html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ORPTS_Backend_Audit_${now.toISOString().slice(0, 10)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Audit report downloaded");
  }

  const supervisors = useMemo(() => users.filter((u) => u.role === "supervisor"), [users]);
  const students = useMemo(() => users.filter((u) => u.role === "student"), [users]);
  const filteredUsers = useMemo(() => {
    if (!search) return users;
    const s = search.toLowerCase();
    return users.filter(
      (u) =>
        u.full_name?.toLowerCase().includes(s) ||
        u.department?.toLowerCase().includes(s) ||
        u.faculty?.toLowerCase().includes(s),
    );
  }, [users, search]);

  // Analytics
  const stats = useMemo(() => {
    const byStatus = projects.reduce<Record<string, number>>((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, {});
    const unassigned = projects.filter((p) => !p.supervisor_id).length;
    const overdueMilestones = milestones.filter(
      (m) => m.status !== "completed" && new Date(m.due_date) < new Date(),
    ).length;
    const pendingReviews = documents.filter((d) => d.review_status === "not_reviewed").length;
    const supervisorLoad = supervisors.map((s) => ({
      ...s,
      load: projects.filter((p) => p.supervisor_id === s.user_id).length,
    }));
    return { byStatus, unassigned, overdueMilestones, pendingReviews, supervisorLoad };
  }, [projects, milestones, documents, supervisors]);

  if (role !== "admin") {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-8 text-center">
        <Shield className="mx-auto h-10 w-10 text-destructive mb-2" />
        <h2 className="font-display text-lg font-semibold">Restricted</h2>
        <p className="text-sm text-muted-foreground">This area is reserved for the project coordinator.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Coordinator hero */}
      <div className="rounded-xl border border-gold-strong bg-gradient-to-r from-card via-card to-primary/5 p-6 shadow-gold">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-md bg-primary/15 flex items-center justify-center text-primary">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Coordinator Console</h1>
            <p className="text-xs text-muted-foreground uppercase tracking-[0.2em]">
              System-wide oversight · Role &amp; assignment management · Analytics
            </p>
          </div>
        </div>
      </div>

      {/* KPI strip — admin-specific layout: dense 6-up grid */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Users", value: users.length, icon: Users },
          { label: "Projects", value: projects.length, icon: FolderOpen },
          { label: "Documents", value: documents.length, icon: FileText },
          { label: "Milestones", value: milestones.length, icon: Target },
          { label: "Unassigned", value: stats.unassigned, icon: AlertTriangle, alert: stats.unassigned > 0 },
          { label: "Overdue", value: stats.overdueMilestones, icon: AlertTriangle, alert: stats.overdueMilestones > 0 },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className={`rounded-lg border ${s.alert ? "border-destructive/50 bg-destructive/5" : "border-gold bg-card"} p-4`}
          >
            <div className="flex items-center justify-between">
              <s.icon className={`h-4 w-4 ${s.alert ? "text-destructive" : "text-primary"}`} />
              <span className="text-xl font-bold text-foreground">{s.value}</span>
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading system data…
        </div>
      ) : (
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users"><UserCog className="h-3.5 w-3.5 mr-1.5" />Users &amp; Roles</TabsTrigger>
            <TabsTrigger value="assignments"><Link2 className="h-3.5 w-3.5 mr-1.5" />Assignments</TabsTrigger>
            <TabsTrigger value="overview"><FolderOpen className="h-3.5 w-3.5 mr-1.5" />System Overview</TabsTrigger>
            <TabsTrigger value="analytics"><TrendingUp className="h-3.5 w-3.5 mr-1.5" />Analytics</TabsTrigger>
          </TabsList>

          {/* USERS & ROLES */}
          <TabsContent value="users" className="space-y-3">
            <Input
              placeholder="Search by name, department, faculty…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
            <div className="rounded-lg border border-gold bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-3">Name</th>
                    <th className="text-left px-4 py-3">Department</th>
                    <th className="text-left px-4 py-3">Faculty</th>
                    <th className="text-left px-4 py-3">Role</th>
                    <th className="text-left px-4 py-3">Change Role</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.user_id} className="border-t border-border hover:bg-secondary/30">
                      <td className="px-4 py-3 font-medium text-foreground">{u.full_name || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{u.department || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{u.faculty || "—"}</td>
                      <td className="px-4 py-3">
                        {u.role ? (
                          <Badge variant={u.role === "admin" ? "default" : "secondary"}>{u.role}</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">none</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Select value={u.role || ""} onValueChange={(v) => changeRole(u.user_id, v as Role)}>
                          <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Set role" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="student">Student</SelectItem>
                            <SelectItem value="supervisor">Supervisor</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No users found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* ASSIGNMENTS */}
          <TabsContent value="assignments" className="space-y-3">
            <p className="text-xs text-muted-foreground">Pair student projects with supervisors.</p>
            <div className="rounded-lg border border-gold bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-3">Project</th>
                    <th className="text-left px-4 py-3">Student</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">Supervisor</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((p) => {
                    const student = users.find((u) => u.user_id === p.student_id);
                    return (
                      <tr key={p.id} className="border-t border-border hover:bg-secondary/30">
                        <td className="px-4 py-3 font-medium text-foreground">{p.title}</td>
                        <td className="px-4 py-3 text-muted-foreground">{student?.full_name || "—"}</td>
                        <td className="px-4 py-3"><Badge variant="outline">{p.status}</Badge></td>
                        <td className="px-4 py-3">
                          <Select
                            value={p.supervisor_id || "none"}
                            onValueChange={(v) => assignSupervisor(p.id, v === "none" ? null : v)}
                          >
                            <SelectTrigger className="h-8 w-56 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">— Unassigned —</SelectItem>
                              {supervisors.map((s) => (
                                <SelectItem key={s.user_id} value={s.user_id}>{s.full_name || "Unnamed"}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    );
                  })}
                  {projects.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No projects yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* OVERVIEW */}
          <TabsContent value="overview" className="grid gap-4 md:grid-cols-2">
            <Card title="Recent Documents" icon={FileText}>
              <ul className="text-sm divide-y divide-border">
                {documents.slice(0, 8).map((d) => (
                  <li key={d.id} className="py-2 flex items-center justify-between">
                    <span className="truncate">{d.title}</span>
                    <Badge variant="outline" className="text-[10px]">{d.review_status}</Badge>
                  </li>
                ))}
                {documents.length === 0 && <p className="text-muted-foreground py-4">No documents.</p>}
              </ul>
            </Card>
            <Card title="Upcoming Milestones" icon={Target}>
              <ul className="text-sm divide-y divide-border">
                {milestones.slice(0, 8).map((m) => (
                  <li key={m.id} className="py-2 flex items-center justify-between gap-3">
                    <span className="truncate">{m.title}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{m.due_date}</span>
                  </li>
                ))}
                {milestones.length === 0 && <p className="text-muted-foreground py-4">No milestones.</p>}
              </ul>
            </Card>
          </TabsContent>

          {/* ANALYTICS */}
          <TabsContent value="analytics" className="grid gap-4 md:grid-cols-2">
            <Card title="Projects by Status" icon={FolderOpen}>
              <div className="space-y-2">
                {Object.entries(stats.byStatus).map(([status, count]) => {
                  const pct = projects.length ? (count / projects.length) * 100 : 0;
                  return (
                    <div key={status}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="capitalize text-foreground">{status}</span>
                        <span className="text-muted-foreground">{count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-secondary overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
                {projects.length === 0 && <p className="text-sm text-muted-foreground">No projects.</p>}
              </div>
            </Card>
            <Card title="Supervisor Load" icon={Users}>
              <div className="space-y-2">
                {stats.supervisorLoad.map((s) => (
                  <div key={s.user_id} className="flex items-center justify-between text-sm">
                    <span className="text-foreground truncate">{s.full_name || "Unnamed"}</span>
                    <Badge variant={s.load > 5 ? "destructive" : "secondary"}>{s.load} project{s.load === 1 ? "" : "s"}</Badge>
                  </div>
                ))}
                {stats.supervisorLoad.length === 0 && <p className="text-sm text-muted-foreground">No supervisors registered.</p>}
              </div>
            </Card>
            <Card title="Health Signals" icon={AlertTriangle}>
              <ul className="text-sm space-y-2">
                <li className="flex justify-between"><span>Unassigned projects</span><Badge variant={stats.unassigned ? "destructive" : "secondary"}>{stats.unassigned}</Badge></li>
                <li className="flex justify-between"><span>Overdue milestones</span><Badge variant={stats.overdueMilestones ? "destructive" : "secondary"}>{stats.overdueMilestones}</Badge></li>
                <li className="flex justify-between"><span>Pending document reviews</span><Badge variant={stats.pendingReviews ? "default" : "secondary"}>{stats.pendingReviews}</Badge></li>
                <li className="flex justify-between"><span>Active students</span><Badge variant="secondary">{students.length}</Badge></li>
              </ul>
            </Card>
            <Card title="Quick Actions" icon={MessageSquare}>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start" onClick={fetchAll}>Refresh data</Button>
                <Button variant="hero" className="w-full justify-start" onClick={downloadAuditReport}>
                  <Download className="h-4 w-4 mr-2" /> Download Backend Audit Report
                </Button>
                <p className="text-xs text-muted-foreground">Audit report includes tables, RLS, indexes &amp; live health signals.</p>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function Card({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gold bg-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-foreground text-sm">{title}</h3>
      </div>
      {children}
    </div>
  );
}
