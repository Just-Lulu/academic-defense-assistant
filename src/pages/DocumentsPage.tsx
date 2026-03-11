import { FileText, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

const mockDocs = [
  { id: 1, name: "Thesis_Draft_v3.pdf", project: "AI-Enhanced Supervision", date: "2026-03-08", size: "2.4 MB" },
  { id: 2, name: "Literature_Review.docx", project: "ML Crop Disease", date: "2026-03-05", size: "1.1 MB" },
  { id: 3, name: "Research_Proposal.pdf", project: "Blockchain Credentials", date: "2026-02-28", size: "890 KB" },
];

export default function DocumentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Documents</h1>
          <div className="divider-gold w-12 mt-2 mb-1" />
          <p className="text-sm text-muted-foreground">Upload and manage project documents.</p>
        </div>
        <Button variant="hero" size="default"><Upload className="h-4 w-4 mr-1" /> Upload</Button>
      </div>

      <div className="rounded-lg border border-gold bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gold bg-secondary/50">
              <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Document</th>
              <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Project</th>
              <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">Date</th>
              <th className="text-right p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Size</th>
            </tr>
          </thead>
          <tbody>
            {mockDocs.map((d) => (
              <tr key={d.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                <td className="p-3 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-medium text-foreground">{d.name}</span>
                </td>
                <td className="p-3 text-muted-foreground hidden sm:table-cell">{d.project}</td>
                <td className="p-3 text-muted-foreground hidden md:table-cell">{d.date}</td>
                <td className="p-3 text-right text-muted-foreground">{d.size}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
