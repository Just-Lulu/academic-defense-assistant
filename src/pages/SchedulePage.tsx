import { Calendar } from "lucide-react";

const events = [
  { id: 1, title: "Supervision Meeting — John Doe", date: "2026-03-12", time: "10:00 AM" },
  { id: 2, title: "Thesis Defense — Alice Johnson", date: "2026-03-14", time: "2:00 PM" },
  { id: 3, title: "Progress Review — Jane Smith", date: "2026-03-18", time: "11:00 AM" },
];

export default function SchedulePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Schedule</h1>
        <div className="divider-gold w-12 mt-2 mb-1" />
        <p className="text-sm text-muted-foreground">Manage supervision meetings and deadlines.</p>
      </div>

      <div className="grid gap-4">
        {events.map((e) => (
          <div key={e.id} className="rounded-lg border border-gold bg-card p-5 flex items-center gap-4 hover:shadow-gold transition-all">
            <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Calendar className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">{e.title}</h3>
              <p className="text-sm text-muted-foreground">{e.date} at {e.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
