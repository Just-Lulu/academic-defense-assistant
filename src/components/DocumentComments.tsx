import { useEffect, useState } from "react";
import { MessageSquare, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface CommentRow {
  id: string;
  document_id: string;
  author_id: string;
  content: string;
  created_at: string;
}

interface Props {
  documentId: string;
  /** Optional: when true (e.g. student view) hides the composer. */
  readOnly?: boolean;
  /** Map of user_id -> display name to show author labels. */
  authorNames?: Record<string, string>;
}

export default function DocumentComments({ documentId, readOnly = false, authorNames = {} }: Props) {
  const { user } = useAuth();
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from("document_comments")
        .select("*")
        .eq("document_id", documentId)
        .order("created_at", { ascending: true });
      if (!cancelled) {
        if (error) toast.error(error.message);
        else setComments((data as CommentRow[]) || []);
        setLoading(false);
      }
    }
    load();

    const channel = supabase
      .channel(`doc-comments-${documentId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "document_comments", filter: `document_id=eq.${documentId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [documentId]);

  async function postComment() {
    if (!user || !draft.trim()) return;
    setPosting(true);
    const { error } = await supabase.from("document_comments").insert({
      document_id: documentId,
      author_id: user.id,
      content: draft.trim(),
    });
    if (error) toast.error(error.message);
    else setDraft("");
    setPosting(false);
  }

  async function deleteComment(id: string) {
    const { error } = await supabase.from("document_comments").delete().eq("id", id);
    if (error) toast.error(error.message);
  }

  return (
    <div className="ml-7 rounded-md border border-border bg-background p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <MessageSquare className="h-4 w-4 text-primary" />
        Comments <span className="text-xs font-normal text-muted-foreground">({comments.length})</span>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">Loading comments…</p>
      ) : comments.length === 0 ? (
        <p className="text-xs text-muted-foreground">No comments on this version yet.</p>
      ) : (
        <ul className="space-y-2">
          {comments.map((c) => {
            const isMine = user?.id === c.author_id;
            const name = authorNames[c.author_id] || (isMine ? "You" : "User");
            return (
              <li key={c.id} className="rounded-md border border-border bg-card p-3 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{name}</span>
                    <span> · {new Date(c.created_at).toLocaleString()}</span>
                  </div>
                  {isMine && (
                    <button
                      onClick={() => deleteComment(c.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      aria-label="Delete comment"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap">{c.content}</p>
              </li>
            );
          })}
        </ul>
      )}

      {!readOnly && (
        <div className="space-y-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Leave a comment on this version…"
            rows={2}
            className="border-gold"
          />
          <div className="flex justify-end">
            <Button size="sm" variant="hero" onClick={postComment} disabled={!draft.trim() || posting}>
              <Send className="h-4 w-4 mr-1" />
              {posting ? "Posting…" : "Post comment"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
