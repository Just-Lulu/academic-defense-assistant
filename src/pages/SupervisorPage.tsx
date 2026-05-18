import { useEffect, useMemo, useRef, useState } from "react";
import {
  Users, FolderOpen, FileText, Target, CheckCircle, Clock, AlertCircle, Download,
  MessageSquare, Sparkles, ShieldCheck, Send, ArrowLeft, History, ChevronDown, ChevronRight,
  CheckCircle2, XCircle, Hourglass,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import DocumentComments from "@/components/DocumentComments";

type Project = Tables<"projects">;
type Document = Tables<"documents">;
type Milestone = Tables<"milestones">;

interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

interface Insights {
  summary: string;
  weaknesses: string[];
  defenseQuestions: string[];
}

const milestoneStatusCfg = {
  completed: { icon: CheckCircle, badge: "border-success/30 bg-success/10 text-success" },
  upcoming: { icon: Clock, badge: "border-info/30 bg-info/10 text-info" },
  overdue: { icon: AlertCircle, badge: "border-destructive/30 bg-destructive/10 text-destructive" },
};

const reviewStatusCfg: Record<string, { label: string; cls: string }> = {
  not_reviewed: { label: "Not reviewed", cls: "border-muted-foreground/30 bg-muted/40 text-muted-foreground" },
  under_review: { label: "Under review", cls: "border-primary/30 bg-primary/10 text-primary" },
  reviewed: { label: "Reviewed", cls: "border-success/30 bg-success/10 text-success" },
  needs_revision: { label: "Needs revision", cls: "border-destructive/30 bg-destructive/10 text-destructive" },
};

export default function SupervisorPage() {
  const { user, role } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [students, setStudents] = useState<Record<string, string>>({});
  const [documents, setDocuments] = useState<Document[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [openChapter, setOpenChapter] = useState<string | null>(null);
  const [openCommentsFor, setOpenCommentsFor] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Milestones
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [mTitle, setMTitle] = useState("");
  const [mDesc, setMDesc] = useState("");
  const [mDue, setMDue] = useState("");
  const [savingMilestone, setSavingMilestone] = useState(false);
  const [feedbackDrafts, setFeedbackDrafts] = useState<Record<string, string>>({});

  // AI insights
  const [insightsDocId, setInsightsDocId] = useState<string | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insights, setInsights] = useState<Insights | null>(null);

  // Inline messaging
  const [chatPartnerId, setChatPartnerId] = useState<string | null>(null);
  const [chatPartnerName, setChatPartnerName] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (user) fetchAssignedProjects(); }, [user]);
  useEffect(() => { if (activeProject) fetchProjectDetails(activeProject.id); }, [activeProject]);
  useEffect(() => { chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  // Realtime for inline chat
  useEffect(() => {
    if (!user || !chatPartnerId) return;
    const channel = supabase
      .channel(`sup-chat-${chatPartnerId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const msg = payload.new as ChatMessage;
        const isThisChat =
          (msg.sender_id === user.id && msg.receiver_id === chatPartnerId) ||
          (msg.sender_id === chatPartnerId && msg.receiver_id === user.id);
        if (isThisChat) {
          setChatMessages((prev) => (prev.find((m) => m.id === msg.id) ? prev : [...prev, msg]));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, chatPartnerId]);

  async function fetchAssignedProjects() {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("projects").select("*")
      .eq("supervisor_id", user.id)
      .order("created_at", { ascending: false });
    if (error) { toast.error(error.message); setLoading(false); return; }
    setProjects(data || []);

    const studentIds = Array.from(new Set((data || []).map((p) => p.student_id)));
    if (studentIds.length) {
      const { data: profs } = await supabase
        .from("profiles").select("user_id, full_name").in("user_id", studentIds);
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
    const drafts: Record<string, string> = {};
    (msRes.data || []).forEach((m) => { drafts[m.id] = m.supervisor_feedback || ""; });
    setFeedbackDrafts(drafts);
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

  async function approveTopic(p: Project) {
    const { error } = await supabase
      .from("projects")
      .update({ status: "in_progress", rejection_reason: null })
      .eq("id", p.id);
    if (error) toast.error(error.message);
    else { toast.success(`Approved: ${p.title}`); fetchAssignedProjects(); }
  }

  async function rejectTopic(p: Project) {
    if (!rejectReason.trim()) { toast.error("Add a brief reason for rejection"); return; }
    const { error } = await supabase
      .from("projects")
      .update({ status: "rejected", rejection_reason: rejectReason.trim() })
      .eq("id", p.id);
    if (error) toast.error(error.message);
    else {
      toast.success(`Rejected: ${p.title}`);
      setRejectingId(null); setRejectReason("");
      fetchAssignedProjects();
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

  async function setDocReviewStatus(doc: Document, status: string) {
    if (!user) return;
    const { error } = await supabase
      .from("documents")
      .update({
        review_status: status,
        reviewed_at: status === "not_reviewed" ? null : new Date().toISOString(),
        reviewed_by: status === "not_reviewed" ? null : user.id,
      })
      .eq("id", doc.id);
    if (error) toast.error(error.message);
    else if (activeProject) {
      toast.success("Review status updated");
      fetchProjectDetails(activeProject.id);
    }
  }

  async function toggleMilestone(m: Milestone) {
    const newStatus = m.status === "completed" ? "upcoming" : "completed";
    const { error } = await supabase.from("milestones").update({ status: newStatus }).eq("id", m.id);
    if (error) toast.error(error.message);
    else if (activeProject) fetchProjectDetails(activeProject.id);
  }

  async function saveFeedback(m: Milestone) {
    const { error } = await supabase
      .from("milestones")
      .update({ supervisor_feedback: feedbackDrafts[m.id] ?? "" })
      .eq("id", m.id);
    if (error) toast.error(error.message);
    else { toast.success("Feedback saved"); if (activeProject) fetchProjectDetails(activeProject.id); }
  }

  async function toggleApproval(m: Milestone) {
    const { error } = await supabase
      .from("milestones")
      .update({ approved: !m.approved })
      .eq("id", m.id);
    if (error) toast.error(error.message);
    else { toast.success(!m.approved ? "Milestone approved" : "Approval removed"); if (activeProject) fetchProjectDetails(activeProject.id); }
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

  async function loadInsights(doc: Document) {
    setInsightsDocId(doc.id);
    setInsights(null);
    setInsightsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("document-insights", {
        body: { documentId: doc.id, projectId: doc.project_id },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      setInsights(data as Insights);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not generate insights");
    } finally {
      setInsightsLoading(false);
    }
  }

  async function openInlineChat(studentId: string, name: string) {
    if (!user) return;
    setChatPartnerId(studentId);
    setChatPartnerName(name);
    setChatMessages([]);
    const { data, error } = await supabase
      .from("messages").select("*")
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${studentId}),and(sender_id.eq.${studentId},receiver_id.eq.${user.id})`)
      .order("created_at", { ascending: true });
    if (error) toast.error(error.message);
    else setChatMessages(data || []);
    await supabase.from("messages")
      .update({ is_read: true })
      .eq("sender_id", studentId).eq("receiver_id", user.id).eq("is_read", false);
  }

  async function sendInlineMessage() {
    if (!user || !chatPartnerId || !chatInput.trim()) return;
    const content = chatInput.trim();
    setChatInput("");
    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      receiver_id: chatPartnerId,
      content,
      project_id: activeProject?.id ?? null,
    });
    if (error) toast.error(error.message);
  }

  // Group submitted documents by chapter for version history
  const docGroups = useMemo(() => {
    const map = new Map<string, { chapter: string; versions: Document[] }>();
    const loose: Document[] = [];
    for (const d of documents) {
      if (d.chapter) {
        if (!map.has(d.chapter)) map.set(d.chapter, { chapter: d.chapter, versions: [] });
        map.get(d.chapter)!.versions.push(d);
      } else {
        loose.push(d);
      }
    }
    for (const g of map.values()) g.versions.sort((a, b) => (b.version ?? 1) - (a.version ?? 1));
    return { groups: Array.from(map.values()), loose };
  }, [documents]);

  const pendingTopics = useMemo(
    () => projects.filter((p) => p.status === "draft" || p.status === "under_review" || p.status === "pending_approval"),
    [projects],
  );

  if (role && role !== "supervisor" && role !== "admin") {
    return (
      <div className="rounded-lg border border-gold bg-card p-8 text-center">
        <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <h2 className="font-display text-lg font-semibold text-foreground">Supervisor area</h2>
        <p className="text-sm text-muted-foreground mt-1">This page is only available to users with a supervisor role.</p>
      </div>
    );
  }

  // Author names lookup for comment threads (project's student + the supervisor)
  const commentAuthorNames: Record<string, string> = {};
  if (activeProject) {
    commentAuthorNames[activeProject.student_id] = students[activeProject.student_id] || "Student";
    if (user) commentAuthorNames[user.id] = "You (supervisor)";
  }

  // ============ Project detail view ============
  if (activeProject) {
    const completedCount = milestones.filter((m) => m.status === "completed").length;
    return (
      <div className="space-y-6">
        <button onClick={() => { setActiveProject(null); setChatPartnerId(null); setInsightsDocId(null); setInsights(null); }}
          className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to assigned projects
        </button>

        {/* Project header */}
        <div className="rounded-lg border border-gold bg-card p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-bold text-foreground truncate">{activeProject.title}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Student: <span className="text-foreground font-medium">{students[activeProject.student_id] || "Unknown"}</span>
                {activeProject.department && <> · {activeProject.department}</>}
              </p>
            </div>
            <Button
              variant="outline" size="sm"
              onClick={() => openInlineChat(activeProject.student_id, students[activeProject.student_id] || "Student")}
            >
              <MessageSquare className="h-4 w-4 mr-1" /> Message student
            </Button>
          </div>

          {activeProject.description && <p className="text-sm text-foreground">{activeProject.description}</p>}
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
                type="range" min={0} max={100}
                value={activeProject.progress}
                onChange={(e) => updateProgress(activeProject.id, parseInt(e.target.value, 10))}
                className="mt-3 w-full accent-primary"
              />
            </div>
          </div>
        </div>

        {/* Inline chat panel */}
        {chatPartnerId && (
          <div className="rounded-lg border border-gold bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button onClick={() => setChatPartnerId(null)} className="text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <MessageSquare className="h-4 w-4 text-primary" />
                <span className="font-semibold text-foreground text-sm">Chat with {chatPartnerName}</span>
              </div>
            </div>
            <div className="max-h-72 overflow-auto space-y-2 rounded-md border border-border bg-background p-3">
              {chatMessages.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No messages yet — start the conversation.</p>
              ) : chatMessages.map((m) => (
                <div key={m.id} className={`flex ${m.sender_id === user!.id ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                    m.sender_id === user!.id ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-foreground border border-border"
                  }`}>
                    <p>{m.content}</p>
                    <p className={`text-[10px] mt-1 ${m.sender_id === user!.id ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                      {new Date(m.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={chatBottomRef} />
            </div>
            <div className="flex gap-2">
              <input
                type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendInlineMessage()}
                placeholder="Type a message..."
                className="flex-1 rounded-md border border-gold bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <Button onClick={sendInlineMessage} disabled={!chatInput.trim()} size="sm">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Documents — version history grouped by chapter */}
        <div className="rounded-lg border border-gold bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
              <History className="h-5 w-5 text-primary" /> Document Version History
            </h2>
            <span className="text-xs text-muted-foreground">
              {docGroups.groups.length} chapter{docGroups.groups.length === 1 ? "" : "s"} · {documents.length} version{documents.length === 1 ? "" : "s"}
            </span>
          </div>

          {documents.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No documents submitted yet.</p>
          ) : (
            <div className="space-y-3">
              {docGroups.groups.map((g) => {
                const isOpen = openChapter === g.chapter;
                const latest = g.versions[0];
                const rs = reviewStatusCfg[latest.review_status] || reviewStatusCfg.not_reviewed;
                return (
                  <div key={g.chapter} className="rounded-md border border-border overflow-hidden">
                    <button
                      onClick={() => setOpenChapter(isOpen ? null : g.chapter)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-secondary/30 transition-colors text-left"
                    >
                      {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      <FileText className="h-4 w-4 text-primary" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{g.chapter}</p>
                        <p className="text-xs text-muted-foreground">
                          {g.versions.length} version{g.versions.length === 1 ? "" : "s"} · Latest {new Date(latest.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full border border-primary/30 bg-primary/10 text-primary shrink-0">
                        Latest v{latest.version}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ${rs.cls}`}>{rs.label}</span>
                    </button>

                    {isOpen && (
                      <div className="border-t border-border divide-y divide-border bg-background/40">
                        {g.versions.map((d) => {
                          const drs = reviewStatusCfg[d.review_status] || reviewStatusCfg.not_reviewed;
                          const commentsOpen = openCommentsFor === d.id;
                          const aiOpen = insightsDocId === d.id;
                          return (
                            <div key={d.id} className="p-4 space-y-3">
                              <div className="flex items-center gap-3 flex-wrap">
                                <span className="text-xs font-mono px-2 py-1 rounded border border-gold bg-card text-foreground">v{d.version}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate">{d.file_name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(d.created_at).toLocaleString()}
                                    {d.reviewed_at && <> · Reviewed {new Date(d.reviewed_at).toLocaleDateString()}</>}
                                  </p>
                                </div>
                                <span className={`text-xs px-2 py-0.5 rounded-full border ${drs.cls}`}>{drs.label}</span>
                                <select
                                  value={d.review_status}
                                  onChange={(e) => setDocReviewStatus(d, e.target.value)}
                                  className="text-xs rounded-md border border-gold bg-background px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
                                >
                                  <option value="not_reviewed">Not reviewed</option>
                                  <option value="under_review">Under review</option>
                                  <option value="reviewed">Reviewed</option>
                                  <option value="needs_revision">Needs revision</option>
                                </select>
                                <Button size="sm" variant="ghost" onClick={() => downloadDoc(d)}>
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setOpenCommentsFor(commentsOpen ? null : d.id)}>
                                  <MessageSquare className="h-4 w-4 mr-1" />
                                  {commentsOpen ? "Hide feedback" : "Feedback"}
                                </Button>
                                <Button
                                  size="sm" variant="outline"
                                  onClick={() => aiOpen ? setInsightsDocId(null) : loadInsights(d)}
                                >
                                  <Sparkles className="h-4 w-4 mr-1" />
                                  {aiOpen ? "Hide AI" : "AI insights"}
                                </Button>
                              </div>

                              {commentsOpen && (
                                <DocumentComments documentId={d.id} authorNames={commentAuthorNames} />
                              )}

                              {aiOpen && (
                                <div className="ml-7 rounded-md border border-primary/30 bg-primary/5 p-4 space-y-3">
                                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                                    <Sparkles className="h-4 w-4" /> AI Insights
                                  </div>
                                  {insightsLoading ? (
                                    <p className="text-xs text-muted-foreground">Analyzing document with AI…</p>
                                  ) : insights ? (
                                    <div className="space-y-3 text-sm">
                                      {insights.summary && <p className="text-foreground">{insights.summary}</p>}
                                      {insights.weaknesses?.length > 0 && (
                                        <div>
                                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Weaknesses</p>
                                          <ul className="list-disc pl-5 space-y-1 text-foreground">
                                            {insights.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
                                          </ul>
                                        </div>
                                      )}
                                      {insights.defenseQuestions?.length > 0 && (
                                        <div>
                                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Suggested Defense Questions</p>
                                          <ul className="list-decimal pl-5 space-y-1 text-foreground">
                                            {insights.defenseQuestions.map((q, i) => <li key={i}>{q}</li>)}
                                          </ul>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-muted-foreground">No insights available.</p>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {docGroups.loose.length > 0 && (
                <div className="rounded-md border border-border p-3 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Other documents (no chapter assigned)</p>
                  {docGroups.loose.map((d) => (
                    <div key={d.id} className="flex items-center gap-2 text-sm">
                      <FileText className="h-4 w-4 text-primary shrink-0" />
                      <span className="flex-1 truncate text-foreground">{d.title}</span>
                      <Button size="sm" variant="ghost" onClick={() => downloadDoc(d)}>
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
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
              <input required value={mTitle} onChange={(e) => setMTitle(e.target.value)}
                placeholder="Title"
                className="w-full rounded-md border border-gold bg-card px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
              <textarea value={mDesc} onChange={(e) => setMDesc(e.target.value)} rows={2}
                placeholder="Description (optional)"
                className="w-full rounded-md border border-gold bg-card px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
              <input type="date" required value={mDue} onChange={(e) => setMDue(e.target.value)}
                className="w-full rounded-md border border-gold bg-card px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
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
                  <div key={m.id} className="rounded-md border border-border p-3 space-y-3">
                    <div className="flex items-center gap-3">
                      <button onClick={() => toggleMilestone(m)} className="shrink-0">
                        <Icon className={`h-5 w-5 ${m.status === "completed" ? "text-success" : "text-info"}`} />
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium text-foreground ${m.status === "completed" ? "line-through opacity-60" : ""}`}>{m.title}</p>
                        {m.description && <p className="text-xs text-muted-foreground truncate">{m.description}</p>}
                      </div>
                      <span className="text-xs text-muted-foreground hidden sm:block">{m.due_date}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${cfg.badge}`}>{m.status}</span>
                      {m.approved && (
                        <span className="text-xs px-2 py-0.5 rounded-full border border-success/30 bg-success/10 text-success flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3" /> Approved
                        </span>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Supervisor feedback</label>
                      <textarea
                        value={feedbackDrafts[m.id] ?? ""}
                        onChange={(e) => setFeedbackDrafts((prev) => ({ ...prev, [m.id]: e.target.value }))}
                        rows={2}
                        placeholder="Add comments, corrections, or guidance for the student…"
                        className="w-full rounded-md border border-gold bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => saveFeedback(m)}>
                          Save feedback
                        </Button>
                        <Button size="sm" variant={m.approved ? "outline" : "hero"} onClick={() => toggleApproval(m)}>
                          <ShieldCheck className="h-4 w-4 mr-1" />
                          {m.approved ? "Revoke approval" : "Mark approved"}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============ Project list view ============
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Supervisor Hub</h1>
        <div className="divider-gold w-12 mt-2 mb-1" />
        <p className="text-sm text-muted-foreground">Review your assigned students, their documents, and project milestones.</p>
      </div>

      {/* Topic Approval Queue */}
      {pendingTopics.length > 0 && (
        <div className="rounded-lg border border-gold bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
              <Hourglass className="h-5 w-5 text-primary" /> Pending Topic Approvals
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full border border-primary/30 bg-primary/10 text-primary">
              {pendingTopics.length} awaiting review
            </span>
          </div>
          <div className="space-y-3">
            {pendingTopics.map((p) => {
              const isRejecting = rejectingId === p.id;
              const statusLabel =
                p.status === "draft" ? "Draft" :
                p.status === "under_review" ? "Under review" :
                p.status === "pending_approval" ? "Pending approval" : p.status;
              return (
                <div key={p.id} className="rounded-md border border-border bg-background/40 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-foreground truncate">{p.title}</h3>
                        <span className="text-xs px-2 py-0.5 rounded-full border border-info/30 bg-info/10 text-info shrink-0">
                          {statusLabel}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Submitted by <span className="text-foreground font-medium">{students[p.student_id] || "Unknown student"}</span>
                        {p.department && <> · {p.department}</>}
                        <> · {new Date(p.created_at).toLocaleDateString()}</>
                      </p>
                      {p.abstract && (
                        <p className="text-sm text-foreground mt-2 line-clamp-3">{p.abstract}</p>
                      )}
                      {!p.abstract && p.description && (
                        <p className="text-sm text-foreground mt-2 line-clamp-3">{p.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" variant="hero" onClick={() => approveTopic(p)}>
                        <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                      </Button>
                      <Button
                        size="sm" variant="outline"
                        onClick={() => { setRejectingId(isRejecting ? null : p.id); setRejectReason(""); }}
                      >
                        <XCircle className="h-4 w-4 mr-1" /> Reject
                      </Button>
                    </div>
                  </div>

                  {isRejecting && (
                    <div className="space-y-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Reason for rejection
                      </label>
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        rows={2}
                        placeholder="Explain why the topic is not approved (visible to the student)…"
                        className="w-full rounded-md border border-gold bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={() => { setRejectingId(null); setRejectReason(""); }}>
                          Cancel
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => rejectTopic(p)}>
                          Confirm rejection
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

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
            <div key={p.id} className="rounded-lg border border-gold bg-card p-5 hover:shadow-gold transition-all space-y-3">
              <button onClick={() => setActiveProject(p)} className="text-left w-full space-y-3">
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
              <Button
                size="sm" variant="outline" className="w-full"
                onClick={() => { setActiveProject(p); openInlineChat(p.student_id, students[p.student_id] || "Student"); }}
              >
                <MessageSquare className="h-4 w-4 mr-1" /> Message {students[p.student_id] || "student"}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
