import { useState, useRef } from "react";
import { Settings, User, LogOut, Save, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function SettingsPage() {
  const { user, profile, role, signOut } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [department, setDepartment] = useState(profile?.department || "");
  const [faculty, setFaculty] = useState(profile?.faculty || "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, department, faculty, avatar_url: avatarUrl })
      .eq("user_id", user.id);
    if (error) toast.error(error.message);
    else toast.success("Profile updated!");
    setSaving(false);
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const filePath = `${user.id}/avatar_${Date.now()}.${file.name.split(".").pop()}`;
    const { error: uploadError } = await supabase.storage.from("documents").upload(filePath, file);
    if (uploadError) { toast.error(uploadError.message); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("documents").getPublicUrl(filePath);
    setAvatarUrl(urlData.publicUrl);
    setUploading(false);
    toast.success("Avatar uploaded! Save to apply.");
  }

  async function handleSignOut() {
    await signOut();
    navigate("/login");
  }

  const inputClass = "mt-1.5 w-full rounded-md border border-gold bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Settings</h1>
        <div className="divider-gold w-12 mt-2 mb-1" />
        <p className="text-sm text-muted-foreground">Manage your profile and account preferences.</p>
      </div>

      {/* Profile Card */}
      <form onSubmit={handleSave} className="rounded-lg border border-gold bg-card p-6 space-y-5">
        <div className="flex items-center gap-4">
          <div className="relative">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="h-16 w-16 rounded-full object-cover border-2 border-primary/20" />
            ) : (
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <User className="h-7 w-7" />
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Upload className="h-3 w-3" />
            </button>
          </div>
          <div>
            <h2 className="font-semibold text-foreground">{profile?.full_name || user?.email}</h2>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
            {role && (
              <span className="inline-block mt-1 text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {role}
              </span>
            )}
          </div>
        </div>

        <div className="grid gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Full Name</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} placeholder="Your full name" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Faculty</label>
              <input value={faculty} onChange={(e) => setFaculty(e.target.value)} className={inputClass} placeholder="e.g. Engineering" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Department</label>
              <input value={department} onChange={(e) => setDepartment(e.target.value)} className={inputClass} placeholder="e.g. Computer Science" />
            </div>
          </div>
        </div>

        <Button type="submit" variant="hero" disabled={saving}>
          <Save className="h-4 w-4 mr-1" /> {saving ? "Saving..." : "Save Profile"}
        </Button>
      </form>

      {/* Sign Out */}
      <div className="rounded-lg border border-gold bg-card p-6">
        <h3 className="font-semibold text-foreground mb-2">Account</h3>
        <p className="text-sm text-muted-foreground mb-4">Sign out of your ORPTS account.</p>
        <Button variant="outline" onClick={handleSignOut} className="text-destructive hover:text-destructive">
          <LogOut className="h-4 w-4 mr-1" /> Sign Out
        </Button>
      </div>
    </div>
  );
}
