import { useState } from "react";
import { LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import heroBg from "@/assets/hero-bg.jpg";

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("/app");
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:flex-1 relative items-center justify-center">
        <img src={heroBg} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-background/70" />
        <div className="relative z-10 max-w-md text-center px-12">
          <h2 className="font-display text-5xl font-bold text-gradient-gold tracking-wider">ORPTS</h2>
          <p className="mt-2 font-display text-lg text-muted-foreground italic">
            Online Research Project Tracking System
          </p>
          <div className="divider-gold mx-auto my-6 w-16" />
          <p className="text-sm text-muted-foreground leading-relaxed">
            AI-powered academic supervision platform built with Design Science Research methodology.
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-card">
        <div className="w-full max-w-sm">
          <div className="lg:hidden text-center mb-8">
            <span className="font-display text-3xl font-bold text-gradient-gold tracking-wider">ORPTS</span>
          </div>

          <h1 className="font-display text-2xl font-bold text-foreground text-center">
            {isSignUp ? "Create Account" : "Welcome Back"}
          </h1>
          <div className="divider-gold mx-auto my-4 w-12" />
          <p className="text-sm text-muted-foreground text-center">
            {isSignUp ? "Sign up to get started" : "Sign in to your account"}
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {isSignUp && (
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Full Name</label>
                <input
                  type="text"
                  className="mt-1.5 w-full rounded-md border border-gold bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="John Doe"
                />
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</label>
              <input
                type="email"
                className="mt-1.5 w-full rounded-md border border-gold bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="you@university.edu"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Password</label>
              <input
                type="password"
                className="mt-1.5 w-full rounded-md border border-gold bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="••••••••"
              />
            </div>
            {isSignUp && (
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Role</label>
                <select className="mt-1.5 w-full rounded-md border border-gold bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                  <option>Student</option>
                  <option>Supervisor</option>
                </select>
              </div>
            )}
            <Button type="submit" variant="hero" className="w-full" size="lg">
              {isSignUp ? (
                <><UserPlus className="h-4 w-4 mr-1" /> Create Account</>
              ) : (
                <><LogIn className="h-4 w-4 mr-1" /> Sign In</>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button onClick={() => setIsSignUp(!isSignUp)} className="font-medium text-primary hover:underline">
              {isSignUp ? "Sign In" : "Sign Up"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
