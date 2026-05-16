
-- 1) Projects: prevent students from changing supervisor_id/status/student_id
DROP POLICY IF EXISTS "Project members can update" ON public.projects;

CREATE POLICY "Students can update their own project fields"
ON public.projects
FOR UPDATE
TO authenticated
USING (auth.uid() = student_id)
WITH CHECK (
  auth.uid() = student_id
  AND student_id = (SELECT student_id FROM public.projects p WHERE p.id = projects.id)
  AND supervisor_id IS NOT DISTINCT FROM (SELECT supervisor_id FROM public.projects p WHERE p.id = projects.id)
  AND status IS NOT DISTINCT FROM (SELECT status FROM public.projects p WHERE p.id = projects.id)
);

CREATE POLICY "Supervisors can update assigned projects"
ON public.projects
FOR UPDATE
TO authenticated
USING (auth.uid() = supervisor_id)
WITH CHECK (auth.uid() = supervisor_id);

CREATE POLICY "Admins can update any project"
ON public.projects
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2) Storage: allow project members to read each other's documents
CREATE POLICY "Project members can read shared documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND EXISTS (
    SELECT 1
    FROM public.documents d
    JOIN public.projects p ON p.id = d.project_id
    WHERE d.file_path = storage.objects.name
      AND (p.student_id = auth.uid() OR p.supervisor_id = auth.uid())
  )
);

-- 3) Lock down internal trigger functions (not meant to be called directly)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
