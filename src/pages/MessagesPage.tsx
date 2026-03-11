import { MessageSquare } from "lucide-react";

const conversations = [
  { id: 1, name: "Dr. Sarah Wilson", lastMessage: "Please review chapter 3 by Friday.", time: "2h ago", unread: 2 },
  { id: 2, name: "John Doe", lastMessage: "I've uploaded the revised methodology.", time: "5h ago", unread: 0 },
  { id: 3, name: "Prof. Mark Chen", lastMessage: "Defense date confirmed for March 14.", time: "1d ago", unread: 1 },
];

export default function MessagesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Messages</h1>
        <p className="text-sm text-muted-foreground mt-1">Communicate with students and supervisors.</p>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden divide-y">
        {conversations.map((c) => (
          <button key={c.id} className="w-full flex items-center gap-4 p-4 text-left hover:bg-muted/30 transition-colors">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-card-foreground">{c.name}</span>
                <span className="text-xs text-muted-foreground">{c.time}</span>
              </div>
              <p className="text-sm text-muted-foreground truncate">{c.lastMessage}</p>
            </div>
            {c.unread > 0 && (
              <span className="h-5 min-w-5 rounded-full bg-primary flex items-center justify-center text-xs font-medium text-primary-foreground">
                {c.unread}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
