import { useState, useRef, useEffect } from "react";
import { Brain, Upload, FileText, Loader2, Check, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { Tables } from "@/integrations/supabase/types";

type Document = Tables<"documents">;

interface GeneratedQuestion {
  question: string;
  suggestedAnswer: string;
}

export default function DefenseSimulatorPage() {
  const { user } = useAuth();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [questions, setQuestions] = useState<GeneratedQuestion[] | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Customization options
  const [numQuestions, setNumQuestions] = useState("5");
  const [difficulty, setDifficulty] = useState("moderate");
  const [tone, setTone] = useState("formal");
  const [answerLength, setAnswerLength] = useState("detailed");

  useEffect(() => {
    if (user) fetchDocuments();
  }, [user]);

  async function fetchDocuments() {
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setDocuments(data || []);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);

    const filePath = `${user.id}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage.from("documents").upload(filePath, file);
    if (uploadError) {
      toast.error(uploadError.message);
      setUploading(false);
      return;
    }

    const { data: dbData, error: dbError } = await supabase.from("documents").insert({
      title: file.name.replace(/\.[^/.]+$/, ""),
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      mime_type: file.type,
      uploaded_by: user.id,
    }).select().single();

    if (dbError) toast.error(dbError.message);
    else {
      toast.success("Document uploaded!");
      fetchDocuments();
      if (dbData) setSelectedDocId(dbData.id);
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const handleSimulate = async () => {
    if (!selectedDocId && documents.length === 0) {
      toast.error("Please select or upload a document first.");
      return;
    }

    setIsAnalyzing(true);
    setQuestions(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const response = await supabase.functions.invoke("defense-simulator", {
        body: {
          documentId: selectedDocId || documents[0]?.id,
          numQuestions: parseInt(numQuestions),
          difficulty,
          tone,
          answerLength,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to generate questions");
      }

      const data = response.data;
      if (data?.questions?.length) {
        setQuestions(data.questions);
      } else {
        toast.error("No questions generated. Try again.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to generate questions");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const selectedDoc = documents.find((d) => d.id === selectedDocId);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Auto-Defense Simulator</h1>
        <div className="divider-gold w-16 mt-2 mb-1" />
        <p className="text-sm text-muted-foreground">
          Select a document or upload a new one to generate AI-powered mock defense questions.
        </p>
      </div>

      {/* Document Selection */}
      {documents.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">Choose from uploaded documents</h3>
          <div className="grid gap-2 max-h-48 overflow-auto rounded-lg border border-border bg-card p-3">
            {documents.map((doc) => (
              <button
                key={doc.id}
                onClick={() => setSelectedDocId(doc.id)}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                  selectedDocId === doc.id
                    ? "bg-primary/10 border border-primary text-foreground"
                    : "hover:bg-secondary text-muted-foreground border border-transparent"
                }`}
              >
                <FileText className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate flex-1">{doc.file_name}</span>
                {selectedDocId === doc.id && <Check className="h-4 w-4 text-primary shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Upload area */}
      <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
        <div className="mx-auto h-14 w-14 rounded-md bg-primary/10 flex items-center justify-center text-primary mb-4">
          <Upload className="h-7 w-7" />
        </div>
        <h3 className="font-semibold text-foreground">
          {documents.length > 0 ? "Or upload a new document" : "Upload Your Thesis Document"}
        </h3>
        <p className="text-sm text-muted-foreground mt-1 mb-4">Supports PDF, DOCX up to 20MB</p>
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload} accept=".pdf,.docx,.doc,.txt" />
        <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          <FileText className="h-4 w-4 mr-1" />
          {uploading ? "Uploading..." : "Choose File"}
        </Button>
        {selectedDoc && (
          <p className="text-xs text-muted-foreground mt-3">
            Selected: <span className="font-medium text-foreground">{selectedDoc.file_name}</span>
          </p>
        )}
      </div>

      {/* Customization Options */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Settings2 className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-foreground text-sm">Customize Output</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Number of Questions</Label>
            <Select value={numQuestions} onValueChange={setNumQuestions}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 Questions</SelectItem>
                <SelectItem value="5">5 Questions</SelectItem>
                <SelectItem value="8">8 Questions</SelectItem>
                <SelectItem value="10">10 Questions</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Difficulty</Label>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="challenging">Challenging</SelectItem>
                <SelectItem value="expert">Expert</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Tone</Label>
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="formal">Formal Academic</SelectItem>
                <SelectItem value="conversational">Conversational</SelectItem>
                <SelectItem value="critical">Critical/Probing</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Answer Length</Label>
            <Select value={answerLength} onValueChange={setAnswerLength}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="brief">Brief (2-3 sentences)</SelectItem>
                <SelectItem value="detailed">Detailed (paragraph)</SelectItem>
                <SelectItem value="comprehensive">Comprehensive (multi-paragraph)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <Button
        variant="default"
        size="lg"
        className="w-full"
        onClick={handleSimulate}
        disabled={isAnalyzing || (!selectedDocId && documents.length === 0)}
      >
        {isAnalyzing ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analyzing Document...</>
        ) : (
          <><Brain className="h-4 w-4 mr-2" /> Generate Defense Questions</>
        )}
      </Button>

      {/* Results */}
      <AnimatePresence>
        {questions && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <h2 className="font-display text-lg font-semibold text-foreground">
              Generated Mock Defense Questions ({questions.length})
            </h2>
            {questions.map((q, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="rounded-lg border border-border bg-card p-5 space-y-3"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    {i + 1}
                  </span>
                  <h3 className="font-semibold text-foreground">{q.question}</h3>
                </div>
                <div className="ml-9 rounded-md bg-secondary p-4 border border-border">
                  <p className="text-[10px] font-medium text-muted-foreground mb-1 uppercase tracking-wider">Suggested Answer</p>
                  <p className="text-sm text-foreground leading-relaxed">{q.suggestedAnswer}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
