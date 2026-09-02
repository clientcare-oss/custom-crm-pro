import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Lock, 
  Sparkles, 
  GraduationCap, 
  FolderOpen, 
  CheckSquare, 
  Calendar, 
  Briefcase, 
  ArrowRight,
  Shield
} from "lucide-react";
import { ActionCenterIcon } from "@/components/ui/ActionCenterIcon";

interface LockedModulePreviewProps {
  moduleId: string;
  moduleName: string;
  onNavigateTab: (tabId: string) => void;
}

export function LockedModulePreview({
  moduleId,
  moduleName,
  onNavigateTab
}: LockedModulePreviewProps) {
  const getModuleConfig = () => {
    switch (moduleId) {
      case "details":
      case "student-workspace":
        return {
          icon: GraduationCap,
          title: "Your Student Workspace",
          quote: "Once you begin advocacy services, you'll set up your student here and Waypoint will build their advocacy workspace around them.",
          bullets: [
            "Comprehensive IEP goal tracker with progress rubrics",
            "Classroom accommodations & testing modifications roster",
            "Specialized instruction minutes and related services ledger",
            "School team contact directory (case manager, teachers, specialists)"
          ],
          cta: "View Scheduled Discovery Call",
          targetTab: "discovery-call"
        };
      case "smart-docs":
      case "documents":
        return {
          icon: FolderOpen,
          title: "Your Document Vault & Comparator",
          quote: "Your IEPs, evaluations, school records, and Waypoint documents will live here.",
          bullets: [
            "Encrypted Cloudflare R2 cloud storage archive",
            "Year-over-year side-by-side IEP comparator",
            "OCR searchable psycho-educational evaluations",
            "Prior Written Notice (PWN) requests & school emails"
          ],
          cta: "View Scheduled Discovery Call",
          targetTab: "discovery-call"
        };
      case "tasks":
        return {
          icon: CheckSquare,
          title: "Advocacy Action Tasks",
          quote: "This is where you and Waypoint will keep track of what is happening, what comes next, and what needs your attention.",
          bullets: [
            "Parent action item checklists with SMS & email alerts",
            "Pre-IEP meeting preparation milestones",
            "Document request follow-up tracking"
          ],
          cta: "View Scheduled Discovery Call",
          targetTab: "discovery-call"
        };
      case "appointments":
        return {
          icon: Calendar,
          title: "Meetings & Representation Calendar",
          quote: "Upcoming meetings, preparation, and advocacy activity will appear here.",
          bullets: [
            "Pre-meeting strategy agenda countdowns",
            "School IEP meeting dates with advocate attendance confirmation",
            "Post-meeting debrief notes and transcripts"
          ],
          cta: "View Scheduled Discovery Call",
          targetTab: "discovery-call"
        };
      case "files":
      case "action-center":
        return {
          icon: ActionCenterIcon,
          title: "Action Center",
          quote: "Documents, requests, and forms we're working on together.",
          bullets: [
            "Active collaborative requests & evaluation forms",
            "Parent concerns statements & meeting agendas",
            "Formal school notices & records requests",
            "Automatic final preservation in Document Vault"
          ],
          cta: "View Scheduled Discovery Call",
          targetTab: "discovery-call"
        };
      default:
        return {
          icon: Shield,
          title: `${moduleName} Preview`,
          quote: `This workspace will become active once advocacy services begin.`,
          bullets: [
            "Organized specifically for your family's IEP case",
            "Integrated directly with Waypoint representation tools"
          ],
          cta: "Return to Discovery Call",
          targetTab: "discovery-call"
        };
    }
  };

  const config = getModuleConfig();
  const Icon = config.icon;

  return (
    <div className="p-6 md:p-10 lg:p-12 space-y-8 max-w-4xl mx-auto animate-in fade-in duration-300">
      <div className="border-b border-white/10 pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 text-amber-300 text-xs font-semibold mb-3 border border-amber-400/20">
          <Lock className="h-3.5 w-3.5" />
          Workspace Preview
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white">
          {config.title}
        </h1>
      </div>

      <Card className="border-white/15 bg-[#00102F]/95 p-6 md:p-8 rounded-2xl space-y-6 shadow-xl">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-300 flex items-center justify-center font-bold shrink-0">
            <Icon className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <p className="text-sm md:text-base font-semibold text-amber-200 leading-relaxed italic">
              "{config.quote}"
            </p>
            <p className="text-xs text-white/60">
              Waypoint organizes everything into dedicated workspaces for each student in your household.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-2.5">
          <span className="text-[11px] font-bold text-white/80 uppercase tracking-wider block">
            What will be available here:
          </span>
          <ul className="space-y-2 text-xs text-white/70">
            {config.bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-2">
                <Sparkles className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          <div className="text-xs text-white/50">
            Ready to explore your scheduled consultation?
          </div>
          <Button
            onClick={() => onNavigateTab(config.targetTab)}
            className="gap-2 bg-amber-400 hover:bg-amber-500 text-[#00102F] font-bold text-xs px-5 shadow-md"
          >
            {config.cta}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
