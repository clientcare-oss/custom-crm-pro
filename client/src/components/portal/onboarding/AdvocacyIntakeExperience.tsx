import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ClipboardList, CheckCircle2, Save, ArrowRight, Mic, Sparkles, Award } from "lucide-react";
import { toast } from "sonner";

interface AdvocacyIntakeExperienceProps {
  onComplete: () => void;
  onNavigateTab: (tabId: string) => void;
}

export function AdvocacyIntakeExperience({ onComplete, onNavigateTab }: AdvocacyIntakeExperienceProps) {
  const [formData, setFormData] = useState({
    strengths: "Liam is deeply creative, exceptionally empathetic with younger children, and possesses strong verbal reasoning skills and curiosity about science.",
    concerns: "The school is not implementing his Orton-Gillingham specialized reading instruction minutes. He is falling two grade levels behind in reading fluency.",
    goals: "1. Secure 45 min/day 1:1 structured literacy instruction with a certified reading specialist.\n2. Obtain assistive technology accommodations (speech-to-text).\n3. Establish sensory break protocols.",
    friction: "The school psychologist claimed Liam does not qualify for additional reading support because his overall IQ is average."
  });

  const [saved, setSaved] = useState(false);
  const [completedOnboarding, setCompletedOnboarding] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setCompletedOnboarding(true);
    toast.success("Advocacy Intake saved & Progressive Onboarding Complete!");
    onComplete();
  };

  return (
    <div className="p-6 md:p-8 lg:p-10 space-y-8 max-w-4xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="border-b border-white/10 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-300 text-xs font-semibold mb-3 border border-cyan-500/20">
            <ClipboardList className="h-3.5 w-3.5" />
            Step 4 of 4: Parent Priorities & Strategy Intake
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">
            Advocacy Priorities & Goals Intake
          </h1>
          <p className="text-xs md:text-sm text-white/70 mt-1">
            Tell Byron Honea your child's key strengths, school friction points, and primary goals for upcoming IEP meetings.
          </p>
        </div>

        {saved && (
          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs py-1 px-3 self-start sm:self-auto gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Intake Saved
          </Badge>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <Card className="border-white/15 bg-white/[0.02] p-6 rounded-2xl space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                1. Student Strengths & Passions
              </Label>
              <span className="text-[10px] text-white/50">What makes your child shine?</span>
            </div>
            <Textarea
              value={formData.strengths}
              onChange={(e) => setFormData({ ...formData, strengths: e.target.value })}
              rows={3}
              className="bg-white/[0.04] border-white/15 text-white text-xs leading-relaxed"
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-white flex items-center gap-1.5">
                <ClipboardList className="h-3.5 w-3.5 text-rose-400" />
                2. Top Concerns & School Challenges
              </Label>
              <span className="text-[10px] text-white/50">What is currently broken or not working?</span>
            </div>
            <Textarea
              value={formData.concerns}
              onChange={(e) => setFormData({ ...formData, concerns: e.target.value })}
              rows={3}
              className="bg-white/[0.04] border-white/15 text-white text-xs leading-relaxed"
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-white flex items-center gap-1.5">
                <Award className="h-3.5 w-3.5 text-emerald-400" />
                3. Top 3 Outcomes Desired from Waypoint Representation
              </Label>
              <span className="text-[10px] text-white/50">What does victory look like?</span>
            </div>
            <Textarea
              value={formData.goals}
              onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
              rows={4}
              className="bg-white/[0.04] border-white/15 text-white text-xs leading-relaxed"
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-white">
              4. District Resistance or Friction (if applicable)
            </Label>
            <Textarea
              value={formData.friction}
              onChange={(e) => setFormData({ ...formData, friction: e.target.value })}
              rows={2}
              className="bg-white/[0.04] border-white/15 text-white text-xs leading-relaxed"
            />
          </div>
        </Card>

        {/* Completion Milestone Card if saved */}
        {completedOnboarding && (
          <Card className="border-emerald-500/40 bg-gradient-to-r from-emerald-500/10 via-[#0a1828] to-[#071422] p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in zoom-in-95 duration-300 shadow-xl">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-500 text-white font-bold text-[10px]">ALL 4 STEPS COMPLETE</Badge>
              </div>
              <h3 className="text-lg font-bold text-white">Onboarding Complete! Case Compass Initialized.</h3>
              <p className="text-xs text-white/70">
                Your student advocacy workspace is ready. You can now launch your active client dashboard.
              </p>
            </div>

            <Button
              type="button"
              onClick={() => onNavigateTab("compass")}
              className="gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs px-6 shadow-md"
            >
              Open Case Compass
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Card>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <div className="text-xs text-white/60">
            Answers autosave independently to your student case profile.
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button
              type="submit"
              className="w-full sm:w-auto gap-2 bg-amber-400 hover:bg-amber-500 text-[#071422] font-bold text-xs px-6"
            >
              <Save className="h-4 w-4" />
              Save Intake & Complete Onboarding
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
