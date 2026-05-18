# Plan

## 1. Login details for Aisha Bello & "Talia"

Findings from the database:
- **Aisha Bello** exists → email `student.demo@orpts.test`, role: student.
- **Talia** → no account found (no profile or email matches "talia").

Passwords are hashed and cannot be read back. Two options for each account:

- Reset Aisha Bello's password to a known value (e.g. `Stud3nt!Aisha2026`) via the existing `admin-manage-users` edge function (add a `reset_password` action) or directly via the Supabase admin API in a one-off call.
- For Talia: either confirm the intended email, or create a new student account `student.talia@orpts.app` with a known password.

**Clarify before I run anything:** confirm Talia's full name + intended email (or let me create `Talia Okafor` / `student.talia@orpts.app`).

## 2. Supervisor name not showing on the Projects page

Root cause: `ProjectsPage.fetchSupervisors()` queries `public.user_roles` to find supervisor IDs. The RLS on `user_roles` only allows users to view **their own** roles (or admins to view all). For a student, that query returns 0 rows, so `supervisors` is empty and `getSupervisorName(supervisor_id)` returns `null`. The UI then shows neither the supervisor's name nor the "Assign Supervisor" button (because `supervisor_id` is set).

Fix (frontend only — `src/pages/ProjectsPage.tsx`):
- Resolve the supervisor name directly from `public.profiles` using each project's `supervisor_id` (profiles are readable by all authenticated users via existing RLS). No schema or policy change needed.
- Still load the supervisor list for the assignment dropdown, but make it tolerant when empty (e.g. only show "Assign Supervisor" to the student/admin and fall back to "no supervisors available" if the list is empty for non-admins).

## 3. How a supervisor marks a document as reviewed

Already implemented on the Supervisor page (`/app/supervisor`):
1. Open the assigned project → scroll to the **Documents** section.
2. Each document version has review-status controls that call `setDocReviewStatus(doc, status)` and write to `documents.review_status` (`reviewed` / `needs_revision` / `not_reviewed`), plus `reviewed_by` and `reviewed_at`.
3. The student sees the resulting badge ("Reviewed", "Needs revision", etc.) on their Documents page.

No code change required — I'll just surface this in the reply. If the buttons are not visible to you, that means your account is currently signed in as a student; sign in with a supervisor account assigned to that project.

## 4. Reject-project error: `projects_status_check`

Root cause: the CHECK constraint on `public.projects.status` only allows  
`draft | in_progress | under_review | completed | archived`.  
`rejectTopic()` in `SupervisorPage.tsx` tries to set status `'rejected'`, which violates the constraint. `pendingTopics` also references a `'pending_approval'` status that isn't allowed either.

Fix (one migration):
- Drop and recreate `projects_status_check` to also allow `'rejected'` and `'pending_approval'`.
- Leave existing rows untouched (all current values remain valid).

## Technical summary

- DB migration: `ALTER TABLE public.projects DROP CONSTRAINT projects_status_check; ALTER TABLE public.projects ADD CONSTRAINT projects_status_check CHECK (status IN ('draft','pending_approval','in_progress','under_review','completed','rejected','archived'));`
- `src/pages/ProjectsPage.tsx`: fetch supervisor profile by `supervisor_id` directly from `profiles`; keep `user_roles` query only as a best-effort source for the assignment dropdown.
- Password reset / account creation: run via the existing `admin-manage-users` edge function (extend with `reset_password` action) — pending your confirmation on Talia.
- No changes needed to document-review code; just an explanation.

## Open question

Who is "Talia"? Please confirm her full name and the email I should use (or approve creating `Talia Okafor` at `student.talia@orpts.app`).
