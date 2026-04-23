import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Plus, MapPin, Link2, Trash2, Video, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Meeting {
  id: string;
  title: string;
  description: string | null;
  project_id: string | null;
  supervisor_id: string;
  student_id: string;
  scheduled_at: string;
  duration_minutes: number;
  location: string | null;
  meeting_link: string | null;
  status: string;
}

interface ProjectRow {
  id: string;
  title: string;
  student_id: string;
  supervisor_id: string | null;
}

export default function SchedulePage() {
  const { user, role } = useAuth();
  const isSupervisor = role === "supervisor" || role === "admin";

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState("10:00");
  const [duration, setDuration] = useState("30");
  const [location, setLocation] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadAll = async () => {
    if (!user) return;
    setLoading(true);
    const { data: m } = await supabase
      .from("meetings")
      .select("*")
      .order("scheduled_at", { ascending: true });
    const list = (m as Meeting[]) || [];
    setMeetings(list);

    // Profiles for participant names
    const ids = Array.from(new Set(list.flatMap((x) => [x.supervisor_id, x.student_id])));
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", ids);
      const map: Record<string, string> = {};
      (profs || []).forEach((p: { user_id: string; full_name: string | null }) => {
        map[p.user_id] = p.full_name || "Unknown";
      });
      setProfiles(map);
    }

    // Projects available to supervisor for scheduling
    if (isSupervisor) {
      const { data: pj } = await supabase
        .from("projects")
        .select("id, title, student_id, supervisor_id")
        .eq("supervisor_id", user.id);
      setProjects((pj as ProjectRow[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
    if (!user) return;
    const ch = supabase
      .channel(`meetings-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "meetings" }, () => loadAll())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, role]);

  const resetForm = () => {
    setTitle(""); setDescription(""); setProjectId(""); setDate(undefined);
    setTime("10:00"); setDuration("30"); setLocation(""); setMeetingLink("");
  };

  const handleCreate = async () => {
    if (!user) return;
    if (!title.trim() || !projectId || !date) {
      toast.error("Title, project, and date are required");
      return;
    }
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;
    const [hh, mm] = time.split(":").map(Number);
    const scheduled = new Date(date);
    scheduled.setHours(hh, mm, 0, 0);

    setSubmitting(true);
    const { error } = await supabase.from("meetings").insert({
      title: title.trim(),
      description: description.trim() || null,
      project_id: project.id,
      supervisor_id: user.id,
      student_id: project.student_id,
      scheduled_at: scheduled.toISOString(),
      duration_minutes: parseInt(duration, 10) || 30,
      location: location.trim() || null,
      meeting_link: meetingLink.trim() || null,
      created_by: user.id,
    });
    setSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Meeting scheduled");
    resetForm();
    setOpen(false);
  };

  const handleCancel = async (id: string) => {
    const { error } = await supabase.from("meetings").update({ status: "cancelled" }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Meeting cancelled");
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("meetings").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Meeting removed");
  };

  const { upcoming, past } = useMemo(() => {
    const now = Date.now();
    const up: Meeting[] = []; const ps: Meeting[] = [];
    meetings.forEach((m) => {
      (new Date(m.scheduled_at).getTime() >= now ? up : ps).push(m);
    });
    return { upcoming: up, past: ps.reverse() };
  }, [meetings]);

  const renderMeeting = (m: Meeting) => {
    const dt = new Date(m.scheduled_at);
    const otherId = user?.id === m.supervisor_id ? m.student_id : m.supervisor_id;
    const otherLabel = user?.id === m.supervisor_id ? "Student" : "Supervisor";
    const cancelled = m.status === "cancelled";
    return (
      <div
        key={m.id}
        className={cn(
          "rounded-lg border border-gold bg-card p-5 hover:shadow-gold transition-all",
          cancelled && "opacity-60"
        )}
      >
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <CalendarIcon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-foreground">{m.title}</h3>
              {cancelled && <Badge variant="destructive">Cancelled</Badge>}
              {!cancelled && new Date(m.scheduled_at).getTime() < Date.now() && (
                <Badge variant="secondary">Past</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {format(dt, "EEE, MMM d, yyyy")} · {format(dt, "h:mm a")} · {m.duration_minutes} min
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {otherLabel}: <span className="text-foreground">{profiles[otherId] || "—"}</span>
            </p>
            {m.description && <p className="text-sm text-foreground/80 mt-2">{m.description}</p>}
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
              {m.location && (
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{m.location}</span>
              )}
              {m.meeting_link && (
                <a href={m.meeting_link} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                  <Video className="h-3 w-3" />Join link
                </a>
              )}
            </div>
          </div>
          {(user?.id === m.supervisor_id || role === "admin") && !cancelled && (
            <div className="flex flex-col gap-1">
              <Button size="sm" variant="ghost" onClick={() => handleCancel(m.id)}>Cancel</Button>
              <Button size="sm" variant="ghost" onClick={() => handleDelete(m.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Schedule</h1>
          <div className="divider-gold w-12 mt-2 mb-1" />
          <p className="text-sm text-muted-foreground">
            {isSupervisor
              ? "Schedule supervision meetings with your students."
              : "Your upcoming meetings with your supervisor."}
          </p>
        </div>
        {isSupervisor && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" /> Schedule meeting
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Schedule a meeting</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Title</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Progress review" />
                </div>
                <div>
                  <Label>Project / Student</Label>
                  <Select value={projectId} onValueChange={setProjectId}>
                    <SelectTrigger><SelectValue placeholder="Select a project" /></SelectTrigger>
                    <SelectContent>
                      {projects.length === 0 && (
                        <div className="px-3 py-2 text-sm text-muted-foreground">No supervised projects yet</div>
                      )}
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {date ? format(date, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={date} onSelect={setDate} initialFocus className={cn("p-3 pointer-events-auto")} />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label>Time</Label>
                    <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Duration (min)</Label>
                    <Input type="number" min={15} step={15} value={duration} onChange={(e) => setDuration(e.target.value)} />
                  </div>
                  <div>
                    <Label>Location</Label>
                    <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Office / Room" />
                  </div>
                </div>
                <div>
                  <Label>Meeting link (optional)</Label>
                  <Input value={meetingLink} onChange={(e) => setMeetingLink(e.target.value)} placeholder="https://meet..." />
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Agenda or notes" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={submitting}>
                  {submitting ? "Scheduling..." : "Schedule"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading meetings...</p>
      ) : (
        <div className="space-y-8">
          <section className="space-y-3">
            <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground flex items-center gap-2">
              <Clock className="h-3.5 w-3.5" /> Upcoming ({upcoming.length})
            </h2>
            {upcoming.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                No upcoming meetings.
                {isSupervisor && " Click \"Schedule meeting\" to add one."}
              </div>
            ) : (
              <div className="grid gap-3">{upcoming.map(renderMeeting)}</div>
            )}
          </section>

          {past.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">Past</h2>
              <div className="grid gap-3">{past.map(renderMeeting)}</div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
