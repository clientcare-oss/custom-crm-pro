import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import PageIdBadge from "@/components/PageIdBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Award,
  User,
  GraduationCap,
  Save,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

export default function EmployeeProfileTab() {
  const { user } = useAuth();
  const [profile, setProfile] = useState({
    name: user?.name || "Byron Honea",
    email: user?.email || "byron@waypointadvocates.com",
    title: "Lead Special Education Advocate & Founder",
    phone: "(404) 555-0192",
    states: "Georgia (Primary), Florida, North Carolina",
    certNumber: "SEA-2024-884",
    emergencyContact: "Angela Honea (Spouse) — (404) 555-0193",
    bio: "Passionate special education advocate dedicated to ensuring neurodivergent students receive authentic, individualized support and meaningful FAPE in Georgia public schools.",
  });

  const handleSave = () => {
    toast.success("Advocate profile & credentials saved");
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#05142B]/95 border border-[#3A2C18] rounded-2xl p-5 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)]">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#020A17] border border-[#3A2C18] flex items-center justify-center text-[#C5A059]">
              <Award className="w-4.5 h-4.5" />
            </div>
            <h2 className="font-serif text-xl font-bold text-[#FFF4D4] tracking-wide">Advocate Profile &amp; Credentials</h2>
            <PageIdBadge id="PG-038-CRD" name="Employee Profile" inline />
          </div>
          <p className="text-xs text-[#C6B697]">
            Professional certifications, advocacy credentials verification, state coverage, and personal details.
          </p>
        </div>

        <Button
          size="sm"
          onClick={handleSave}
          className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs rounded-xl py-2 px-4 gap-1.5 border border-[#FFE394]/50 shadow-[0_3px_10px_rgba(0,0,0,0.8)] cursor-pointer hover:brightness-110 transition-all active:scale-95"
        >
          <Save className="w-4 h-4" />
          <span>Save Profile</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Form Editor */}
        <Card className="lg:col-span-2 rounded-2xl border border-[#3A2C18] bg-[#05142B]/90 p-5 sm:p-6 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] space-y-4">
          <h3 className="font-serif text-base font-bold text-[#FFF4D4] flex items-center gap-2 pb-3 border-b border-[#3A2C18]/60">
            <User className="w-4 h-4 text-[#C5A059]" />
            <span>Advocate Identity &amp; Contact Details</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-[#C6B697]">Full Name</Label>
              <Input
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="bg-[#020A17] border-[#3A2C18] text-xs text-[#FFF4D4] focus:border-[#C5A059] rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-[#C6B697]">Official Title</Label>
              <Input
                value={profile.title}
                onChange={(e) => setProfile({ ...profile, title: e.target.value })}
                className="bg-[#020A17] border-[#3A2C18] text-xs text-[#FFF4D4] focus:border-[#C5A059] rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-[#C6B697]">Practice Email</Label>
              <Input
                value={profile.email}
                disabled
                className="bg-[#020A17]/60 border-[#3A2C18] text-xs text-[#8C7A58] rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-[#C6B697]">Direct Office Phone</Label>
              <Input
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="bg-[#020A17] border-[#3A2C18] text-xs text-[#FFF4D4] focus:border-[#C5A059] rounded-xl font-mono"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs font-semibold text-[#C6B697]">Active State Jurisdictions</Label>
              <Input
                value={profile.states}
                onChange={(e) => setProfile({ ...profile, states: e.target.value })}
                className="bg-[#020A17] border-[#3A2C18] text-xs text-[#FFF4D4] focus:border-[#C5A059] rounded-xl"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs font-semibold text-[#C6B697]">Emergency Contact</Label>
              <Input
                value={profile.emergencyContact}
                onChange={(e) => setProfile({ ...profile, emergencyContact: e.target.value })}
                className="bg-[#020A17] border-[#3A2C18] text-xs text-[#FFF4D4] focus:border-[#C5A059] rounded-xl"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs font-semibold text-[#C6B697]">Advocate Public Bio</Label>
              <Textarea
                rows={3}
                value={profile.bio}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                className="bg-[#020A17] border-[#3A2C18] text-xs text-[#FFF4D4] focus:border-[#C5A059] rounded-xl leading-relaxed"
              />
            </div>
          </div>
        </Card>

        {/* Right 1 Col: Official Credentials Badge & Verified Seals */}
        <div className="space-y-6">
          <Card className="rounded-2xl border border-[#3A2C18] bg-[#05142B]/90 p-5 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] space-y-4">
            <h3 className="font-serif text-sm font-bold text-[#FFF4D4] flex items-center gap-2 pb-2 border-b border-[#3A2C18]/60">
              <GraduationCap className="w-4 h-4 text-[#C5A059]" />
              <span>Verified Qualifications</span>
            </h3>

            <div className="space-y-3">
              {[
                { title: "Special Education Advocacy Certification", issuer: "COPAA / Advocacy Registry", id: profile.certNumber },
                { title: "FERPA Special Education Certified", issuer: "Student Privacy Consortium", id: "FERPA-2024-912" },
                { title: "Georgia State Advocacy Credential", issuer: "GA Advocacy Registry", id: "GA-SED-5501" },
              ].map((c, i) => (
                <div key={i} className="p-3 rounded-xl bg-[#020A17]/85 border border-[#3A2C18] space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-serif font-bold text-[#FFF4D4]">{c.title}</span>
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300 font-bold bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Active
                    </span>
                  </div>
                  <div className="text-[11px] text-[#A69371]">{c.issuer}</div>
                  <div className="text-[10px] font-mono text-[#FFE394] pt-0.5">ID: {c.id}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
