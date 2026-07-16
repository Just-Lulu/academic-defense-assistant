import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Bot, Brain, Calendar, FileText, MessageSquare, Shield, Users, ChevronDown } from "lucide-react";
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
  visible: { transition: { staggerChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-gold bg-background/90 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <span className="font-display text-2xl font-bold text-primary tracking-wider">ORPTS</span>
          <div className="hidden sm:flex items-center gap-8">
            <button onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })} className="text-sm text-muted-foreground hover:text-primary transition-colors tracking-wide uppercase">Features</button>
            <button onClick={() => document.getElementById("about")?.scrollIntoView({ behavior: "smooth" })} className="text-sm text-muted-foreground hover:text-primary transition-colors tracking-wide uppercase">About</button>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/login")} className="text-muted-foreground hover:text-primary tracking-wide uppercase text-xs">Sign In</Button>
            <Button variant="hero" size="sm" onClick={() => navigate("/login")}>Get Started</Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroBg}
            alt=""
            width={1920}
            height={1080}
            fetchPriority="high"
            decoding="async"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-hero-overlay" />
        </div>
        <div className="container relative z-10 py-32 pt-40">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="max-w-3xl mx-auto text-center"
          >
            <motion.p variants={fadeUp} className="text-sm tracking-[0.3em] uppercase text-primary mb-6">
              AI-Powered Academic Supervision
            </motion.p>
            <motion.h1
              variants={fadeUp}
              className="font-display text-5xl font-bold leading-tight tracking-tight text-foreground sm:text-6xl md:text-7xl"
            >
              <span className="text-gradient-gold">ORPTS</span>
              <span className="sr-only"> — Online Research Project Tracking System</span>
            </motion.h1>
            <motion.p variants={fadeUp} className="font-display text-xl text-muted-foreground mt-2 sm:text-2xl italic">
              Online Research Project Tracking System
            </motion.p>

            <motion.p
              variants={fadeUp}
              className="mt-8 max-w-xl mx-auto text-base leading-relaxed text-muted-foreground"
            >
              A comprehensive platform that streamlines thesis supervision with
              intelligent document analysis, automated defense preparation, and
              AI-assisted communication.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-10 flex flex-wrap justify-center gap-4">
              <Button variant="hero" size="xl" onClick={() => navigate("/login")}>
                Explore Now <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
              <Button variant="hero-outline" size="xl" onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}>
                View Features
              </Button>
            </motion.div>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2"
          >
            <ChevronDown className="h-6 w-6 text-primary animate-bounce" />
          </motion.div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-gold bg-card">
        <div className="container py-8">
          <div className="grid grid-cols-3 gap-6 max-w-lg mx-auto text-center">
            {[
              { value: "8+", label: "Core Modules" },
              { value: "2", label: "AI Engines" },
              { value: "3", label: "User Roles" },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-3xl font-display font-bold text-primary">{stat.value}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="py-24 bg-background">
        <div className="container grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-xs tracking-[0.25em] uppercase text-primary mb-3">About the Platform</p>
            <h2 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
              The Comprehensive Approach to Research Supervision
            </h2>
            <div className="divider-gold my-6 w-24" />
            <p className="text-muted-foreground leading-relaxed">
              ORPTS is built using Design Science Research methodology, providing a robust platform for managing the entire thesis supervision lifecycle. From project registration to AI-powered defense preparation, every feature is designed for academic excellence.
            </p>
            <Button variant="hero" size="lg" className="mt-8" onClick={() => navigate("/login")}>
              Learn about our research supervision methodology
            </Button>

          </div>
          <div className="rounded-lg overflow-hidden border border-gold">
            <img src={heroBg} alt="Academic workspace" className="w-full h-72 object-cover" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 bg-card">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16 text-center"
          >
            <p className="text-xs tracking-[0.25em] uppercase text-primary mb-3">Platform Capabilities</p>
            <h2 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
              What's Included
            </h2>
            <div className="divider-gold mx-auto my-6 w-24" />
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
          >
            {features.map((f) => (
              <motion.div
                key={f.title}
                variants={fadeUp}
                className="group rounded-lg border border-gold bg-background p-6 transition-all duration-300 hover:shadow-gold hover:-translate-y-1"
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-sans text-sm font-semibold text-foreground tracking-wide">{f.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{f.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-background relative overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <img src={heroBg} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="absolute inset-0 bg-background/80" />
        <div className="container relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <p className="text-xs tracking-[0.25em] uppercase text-primary mb-3">Get Started</p>
            <h2 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
              Ready to Modernize Your Supervision?
            </h2>
            <div className="divider-gold mx-auto my-6 w-24" />
            <p className="mx-auto max-w-lg text-muted-foreground">
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
      <footer className="border-t border-gold py-10 bg-card">
        <div className="container flex flex-col items-center justify-between gap-4 sm:flex-row">
          <span className="font-display text-lg font-bold text-primary tracking-wider">ORPTS</span>
          <p className="text-xs text-muted-foreground">
            © 2026 ORPTS — Adesina Toluwanimi
          </p>
        </div>
      </footer>
    </div>
  );
}
