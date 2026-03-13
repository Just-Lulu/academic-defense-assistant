import { motion } from "framer-motion";
import { FolderOpen, FileText, Target, Users, Brain, Bot, ArrowUpRight, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4 } }),
};

export default function DashboardHome() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [counts, setCounts] = useState({ projects: 0, documents: 0, milestones: 0 });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    async function fetchCounts() {
      const [p, d, m] = await Promise.all([
        supabase.from("projects").select("id", { count: "exact", head: true }),
        supabase.from("documents").select("id", { count: "exact", head: true }),
        supabase.from("milestones").select("id", { count: "exact", head: true }),
      ]);
      setCounts({
        projects: p.count || 0,
        documents: d.count || 0,
        milestones: m.count || 0,
      });
    }
    fetchCounts();
  }, []);

  const greeting = (() => {
    const h = currentTime.getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  const displayName = profile?.full_name || "Researcher";

  const stats = [
    { label: "Projects", value: String(counts.projects), icon: FolderOpen, color: "bg-primary/10 text-primary", to: "/app/projects" },
    { label: "Documents", value: String(counts.documents), icon: FileText, color: "bg-info/10 text-info", to: "/app/documents" },
    { label: "Milestones", value: String(counts.milestones), icon: Target, color: "bg-primary/10 text-primary", to: "/app/milestones" },
    { label: "Messages", value: "0", icon: Users, color: "bg-success/10 text-success", to: "/app/messages" },
  ];

  const quickActions = [
    { label: "Defense Simulator", description: "Upload thesis & generate mock questions", icon: Brain, to: "/app/defense-simulator" },
    { label: "AI Chatbot", description: "Ask questions about your project", icon: Bot, to: "/app/chatbot" },
    { label: "My Projects", description: "View and manage your research projects", icon: FolderOpen, to: "/app/projects" },
    { label: "Schedule", description: "View upcoming meetings and deadlines", icon: Clock, to: "/app/schedule" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">{greeting}, {displayName}</h1>
        <div className="divider-gold w-16 mt-2 mb-1" />
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Clock className="h-3.5 w-3.5" />
          {currentTime.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          {" · "}
          {currentTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <motion.button key={s.label} custom={i} initial="hidden" animate="visible" variants={fadeUp} onClick={() => navigate(s.to)}
            className="rounded-lg border border-gold bg-card p-5 transition-all hover:shadow-gold hover:-translate-y-0.5 text-left">
            <div className="flex items-center justify-between">
              <div className={`h-10 w-10 rounded-md flex items-center justify-center ${s.color}`}><s.icon className="h-5 w-5" /></div>
              <span className="text-2xl font-bold text-foreground">{s.value}</span>
            </div>
            <p className="mt-3 text-xs text-muted-foreground uppercase tracking-wider">{s.label}</p>
          </motion.button>
        ))}
      </div>

      <div>
        <h2 className="font-display text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {quickActions.map((a, i) => (
            <motion.button key={a.label} custom={i + 4} initial="hidden" animate="visible" variants={fadeUp} onClick={() => navigate(a.to)}
              className="group flex items-start gap-4 rounded-lg border border-gold bg-card p-6 text-left transition-all hover:shadow-gold hover:-translate-y-0.5">
              <div className="h-12 w-12 shrink-0 rounded-md bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <a.icon className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">{a.label}</span>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{a.description}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
