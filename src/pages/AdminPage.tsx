import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Shield, Users, FolderOpen, FileText, Target, MessageSquare,
  UserCog, Link2, AlertTriangle, TrendingUp, Loader2,
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
                <p className="text-xs text-muted-foreground">Use the tabs above to assign roles and supervisors.</p>
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
