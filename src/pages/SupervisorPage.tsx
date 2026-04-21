import { useEffect, useState } from "react";
import { Users, FolderOpen, FileText, Target, CheckCircle, Clock, AlertCircle, Download, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import type { Tables } from "@/integrations/supabase/types";

type Project = Tables<"projects">;
type Document = Tables<"documents">;
type Milestone = Tables<"milestones">;

const milestoneStatusCfg = {
  completed: { icon: CheckCircle, badge: "border-success/30 bg-success/10 text-success" },
  upcoming: { icon: Clock, badge: "border-info/30 bg-info/10 text-info" },
  overdue: { icon: AlertCircle, badge: "border-destructive/30 bg-destructive/10 text-destructive" },
};

export default function SupervisorPage() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [students, setStudents] = useState<Record<string, string>>({});
  const [documents, setDocuments] = useState<Document[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  // New milestone form
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [mTitle, setMTitle] = useState("");
  const [mDesc, setMDesc] = useState("");
  const [mDue, setMDue] = useState("");
  const [savingMilestone, setSavingMilestone] = useState(false);

  useEffect(() => {
    if (user) fetchAssignedProjects();
  }, [user]);

  useEffect(() => {
    if (activeProject) fetchProjectDetails(activeProject.id);
  }, [activeProject]);

  async function fetchAssignedProjects() {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("supervisor_id", user.id)
      .order("created_at", { ascending: false });
    if (error) { toast.error(error.message); setLoading(false); return; }
    setProjects(data || []);

    // fetch student names
    const studentIds = Array.from(new Set((data || []).map((p) => p.student_id)));
    if (studentIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", studentIds);
      const map: Record<string, string> = {};
      profs?.forEach((p) => { map[p.user_id] = p.full_name || "Unknown student"; });
      setStudents(map);
    }
    setLoading(false);
  }

  async function fetchProjectDetails(projectId: string) {
    const [docsRes, msRes] = await Promise.all([
      supabase.from("documents").select("*").eq("project_id", projectId).order("created_at", { ascending: false }),
      supabase.from("milestones").select("*").eq("project_id", projectId).order("due_date", { ascending: true }),
    ]);
    setDocuments(docsRes.data || []);
    setMilestones(msRes.data || []);
  }

  async function updateProjectStatus(projectId: string, status: string) {
    const { error } = await supabase.from("projects").update({ status }).eq("id", projectId);
    if (error) toast.error(error.message);
    else {
      toast.success("Project status updated");
      fetchAssignedProjects();
      if (activeProject?.id === projectId) setActiveProject({ ...activeProject, status });
    }
  }

  async function updateProgress(projectId: string, progress: number) {
    const { error } = await supabase.from("projects").update({ progress }).eq("id", projectId);
    if (error) toast.error(error.message);
    else {
      fetchAssignedProjects();
      if (activeProject?.id === projectId) setActiveProject({ ...activeProject, progress });
    }
  }

  async function downloadDoc(doc: Document) {
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(doc.file_path, 60);
    if (error || !data) { toast.error("Could not generate download link"); return; }
    window.open(data.signedUrl, "_blank");
  }

  async function toggleMilestone(m: Milestone) {
    const newStatus = m.status === "completed" ? "upcoming" : "completed";
    const { error } = await supabase.from("milestones").update({ status: newStatus }).eq("id", m.id);
    if (error) toast.error(error.message);
    else if (activeProject) fetchProjectDetails(activeProject.id);
  }

  async function createMilestone(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !activeProject) return;
    setSavingMilestone(true);
    const { error } = await supabase.from("milestones").insert({
      title: mTitle,
      description: mDesc || null,
      due_date: mDue,
      project_id: activeProject.id,
      created_by: user.id,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Milestone added");
      setMTitle(""); setMDesc(""); setMDue(""); setShowMilestoneForm(false);
      fetchProjectDetails(activeProject.id);
    }
    setSavingMilestone(false);
  }

  function messageStudent(studentId: string) {
    navigate("/app/messages");
    // Light navigation; user can pick the conversation
  }

  if (role && role !== "supervisor" && role !== "admin") {
    return (
      <div className="rounded-lg border border-gold bg-card p-8 text-center">
        <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <h2 className="font-display text-lg font-semibold text-foreground">Supervisor area</h2>
        <p className="text-sm text-muted-foreground mt-1">This page is only available to users with a supervisor role.</p>
      </div>
    );
  }

  if (activeProject) {
    const completedCount = milestones.filter((m) => m.status === "completed").length;
    return (
      <div className="space-y-6">
        <button onClick={() => setActiveProject(null)} className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to assigned projects
        </button>

        <div className="rounded-lg border border-gold bg-card p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-bold text-foreground truncate">{activeProject.title}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Student: <span className="text-foreground font-medium">{students[activeProject.student_id] || "Unknown"}</span>
                {activeProject.department && <> · {activeProject.department}</>}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => messageStudent(activeProject.student_id)}>
              <MessageSquare className="h-4 w-4 mr-1" /> Message
            </Button>
          </div>

          {activeProject.description && (
            <p className="text-sm text-foreground">{activeProject.description}</p>
          )}
          {activeProject.abstract && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Abstract</p>
              <p className="text-sm text-foreground">{activeProject.abstract}</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</label>
              <select
                value={activeProject.status}
                onChange={(e) => updateProjectStatus(activeProject.id, e.target.value)}
                className="mt-1.5 w-full rounded-md border border-gold bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="draft">Draft</option>
                <option value="in_progress">In Progress</option>
                <option value="under_review">Under Review</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Progress: {activeProject.progress}%
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={activeProject.progress}
                onChange={(e) => updateProgress(activeProject.id, parseInt(e.target.value, 10))}
                className="mt-3 w-full accent-primary"
              />
            </div>
          </div>
        </div>

        {/* Documents */}
        <div className="rounded-lg border border-gold bg-card p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" /> Submitted Documents
            </h2>
            <span className="text-xs text-muted-foreground">{documents.length} total</span>
          </div>
          {documents.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No documents submitted yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {documents.map((d) => (
                <div key={d.id} className="flex items-center gap-3 py-3">
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{d.title}</p>
                    <p className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleDateString()}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => downloadDoc(d)}>
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Milestones */}
        <div className="rounded-lg border border-gold bg-card p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" /> Milestones
              <span className="text-xs font-normal text-muted-foreground">({completedCount}/{milestones.length})</span>
            </h2>
            <Button size="sm" variant="hero" onClick={() => setShowMilestoneForm(!showMilestoneForm)}>
              {showMilestoneForm ? "Cancel" : "Add Milestone"}
            </Button>
          </div>

          {showMilestoneForm && (
            <form onSubmit={createMilestone} className="rounded-md border border-gold bg-background p-4 space-y-3">
              <input
                required value={mTitle} onChange={(e) => setMTitle(e.target.value)}
                placeholder="Title" className="w-full rounded-md border border-gold bg-card px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <textarea
                value={mDesc} onChange={(e) => setMDesc(e.target.value)} rows={2}
                placeholder="Description (optional)" className="w-full rounded-md border border-gold bg-card px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <input
                type="date" required value={mDue} onChange={(e) => setMDue(e.target.value)}
                className="w-full rounded-md border border-gold bg-card px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <Button type="submit" variant="hero" size="sm" disabled={savingMilestone}>
                {savingMilestone ? "Saving..." : "Add Milestone"}
              </Button>
            </form>
          )}

          {milestones.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No milestones set.</p>
          ) : (
            <div className="space-y-2">
              {milestones.map((m) => {
                const cfg = milestoneStatusCfg[m.status as keyof typeof milestoneStatusCfg] || milestoneStatusCfg.upcoming;
                const Icon = cfg.icon;
                return (
                  <div key={m.id} className="flex items-center gap-3 rounded-md border border-border p-3">
                    <button onClick={() => toggleMilestone(m)} className="shrink-0">
                      <Icon className={`h-5 w-5 ${m.status === "completed" ? "text-success" : "text-info"}`} />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium text-foreground ${m.status === "completed" ? "line-through opacity-60" : ""}`}>{m.title}</p>
                      {m.description && <p className="text-xs text-muted-foreground truncate">{m.description}</p>}
                    </div>
                    <span className="text-xs text-muted-foreground hidden sm:block">{m.due_date}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${cfg.badge}`}>{m.status}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Supervisor Hub</h1>
        <div className="divider-gold w-12 mt-2 mb-1" />
        <p className="text-sm text-muted-foreground">Review your assigned students, their documents, and project milestones.</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Loading assigned projects...</div>
      ) : projects.length === 0 ? (
        <div className="text-center py-12 rounded-lg border border-gold bg-card">
          <FolderOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No projects have been assigned to you yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Students assign supervisors from the Projects page.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {projects.map((p) => (
            <button
              key={p.id}
              onClick={() => setActiveProject(p)}
              className="text-left rounded-lg border border-gold bg-card p-5 hover:shadow-gold transition-all space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-foreground truncate">{p.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Student: <span className="text-foreground">{students[p.student_id] || "—"}</span>
                  </p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full border border-primary/30 bg-primary/10 text-primary capitalize shrink-0">
                  {p.status.replace("_", " ")}
                </span>
              </div>
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Progress</span><span>{p.progress}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${p.progress}%` }} />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
