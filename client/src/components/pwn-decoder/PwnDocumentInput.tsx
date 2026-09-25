import React, { useState } from "react";
import { FolderLock, UploadCloud, FileEdit, Sparkles, AlertCircle, Compass, CheckCircle2, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

interface PwnDocumentInputProps {
  studentId: number;
  vaultDocuments: Array<{ id: number; fileName: string; fileSize?: number | null; uploadedAt: string | Date }>;
  isLoadingVault: boolean;
  onAnalyze: (data: {
    rawText?: string;
    documentId?: number;
    pwnDocumentName?: string;
  }) => void;
  isAnalyzing: boolean;
}

const SAMPLE_PWN_TEXT = `PRIOR WRITTEN NOTICE (PWN)
Local Educational Agency: Metro County School District
Date of Notice: October 14, 2026
Student: Active Waypoint Student
Grade: 4th Grade | Eligibility: Autism / Speech-Language Impairment

1. DESCRIPTION OF THE ACTION PROPOSED OR REFUSED BY THE LEA:
The IEP team proposes to implement 60 minutes weekly of direct speech and language therapy in a small group setting outside general education.
The IEP team refuses the parent request for a dedicated 1:1 adult paraprofessional support aide for the entire school day across core academic blocks.
The IEP team refuses the parent request for Extended School Year (ESY) services during summer 2027.

2. EXPLANATION OF WHY THE LEA PROPOSES OR REFUSES THE ACTION:
Speech therapy: Progress monitoring demonstrates that student continues to have pragmatic language and articulation needs requiring specialized instruction.
1:1 Paraprofessional support: The team determined that additional individual support was not necessary. The student is doing well in the general education setting with current accommodations and visual schedules.
Extended School Year (ESY): The IEP team reviewed regression and recoupment data and determined student does not qualify for summer services.

3. DESCRIPTION OF EACH EVALUATION PROCEDURE, ASSESSMENT, RECORD, OR REPORT THE LEA USED AS A BASIS FOR THE PROPOSED OR REFUSED ACTION:
For speech services: Speech-Language Triennial Evaluation dated September 18, 2026, and quarterly IEP progress reporting from speech pathologist.
For 1:1 aide refusal: General classroom teacher observations.
For ESY refusal: Quarterly report cards and fall MAP assessment score reports.

4. DESCRIPTION OF OTHER OPTIONS THAT THE IEP TEAM CONSIDERED AND THE REASONS WHY THOSE OPTIONS WERE REJECTED:
Option 1: Providing 30 minutes of speech instead of 60 minutes. Rejected because current evaluation scores indicate 60 minutes is necessary to make progress on receptive and expressive goals.
Option 2: 1:1 Paraprofessional support for math and reading only. Rejected.

5. DESCRIPTION OF OTHER FACTORS RELEVANT TO THE LEA'S PROPOSAL OR REFUSAL:
Student demonstrates sensory sensitivities in loud environments, which are addressed by occupational therapy sensory break diet.

6. PROCEDURAL SAFEGUARDS STATEMENT:
Parents of a child with a disability have protections under the procedural safeguards of IDEA. A copy of the Procedural Safeguards Notice is available upon request from the Special Education Director.

7. SOURCES FOR PARENTS TO CONTACT TO OBTAIN ASSISTANCE IN UNDERSTANDING IDEA:
Georgia Department of Education, Division for Special Education Services: 404-656-3963
Parent to Parent of Georgia: 800-229-2038`;

export const PwnDocumentInput: React.FC<PwnDocumentInputProps> = ({
  studentId,
  vaultDocuments,
  isLoadingVault,
  onAnalyze,
  isAnalyzing,
}) => {
  const [activeTab, setActiveTab] = useState<"vault" | "upload" | "paste">("paste");
  const [selectedVaultDocId, setSelectedVaultDocId] = useState<number | null>(null);
  const [pastedText, setPastedText] = useState<string>("");
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [uploadedFileText, setUploadedFileText] = useState<string>("");
  const [isReadingFile, setIsReadingFile] = useState(false);

  // File upload reader (handles .txt, .pdf raw, etc.)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setIsReadingFile(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setUploadedFileText(content || "");
      setIsReadingFile(false);
    };
    reader.onerror = () => {
      setIsReadingFile(false);
    };
    reader.readAsText(file);
  };

  const handleStartAnalysis = () => {
    if (activeTab === "paste") {
      if (!pastedText.trim()) return;
      onAnalyze({
        rawText: pastedText,
        pwnDocumentName: "Pasted Prior Written Notice",
      });
    } else if (activeTab === "vault") {
      if (!selectedVaultDocId) return;
      const doc = vaultDocuments.find((d) => d.id === selectedVaultDocId);
      onAnalyze({
        documentId: selectedVaultDocId,
        pwnDocumentName: doc?.fileName || "Vault Document",
      });
    } else if (activeTab === "upload") {
      if (!uploadedFileText.trim()) return;
      onAnalyze({
        rawText: uploadedFileText,
        pwnDocumentName: uploadedFileName || "Uploaded PWN",
      });
    }
  };

  const isSubmitDisabled =
    isAnalyzing ||
    isReadingFile ||
    (activeTab === "paste" && !pastedText.trim()) ||
    (activeTab === "vault" && !selectedVaultDocId) ||
    (activeTab === "upload" && !uploadedFileText.trim());

  return (
    <div className="w-full space-y-4">
      {/* Step Header & State Overlay Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
        <span className="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1.5">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-400/10 border border-amber-400/30 text-[11px] text-amber-300">
            2
          </span>
          Step 2 — Add Prior Written Notice
        </span>

        {/* State Overlay Architecture Indicator */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-white/10 text-xs">
          <Compass className="h-3.5 w-3.5 text-indigo-400" />
          <span className="text-slate-300 font-medium">Framework:</span>
          <span className="text-emerald-300 font-semibold">Federal Core (34 CFR §300.503)</span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400 italic">State Overlay: <span className="text-amber-400/90 not-italic font-semibold">Not Configured</span></span>
        </div>
      </div>

      {/* Mode Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("paste")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all border ${
            activeTab === "paste"
              ? "bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-md shadow-amber-500/10"
              : "bg-slate-900/60 border-white/5 text-slate-400 hover:text-white hover:border-white/10"
          }`}
        >
          <FileEdit className="h-4 w-4" />
          Paste PWN Text
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("vault")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all border ${
            activeTab === "vault"
              ? "bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-md shadow-amber-500/10"
              : "bg-slate-900/60 border-white/5 text-slate-400 hover:text-white hover:border-white/10"
          }`}
        >
          <FolderLock className="h-4 w-4" />
          Choose from Document Vault
          {vaultDocuments.length > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-slate-300">
              {vaultDocuments.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("upload")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all border ${
            activeTab === "upload"
              ? "bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-md shadow-amber-500/10"
              : "bg-slate-900/60 border-white/5 text-slate-400 hover:text-white hover:border-white/10"
          }`}
        >
          <UploadCloud className="h-4 w-4" />
          Upload PWN File
        </button>
      </div>

      {/* Tab 1: Paste Text */}
      {activeTab === "paste" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs text-slate-400">
              Paste the text from the district's Prior Written Notice below:
            </label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPastedText(SAMPLE_PWN_TEXT)}
              className="h-6 text-[11px] px-2.5 border-amber-500/30 text-amber-300 hover:bg-amber-500/10 bg-amber-500/5"
            >
              <Sparkles className="h-3 w-3 mr-1 text-amber-400" />
              Load Sample PWN
            </Button>
          </div>
          <Textarea
            rows={10}
            placeholder="Paste raw PWN text here. Different districts organize PWNs differently — the decoder will semantically extract actions, reasons, evidence, and options..."
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            className="w-full bg-[#000820] border-slate-700/80 text-slate-100 placeholder:text-slate-500 rounded-xl font-sans text-sm focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/40 p-3 leading-relaxed"
          />
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>{pastedText.length.toLocaleString()} characters entered</span>
            <span>Semantic parsing under 34 C.F.R. §300.503</span>
          </div>
        </div>
      )}

      {/* Tab 2: Document Vault */}
      {activeTab === "vault" && (
        <div className="space-y-3">
          <p className="text-xs text-slate-400">
            Select an existing Prior Written Notice document stored in this student's Document Vault:
          </p>

          {isLoadingVault ? (
            <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
              Loading student's Document Vault...
            </div>
          ) : vaultDocuments.length === 0 ? (
            <div className="p-6 rounded-xl border border-dashed border-slate-800 bg-[#000820] text-center space-y-2">
              <FolderLock className="h-8 w-8 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400">
                No documents found in this student's Document Vault.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setActiveTab("paste")}
                className="text-xs border-white/10 hover:bg-white/5 text-amber-300"
              >
                Paste PWN Text Instead
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto p-1">
              {vaultDocuments.map((doc) => {
                const isSelected = selectedVaultDocId === doc.id;
                return (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => setSelectedVaultDocId(doc.id)}
                    className={`p-3 rounded-xl border text-left transition-all flex items-start gap-3 ${
                      isSelected
                        ? "bg-amber-500/15 border-amber-500/60 shadow-lg shadow-amber-500/10 text-white"
                        : "bg-[#000820] border-slate-800 hover:border-slate-700 text-slate-300"
                    }`}
                  >
                    <FileText className={`h-5 w-5 mt-0.5 flex-shrink-0 ${isSelected ? "text-amber-400" : "text-slate-500"}`} />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-xs truncate">{doc.fileName}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
                      </div>
                    </div>
                    {isSelected && <CheckCircle2 className="h-4 w-4 text-amber-400 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Upload PWN */}
      {activeTab === "upload" && (
        <div className="space-y-3">
          <p className="text-xs text-slate-400">
            Upload a PWN document. It will be associated with this student and saved to their Document Vault:
          </p>

          <div className="border-2 border-dashed border-slate-700 hover:border-amber-500/50 rounded-xl p-8 bg-[#000820] text-center space-y-3 transition-colors">
            <UploadCloud className="h-10 w-10 text-amber-400/80 mx-auto" />
            <div className="space-y-1">
              <label className="cursor-pointer font-semibold text-sm text-amber-300 hover:underline">
                <span>Click to browse file</span>
                <input
                  type="file"
                  accept=".pdf,.txt,.doc,.docx"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              <p className="text-xs text-slate-400">
                PDF, TXT, or text-based document
              </p>
            </div>

            {uploadedFileName && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-emerald-500/30 text-emerald-300 text-xs">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span>Selected: <strong>{uploadedFileName}</strong></span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Button: ANALYZE PWN */}
      <div className="pt-2">
        <Button
          type="button"
          size="lg"
          onClick={handleStartAnalysis}
          disabled={isSubmitDisabled}
          className="w-full sm:w-auto min-w-[220px] bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm tracking-wide py-3 px-8 rounded-xl shadow-lg shadow-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
              <span>Decoding PWN Content...</span>
            </>
          ) : (
            <>
              <Compass className="h-4 w-4 text-slate-950" />
              <span>ANALYZE PWN</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
