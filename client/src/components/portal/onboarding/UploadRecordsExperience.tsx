import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UploadCloud, CheckCircle2, FileText, ArrowRight, Trash2, ShieldCheck, Plus } from "lucide-react";
import { toast } from "sonner";

interface UploadRecordsExperienceProps {
  onComplete: () => void;
  onNavigateTab: (tabId: string) => void;
}

export function UploadRecordsExperience({ onComplete, onNavigateTab }: UploadRecordsExperienceProps) {
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; category: string; size: string }>>([
    { name: "2025_Current_IEP_Draft.pdf", category: "Current IEP", size: "2.4 MB" },
    { name: "2024_Comprehensive_Psych_Eval.pdf", category: "Psychological Evaluation", size: "5.1 MB" }
  ]);

  const categories = [
    { title: "Current IEP or 504 Plan", desc: "Upload the latest document and any proposed revisions.", required: true },
    { title: "Psychological / Psycho-Educational Evaluation", desc: "Triennial evaluations, IQ/achievement testing, or school psychologist reports.", required: true },
    { title: "Private Medical, OT, PT, or Speech Therapy Reports", desc: "Outside specialist evaluations, neuro-psych exams, or clinic notes.", required: false },
    { title: "School Work Samples & Incident Logs", desc: "Standardized test scores, teacher emails, disciplinary logs.", required: false }
  ];

  const handleSimulateUpload = (category: string) => {
    const newDoc = {
      name: `${category.replace(/[^a-zA-Z0-9]/g, "_")}_Document.pdf`,
      category,
      size: "1.8 MB"
    };
    setUploadedFiles((prev) => [...prev, newDoc]);
    toast.success(`Uploaded ${newDoc.name} to secure R2 vault!`);
    onComplete();
  };

  const handleRemove = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
    toast.info("Document removed.");
  };

  return (
    <div className="p-6 md:p-8 lg:p-10 space-y-8 max-w-4xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="border-b border-white/10 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-300 text-xs font-semibold mb-3 border border-cyan-500/20">
            <UploadCloud className="h-3.5 w-3.5" />
            Step 3 of 4: School Records & Evaluations
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">
            Upload IEP Records & Evaluations
          </h1>
          <p className="text-xs md:text-sm text-white/70 mt-1">
            Securely upload your student's IEPs, 504s, psychological evals, and school correspondence.
          </p>
        </div>

        {uploadedFiles.length >= 2 && (
          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs py-1 px-3 self-start sm:self-auto gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {uploadedFiles.length} Records Stored
          </Badge>
        )}
      </div>

      {/* Upload Dropzones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories.map((cat, idx) => (
          <Card key={idx} className="border-white/15 bg-white/[0.02] p-5 rounded-2xl flex flex-col justify-between space-y-4 hover:border-amber-400/30 transition-all">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-bold text-white text-sm">{cat.title}</h3>
                {cat.required && (
                  <Badge variant="outline" className="text-[9px] text-amber-300 border-amber-400/30">
                    Required
                  </Badge>
                )}
              </div>
              <p className="text-xs text-white/60 leading-relaxed">{cat.desc}</p>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => handleSimulateUpload(cat.title)}
              className="w-full text-xs font-semibold border-white/20 text-white hover:bg-white/10 gap-1.5"
            >
              <UploadCloud className="h-3.5 w-3.5 text-amber-400" />
              Upload PDF / File
            </Button>
          </Card>
        ))}
      </div>

      {/* Uploaded Documents List */}
      <div className="space-y-3 pt-2">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <FileText className="h-4 w-4 text-amber-400" />
          Uploaded Documents in Cloudflare R2 Vault ({uploadedFiles.length})
        </h3>

        <div className="space-y-2">
          {uploadedFiles.map((file, i) => (
            <div key={i} className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.03] border border-white/10 text-xs">
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <p className="font-bold text-white">{file.name}</p>
                  <p className="text-[10px] text-white/50">{file.category} · {file.size}</p>
                </div>
              </div>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleRemove(i)}
                className="h-7 w-7 p-0 text-white/40 hover:text-red-400 hover:bg-red-500/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/10">
        <div className="text-xs text-white/60">
          All files are stored in your encrypted family vault.
        </div>

        <Button
          onClick={() => onNavigateTab("advocacy-intake")}
          className="w-full sm:w-auto gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs px-6"
        >
          Continue to Advocacy Intake
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
