import { motion } from "framer-motion";
import {
  FolderOpen, FileText, Target, Users, Brain, Bot, ArrowUpRight, Clock,
  Shield, ClipboardCheck, MessageSquare, AlertTriangle, TrendingUp,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.4 } }),
};

export default function DashboardHome() {
  const { profile, role, user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const greeting = (() => {
    const h = currentTime.getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();
  const displayName = profile?.full_name || "Researcher";

  const roleLabel = role === "admin" ? "Coordinator" : role === "supervisor" ? "Supervisor" : "Student";

  return (
    <div className="space-y-8">
      {/* Hero — same theme, role-tagged subheading */}
      <div>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-primary mb-2">
          {role === "admin" && <Shield className="h-3 w-3" />}
          {role === "supervisor" && <ClipboardCheck className="h-3 w-3" />}
          {role === "student" && <Brain className="h-3 w-3" />}
          <span>{roleLabel} workspace</span>
        </div>
        <h1 className="font-display text-2xl font-bold text-foreground">{greeting}, {displayName}</h1>
        <div className="divider-gold w-16 mt-2 mb-1" />
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Clock className="h-3.5 w-3.5" />
          {currentTime.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          {" · "}
          {currentTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </p>
      </div>

      {role === "admin" && <AdminDash />}
      {role === "supervisor" && user && <SupervisorDash userId={user.id} />}
      {(role === "student" || !role) && <StudentDash />}
    </div>
  );
}

/* -------------------- ADMIN: command-center layout -------------------- */
function AdminDash() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [counts, setCounts] = useState({ users: 0, projects: 0, unassigned: 0, overdue: 0, pendingReviews: 0, unread: 0 });

  async function refresh() {
    const [profilesRes, projectsRes, milestonesRes, documentsRes, unreadRes] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("projects").select("id, supervisor_id"),
      supabase.from("milestones").select("status, due_date"),
      supabase.from("documents").select("review_status"),
      user
        ? supabase.from("messages").select("id", { count: "exact", head: true }).eq("receiver_id", user.id).eq("is_read", false)
        : Promise.resolve({ count: 0 } as any),
    ]);
    const projects = projectsRes.data || [];
    const ms = milestonesRes.data || [];
    const docs = documentsRes.data || [];
    setCounts({
      users: profilesRes.count || 0,
      projects: projects.length,
      unassigned: projects.filter((p: any) => !p.supervisor_id).length,
      overdue: ms.filter((m: any) => m.status !== "completed" && new Date(m.due_date) < new Date()).length,
      pendingReviews: docs.filter((d: any) => d.review_status === "not_reviewed").length,
      unread: (unreadRes as any).count || 0,
    });
  }

  useEffect(() => {
    refresh();
    if (!user) return;
    const ch = supabase
      .channel(`admin-unread-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `receiver_id=eq.${user.id}` }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return (
    <>
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Users", value: counts.users, icon: Users, to: "/app/admin" },
          { label: "Projects", value: counts.projects, icon: FolderOpen, to: "/app/projects" },
          { label: "Unassigned", value: counts.unassigned, icon: AlertTriangle, to: "/app/admin", alert: counts.unassigned > 0 },
          { label: "Overdue", value: counts.overdue, icon: AlertTriangle, to: "/app/milestones", alert: counts.overdue > 0 },
          { label: "Pending Reviews", value: counts.pendingReviews, icon: ClipboardCheck, to: "/app/admin" },
          { label: "Unread Messages", value: counts.unread, icon: MessageSquare, to: "/app/messages", alert: counts.unread > 0, live: true },
        ].map((s, i) => (
          <motion.button
            key={s.label} custom={i} initial="hidden" animate="visible" variants={fadeUp}
            onClick={() => navigate(s.to)}
            className={`relative rounded-lg border ${s.alert ? "border-destructive/50 bg-destructive/5" : "border-gold bg-card"} p-4 text-left hover:shadow-gold transition-all`}
          >
            {s.live && (
              <span className="absolute top-2 right-2 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
            )}
            <div className="flex items-center justify-between">
              <s.icon className={`h-4 w-4 ${s.alert ? "text-destructive" : "text-primary"}`} />
              <span className="text-xl font-bold text-foreground">{s.value}</span>
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
          </motion.button>
        ))}
      </div>

      <div>
        <h2 className="font-display text-lg font-semibold text-foreground mb-4">Coordinator Tools</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <ActionCard to="/app/admin" icon={Shield} label="Coordinator Console" desc="Manage users, roles, supervisor assignments and analytics" />
          <ActionCard to="/app/projects" icon={FolderOpen} label="All Projects" desc="System-wide view of every research project" />
          <ActionCard to="/app/documents" icon={FileText} label="Documents" desc="Browse and audit submissions across the system" />
          <ActionCard to="/app/messages" icon={MessageSquare} label="Messages" desc="Reach any user directly" />
        </div>
      </div>
    </>
  );
}

/* ---------------- SUPERVISOR: review-queue-first layout ---------------- */
function SupervisorDash({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const [counts, setCounts] = useState({ assigned: 0, pendingReviews: 0, pendingMilestones: 0, unread: 0 });

  async function refresh() {
    const projectsRes = await supabase.from("projects").select("id").eq("supervisor_id", userId);
    const projectIds = (projectsRes.data || []).map((p: any) => p.id);

    let pendingReviews = 0;
    let pendingMilestones = 0;
    if (projectIds.length) {
      const [docsRes, msRes] = await Promise.all([
        supabase.from("documents").select("review_status").in("project_id", projectIds),
        supabase.from("milestones").select("approved, status").in("project_id", projectIds),
      ]);
      pendingReviews = (docsRes.data || []).filter((d: any) => d.review_status === "not_reviewed").length;
      pendingMilestones = (msRes.data || []).filter((m: any) => !m.approved && m.status === "completed").length;
    }
    const unreadRes = await supabase
      .from("messages").select("id", { count: "exact", head: true })
      .eq("receiver_id", userId).eq("is_read", false);

    setCounts({
      assigned: projectIds.length,
      pendingReviews,
      pendingMilestones,
      unread: unreadRes.count || 0,
    });
  }

  useEffect(() => {
    refresh();
    const ch = supabase
      .channel(`supervisor-unread-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `receiver_id=eq.${userId}` }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return (
    <>
      {/* Review queue front and center */}
      <div className="rounded-xl border border-gold-strong bg-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <ClipboardCheck className="h-4 w-4 text-primary" />
          <h2 className="font-display text-base font-semibold">Review Queue</h2>
          <span className="ml-auto flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-primary">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            Live
          </span>
        </div>
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <Stat icon={FolderOpen} label="Assigned Projects" value={counts.assigned} />
          <Stat icon={FileText} label="Documents to Review" value={counts.pendingReviews} alert={counts.pendingReviews > 0} />
          <Stat icon={Target} label="Milestones to Approve" value={counts.pendingMilestones} alert={counts.pendingMilestones > 0} />
          <Stat icon={MessageSquare} label="Unread Messages" value={counts.unread} alert={counts.unread > 0} />
        </div>
      </div>

      <div>
        <h2 className="font-display text-lg font-semibold text-foreground mb-4">Supervision Tools</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <ActionCard to="/app/supervisor" icon={Users} label="Supervisor Hub" desc="Review documents, approve milestones, and message students" />
          <ActionCard to="/app/messages" icon={MessageSquare} label="Messages" desc="Direct conversations with your students" />
          <ActionCard to="/app/schedule" icon={Clock} label="Schedule" desc="Upcoming meetings and deadlines" />
          <ActionCard to="/app/chatbot" icon={Bot} label="AI Assistant" desc="Ask about supervision best practices" />
        </div>
      </div>
    </>
  );
}

/* ----------------------- STUDENT: original layout ---------------------- */
function StudentDash() {
  const navigate = useNavigate();
  const [counts, setCounts] = useState({ projects: 0, documents: 0, milestones: 0, messages: 0 });

  useEffect(() => {
    (async () => {
      const [p, d, m, msg] = await Promise.all([
        supabase.from("projects").select("id", { count: "exact", head: true }),
        supabase.from("documents").select("id", { count: "exact", head: true }),
        supabase.from("milestones").select("id", { count: "exact", head: true }),
        supabase.from("messages").select("id", { count: "exact", head: true }),
      ]);
      setCounts({
        projects: p.count || 0, documents: d.count || 0, milestones: m.count || 0, messages: msg.count || 0,
      });
    })();
  }, []);

  const stats = [
    { label: "Projects", value: counts.projects, icon: FolderOpen, to: "/app/projects" },
    { label: "Documents", value: counts.documents, icon: FileText, to: "/app/documents" },
    { label: "Milestones", value: counts.milestones, icon: Target, to: "/app/milestones" },
    { label: "Messages", value: counts.messages, icon: Users, to: "/app/messages" },
  ];

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <motion.button
            key={s.label} custom={i} initial="hidden" animate="visible" variants={fadeUp}
            onClick={() => navigate(s.to)}
            className="rounded-lg border border-gold bg-card p-5 transition-all hover:shadow-gold hover:-translate-y-0.5 text-left"
          >
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center text-primary"><s.icon className="h-5 w-5" /></div>
              <span className="text-2xl font-bold text-foreground">{s.value}</span>
            </div>
            <p className="mt-3 text-xs text-muted-foreground uppercase tracking-wider">{s.label}</p>
          </motion.button>
        ))}
      </div>

      <div>
        <h2 className="font-display text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <ActionCard to="/app/defense-simulator" icon={Brain} label="Defense Simulator" desc="Upload thesis & generate mock questions" />
          <ActionCard to="/app/chatbot" icon={Bot} label="AI Chatbot" desc="Ask questions about your project" />
          <ActionCard to="/app/projects" icon={FolderOpen} label="My Projects" desc="View and manage your research projects" />
          <ActionCard to="/app/schedule" icon={Clock} label="Schedule" desc="View upcoming meetings and deadlines" />
        </div>
      </div>
    </>
  );
}

/* -------------------------- shared sub-components -------------------------- */
function ActionCard({ to, icon: Icon, label, desc }: { to: string; icon: any; label: string; desc: string }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(to)}
      className="group flex items-start gap-4 rounded-lg border border-gold bg-card p-6 text-left transition-all hover:shadow-gold hover:-translate-y-0.5"
    >
      <div className="h-12 w-12 shrink-0 rounded-md bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
        <Icon className="h-6 w-6" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground">{label}</span>
          <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
      </div>
    </button>
  );
}

function Stat({ icon: Icon, label, value, alert }: { icon: any; label: string; value: number; alert?: boolean }) {
  return (
    <div className={`rounded-md border ${alert ? "border-destructive/50 bg-destructive/5" : "border-border bg-secondary/40"} p-3`}>
      <div className="flex items-center justify-between">
        <Icon className={`h-4 w-4 ${alert ? "text-destructive" : "text-primary"}`} />
        <span className="text-lg font-bold text-foreground">{value}</span>
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
    </div>
  );
}
