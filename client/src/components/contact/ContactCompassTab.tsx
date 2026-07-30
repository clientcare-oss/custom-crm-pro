import React, { useState } from "react";
import { Compass, Sparkles, CheckCircle2, Save, RefreshCw } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface ContactCompassTabProps {
  caseId: string;
  compassData?: any;
  refetchCompass?: () => void;
}

export default function ContactCompassTab({ caseId, compassData, refetchCompass }: ContactCompassTabProps) {
  const [currentStatus, setCurrentStatus] = useState(compassData?.currentStatus || "");
  const [lastMeetingSummary, setLastMeetingSummary] = useState(compassData?.lastMeetingSummary || "");
  const [nextStep, setNextStep] = useState(compassData?.nextStep || "");
  const [whoHasBall, setWhoHasBall] = useState(compassData?.whoHasBall || "");

  const updateCompassMutation = trpc.caseCompass.upsert.useMutation({
    onSuccess: () => {
      toast.success("Case Compass updated successfully");
      refetchCompass?.();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update Case Compass");
    },
  });

  const handleSave = () => {
    updateCompassMutation.mutate({
      caseId,
      currentStatus,
      lastMeetingSummary,
      nextStep,
      whoHasBall,
    });
  };

  return (
    <div className="space-y-6">
      <Card className="border-amber-400/20 bg-[#0A1628]/90 text-slate-100 shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-400">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-white">Case Compass Management</CardTitle>
              <p className="text-xs text-slate-400">Live navigation & status tracker for Case {caseId}</p>
            </div>
          </div>
          <Button
            onClick={handleSave}
            disabled={updateCompassMutation.isPending}
            className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs gap-1.5"
          >
            {updateCompassMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Compass Update
          </Button>
        </CardHeader>

        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-amber-300">Current Focus / Stage</Label>
              <Input
                value={currentStatus}
                onChange={(e) => setCurrentStatus(e.target.value)}
                placeholder="e.g. Preparing for Annual IEP Meeting"
                className="bg-slate-900/80 border-slate-700 text-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-amber-300">Who Has the Ball?</Label>
              <Input
                value={whoHasBall}
                onChange={(e) => setWhoHasBall(e.target.value)}
                placeholder="e.g. Advocate / School Psychologist"
                className="bg-slate-900/80 border-slate-700 text-white"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-amber-300">Immediate Next Step</Label>
            <Input
              value={nextStep}
              onChange={(e) => setNextStep(e.target.value)}
              placeholder="e.g. Review Draft Accommodation Plan before Friday"
              className="bg-slate-900/80 border-slate-700 text-white"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-amber-300">Last Meeting Summary & Key Findings</Label>
            <Textarea
              value={lastMeetingSummary}
              onChange={(e) => setLastMeetingSummary(e.target.value)}
              rows={3}
              placeholder="Summary of recommendations and key decisions..."
              className="bg-slate-900/80 border-slate-700 text-white"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
