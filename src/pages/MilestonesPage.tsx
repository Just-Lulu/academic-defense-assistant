import { useEffect, useState } from "react";
import { CheckCircle, Clock, AlertCircle, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Milestone = Tables<"milestones">;
type Project = Tables<"projects">;

const statusConfig = {
  completed: { icon: CheckCircle, className: "text-success", badge: "border-success/30 bg-success/10 text-success" },
  upcoming: { icon: Clock, className: "text-info", badge: "border-info/30 bg-info/10 text-info" },
  overdue: { icon: AlertCircle, className: "text-destructive", badge: "border-destructive/30 bg-destructive/10 text-destructive" },
};

export default function MilestonesPage() {
  const { user } = useAuth();
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [projectId, setProjectId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const [mRes, pRes] = await Promise.all([
      supabase.from("milestones").select("*").order("due_date", { ascending: true }),
      supabase.from("projects").select("id, title"),
    ]);
    if (mRes.error) toast.error(mRes.error.message);
    else setMilestones(mRes.data || []);
    if (pRes.error) toast.error(pRes.error.message);
    else setProjects(pRes.data || []);
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("milestones").insert({
      title, due_date: dueDate, project_id: projectId, created_by: user.id,
    });
    if (error) toast.error(error.message);
    else { toast.success("Milestone created!"); setShowForm(false); setTitle(""); setDueDate(""); setProjectId(""); fetchData(); }
    setSaving(false);
  }

  async function toggleComplete(m: Milestone) {
    const newStatus = m.status === "completed" ? "upcoming" : "completed";
    const { error } = await supabase.from("milestones").update({ status: newStatus }).eq("id", m.id);
    if (error) toast.error(error.message);
    else fetchData();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Milestones</h1>
          <div className="divider-gold w-12 mt-2 mb-1" />
          <p className="text-sm text-muted-foreground">Track project milestones and deadlines.</p>
        </div>
        <Button variant="hero" size="default" onClick={() => setShowForm(true)} disabled={projects.length === 0}>
          <Plus className="h-4 w-4 mr-1" /> New Milestone
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="rounded-lg border border-gold bg-card p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-display text-lg font-semibold text-foreground">New Milestone</h2>
            <button type="button" onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Title *</label>
            <input required value={title} onChange={e => setTitle(e.target.value)} className="mt-1.5 w-full rounded-md border border-gold bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Due Date *</label>
              <input type="date" required value={dueDate} onChange={e => setDueDate(e.target.value)} className="mt-1.5 w-full rounded-md border border-gold bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Project *</label>
              <select required value={projectId} onChange={e => setProjectId(e.target.value)} className="mt-1.5 w-full rounded-md border border-gold bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="">Select project</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>
          </div>
          <Button type="submit" variant="hero" disabled={saving}>{saving ? "Creating..." : "Create Milestone"}</Button>
        </form>
      )}

      {projects.length === 0 && !loading && (
        <div className="text-center py-4 text-sm text-muted-foreground bg-card rounded-lg border border-gold p-4">
          Create a project first before adding milestones.
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Loading milestones...</div>
      ) : milestones.length === 0 ? (
        <div className="text-center py-12 rounded-lg border border-gold bg-card">
          <Clock className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No milestones yet.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {milestones.map((m) => {
            const cfg = statusConfig[m.status as keyof typeof statusConfig] || statusConfig.upcoming;
            const Icon = cfg.icon;
            return (
              <div key={m.id} className="rounded-lg border border-gold bg-card p-5 flex items-center gap-4 hover:shadow-gold transition-all">
                <button onClick={() => toggleComplete(m)} className="shrink-0">
                  <Icon className={`h-5 w-5 ${cfg.className}`} />
                </button>
                <div className="flex-1 min-w-0">
                  <h3 className={`font-semibold text-foreground ${m.status === "completed" ? "line-through opacity-60" : ""}`}>{m.title}</h3>
                  <p className="text-sm text-muted-foreground">{projects.find(p => p.id === m.project_id)?.title || "—"}</p>
                </div>
                <span className="text-xs text-muted-foreground hidden sm:block">{m.due_date}</span>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full border capitalize ${cfg.badge}`}>{m.status}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
