import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Heuristic: only fetch project context (RAG) when the user's message
// looks like it actually needs it. This dramatically cuts first-token latency.
const RAG_KEYWORDS = [
  "my project", "project", "thesis", "dissertation", "abstract",
  "milestone", "deadline", "due", "document", "upload", "supervisor",
  "department", "faculty", "progress", "status", "chapter", "defense",
];

function needsProjectContext(messages: Array<{ role: string; content: string }>): boolean {
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser) return false;
  const lower = lastUser.content.toLowerCase();
  return RAG_KEYWORDS.some((k) => lower.includes(k));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    let documentContext = "";

    // Only run RAG queries when the question seems related to the user's data.
    if (authHeader && needsProjectContext(messages)) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";
      const supabase = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: authHeader } },
      });

      // Run all three context fetches in parallel for speed
      const [projectsRes, documentsRes, milestonesRes] = await Promise.all([
        supabase.from("projects").select("title, description, abstract, status, department, faculty").limit(5),
        supabase.from("documents").select("title, file_name, review_status, created_at").limit(10),
        supabase.from("milestones").select("title, description, status, due_date, approved").limit(10),
      ]);

      const projects = projectsRes.data;
      const documents = documentsRes.data;
      const milestones = milestonesRes.data;

      if (projects?.length) {
        documentContext += "\n\n## User's Projects:\n" +
          projects.map(p => `- **${p.title}** (${p.status}): ${p.description || ""} | Dept: ${p.department || "N/A"}`).join("\n");
      }
      if (documents?.length) {
        documentContext += "\n\n## User's Documents:\n" +
          documents.map(d => `- ${d.title} (${d.review_status})`).join("\n");
      }
      if (milestones?.length) {
        documentContext += "\n\n## User's Milestones:\n" +
          milestones.map(m => `- **${m.title}** (${m.status}, due ${m.due_date}${m.approved ? ", approved" : ""})`).join("\n");
      }
    }

    const systemPrompt = `You are the ORPTS AI Assistant for the Online Research Project Tracking & Supervision system. Help students and supervisors with project management, supervision guidelines, thesis writing, defense prep, system navigation, and research methodology (Design Science Research).

${documentContext ? `Context from user's data:${documentContext}` : ""}

Be concise, academic, and direct. Reference user data only when relevant.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // Switched to Gemini Flash for ~3-5x faster first-token latency
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds in Settings > Workspace > Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
