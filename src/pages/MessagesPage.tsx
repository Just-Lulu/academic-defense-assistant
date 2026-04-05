import { useEffect, useState, useRef } from "react";
import { MessageSquare, Send, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Conversation {
  userId: string;
  name: string;
  lastMessage: string;
  lastTime: string;
  unreadCount: number;
}

interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export default function MessagesPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [activeName, setActiveName] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) fetchConversations();
  }, [user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("messages-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, (payload) => {
        const msg = payload.new as ChatMessage;
        if (msg.sender_id === user.id || msg.receiver_id === user.id) {
          if (activeChat && (msg.sender_id === activeChat || msg.receiver_id === activeChat)) {
            setMessages((prev) => {
              if (prev.find((m) => m.id === msg.id)) return prev;
              return [...prev, msg];
            });
          }
          fetchConversations();
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, activeChat]);

  async function fetchConversations() {
    if (!user) return;
    setLoading(true);

    // Get all messages involving the user
    const { data: allMessages, error } = await supabase
      .from("messages")
      .select("*")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (error) { toast.error(error.message); setLoading(false); return; }

    // Group by conversation partner
    const convMap = new Map<string, { lastMessage: string; lastTime: string; unreadCount: number }>();
    for (const msg of allMessages || []) {
      const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
      if (!convMap.has(partnerId)) {
        convMap.set(partnerId, {
          lastMessage: msg.content,
          lastTime: msg.created_at,
          unreadCount: 0,
        });
      }
      if (msg.receiver_id === user.id && !msg.is_read) {
        const c = convMap.get(partnerId)!;
        c.unreadCount++;
      }
    }

    // Get profile names
    const partnerIds = Array.from(convMap.keys());
    let profiles: { user_id: string; full_name: string | null }[] = [];
    if (partnerIds.length) {
      const { data } = await supabase.from("profiles").select("user_id, full_name").in("user_id", partnerIds);
      profiles = data || [];
    }

    const convs: Conversation[] = partnerIds.map((id) => {
      const c = convMap.get(id)!;
      const profile = profiles.find((p) => p.user_id === id);
      return {
        userId: id,
        name: profile?.full_name || "Unknown User",
        lastMessage: c.lastMessage,
        lastTime: c.lastTime,
        unreadCount: c.unreadCount,
      };
    });

    setConversations(convs);
    setLoading(false);
  }

  async function openChat(partnerId: string, partnerName: string) {
    setActiveChat(partnerId);
    setActiveName(partnerName);

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .or(`and(sender_id.eq.${user!.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user!.id})`)
      .order("created_at", { ascending: true });

    if (error) toast.error(error.message);
    else setMessages(data || []);

    // Mark unread as read
    await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("sender_id", partnerId)
      .eq("receiver_id", user!.id)
      .eq("is_read", false);

    fetchConversations();
  }

  async function handleSend() {
    if (!input.trim() || !activeChat || !user) return;
    const content = input.trim();
    setInput("");

    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      receiver_id: activeChat,
      content,
    });

    if (error) toast.error(error.message);
  }

  function formatTime(dt: string) {
    const d = new Date(dt);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString();
  }

  // New conversation with a project member
  const [showNewChat, setShowNewChat] = useState(false);
  const [projectMembers, setProjectMembers] = useState<{ user_id: string; full_name: string | null }[]>([]);

  async function fetchProjectMembers() {
    if (!user) return;
    // Get all projects this user belongs to
    const { data: projects } = await supabase
      .from("projects")
      .select("student_id, supervisor_id")
      .or(`student_id.eq.${user.id},supervisor_id.eq.${user.id}`);

    if (!projects?.length) { setProjectMembers([]); return; }

    const memberIds = new Set<string>();
    for (const p of projects) {
      if (p.student_id && p.student_id !== user.id) memberIds.add(p.student_id);
      if (p.supervisor_id && p.supervisor_id !== user.id) memberIds.add(p.supervisor_id);
    }

    if (!memberIds.size) { setProjectMembers([]); return; }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", Array.from(memberIds));

    setProjectMembers(profiles || []);
  }

  if (activeChat) {
    return (
      <div className="flex flex-col h-[calc(100vh-8rem)]">
        {/* Chat header */}
        <div className="flex items-center gap-3 pb-3 border-b border-gold">
          <button onClick={() => setActiveChat(null)} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <MessageSquare className="h-4 w-4" />
          </div>
          <span className="font-semibold text-foreground">{activeName}</span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-auto py-4 space-y-3">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.sender_id === user!.id ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-lg px-4 py-2.5 text-sm ${
                m.sender_id === user!.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-foreground border border-border"
              }`}>
                <p>{m.content}</p>
                <p className={`text-[10px] mt-1 ${m.sender_id === user!.id ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                  {formatTime(m.created_at)}
                </p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="flex gap-2 pt-3 border-t border-gold">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type a message..."
            className="flex-1 rounded-lg border border-gold bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <Button onClick={handleSend} disabled={!input.trim()} size="icon" className="h-11 w-11 rounded-lg">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Messages</h1>
          <div className="divider-gold w-12 mt-2 mb-1" />
          <p className="text-sm text-muted-foreground">Communicate with students and supervisors.</p>
        </div>
        <Button
          variant="hero"
          size="default"
          onClick={() => { setShowNewChat(!showNewChat); if (!showNewChat) fetchProjectMembers(); }}
        >
          <MessageSquare className="h-4 w-4 mr-1" /> New Message
        </Button>
      </div>

      {/* New chat picker */}
      {showNewChat && (
        <div className="rounded-lg border border-gold bg-card p-4 space-y-2">
          <h3 className="text-sm font-medium text-foreground">Select a project member to message</h3>
          {projectMembers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No project members found. Assign a supervisor to a project first.</p>
          ) : (
            <div className="space-y-1">
              {projectMembers.map((m) => (
                <button
                  key={m.user_id}
                  onClick={() => { openChat(m.user_id, m.full_name || "Unknown"); setShowNewChat(false); }}
                  className="w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm text-left hover:bg-secondary/50 transition-colors"
                >
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <MessageSquare className="h-3.5 w-3.5" />
                  </div>
                  <span className="font-medium text-foreground">{m.full_name || "Unknown User"}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Conversations list */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Loading messages...</div>
      ) : conversations.length === 0 ? (
        <div className="text-center py-12 rounded-lg border border-gold bg-card">
          <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No messages yet. Start a conversation with a project member!</p>
        </div>
      ) : (
        <div className="rounded-lg border border-gold bg-card overflow-hidden divide-y divide-border">
          {conversations.map((c) => (
            <button
              key={c.userId}
              onClick={() => openChat(c.userId, c.name)}
              className="w-full flex items-center gap-4 p-4 text-left hover:bg-secondary/30 transition-colors"
            >
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <MessageSquare className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">{c.name}</span>
                  <span className="text-xs text-muted-foreground">{formatTime(c.lastTime)}</span>
                </div>
                <p className="text-sm text-muted-foreground truncate">{c.lastMessage}</p>
              </div>
              {c.unreadCount > 0 && (
                <span className="h-5 min-w-5 rounded-full bg-primary flex items-center justify-center text-xs font-medium text-primary-foreground">
                  {c.unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
