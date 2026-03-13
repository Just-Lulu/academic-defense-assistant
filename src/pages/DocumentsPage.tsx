import { useEffect, useState, useRef } from "react";
import { FileText, Upload, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Document = Tables<"documents">;

export default function DocumentsPage() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchDocuments(); }, []);

  async function fetchDocuments() {
    setLoading(true);
    const { data, error } = await supabase.from("documents").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setDocuments(data || []);
    setLoading(false);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);

    const filePath = `${user.id}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage.from("documents").upload(filePath, file);
    if (uploadError) { toast.error(uploadError.message); setUploading(false); return; }

    const { error: dbError } = await supabase.from("documents").insert({
      title: file.name.replace(/\.[^/.]+$/, ""),
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      mime_type: file.type,
      uploaded_by: user.id,
    });

    if (dbError) toast.error(dbError.message);
    else { toast.success("Document uploaded!"); fetchDocuments(); }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleDelete(doc: Document) {
    await supabase.storage.from("documents").remove([doc.file_path]);
    const { error } = await supabase.from("documents").delete().eq("id", doc.id);
    if (error) toast.error(error.message);
    else { toast.success("Document deleted"); fetchDocuments(); }
  }

  function formatSize(bytes: number | null) {
    if (!bytes) return "—";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Documents</h1>
          <div className="divider-gold w-12 mt-2 mb-1" />
          <p className="text-sm text-muted-foreground">Upload and manage project documents.</p>
        </div>
        <div>
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload} />
          <Button variant="hero" size="default" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            <Upload className="h-4 w-4 mr-1" /> {uploading ? "Uploading..." : "Upload"}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Loading documents...</div>
      ) : documents.length === 0 ? (
        <div className="text-center py-12 rounded-lg border border-gold bg-card">
          <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No documents yet. Upload your first file!</p>
        </div>
      ) : (
        <div className="rounded-lg border border-gold bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gold bg-secondary/50">
                <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Document</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">Date</th>
                <th className="text-right p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Size</th>
                <th className="text-right p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider w-16"></th>
              </tr>
            </thead>
            <tbody>
              {documents.map((d) => (
                <tr key={d.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                  <td className="p-3 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <span className="font-medium text-foreground truncate">{d.file_name}</span>
                  </td>
                  <td className="p-3 text-muted-foreground hidden md:table-cell">{new Date(d.created_at).toLocaleDateString()}</td>
                  <td className="p-3 text-right text-muted-foreground">{formatSize(d.file_size)}</td>
                  <td className="p-3 text-right">
                    <button onClick={() => handleDelete(d)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
