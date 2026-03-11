import { useState } from "react";
import { BookOpen, LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

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
      <div className="hidden lg:flex lg:flex-1 bg-hero-gradient items-center justify-center p-12">
        <div className="max-w-md text-center">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-accent/20 flex items-center justify-center mb-6">
            <BookOpen className="h-8 w-8 text-accent" />
          </div>
          <h2 className="font-display text-3xl font-bold text-primary-foreground">SuperviseAI</h2>
          <p className="mt-4 text-primary-foreground/70 leading-relaxed">
            AI-powered academic supervision platform built with Design Science Research methodology.
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <BookOpen className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold text-foreground">SuperviseAI</span>
          </div>

          <h1 className="font-display text-2xl font-bold text-foreground text-center">
            {isSignUp ? "Create Account" : "Welcome Back"}
          </h1>
          <p className="text-sm text-muted-foreground text-center mt-2">
            {isSignUp ? "Sign up to get started" : "Sign in to your account"}
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {isSignUp && (
              <div>
                <label className="text-sm font-medium text-foreground">Full Name</label>
                <input
                  type="text"
                  className="mt-1 w-full rounded-lg border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="John Doe"
                />
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-foreground">Email</label>
              <input
                type="email"
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="you@university.edu"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Password</label>
              <input
                type="password"
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="••••••••"
              />
            </div>
            {isSignUp && (
              <div>
                <label className="text-sm font-medium text-foreground">Role</label>
                <select className="mt-1 w-full rounded-lg border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                  <option>Student</option>
                  <option>Supervisor</option>
                </select>
              </div>
            )}
            <Button type="submit" className="w-full" size="lg">
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
