
-- 1. Performance indexes
CREATE INDEX IF NOT EXISTS idx_projects_student_id ON public.projects(student_id);
CREATE INDEX IF NOT EXISTS idx_projects_supervisor_id ON public.projects(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);

CREATE INDEX IF NOT EXISTS idx_milestones_project_id ON public.milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_milestones_due_date ON public.milestones(due_date);
CREATE INDEX IF NOT EXISTS idx_milestones_status ON public.milestones(status);

CREATE INDEX IF NOT EXISTS idx_documents_project_id ON public.documents(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON public.documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_documents_review_status ON public.documents(review_status);

CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_project_id ON public.messages(project_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);

-- 2. Data integrity: uploaded_by must always be set
ALTER TABLE public.documents ALTER COLUMN uploaded_by SET NOT NULL;

-- 3. Realtime: full row payloads + add to publication
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.milestones REPLICA IDENTITY FULL;
ALTER TABLE public.documents REPLICA IDENTITY FULL;
ALTER TABLE public.projects REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.milestones;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.documents;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
