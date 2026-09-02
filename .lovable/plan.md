# Rewrite the Northeastern personal statement truthfully

## Goal
Keep the essay's reflective tone, structure, and length, but replace the paragraph describing features ORPTS does not have with an accurate account of what the platform actually does.

## What is inaccurate
The second paragraph claims Defense Buddy (ORPTS) was built to:
1. Generate UML diagrams from a student's project description
2. Draft full methodology chapters
3. Assemble results into submission-ready Word documents

None of these exist in the codebase. The real AI features are:
- **AI Assistant (RAG chatbot)** — a streaming assistant grounded in the user's live projects, documents, and milestones, answering supervision and methodology questions
- **Auto-Defense Simulator** — analyzes a student's uploaded chapter/document and generates realistic defense questions with evaluated practice answers
- **Document Insights** — AI-generated summary and review guidance on uploaded chapter drafts

The real engineering depth is in the platform itself: role-based access (student / supervisor / admin) with row-level security, versioned document uploads with threaded supervisor feedback, real-time messaging, meeting scheduling, and a hardened auth/role system — all built on React, Vite, Tailwind, and a managed Postgres backend with edge functions.

## Rewrite approach
- Keep every paragraph before and after the false one essentially intact (personal history, GPA, Northeastern motivation, goals) — only fix factual details where needed (e.g., "Defense Buddy" naming stays).
- Replace the UML / methodology-chapter / Word-document claims with an equivalent three-part learning narrative drawn from the real features:
  1. The **RAG assistant** — taught prompt grounding, context injection, and why retrieval quality decides whether AI help is useful or dangerous
  2. The **defense simulator** — pushed into natural language generation limits: getting a model to ask probing, academically rigorous questions and evaluate answers fairly
  3. The **platform engineering** — auth, row-level security, versioning, real-time data: the unglamorous but essential engineering that turns a good idea into software a department could actually run
- Preserve the exact reflective cadence ("Each of those pieces taught me something different...") so the statement still reads as one voice.
- Light copyedit pass on the remaining known artifacts (missing em-dashes/commas lost in extraction) — no content changes.

## Deliverable
A new downloadable Word document `Northeastern_Toluwanimi_revised.docx` (same two-page personal statement format) plus the revised text shown in chat for review before download.

## Technical notes
- Generate the .docx with the docx skill (docx-js, US Letter, 1" margins, serif body font to match a statement of purpose).
- No changes to app code.
