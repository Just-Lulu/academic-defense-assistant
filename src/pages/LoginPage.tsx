import { useState } from "react";
import { LogIn, UserPlus, Eye, EyeOff, Check, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import heroBg from "@/assets/hero-bg.jpg";

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPwHints, setShowPwHints] = useState(false);

  const pwChecks = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /\d/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  };

  const generateStrongPassword = () => {
    const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const lower = "abcdefghijkmnopqrstuvwxyz";
    const nums = "23456789";
    const syms = "!@#$%^&*?";
    const all = upper + lower + nums + syms;
    const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
    let pw = [pick(upper), pick(lower), pick(nums), pick(syms)];
    for (let i = 0; i < 12; i++) pw.push(pick(all));
    pw = pw.sort(() => Math.random() - 0.5);
    setPassword(pw.join(""));
    setShowPassword(true);
  };
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"student" | "supervisor">("student");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Redirect if already logged in
  if (user) {
    navigate("/app", { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName, role },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;

        toast.success("Account created! Check your email to confirm, or sign in if auto-confirm is enabled.");
        // If auto-confirmed, navigate
        if (data.session) navigate("/app");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/app");
      }
    } catch (err: any) {
      toast.error(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
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
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1.5 w-full rounded-md border border-gold bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="John Doe"
                />
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-gold bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="you@university.edu"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Password</label>
              <div className="relative mt-1.5">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md border border-gold bg-background px-3 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {isSignUp && (
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as "student" | "supervisor")}
                  className="mt-1.5 w-full rounded-md border border-gold bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="student">Student</option>
                  <option value="supervisor">Supervisor</option>
                </select>
              </div>
            )}
            <Button type="submit" variant="hero" className="w-full" size="lg" disabled={loading}>
              {loading ? (
                <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : isSignUp ? (
                <><UserPlus className="h-4 w-4 mr-1" /> Create Account</>
              ) : (
                <><LogIn className="h-4 w-4 mr-1" /> Sign In</>
              )}
            </Button>
          </form>

          <div className="mt-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Button
            type="button"
            variant="outline"
            size="lg"
            className="mt-4 w-full"
            disabled={loading}
            onClick={async () => {
              try {
                const result = await lovable.auth.signInWithOAuth("google", {
                  redirect_uri: window.location.origin + "/app",
                });
                if (result.error) throw new Error(result.error.message || "Google sign-in failed");
              } catch (err: any) {
                toast.error(err.message || "Google sign-in failed");
              }
            }}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"/>
            </svg>
            Continue with Google
          </Button>

          <Button
            type="button"
            variant="outline"
            size="lg"
            className="mt-3 w-full"
            disabled={loading}
            onClick={async () => {
              try {
                const result = await lovable.auth.signInWithOAuth("apple", {
                  redirect_uri: window.location.origin + "/app",
                });
                if (result.error) throw new Error(result.error.message || "Apple sign-in failed");
              } catch (err: any) {
                toast.error(err.message || "Apple sign-in failed");
              }
            }}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M16.365 1.43c0 1.14-.42 2.22-1.13 3-.76.84-2 .15-2.08-.06-.06-1.1.46-2.18 1.16-2.93C15.13.62 16.36.13 16.36.13s.01.81.01 1.3zM20.5 17.36c-.36.83-.53 1.2-1 1.94-.65 1.04-1.57 2.34-2.71 2.35-1.01.01-1.27-.66-2.64-.65-1.37.01-1.66.66-2.67.65-1.14-.01-2.01-1.18-2.66-2.22-1.81-2.91-2-6.32-.88-8.13.79-1.29 2.04-2.04 3.21-2.04 1.2 0 1.95.66 2.94.66.96 0 1.55-.66 2.94-.66 1.05 0 2.16.57 2.95 1.56-2.59 1.42-2.17 5.12.52 6.54z"/>
            </svg>
            Continue with Apple
          </Button>

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
