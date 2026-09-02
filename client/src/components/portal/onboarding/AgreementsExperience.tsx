import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import SignaturePad from "@/components/SignaturePad";
import { PenTool, CheckCircle2, FileText, Download, ShieldCheck, ArrowRight } from "lucide-react";
import { toast } from "sonner";

interface AgreementsExperienceProps {
  onComplete: () => void;
  onNavigateTab: (tabId: string) => void;
}

export function AgreementsExperience({ onComplete, onNavigateTab }: AgreementsExperienceProps) {
  const [signed, setSigned] = useState(false);
  const [showSignDialog, setShowSignDialog] = useState(false);

  const handleSaveSignature = (dataUrl: string) => {
    setSigned(true);
    setShowSignDialog(false);
    toast.success("Advocacy Agreement electronically signed and saved!");
    onComplete();
  };

  return (
    <div className="p-6 md:p-8 lg:p-10 space-y-8 max-w-4xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="border-b border-white/10 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-300 text-xs font-semibold mb-3 border border-cyan-500/20">
            <PenTool className="h-3.5 w-3.5" />
            Step 1 of 4: Legal & Representation Terms
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">
            Waypoint Master Advocacy Agreement
          </h1>
          <p className="text-xs md:text-sm text-white/70 mt-1">
            Please review representation scope, confidentiality, and FERPA authorization disclosures below.
          </p>
        </div>

        {signed && (
          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs py-1 px-3 self-start sm:self-auto gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Signed & Executed
          </Badge>
        )}
      </div>

      {/* Contract Preview Document */}
      <Card className="border-white/15 bg-white/[0.02] p-6 space-y-4 max-h-[450px] overflow-y-auto font-sans text-xs text-white/80 leading-relaxed rounded-2xl">
        <div className="border-b border-white/10 pb-3">
          <p className="font-bold text-white text-sm">1. SCOPE OF ADVOCACY SERVICES</p>
          <p className="mt-1">
            Waypoint Advocates agrees to provide special education coaching, document analysis, meeting strategy, and IEP table representation. 
            Services are non-attorney advocacy and do not constitute legal advice.
          </p>
        </div>

        <div className="border-b border-white/10 pb-3">
          <p className="font-bold text-white text-sm">2. FERPA & EDUCATIONAL RECORDS DISCLOSURE</p>
          <p className="mt-1">
            Client hereby authorizes Waypoint Advocates to review, inspect, and discuss all school records, IEPs, multidisciplinary evaluations, 
            and teacher communications under the Family Educational Rights and Privacy Act (FERPA).
          </p>
        </div>

        <div className="border-b border-white/10 pb-3">
          <p className="font-bold text-white text-sm">3. CONFIDENTIALITY & DATA SECURITY</p>
          <p className="mt-1">
            All documents uploaded to the Waypoint Portal are encrypted at rest and in transit via Cloudflare R2 storage infrastructure.
          </p>
        </div>

        <div>
          <p className="font-bold text-white text-sm">4. CLIENT COOPERATION & INDEPENDENT STEPS</p>
          <p className="mt-1">
            Client agrees to provide accurate student information, upload current evaluations, and respond to strategy inquiries in a timely manner.
          </p>
        </div>
      </Card>

      {/* Signature Section */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        <div className="text-xs text-white/60">
          {signed 
            ? "Your agreement has been saved. You can proceed to Student Setup."
            : "Draw your signature below to authorize advocacy representation."}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {!signed ? (
            <Button
              onClick={() => setShowSignDialog(true)}
              className="w-full sm:w-auto gap-2 bg-amber-400 hover:bg-amber-500 text-[#071422] font-bold text-xs px-6"
            >
              <PenTool className="h-4 w-4" />
              Sign Agreement Now
            </Button>
          ) : (
            <Button
              onClick={() => onNavigateTab("student-setup")}
              className="w-full sm:w-auto gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs px-6"
            >
              Continue to Student Setup
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Signature Pad Dialog */}
      {showSignDialog && (
        <Card className="border-amber-400/40 bg-[#161B22] p-6 rounded-2xl space-y-4 shadow-2xl">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <PenTool className="h-4 w-4 text-amber-400" />
            Sign Representation Agreement
          </h3>
          <p className="text-xs text-white/60">Use your mouse, trackpad, or touch screen to draw your signature below.</p>
          <SignaturePad
            onSave={handleSaveSignature}
            onCancel={() => setShowSignDialog(false)}
          />
        </Card>
      )}
    </div>
  );
}
