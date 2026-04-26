-- 1. Topic approval: rejection reason on projects
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 2. Document versioning
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS chapter TEXT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS parent_document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_documents_chapter ON public.documents(project_id, chapter);

-- 3. Document comments (threaded feedback)
CREATE TABLE IF NOT EXISTS public.document_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.document_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members and admins can view comments"
ON public.document_comments FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.documents d
    JOIN public.projects p ON p.id = d.project_id
    WHERE d.id = document_comments.document_id
      AND (p.student_id = auth.uid() OR p.supervisor_id = auth.uid())
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Project members can post comments"
ON public.document_comments FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = author_id
  AND EXISTS (
    SELECT 1 FROM public.documents d
    JOIN public.projects p ON p.id = d.project_id
    WHERE d.id = document_comments.document_id
      AND (p.student_id = auth.uid() OR p.supervisor_id = auth.uid())
  )
);

CREATE POLICY "Authors can update own comments"
ON public.document_comments FOR UPDATE TO authenticated
USING (auth.uid() = author_id);

CREATE POLICY "Authors and admins can delete comments"
ON public.document_comments FOR DELETE TO authenticated
USING (auth.uid() = author_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_document_comments_doc ON public.document_comments(document_id, created_at);

CREATE TRIGGER update_document_comments_updated_at
BEFORE UPDATE ON public.document_comments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.document_comments REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.document_comments;