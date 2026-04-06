import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { documentId, documentContent, projectId, numQuestions = 5, difficulty = "moderate", tone = "formal", answerLength = "detailed" } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    let projectContext = "";
    let docTitle = "uploaded document";

    if (authHeader) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";
      const supabase = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: authHeader } },
      });

      if (documentId) {
        const { data: doc } = await supabase
          .from("documents")
          .select("title, file_name")
          .eq("id", documentId)
          .maybeSingle();
        if (doc) docTitle = doc.title || doc.file_name;
      }

      if (projectId) {
        const { data: project } = await supabase
          .from("projects")
          .select("title, description, abstract, department, faculty")
          .eq("id", projectId)
          .maybeSingle();
        if (project) {
          projectContext = `\nProject: ${project.title}\nDescription: ${project.description || "N/A"}\nAbstract: ${project.abstract || "N/A"}\nDepartment: ${project.department || "N/A"}\nFaculty: ${project.faculty || "N/A"}`;
        }
      }

      if (!projectId) {
        const { data: projects } = await supabase
          .from("projects")
          .select("title, description, abstract, department, faculty")
          .limit(1);
        if (projects?.[0]) {
          const p = projects[0];
          projectContext = `\nProject: ${p.title}\nDescription: ${p.description || "N/A"}\nAbstract: ${p.abstract || "N/A"}\nDepartment: ${p.department || "N/A"}\nFaculty: ${p.faculty || "N/A"}`;
        }
      }
    }

    const toneMap: Record<string, string> = {
      formal: "Use a formal academic tone, as would be expected in a real thesis defense panel.",
      conversational: "Use a conversational and encouraging tone, as a friendly but knowledgeable examiner.",
      critical: "Use a critical and probing tone, challenging assumptions and pushing for deeper justification.",
    };

    const lengthMap: Record<string, string> = {
      brief: "Keep suggested answers brief — 2-3 sentences each.",
      detailed: "Provide detailed suggested answers — one solid paragraph each.",
      comprehensive: "Provide comprehensive suggested answers — multiple paragraphs with examples and references.",
    };

    const systemPrompt = `You are an academic thesis defense examiner AI. Generate ${difficulty}-difficulty mock defense questions.
${toneMap[tone] || toneMap.formal}
${lengthMap[answerLength] || lengthMap.detailed}

Generate exactly ${numQuestions} questions with suggested answers.

Respond in this exact JSON format:
{
  "questions": [
    { "question": "...", "suggestedAnswer": "..." }
  ]
}`;

    const userContent = `Generate mock thesis defense questions for:
Document: ${docTitle}
${projectContext}
${documentContent ? `\nDocument content excerpt:\n${documentContent.substring(0, 3000)}` : ""}`;

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
          { role: "user", content: userContent },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI service error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    let parsed;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { questions: [] };
    } catch {
      console.error("Failed to parse AI response:", content);
      parsed = { questions: [] };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("defense-simulator error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
