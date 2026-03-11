import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account and system preferences.</p>
      </div>

      <div className="rounded-xl border bg-card p-8 text-center">
        <Settings className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground text-sm">
          Settings will be available once authentication is connected via Lovable Cloud.
        </p>
      </div>
    </div>
  );
}
