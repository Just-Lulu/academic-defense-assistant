import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Bot, Brain, Calendar, FileText, MessageSquare, Shield, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import heroBg from "@/assets/hero-bg.jpg";

const features = [
  {
    icon: Users,
    title: "User Management",
    description: "Multi-role system for students, supervisors, and administrators with secure access controls.",
  },
  {
    icon: FileText,
    title: "Project Registration",
    description: "Streamlined project and thesis registration with approval workflows and tracking.",
  },
  {
    icon: BookOpen,
    title: "Document Repository",
    description: "Centralized document storage with version control for all supervision materials.",
  },
  {
    icon: Calendar,
    title: "Milestones & Scheduling",
    description: "Track project milestones, set deadlines, and manage supervision schedules effortlessly.",
  },
  {
    icon: MessageSquare,
    title: "Messaging System",
    description: "Built-in communication between students and supervisors with notification support.",
  },
  {
    icon: Brain,
    title: "AI Defense Simulator",
    description: "Upload your thesis and receive AI-generated mock defense questions with suggested answers.",
  },
  {
    icon: Bot,
    title: "AI Chatbot Assistant",
    description: "RAG-powered chatbot that answers queries using your documents and supervision guidelines.",
  },
  {
    icon: Shield,
    title: "Accountability & Logs",
    description: "Full audit trail of interactions for transparency and continuous improvement.",
  },
];

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b bg-background/80 backdrop-blur-lg">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <BookOpen className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold text-foreground">SuperviseAI</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>
              Sign In
            </Button>
            <Button size="sm" onClick={() => navigate("/login")}>
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden pt-16">
        <div className="absolute inset-0">
          <img src={heroBg} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-hero-gradient opacity-90" />
        </div>
        <div className="container relative z-10 py-24">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="max-w-3xl"
          >
            <motion.div variants={fadeUp} className="mb-4">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-sm font-medium text-accent">
                <Brain className="h-3.5 w-3.5" /> AI-Powered Academic Supervision
              </span>
            </motion.div>
            <motion.h1
              variants={fadeUp}
              className="font-display text-4xl font-bold leading-tight tracking-tight text-primary-foreground sm:text-5xl md:text-6xl"
            >
              Transform Your{" "}
              <span className="text-gradient-hero">Research Supervision</span>{" "}
              Experience
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="mt-6 max-w-xl text-lg leading-relaxed text-primary-foreground/75"
            >
              A comprehensive platform that streamlines thesis supervision with
              intelligent document analysis, automated defense preparation, and
              AI-assisted communication — all in one place.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-10 flex flex-wrap gap-4">
              <Button variant="hero" size="xl" onClick={() => navigate("/login")}>
                Start Your Journey <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
              <Button
                variant="hero-outline"
                size="xl"
                onClick={() => {
                  document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                Explore Features
              </Button>
            </motion.div>

            {/* Stats */}
            <motion.div variants={fadeUp} className="mt-16 grid grid-cols-3 gap-8 max-w-md">
              {[
                { value: "8+", label: "Core Modules" },
                { value: "2", label: "AI Engines" },
                { value: "3", label: "User Roles" },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="text-3xl font-bold text-accent">{stat.value}</div>
                  <div className="text-sm text-primary-foreground/60">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 bg-background">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16 text-center"
          >
            <span className="text-sm font-semibold uppercase tracking-widest text-primary">
              Platform Capabilities
            </span>
            <h2 className="font-display mt-3 text-3xl font-bold text-foreground sm:text-4xl">
              Everything You Need for Effective Supervision
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              From project registration to AI-powered defense simulation, our
              platform covers the entire supervision lifecycle.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
          >
            {features.map((f) => (
              <motion.div
                key={f.title}
                variants={fadeUp}
                className="group rounded-xl border bg-card p-6 transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1"
              >
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-sans text-base font-semibold text-card-foreground">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-hero-gradient py-20">
        <div className="container text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-display text-3xl font-bold text-primary-foreground sm:text-4xl">
              Ready to Modernize Your Supervision Process?
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-primary-foreground/70">
              Join the pilot program and experience AI-enhanced academic
              supervision designed using Design Science Research methodology.
            </p>
            <Button variant="hero" size="xl" className="mt-8" onClick={() => navigate("/login")}>
              Get Started Now <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-10 bg-card">
        <div className="container flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-primary flex items-center justify-center">
              <BookOpen className="h-3 w-3 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold text-foreground">SuperviseAI</span>
          </div>
          <p className="text-xs text-muted-foreground">
            © 2026 SuperviseAI — Built with Design Science Research methodology
          </p>
        </div>
      </footer>
    </div>
  );
}
