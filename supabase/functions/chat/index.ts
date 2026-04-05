import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Get auth token to fetch user's documents for RAG
    const authHeader = req.headers.get("Authorization");
    let documentContext = "";

    if (authHeader) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";
      const supabase = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: authHeader } },
      });

      // Fetch user's projects for context
      const { data: projects } = await supabase
        .from("projects")
        .select("title, description, abstract, status, department, faculty")
        .limit(10);

      // Fetch user's documents metadata
      const { data: documents } = await supabase
        .from("documents")
        .select("title, file_name, mime_type, created_at")
        .limit(20);

      // Fetch milestones
      const { data: milestones } = await supabase
        .from("milestones")
        .select("title, description, status, due_date")
        .limit(20);

      if (projects?.length) {
        documentContext += "\n\n## User's Projects:\n" +
          projects.map(p => `- **${p.title}** (${p.status}): ${p.description || ""}\n  Abstract: ${p.abstract || "N/A"}\n  Dept: ${p.department || "N/A"}, Faculty: ${p.faculty || "N/A"}`).join("\n");
      }
      if (documents?.length) {
        documentContext += "\n\n## User's Documents:\n" +
          documents.map(d => `- ${d.title} (${d.file_name}) - uploaded ${d.created_at}`).join("\n");
      }
      if (milestones?.length) {
        documentContext += "\n\n## User's Milestones:\n" +
          milestones.map(m => `- **${m.title}** (${m.status}) - due ${m.due_date}: ${m.description || ""}`).join("\n");
      }
    }

    const systemPrompt = `You are the ORPTS AI Assistant — an intelligent helper for the Online Research Project Tracking & Supervision system. You help students and supervisors with:
- Project management questions
- Supervision guidelines and best practices
- Thesis writing and defense preparation advice
- System usage and navigation help
- Academic research methodology guidance (especially Design Science Research)

${documentContext ? `Here is the user's current data from the system for context:${documentContext}` : "The user has no data in the system yet."}

Be helpful, concise, and academic in tone. Reference the user's actual project data when relevant.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
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
