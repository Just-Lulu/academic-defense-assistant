import { useState } from "react";
import { Brain, Upload, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

interface MockQuestion {
  question: string;
  suggestedAnswer: string;
}

const mockQuestions: MockQuestion[] = [
  {
    question: "What is the primary research gap your study addresses?",
    suggestedAnswer: "The study addresses the lack of AI-integrated tools in academic supervision systems, which leads to inefficiencies in thesis defense preparation and routine communication."
  },
  {
    question: "Why did you choose Design Science Research as your methodology?",
    suggestedAnswer: "DSR is appropriate because the project involves designing and evaluating a novel IT artifact — an AI-enhanced supervision platform — to solve a specific organizational problem."
  },
  {
    question: "How does your AI chatbot handle ambiguous queries?",
    suggestedAnswer: "The chatbot uses retrieval-augmented generation to match queries against stored documents. When confidence is below a threshold, the query is escalated to the appropriate supervisor."
  },
  {
    question: "What evaluation framework will you use to assess user acceptance?",
    suggestedAnswer: "We will use the Technology Acceptance Model (TAM) to measure perceived usefulness and ease of use, supplemented by qualitative feedback interviews."
  },
];

export default function DefenseSimulatorPage() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [questions, setQuestions] = useState<MockQuestion[] | null>(null);

  const handleSimulate = () => {
    setIsAnalyzing(true);
    setQuestions(null);
    setTimeout(() => {
      setIsAnalyzing(false);
      setQuestions(mockQuestions);
    }, 2500);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Auto-Defense Simulator</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload your thesis document to generate AI-powered mock defense questions and suggested answers.
        </p>
      </div>

      {/* Upload area */}
      <div className="rounded-xl border-2 border-dashed bg-card p-10 text-center">
        <div className="mx-auto h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
          <Upload className="h-7 w-7" />
        </div>
        <h3 className="font-semibold text-card-foreground">Upload Your Thesis Document</h3>
        <p className="text-sm text-muted-foreground mt-1 mb-4">Supports PDF, DOCX up to 20MB</p>
        <div className="flex justify-center gap-3">
          <Button variant="outline">
            <FileText className="h-4 w-4 mr-1" /> Choose File
          </Button>
          <Button onClick={handleSimulate} disabled={isAnalyzing}>
            {isAnalyzing ? (
              <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Analyzing...</>
            ) : (
              <><Brain className="h-4 w-4 mr-1" /> Generate Questions</>
            )}
          </Button>
        </div>
      </div>

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
                className="rounded-xl border bg-card p-5 space-y-3"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    {i + 1}
                  </span>
                  <h3 className="font-semibold text-card-foreground">{q.question}</h3>
                </div>
                <div className="ml-9 rounded-lg bg-muted p-4">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Suggested Answer</p>
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
