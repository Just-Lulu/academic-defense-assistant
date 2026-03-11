import { motion } from "framer-motion";
import { FolderOpen, FileText, Target, Users, Brain, Bot, ArrowUpRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const stats = [
  { label: "Active Projects", value: "12", icon: FolderOpen, color: "bg-primary/10 text-primary" },
  { label: "Documents", value: "48", icon: FileText, color: "bg-info/10 text-info" },
  { label: "Milestones Due", value: "5", icon: Target, color: "bg-primary/10 text-primary" },
  { label: "Students", value: "24", icon: Users, color: "bg-success/10 text-success" },
];

const quickActions = [
  { label: "Defense Simulator", description: "Upload thesis & generate mock questions", icon: Brain, to: "/app/defense-simulator" },
  { label: "AI Chatbot", description: "Ask questions about your project", icon: Bot, to: "/app/chatbot" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4 } }),
};

export default function DashboardHome() {
  const navigate = useNavigate();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Welcome back</h1>
        <div className="divider-gold w-16 mt-2 mb-1" />
        <p className="text-sm text-muted-foreground">Here's an overview of your supervision activity.</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            custom={i}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="rounded-lg border border-gold bg-card p-5 transition-all hover:shadow-gold"
          >
            <div className="flex items-center justify-between">
              <div className={`h-10 w-10 rounded-md flex items-center justify-center ${s.color}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <span className="text-2xl font-bold text-foreground">{s.value}</span>
            </div>
            <p className="mt-3 text-xs text-muted-foreground uppercase tracking-wider">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="font-display text-lg font-semibold text-foreground mb-4">AI-Powered Tools</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {quickActions.map((a, i) => (
            <motion.button
              key={a.label}
              custom={i + 4}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              onClick={() => navigate(a.to)}
              className="group flex items-start gap-4 rounded-lg border border-gold bg-card p-6 text-left transition-all hover:shadow-gold hover:-translate-y-0.5"
            >
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

      {/* Recent Activity */}
      <div>
        <h2 className="font-display text-lg font-semibold text-foreground mb-4">Recent Activity</h2>
        <div className="rounded-lg border border-gold bg-card p-8 text-center">
          <p className="text-muted-foreground text-sm">
            Activity feed will appear here once you start using the system.
          </p>
        </div>
      </div>
    </div>
  );
}
