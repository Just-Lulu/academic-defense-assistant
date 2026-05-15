import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Extract plain text from a stored document (best-effort).
// PDFs/DOCX won't fully decode without a parser, but we extract printable
// ASCII runs which often catches abstract/intro content from text-based PDFs.
async function extractDocumentText(
  supabase: ReturnType<typeof createClient>,
  filePath: string,
  mimeType: string | null,
): Promise<string> {
  try {
    const { data, error } = await supabase.storage.from("documents").download(filePath);
    if (error || !data) return "";

    if (mimeType?.startsWith("text/") || filePath.endsWith(".txt") || filePath.endsWith(".md")) {
      return await data.text();
    }

    // For binary docs, pull readable ASCII runs of length >= 4
    const buf = new Uint8Array(await data.arrayBuffer());
    const chunks: string[] = [];
    let current = "";
    for (let i = 0; i < buf.length; i++) {
      const b = buf[i];
      if (b >= 32 && b < 127) {
        current += String.fromCharCode(b);
      } else {
        if (current.length >= 4) chunks.push(current);
        current = "";
      }
    }
    if (current.length >= 4) chunks.push(current);
    return chunks.join(" ").replace(/\s+/g, " ").slice(0, 8000);
  } catch (e) {
    console.error("extractDocumentText error:", e);
    return "";
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { documentId, projectId, numQuestions = 5, difficulty = "moderate", tone = "formal", answerLength = "detailed" } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    let projectContext = "";
    let docTitle = "uploaded document";
    let documentContent = "";

    if (authHeader) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";
      const supabase = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: authHeader } },
      });

      let resolvedProjectId: string | null = projectId ?? null;

      if (documentId) {
        const { data: doc } = await supabase
          .from("documents")
          .select("title, file_name, file_path, mime_type, project_id")
          .eq("id", documentId)
          .maybeSingle();
        if (doc) {
          docTitle = doc.title || doc.file_name;
          if (!resolvedProjectId && doc.project_id) resolvedProjectId = doc.project_id;
          if (doc.file_path) {
            documentContent = await extractDocumentText(supabase, doc.file_path, doc.mime_type);
          }
        }
      }

      if (resolvedProjectId) {
        const { data: project } = await supabase
          .from("projects")
          .select("title, description, abstract, department, faculty")
          .eq("id", resolvedProjectId)
          .maybeSingle();
        if (project) {
          projectContext = `\nProject: ${project.title}\nDescription: ${project.description || "N/A"}\nAbstract: ${project.abstract || "N/A"}\nDepartment: ${project.department || "N/A"}\nFaculty: ${project.faculty || "N/A"}`;
        }
      } else {
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
      formal: "Use a formal academic tone, as expected from a real thesis defense panel.",
      conversational: "Use a conversational and encouraging tone, as a friendly but knowledgeable examiner.",
      critical: "Use a critical and probing tone, challenging assumptions and pushing for deeper justification.",
    };

    const lengthMap: Record<string, string> = {
      brief: "Suggested answers: 2-3 sentences each.",
      detailed: "Suggested answers: one solid paragraph each (4-6 sentences).",
      comprehensive: "Suggested answers: multiple paragraphs with examples and rationale.",
    };

    const systemPrompt = `You are an experienced academic thesis defense examiner with deep expertise in research methodology, study design, and academic rigor.

Your task: generate exactly ${numQuestions} ${difficulty}-difficulty mock defense questions that a real examination panel would ask, plus model answers grounded ONLY in the provided document and project context.

Quality requirements (CRITICAL — your answer is graded on accuracy):
1. Each question must be specific to THIS project — never generic. Reference actual concepts, methods, terminology, or claims from the document/abstract.
2. Cover diverse angles: motivation/problem, methodology, validity/limitations, results interpretation, contribution/novelty, ethical considerations, future work.
3. Suggested answers must be defensible, factually grounded in the supplied context, and demonstrate critical thinking. Do not fabricate findings not present in the source.
4. If the source material is thin, base questions on the project's stated domain and standard rigorous standards for that field — but flag assumptions clearly inside the answer.
5. ${toneMap[tone] || toneMap.formal}
6. ${lengthMap[answerLength] || lengthMap.detailed}

Use the provided tool to return your answer.`;

    const userContent = `Generate mock thesis defense questions for:
Document title: ${docTitle}
${projectContext}
${documentContent ? `\n--- Document content excerpt ---\n${documentContent.substring(0, 6000)}\n--- end excerpt ---` : "\n(No extractable text from the document — rely on project context.)"}`;

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
        // Force structured output via tool calling — far more reliable than JSON parsing
        tools: [
          {
            type: "function",
            function: {
              name: "submit_defense_questions",
              description: "Submit the generated defense questions and suggested answers.",
              parameters: {
                type: "object",
                properties: {
                  questions: {
                    type: "array",
                    minItems: numQuestions,
                    maxItems: numQuestions,
                    items: {
                      type: "object",
                      properties: {
                        question: { type: "string", description: "The mock defense question." },
                        suggestedAnswer: { type: "string", description: "Defensible model answer grounded in the source." },
                        category: {
                          type: "string",
                          enum: ["motivation", "methodology", "results", "validity", "contribution", "ethics", "future_work"],
                          description: "Question category.",
                        },
                      },
                      required: ["question", "suggestedAnswer", "category"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["questions"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_defense_questions" } },
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
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let parsed: { questions: Array<{ question: string; suggestedAnswer: string; category?: string }> } = { questions: [] };

    if (toolCall?.function?.arguments) {
      try {
        parsed = JSON.parse(toolCall.function.arguments);
      } catch (e) {
        console.error("Failed to parse tool arguments:", e, toolCall.function.arguments);
      }
    } else {
      // Fallback: try to parse content as JSON
      const content = data.choices?.[0]?.message?.content || "";
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
      } catch {
        console.error("No tool_call and content not JSON:", content);
      }
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
