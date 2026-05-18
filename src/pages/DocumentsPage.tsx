import { useEffect, useState, useRef, useMemo } from "react";
import { FileText, Upload, Trash2, Download, History, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import DocumentComments from "@/components/DocumentComments";

type Document = Tables<"documents">;
type Project = Tables<"projects">;

const reviewStatusCfg: Record<string, { label: string; cls: string }> = {
  not_reviewed: { label: "Not reviewed", cls: "border-muted-foreground/30 bg-muted/40 text-muted-foreground" },
  under_review: { label: "Under review", cls: "border-primary/30 bg-primary/10 text-primary" },
  reviewed: { label: "Reviewed", cls: "border-success/30 bg-success/10 text-success" },
  needs_revision: { label: "Needs revision", cls: "border-destructive/30 bg-destructive/10 text-destructive" },
};

export default function DocumentsPage() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [authorNames, setAuthorNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [projectId, setProjectId] = useState<string>("");
  const [chapter, setChapter] = useState<string>("");
  const [openChapter, setOpenChapter] = useState<string | null>(null);
  const [openCommentsFor, setOpenCommentsFor] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    if (!user) return;
    setLoading(true);
    const [docsRes, projRes] = await Promise.all([
      supabase.from("documents").select("*").order("created_at", { ascending: false }),
      supabase
        .from("projects")
        .select("*")
        .or(`student_id.eq.${user.id},supervisor_id.eq.${user.id}`)
        .order("created_at", { ascending: false }),
    ]);
    if (docsRes.error) toast.error(docsRes.error.message);
    setDocuments((docsRes.data as Document[]) || []);
    setProjects((projRes.data as Project[]) || []);

    const ids = Array.from(new Set([...(docsRes.data || []).map((d) => d.uploaded_by)]));
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", ids);
      const map: Record<string, string> = {};
      profs?.forEach((p) => {
        map[p.user_id] = p.full_name || "User";
      });
      setAuthorNames(map);
    }
    setLoading(false);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!projectId) {
      toast.error("Pick a project first");
      return;
    }
    if (!chapter.trim()) {
      toast.error("Enter a chapter name (e.g. 'Chapter 2')");
      return;
    }
    setUploading(true);

    // Auto-version: find latest version for this (project, chapter)
    const chapterNorm = chapter.trim();
    const { data: existing } = await supabase
      .from("documents")
      .select("id, version")
      .eq("project_id", projectId)
      .eq("chapter", chapterNorm)
      .order("version", { ascending: false })
      .limit(1);

    const previous = existing && existing.length ? existing[0] : null;
    const nextVersion = (previous?.version ?? 0) + 1;

    const filePath = `${user.id}/${projectId}/${chapterNorm.replace(/[^a-z0-9-_]+/gi, "_")}_v${nextVersion}_${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage.from("documents").upload(filePath, file);
    if (uploadError) {
      toast.error(uploadError.message);
      setUploading(false);
      return;
    }

    const { error: dbError } = await supabase.from("documents").insert({
      title: `${chapterNorm} – v${nextVersion}`,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      mime_type: file.type,
      uploaded_by: user.id,
      project_id: projectId,
      chapter: chapterNorm,
      version: nextVersion,
      parent_document_id: previous?.id ?? null,
    });

    if (dbError) toast.error(dbError.message);
    else {
      toast.success(`Uploaded ${chapterNorm} v${nextVersion}`);
      setOpenChapter(`${projectId}::${chapterNorm}`);
      fetchAll();
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleDelete(doc: Document) {
    await supabase.storage.from("documents").remove([doc.file_path]);
    const { error } = await supabase.from("documents").delete().eq("id", doc.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Document deleted");
      fetchAll();
    }
  }

  async function downloadDoc(doc: Document) {
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(doc.file_path, 60);
    if (error || !data) {
      toast.error("Could not generate download link");
      return;
    }
    window.open(data.signedUrl, "_blank");
  }

  function formatSize(bytes: number | null) {
    if (!bytes) return "—";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  }

  const projectName = (id: string | null) => projects.find((p) => p.id === id)?.title || "Unassigned";

  // Group versioned docs by (project, chapter)
  const grouped = useMemo(() => {
    const map = new Map<string, { projectId: string | null; chapter: string; versions: Document[] }>();
    const loose: Document[] = [];
    for (const d of documents) {
      if (d.chapter && d.project_id) {
        const key = `${d.project_id}::${d.chapter}`;
        if (!map.has(key)) map.set(key, { projectId: d.project_id, chapter: d.chapter, versions: [] });
        map.get(key)!.versions.push(d);
      } else {
        loose.push(d);
      }
    }
    // Sort versions desc within each group
    for (const g of map.values()) g.versions.sort((a, b) => (b.version ?? 1) - (a.version ?? 1));
    return { groups: Array.from(map.values()), loose };
  }, [documents]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Documents</h1>
        <div className="divider-gold w-12 mt-2 mb-1" />
        <p className="text-sm text-muted-foreground">
          Upload chapter drafts. Re-uploading the same chapter creates a new version automatically.
        </p>
      </div>

      {/* Upload bar */}
      <div className="rounded-lg border border-gold bg-card p-4 grid gap-3 md:grid-cols-[1fr_1fr_auto] items-end">
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Project</label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="mt-1.5 w-full rounded-md border border-gold bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">— Select project —</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Chapter</label>
          <input
            value={chapter}
            onChange={(e) => setChapter(e.target.value)}
            placeholder="e.g. Chapter 2 - Literature Review"
            className="mt-1.5 w-full rounded-md border border-gold bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload} />
          <Button
            variant="hero"
            size="default"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || !projectId || !chapter.trim()}
          >
            <Upload className="h-4 w-4 mr-1" /> {uploading ? "Uploading..." : "Upload version"}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Loading documents...</div>
      ) : grouped.groups.length === 0 && grouped.loose.length === 0 ? (
        <div className="text-center py-12 rounded-lg border border-gold bg-card">
          <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No documents yet. Upload your first chapter version!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.groups.map((g) => {
            const key = `${g.projectId}::${g.chapter}`;
            const isOpen = openChapter === key;
            const latest = g.versions[0];
            const rs = reviewStatusCfg[latest.review_status] || reviewStatusCfg.not_reviewed;
            return (
              <div key={key} className="rounded-lg border border-gold bg-card overflow-hidden">
                <button
                  className="w-full flex items-center gap-3 p-4 hover:bg-secondary/30 transition-colors text-left"
                  onClick={() => setOpenChapter(isOpen ? null : key)}
                >
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <History className="h-4 w-4 text-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{g.chapter}</p>
                    <p className="text-xs text-muted-foreground">
                      {projectName(g.projectId)} · {g.versions.length} version{g.versions.length === 1 ? "" : "s"} · Latest{" "}
                      {new Date(latest.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full border border-primary/30 bg-primary/10 text-primary shrink-0">
                    Latest v{latest.version}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ${rs.cls}`}>{rs.label}</span>
                </button>

                {isOpen && (
                  <div className="border-t border-border divide-y divide-border">
                    {g.versions.map((d) => {
                      const drs = reviewStatusCfg[d.review_status] || reviewStatusCfg.not_reviewed;
                      const commentsOpen = openCommentsFor === d.id;
                      return (
                        <div key={d.id} className="p-4 space-y-3">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-xs font-mono px-2 py-1 rounded border border-gold bg-background text-foreground">
                              v{d.version}
                            </span>
                            <FileText className="h-4 w-4 text-primary shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{d.file_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(d.created_at).toLocaleString()} · {formatSize(d.file_size)}
                              </p>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${drs.cls}`}>{drs.label}</span>
                            <Button size="sm" variant="ghost" onClick={() => downloadDoc(d)} aria-label="Download">
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setOpenCommentsFor(commentsOpen ? null : d.id)}
                            >
                              {commentsOpen ? "Hide feedback" : "View feedback"}
                            </Button>
                            {d.uploaded_by === user?.id && (
                              <button
                                onClick={() => handleDelete(d)}
                                className="text-muted-foreground hover:text-destructive transition-colors"
                                aria-label="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                          {commentsOpen && (
                            <DocumentComments documentId={d.id} authorNames={authorNames} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {grouped.loose.length > 0 && (
            <div className="rounded-lg border border-gold bg-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-secondary/30">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Other documents (no chapter)
                </p>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {grouped.loose.map((d) => (
                    <tr key={d.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                      <td className="p-3 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary shrink-0" />
                        <span className="font-medium text-foreground truncate">{d.file_name}</span>
                      </td>
                      <td className="p-3 text-muted-foreground hidden md:table-cell">
                        {new Date(d.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-right text-muted-foreground">{formatSize(d.file_size)}</td>
                      <td className="p-3 text-right">
                        {d.uploaded_by === user?.id && (
                          <button
                            onClick={() => handleDelete(d)}
                            className="text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
