import { CheckCircle, Clock, AlertCircle } from "lucide-react";

const milestones = [
  { id: 1, title: "Literature Review Submission", project: "AI Supervision", due: "2026-03-15", status: "upcoming" },
  { id: 2, title: "Methodology Chapter Draft", project: "ML Crop Disease", due: "2026-03-20", status: "overdue" },
  { id: 3, title: "Data Collection Complete", project: "Blockchain Credentials", due: "2026-03-01", status: "completed" },
  { id: 4, title: "Final Thesis Submission", project: "AI Supervision", due: "2026-05-30", status: "upcoming" },
];

const statusConfig = {
  completed: { icon: CheckCircle, className: "text-success", badge: "border-success/30 bg-success/10 text-success" },
  upcoming: { icon: Clock, className: "text-info", badge: "border-info/30 bg-info/10 text-info" },
  overdue: { icon: AlertCircle, className: "text-destructive", badge: "border-destructive/30 bg-destructive/10 text-destructive" },
};

export default function MilestonesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Milestones</h1>
        <div className="divider-gold w-12 mt-2 mb-1" />
        <p className="text-sm text-muted-foreground">Track project milestones and deadlines.</p>
      </div>

      <div className="grid gap-4">
        {milestones.map((m) => {
          const cfg = statusConfig[m.status as keyof typeof statusConfig];
          const Icon = cfg.icon;
          return (
            <div key={m.id} className="rounded-lg border border-gold bg-card p-5 flex items-center gap-4 hover:shadow-gold transition-all">
              <Icon className={`h-5 w-5 ${cfg.className} shrink-0`} />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground">{m.title}</h3>
                <p className="text-sm text-muted-foreground">{m.project}</p>
              </div>
              <span className="text-xs text-muted-foreground hidden sm:block">{m.due}</span>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full border capitalize ${cfg.badge}`}>
                {m.status}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
