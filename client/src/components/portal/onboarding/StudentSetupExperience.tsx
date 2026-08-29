import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, CheckCircle2, Save, ArrowRight, Plus } from "lucide-react";
import { toast } from "sonner";

interface StudentSetupExperienceProps {
  onComplete: () => void;
  onNavigateTab: (tabId: string) => void;
}

export function StudentSetupExperience({ onComplete, onNavigateTab }: StudentSetupExperienceProps) {
  const [formData, setFormData] = useState({
    firstName: "Liam",
    lastName: "Jenkins",
    gradeLevel: "4th Grade",
    schoolName: "Fulton Elementary",
    countyDistrict: "Fulton County Schools",
    eligibilityCategory: "Specific Learning Disability (SLD) / ADHD",
    caseManagerName: "Ms. Henderson",
    caseManagerEmail: "henderson.m@fultonschools.org"
  });

  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    toast.success("Student profile saved successfully!");
    onComplete();
  };

  return (
    <div className="p-6 md:p-8 lg:p-10 space-y-8 max-w-4xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="border-b border-white/10 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-300 text-xs font-semibold mb-3 border border-cyan-500/20">
            <GraduationCap className="h-3.5 w-3.5" />
            Step 2 of 4: Student Advocacy Profile
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">
            Student Setup & School Profile
          </h1>
          <p className="text-xs md:text-sm text-white/70 mt-1">
            Provide details about your child's school district, current placement, and special education team.
          </p>
        </div>

        {saved && (
          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs py-1 px-3 self-start sm:self-auto gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Profile Saved
          </Badge>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <Card className="border-white/15 bg-white/[0.02] p-6 rounded-2xl space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-white/80">Student First Name</Label>
              <Input
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="bg-white/[0.04] border-white/15 text-white text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-white/80">Student Last Name</Label>
              <Input
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="bg-white/[0.04] border-white/15 text-white text-xs"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-white/80">Current Grade Level</Label>
              <Input
                value={formData.gradeLevel}
                onChange={(e) => setFormData({ ...formData, gradeLevel: e.target.value })}
                className="bg-white/[0.04] border-white/15 text-white text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-white/80">Current School Name</Label>
              <Input
                value={formData.schoolName}
                onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                className="bg-white/[0.04] border-white/15 text-white text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-white/80">School District / County</Label>
              <Input
                value={formData.countyDistrict}
                onChange={(e) => setFormData({ ...formData, countyDistrict: e.target.value })}
                className="bg-white/[0.04] border-white/15 text-white text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-white/80">Primary Special Education Eligibility / Diagnosis</Label>
            <Input
              value={formData.eligibilityCategory}
              onChange={(e) => setFormData({ ...formData, eligibilityCategory: e.target.value })}
              placeholder="e.g. Autism Spectrum Disorder, ADHD, Specific Learning Disability (Dyslexia), OHI, Speech"
              className="bg-white/[0.04] border-white/15 text-white text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/10">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-white/80">IEP Case Manager / Lead Teacher Name</Label>
              <Input
                value={formData.caseManagerName}
                onChange={(e) => setFormData({ ...formData, caseManagerName: e.target.value })}
                className="bg-white/[0.04] border-white/15 text-white text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-white/80">Case Manager Email Address</Label>
              <Input
                type="email"
                value={formData.caseManagerEmail}
                onChange={(e) => setFormData({ ...formData, caseManagerEmail: e.target.value })}
                className="bg-white/[0.04] border-white/15 text-white text-xs"
              />
            </div>
          </div>
        </Card>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <div className="text-xs text-white/60">
            {saved ? "Student profile saved. Ready to upload records." : "Every step saves independently in your portal account."}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button
              type="submit"
              className="w-full sm:w-auto gap-2 bg-amber-400 hover:bg-amber-500 text-[#071422] font-bold text-xs px-6"
            >
              <Save className="h-4 w-4" />
              Save Student Profile
            </Button>

            {saved && (
              <Button
                type="button"
                onClick={() => onNavigateTab("upload-records")}
                className="w-full sm:w-auto gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs px-6"
              >
                Continue to Upload Records
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
