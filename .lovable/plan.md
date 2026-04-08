

# Use Case Diagram & System Architecture Diagram

## Deliverables

Two visual diagrams rendered as `.mmd` Mermaid files with previews:

### 1. Use Case Diagram
Student and Supervisor stick-figure actors with their ORPTS interactions — same as previously designed.

### 2. System Architecture Diagram (3 Layers Only)

```text
+----------------------------------------------------+
|           PRESENTATION LAYER                        |
|  React + TypeScript + Tailwind CSS                  |
|  Dashboard | Projects | Documents | Milestones      |
|  Messages | Defense Simulator | AI Chatbot | Auth   |
+----------------------------------------------------+
                        |
+----------------------------------------------------+
|           APPLICATION LAYER                         |
|  Supabase SDK | Edge Functions | Auth Service       |
|  AI Gateway (Gemini) | Realtime Engine | Storage    |
+----------------------------------------------------+
                        |
+----------------------------------------------------+
|           DATA LAYER                                |
|  PostgreSQL + Row Level Security                    |
|  Tables: projects, documents, milestones,           |
|  messages, profiles, user_roles                     |
|  File Storage: document_uploads bucket              |
+----------------------------------------------------+
```

## Implementation Steps

1. Write Use Case `.mmd` file to `/mnt/documents/ORPTS_Use_Case_Diagram.mmd`
2. Write System Architecture `.mmd` file to `/mnt/documents/ORPTS_System_Architecture.mmd` with exactly 3 layers
3. Render both as inline previews using `presentation-artifact` tags

No code changes — documentation artifacts only.

