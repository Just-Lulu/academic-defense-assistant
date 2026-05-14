import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import img1 from "@/assets/showcase/01_supervisor_topic_approval.png";
import img2 from "@/assets/showcase/02_supervisor_version_history.png";
import img3 from "@/assets/showcase/03_supervisor_feedback_interface.png";
import img4 from "@/assets/showcase/04_student_feedback_view.png";
import img5 from "@/assets/showcase/05_admin_summary_dashboard.png";

const shots = [
  { src: img1, title: "Supervisor Topic Approval", desc: "Pending project topics with approve / reject actions and rejection reason capture." },
  { src: img2, title: "Document Version History", desc: "Chapter-grouped submissions with auto-incremented version badges and dates." },
  { src: img3, title: "Supervisor Feedback Interface", desc: "Threaded comments attached to a specific document version." },
  { src: img4, title: "Student Feedback View", desc: "Student perspective of supervisor feedback on a chapter version." },
  { src: img5, title: "Administrative Summary", desc: "Coordinator console summarising projects, milestones and users." },
];

export default function ShowcasePage() {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">System Showcase</h1>
        <div className="divider-gold w-16 mt-2 mb-1" />
        <p className="text-sm text-muted-foreground">Reference screenshots of key ORPTS workflows captured from the live system.</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {shots.map((s) => (
          <button
            key={s.title}
            onClick={() => setOpen(s.src)}
            className="group rounded-lg border border-border bg-card overflow-hidden text-left transition-colors hover:border-primary"
          >
            <div className="aspect-video overflow-hidden bg-secondary">
              <img src={s.src} alt={s.title} className="h-full w-full object-cover object-top transition-transform group-hover:scale-105" />
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-foreground text-sm">{s.title}</h3>
              <p className="text-xs text-muted-foreground mt-1">{s.desc}</p>
            </div>
          </button>
        ))}
      </div>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-5xl p-2">
          {open && <img src={open} alt="Preview" className="w-full h-auto rounded" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
