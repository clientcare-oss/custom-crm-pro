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
  ShieldCheck,
  User,
  Mail,
  Phone,
  GraduationCap,
  Save,
  CheckCircle2,
  MapPin,
  HeartHandshake,
  FileCheck,
} from "lucide-react";
import { toast } from "sonner";

export default function EmployeeProfileTab() {
  const { user } = useAuth();
  const [profile, setProfile] = useState({
    name: user?.name || "Byron Honea",
    email: user?.email || "byron@waypointadvocates.com",
    title: "Master IEP Coach® & Founder",
    phone: "(404) 555-0192",
    states: "Georgia (Primary), Florida, North Carolina",
    certNumber: "MIPC-2024-884",
    emergencyContact: "Angela Honea (Spouse) — (404) 555-0193",
    bio: "Passionate special education advocate and Master IEP Coach® dedicated to ensuring neurodivergent students receive authentic, individualized support and meaningful FAPE in Georgia public schools.",
  });

  const handleSave = () => {
    toast.success("Advocate profile & credentials saved");
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#000d2b]/90 border border-blue-900/60 rounded-2xl p-5 shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-bold text-white tracking-wide">Advocate Profile &amp; Credentials</h2>
            <PageIdBadge id="PG-038-CRD" name="Employee Profile" inline />
          </div>
          <p className="text-xs text-blue-200/70">
            Professional certifications, Master IEP Coach® verification, state coverage, and personal details.
          </p>
        </div>

        <Button
          size="sm"
          onClick={handleSave}
          className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl py-2 px-4 gap-1.5 shadow-md cursor-pointer transition-all active:scale-95"
        >
          <Save className="w-4 h-4" />
          <span>Save Profile</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Form Editor */}
        <Card className="lg:col-span-2 rounded-2xl border border-blue-900/60 bg-[#000821] p-5 sm:p-6 shadow-xl space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2 pb-3 border-b border-blue-900/40">
            <User className="w-4 h-4 text-sky-400" />
            <span>Advocate Identity &amp; Contact Details</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-300">Full Name</Label>
              <Input
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="bg-[#001438] border-blue-900 text-xs text-white"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-300">Official Title</Label>
              <Input
                value={profile.title}
                onChange={(e) => setProfile({ ...profile, title: e.target.value })}
                className="bg-[#001438] border-blue-900 text-xs text-white"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-300">Practice Email</Label>
              <Input
                value={profile.email}
                disabled
                className="bg-[#001438]/50 border-blue-950 text-xs text-slate-400"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-300">Direct Office Phone</Label>
              <Input
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="bg-[#001438] border-blue-900 text-xs text-white"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs font-semibold text-slate-300">Active State Jurisdictions</Label>
              <Input
                value={profile.states}
                onChange={(e) => setProfile({ ...profile, states: e.target.value })}
                className="bg-[#001438] border-blue-900 text-xs text-white"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs font-semibold text-slate-300">Emergency Contact</Label>
              <Input
                value={profile.emergencyContact}
                onChange={(e) => setProfile({ ...profile, emergencyContact: e.target.value })}
                className="bg-[#001438] border-blue-900 text-xs text-white"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs font-semibold text-slate-300">Advocate Public Bio</Label>
              <Textarea
                rows={3}
                value={profile.bio}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                className="bg-[#001438] border-blue-900 text-xs text-white leading-relaxed"
              />
            </div>
          </div>
        </Card>

        {/* Right 1 Col: Official Credentials Badge & Verified Seals */}
        <div className="space-y-6">
          <Card className="rounded-2xl border border-blue-900/60 bg-[#000821] p-5 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-2 border-b border-blue-900/40">
              <GraduationCap className="w-4 h-4 text-amber-400" />
              <span>Verified Qualifications</span>
            </h3>

            <div className="space-y-3">
              {[
                { title: "Master IEP Coach®", issuer: "Master IEP Coach Network", id: profile.certNumber, active: true },
                { title: "FERPA Special Education Certified", issuer: "Student Privacy Consortium", id: "FERPA-2024-912", active: true },
                { title: "Georgia State Advocacy Credential", issuer: "GA Advocacy Registry", id: "GA-SED-5501", active: true },
              ].map((c, i) => (
                <div key={i} className="p-3 rounded-xl bg-blue-950/40 border border-blue-900/60 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{c.title}</span>
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      <CheckCircle2 className="w-3 h-3" /> Active
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">{c.issuer}</div>
                  <div className="text-[10px] font-mono text-amber-300/90 pt-0.5">ID: {c.id}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
