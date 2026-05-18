import { useEffect, useState } from "react";
import { FolderOpen, Plus, X, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Project = Tables<"projects">;

interface SupervisorProfile {
  user_id: string;
  full_name: string | null;
  department: string | null;
}

export default function ProjectsPage() {
  const { user, role } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [faculty, setFaculty] = useState("");
  const [department, setDepartment] = useState("");
  const [saving, setSaving] = useState(false);

  // Supervisor assignment
  const [supervisors, setSupervisors] = useState<SupervisorProfile[]>([]);
  const [supervisorNames, setSupervisorNames] = useState<Record<string, string>>({});
  const [assigningProject, setAssigningProject] = useState<string | null>(null);
  const [selectedSupervisor, setSelectedSupervisor] = useState("");

  useEffect(() => {
    fetchProjects();
    fetchSupervisors();
  }, []);

  // Resolve supervisor names directly from profiles (works for students,
  // who cannot read other users' rows in user_roles due to RLS).
  useEffect(() => {
    const ids = Array.from(new Set(projects.map((p) => p.supervisor_id).filter(Boolean))) as string[];
    if (!ids.length) { setSupervisorNames({}); return; }
    supabase.from("profiles").select("user_id, full_name").in("user_id", ids).then(({ data }) => {
      const map: Record<string, string> = {};
      data?.forEach((p) => { map[p.user_id] = p.full_name || "Supervisor"; });
      setSupervisorNames(map);
    });
  }, [projects]);

  async function fetchProjects() {
    setLoading(true);
    const { data, error } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setProjects(data || []);
    setLoading(false);
  }

  async function fetchSupervisors() {
    // Get user_ids that have the supervisor role
    const { data: roleData } = await supabase.from("user_roles").select("user_id").eq("role", "supervisor");
    if (!roleData?.length) return;
    const ids = roleData.map((r) => r.user_id);
    const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, department").in("user_id", ids);
    if (profiles) setSupervisors(profiles);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("projects").insert({
      title, description, faculty, department, student_id: user.id,
    });
    if (error) toast.error(error.message);
    else { toast.success("Project created!"); setShowForm(false); setTitle(""); setDescription(""); setFaculty(""); setDepartment(""); fetchProjects(); }
    setSaving(false);
  }

  async function handleAssignSupervisor(projectId: string) {
    if (!selectedSupervisor) return;
    const { error } = await supabase.from("projects").update({ supervisor_id: selectedSupervisor }).eq("id", projectId);
    if (error) toast.error(error.message);
    else { toast.success("Supervisor assigned!"); setAssigningProject(null); setSelectedSupervisor(""); fetchProjects(); }
  }

  const getSupervisorName = (supervisorId: string | null) => {
    if (!supervisorId) return null;
    const s = supervisors.find((sv) => sv.user_id === supervisorId);
    return s?.full_name || "Unknown";
  };

  const statusLabel = (s: string) => {
    const map: Record<string, { className: string; label: string }> = {
      completed: { className: "border-success/30 text-success bg-success/10", label: "Completed" },
      under_review: { className: "border-primary/30 text-primary bg-primary/10", label: "Under Review" },
      in_progress: { className: "border-info/30 text-info bg-info/10", label: "In Progress" },
      draft: { className: "border-muted-foreground/30 text-muted-foreground bg-muted/50", label: "Draft" },
      archived: { className: "border-muted-foreground/30 text-muted-foreground bg-muted/50", label: "Archived" },
    };
    return map[s] || map.draft;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Projects</h1>
          <div className="divider-gold w-12 mt-2 mb-1" />
          <p className="text-sm text-muted-foreground">Manage student projects and thesis registrations.</p>
        </div>
        <Button variant="hero" size="default" onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-1" /> New Project</Button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="rounded-lg border border-gold bg-card p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-display text-lg font-semibold text-foreground">New Project</h2>
            <button type="button" onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Title *</label>
            <input required value={title} onChange={e => setTitle(e.target.value)} className="mt-1.5 w-full rounded-md border border-gold bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Project title" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="mt-1.5 w-full rounded-md border border-gold bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Brief description" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Faculty</label>
              <input value={faculty} onChange={e => setFaculty(e.target.value)} className="mt-1.5 w-full rounded-md border border-gold bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Department</label>
              <input value={department} onChange={e => setDepartment(e.target.value)} className="mt-1.5 w-full rounded-md border border-gold bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
          </div>
          <Button type="submit" variant="hero" disabled={saving}>{saving ? "Creating..." : "Create Project"}</Button>
        </form>
      )}

      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className="text-center py-12 rounded-lg border border-gold bg-card">
          <FolderOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No projects yet. Create your first one!</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {projects.map((p) => {
            const s = statusLabel(p.status);
            const supervisorName = getSupervisorName(p.supervisor_id);
            return (
              <div key={p.id} className="rounded-lg border border-gold bg-card p-5 space-y-3">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <FolderOpen className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{p.title}</h3>
                    <p className="text-sm text-muted-foreground truncate">{p.description || "No description"}</p>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${s.className}`}>{s.label}</span>
                  <div className="w-24 hidden sm:block">
                    <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${p.progress}%` }} />
                    </div>
                  </div>
                </div>

                {/* Supervisor info */}
                <div className="flex items-center gap-2 ml-14">
                  {supervisorName ? (
                    <span className="text-xs text-muted-foreground">
                      Supervisor: <span className="font-medium text-foreground">{supervisorName}</span>
                    </span>
                  ) : (
                    <>
                      {assigningProject === p.id ? (
                        <div className="flex items-center gap-2">
                          <select
                            value={selectedSupervisor}
                            onChange={(e) => setSelectedSupervisor(e.target.value)}
                            className="rounded-md border border-gold bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          >
                            <option value="">Select supervisor</option>
                            {supervisors.map((sv) => (
                              <option key={sv.user_id} value={sv.user_id}>
                                {sv.full_name || "Unnamed"} {sv.department ? `(${sv.department})` : ""}
                              </option>
                            ))}
                          </select>
                          <Button size="sm" variant="hero" className="h-7 text-xs" onClick={() => handleAssignSupervisor(p.id)} disabled={!selectedSupervisor}>
                            Assign
                          </Button>
                          <button onClick={() => setAssigningProject(null)} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAssigningProject(p.id)}
                          className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                        >
                          <UserPlus className="h-3 w-3" /> Assign Supervisor
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
