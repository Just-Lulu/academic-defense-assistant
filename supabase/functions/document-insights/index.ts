import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { documentId, projectId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey =
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    let docTitle = "Uploaded document";
    let docFileName = "";
    let projectContext = "";

    if (documentId) {
      const { data: doc } = await supabase
        .from("documents")
        .select("title, file_name, project_id")
        .eq("id", documentId)
        .maybeSingle();
      if (doc) {
        docTitle = doc.title || doc.file_name;
        docFileName = doc.file_name || "";
        if (!projectId && doc.project_id) {
          const { data: project } = await supabase
            .from("projects")
            .select("title, description, abstract, department, faculty")
            .eq("id", doc.project_id)
            .maybeSingle();
          if (project) {
            projectContext = `Project: ${project.title}\nDescription: ${project.description || "N/A"}\nAbstract: ${project.abstract || "N/A"}\nDepartment: ${project.department || "N/A"}\nFaculty: ${project.faculty || "N/A"}`;
          }
        }
      }
    }

    if (projectId && !projectContext) {
      const { data: project } = await supabase
        .from("projects")
        .select("title, description, abstract, department, faculty")
        .eq("id", projectId)
        .maybeSingle();
      if (project) {
        projectContext = `Project: ${project.title}\nDescription: ${project.description || "N/A"}\nAbstract: ${project.abstract || "N/A"}\nDepartment: ${project.department || "N/A"}\nFaculty: ${project.faculty || "N/A"}`;
      }
    }

    const systemPrompt = `You are a senior thesis supervisor and academic reviewer.
Analyze the student's submitted research document based on the available metadata and project context.
Identify likely weaknesses, gaps, and risks, and propose probing defense questions a panel might ask.

Respond ONLY with valid JSON in this exact shape (no prose outside JSON):
{
  "summary": "2-3 sentence overview of the document's apparent focus and quality.",
  "weaknesses": ["short, specific weakness 1", "short, specific weakness 2", "..."],
  "defenseQuestions": ["pointed defense question 1", "pointed defense question 2", "..."]
}
Provide 4-6 weaknesses and 5-7 defense questions. Be concrete and academic.`;

    const userContent = `Document title: ${docTitle}
File name: ${docFileName}

${projectContext || "No project context available."}

Generate the supervisor insights now.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI service error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    let parsed: { summary?: string; weaknesses?: string[]; defenseQuestions?: string[] } = {};
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
      console.error("Failed to parse AI response:", content);
    }

    return new Response(
      JSON.stringify({
        summary: parsed.summary || "",
        weaknesses: parsed.weaknesses || [],
        defenseQuestions: parsed.defenseQuestions || [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("document-insights error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
