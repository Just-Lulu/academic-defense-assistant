CREATE TABLE public.meetings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  project_id UUID,
  supervisor_id UUID NOT NULL,
  student_id UUID NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  location TEXT,
  meeting_link TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants and admins can view meetings"
ON public.meetings FOR SELECT TO authenticated
USING (auth.uid() = supervisor_id OR auth.uid() = student_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Supervisors can create meetings for their projects"
ON public.meetings FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = created_by
  AND auth.uid() = supervisor_id
  AND (
    project_id IS NULL OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.supervisor_id = auth.uid() AND p.student_id = meetings.student_id
    )
  )
);

CREATE POLICY "Participants and admins can update meetings"
ON public.meetings FOR UPDATE TO authenticated
USING (auth.uid() = supervisor_id OR auth.uid() = student_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Supervisors and admins can delete meetings"
ON public.meetings FOR DELETE TO authenticated
USING (auth.uid() = supervisor_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_meetings_supervisor ON public.meetings(supervisor_id);
CREATE INDEX idx_meetings_student ON public.meetings(student_id);
CREATE INDEX idx_meetings_project ON public.meetings(project_id);
CREATE INDEX idx_meetings_scheduled_at ON public.meetings(scheduled_at);

CREATE TRIGGER update_meetings_updated_at
BEFORE UPDATE ON public.meetings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.meetings REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.meetings;