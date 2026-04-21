-- Milestones: supervisor feedback + approval
ALTER TABLE public.milestones
  ADD COLUMN IF NOT EXISTS supervisor_feedback text,
  ADD COLUMN IF NOT EXISTS approved boolean NOT NULL DEFAULT false;

-- Documents: review status tracking
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'not_reviewed',
  ADD COLUMN IF NOT EXISTS reviewed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid;

-- Allow project members (student or supervisor) to update documents on their projects
-- (existing policy only lets the uploader update). Add a complementary policy.
DROP POLICY IF EXISTS "Project members can update documents" ON public.documents;
CREATE POLICY "Project members can update documents"
ON public.documents
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = documents.project_id
      AND (projects.student_id = auth.uid() OR projects.supervisor_id = auth.uid())
  )
);