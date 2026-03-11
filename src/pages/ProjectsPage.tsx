import { FolderOpen, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

const mockProjects = [
  { id: 1, title: "AI-Enhanced Student Supervision System", student: "John Doe", status: "In Progress", progress: 65 },
  { id: 2, title: "Machine Learning for Crop Disease Detection", student: "Jane Smith", status: "Under Review", progress: 40 },
  { id: 3, title: "Blockchain-Based Academic Credential Verification", student: "Alice Johnson", status: "Completed", progress: 100 },
];

export default function ProjectsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Projects</h1>
          <div className="divider-gold w-12 mt-2 mb-1" />
          <p className="text-sm text-muted-foreground">Manage student projects and thesis registrations.</p>
        </div>
        <Button variant="hero" size="default"><Plus className="h-4 w-4 mr-1" /> New Project</Button>
      </div>

      <div className="grid gap-4">
        {mockProjects.map((p) => (
          <div key={p.id} className="rounded-lg border border-gold bg-card p-5 flex items-center gap-4 hover:shadow-gold transition-all">
            <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <FolderOpen className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground truncate">{p.title}</h3>
              <p className="text-sm text-muted-foreground">{p.student}</p>
            </div>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
              p.status === "Completed" ? "border-success/30 text-success bg-success/10" :
              p.status === "Under Review" ? "border-primary/30 text-primary bg-primary/10" :
              "border-info/30 text-info bg-info/10"
            }`}>
              {p.status}
            </span>
            <div className="w-24 hidden sm:block">
              <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${p.progress}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
