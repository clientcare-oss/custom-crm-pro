import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  Clock, 
  Video, 
  Sparkles, 
  CheckCircle2, 
  Info, 
  Lock, 
  GraduationCap, 
  FolderOpen, 
  Users, 
  Compass, 
  ArrowRight,
  ExternalLink,
  ChevronRight
} from "lucide-react";

interface DiscoveryCallExperienceProps {
  displayName: string;
  upcomingAppointment?: any;
  onNavigateTab: (tabId: string) => void;
  onOpenScheduler: () => void;
}

export function DiscoveryCallExperience({
  displayName,
  upcomingAppointment,
  onNavigateTab,
  onOpenScheduler,
}: DiscoveryCallExperienceProps) {
  const firstName = displayName.split(" ")[0] || "there";

  const apptDate = upcomingAppointment?.startTime 
    ? new Date(upcomingAppointment.startTime).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    : "Tuesday, September 15, 2026";

  const apptTime = upcomingAppointment?.startTime
    ? `${new Date(upcomingAppointment.startTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} EDT`
    : "2:00 PM - 2:30 PM EDT";

  const meetLink = upcomingAppointment?.location || "https://meet.google.com/waypoint-discovery";

  return (
    <div className="p-6 md:p-8 lg:p-10 space-y-8 max-w-5xl mx-auto animate-in fade-in duration-300">
      
      {/* Hero Welcome Header */}
      <div className="border-b border-white/10 pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 text-amber-300 text-xs font-semibold mb-3 border border-amber-400/20">
          <Sparkles className="h-3.5 w-3.5" />
          Pre-Advocacy Client Workspace
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
          Welcome to Waypoint, {firstName}
        </h1>
        <p className="text-sm text-white/70 mt-1.5 max-w-2xl leading-relaxed">
          We are looking forward to reviewing your student's educational advocacy needs and charting a clear path to IEP success.
        </p>
      </div>

      {/* Your Discovery Call Card */}
      <Card className="border-amber-400/30 bg-gradient-to-br from-amber-400/10 via-[#0a1828] to-[#071422] shadow-xl overflow-hidden">
        <CardHeader className="bg-amber-400/10 border-b border-amber-400/20 p-5 md:p-6 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-amber-500 text-[#071422] flex items-center justify-center font-bold shadow-md shrink-0">
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-lg md:text-xl font-bold text-white">
                  Your Discovery Call
                </CardTitle>
                <CardDescription className="text-xs text-white/60">
                  Confirmed with Byron Honea · Master IEP Coach®
                </CardDescription>
              </div>
            </div>

            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 font-semibold text-xs py-1 px-3 self-start sm:self-auto">
              Confirmed & Scheduled
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-6 md:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white/[0.03] p-4 rounded-xl border border-white/10 text-xs">
            <div className="space-y-1">
              <span className="text-white/50 font-semibold flex items-center gap-1.5 text-[10px] uppercase tracking-wider">
                <Calendar className="h-3.5 w-3.5 text-amber-400" />
                Date
              </span>
              <p className="font-extrabold text-white text-sm">
                {apptDate}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-white/50 font-semibold flex items-center gap-1.5 text-[10px] uppercase tracking-wider">
                <Clock className="h-3.5 w-3.5 text-amber-400" />
                Time
              </span>
              <p className="font-extrabold text-white text-sm">
                {apptTime}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-white/50 font-semibold flex items-center gap-1.5 text-[10px] uppercase tracking-wider">
                <Video className="h-3.5 w-3.5 text-amber-400" />
                Meeting Format
              </span>
              <p className="font-extrabold text-white text-sm truncate">
                Video via Google Meet
              </p>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <div className="text-xs text-white/60 flex items-center gap-2">
              <Info className="h-4 w-4 text-amber-400 shrink-0" />
              <span>A calendar invitation and join link have been confirmed for your account.</span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenScheduler}
                className="flex-1 sm:flex-none text-xs border-white/20 text-white hover:bg-white/10"
              >
                Manage / Reschedule
              </Button>
              <Button
                size="sm"
                onClick={() => window.open(meetLink, "_blank")}
                className="flex-1 sm:flex-none text-xs font-bold gap-1.5 bg-amber-400 hover:bg-amber-500 text-[#071422] shadow-md"
              >
                <Video className="h-3.5 w-3.5" />
                Join Video Call
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* You're All Set Section */}
      <Card className="border-white/10 bg-white/[0.02] p-5 md:p-6 space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-white">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          You're All Set for Your Discovery Call
        </div>
        <p className="text-xs text-white/70 leading-relaxed">
          During this 30-minute consultation, Byron Honea will review your child's current IEP or 504 challenges, discuss your primary goals, 
          and outline specific options for advocacy representation. Feel free to gather recent school emails, evaluation reports, or notes on your top concerns.
        </p>
      </Card>

      {/* Your Waypoint Journey Visual Progression */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-400" />
              Your Waypoint Journey
            </h2>
            <p className="text-xs text-white/50 mt-0.5">The visual progression from discovery call to active IEP representation</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {[
            { step: "1", title: "Discovery Call", sub: "30-min strategy review", active: true, done: false },
            { step: "2", title: "Choose Your Support", sub: "Select advocacy tier", active: false, done: false },
            { step: "3", title: "Set Up Your Student", sub: "Profile & district setup", active: false, done: false },
            { step: "4", title: "Complete Setup", sub: "Upload IEPs & evals", active: false, done: false },
            { step: "5", title: "Begin Advocacy", sub: "Case Compass launched", active: false, done: false },
          ].map((item, idx) => (
            <div
              key={idx}
              className={`p-3.5 rounded-xl border flex flex-col justify-between text-xs transition-all ${
                item.active
                  ? "border-amber-400 bg-amber-400/10 shadow-md ring-1 ring-amber-400/30"
                  : "border-white/10 bg-white/[0.02] opacity-70"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                  item.active ? "bg-amber-400 text-[#071422]" : "bg-white/10 text-white/60"
                }`}>
                  {item.step}
                </span>
                {item.active && (
                  <Badge className="bg-amber-400/20 text-amber-300 text-[9px] py-0 px-1.5 font-bold">
                    Current Stage
                  </Badge>
                )}
              </div>
              <div>
                <p className="font-bold text-white text-xs">{item.title}</p>
                <p className="text-[10px] text-white/50 mt-0.5">{item.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Explore Your Future Portal Teasers */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">
              Explore Your Future Portal
            </h2>
            <p className="text-xs text-white/50 mt-0.5">
              Preview the organized tools and workspaces that unlock once advocacy begins.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Teaser 1: Student Workspace */}
          <Card 
            onClick={() => onNavigateTab("details")}
            className="border-white/10 bg-white/[0.02] hover:bg-white/[0.04] cursor-pointer transition-all p-4 space-y-2 relative group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <GraduationCap className="h-4 w-4 text-amber-400" />
                Student Workspace
              </div>
              <Badge variant="outline" className="text-[10px] text-amber-300 border-amber-400/30 gap-1">
                <Lock className="h-2.5 w-2.5" /> Preview
              </Badge>
            </div>
            <p className="text-xs text-white/70 leading-relaxed">
              "Your student's advocacy workspace will appear here when you begin services."
            </p>
          </Card>

          {/* Teaser 2: Documents */}
          <Card 
            onClick={() => onNavigateTab("smart-docs")}
            className="border-white/10 bg-white/[0.02] hover:bg-white/[0.04] cursor-pointer transition-all p-4 space-y-2 relative group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <FolderOpen className="h-4 w-4 text-amber-400" />
                Document Vault
              </div>
              <Badge variant="outline" className="text-[10px] text-amber-300 border-amber-400/30 gap-1">
                <Lock className="h-2.5 w-2.5" /> Preview
              </Badge>
            </div>
            <p className="text-xs text-white/70 leading-relaxed">
              "Your IEPs, evaluations, school records, and Waypoint documents will live here."
            </p>
          </Card>

          {/* Teaser 3: Meetings */}
          <Card 
            onClick={() => onNavigateTab("appointments")}
            className="border-white/10 bg-white/[0.02] hover:bg-white/[0.04] cursor-pointer transition-all p-4 space-y-2 relative group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Users className="h-4 w-4 text-amber-400" />
                Meetings & Strategy
              </div>
              <Badge variant="outline" className="text-[10px] text-amber-300 border-amber-400/30 gap-1">
                <Lock className="h-2.5 w-2.5" /> Preview
              </Badge>
            </div>
            <p className="text-xs text-white/70 leading-relaxed">
              "Upcoming meetings, preparation, and advocacy activity will appear here."
            </p>
          </Card>

          {/* Teaser 4: Advocacy Workspace & Case Compass */}
          <Card 
            onClick={() => onNavigateTab("compass")}
            className="border-white/10 bg-white/[0.02] hover:bg-white/[0.04] cursor-pointer transition-all p-4 space-y-2 relative group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Compass className="h-4 w-4 text-amber-400" />
                Advocacy Workspace & Compass
              </div>
              <Badge variant="outline" className="text-[10px] text-amber-300 border-amber-400/30 gap-1">
                <Lock className="h-2.5 w-2.5" /> Preview
              </Badge>
            </div>
            <p className="text-xs text-white/70 leading-relaxed">
              "This is where you and Waypoint will keep track of what is happening, what comes next, and what needs your attention."
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
