import React, { useState, useEffect } from "react";
import { JourneyStage, SampleClientPersona } from "./types";
import { SAMPLE_CLIENT_PERSONAS } from "./journeyData";
import { InteractivePageIdPill } from "./InteractivePageIdPill";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { 
  Laptop, 
  Tablet, 
  Smartphone, 
  Calendar, 
  Clock, 
  Video, 
  Shield, 
  Lock, 
  Sparkles, 
  ArrowRight, 
  Compass, 
  CheckCircle2, 
  FileText, 
  Users, 
  FolderOpen, 
  ExternalLink,
  MessageSquare,
  Scale,
  RefreshCw,
  Info,
  ChevronRight,
  GraduationCap,
  PenTool,
  UploadCloud,
  ClipboardList,
  Hash,
  Copy,
  Check,
  X,
  Maximize2,
  Minimize2,
  ChevronDown,
  LogOut,
  Bell,
  Settings
} from "lucide-react";

interface ExperiencePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedStage: JourneyStage | null;
}

type DeviceMode = "full" | "tablet" | "mobile";

export function ExperiencePreviewModal({
  open,
  onOpenChange,
  selectedStage
}: ExperiencePreviewModalProps) {
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("full");
  const [activePersonaIndex, setActivePersonaIndex] = useState<number>(0);
  const [isBarCollapsed, setIsBarCollapsed] = useState<boolean>(false);

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  if (!open) return null;

  const currentPersona = SAMPLE_CLIENT_PERSONAS[activePersonaIndex] || SAMPLE_CLIENT_PERSONAS[0];
  const currentPageId = selectedStage?.pageId || `PG-027-S0${activePersonaIndex + 1}`;
  const currentStageName = selectedStage?.name || currentPersona.stageName;

  const getContainerWidth = () => {
    switch (deviceMode) {
      case "mobile":
        return "max-w-[420px] mx-auto border-x border-border/70 shadow-2xl min-h-screen bg-background";
      case "tablet":
        return "max-w-[840px] mx-auto border-x border-border/70 shadow-2xl min-h-screen bg-background";
      case "full":
      default:
        return "w-full min-h-screen bg-background";
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      
      {/* ── TOP ADMIN FLOATING OVERLAY BAR ─────────────────────────────────── */}
      <header className={`border-b border-border/80 bg-background/95 backdrop-blur-md shadow-md transition-all duration-200 z-50 shrink-0 ${isBarCollapsed ? "py-1 px-4" : "py-2.5 px-6"}`}>
        <div className="flex items-center justify-between gap-4">
          
          {/* Left: Brand + Stage Info + Page ID */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-extrabold uppercase tracking-wider text-primary hidden sm:inline">
                Client Preview
              </span>
            </div>

            {/* Signature # Page ID Badge */}
            <InteractivePageIdPill
              pageId={currentPageId}
              name={currentStageName}
              showName={!isBarCollapsed}
              className="bg-muted/60 border-primary/40 font-bold"
            />

            {!isBarCollapsed && (
              <Badge variant="outline" className="hidden lg:inline-flex text-[11px] font-medium bg-muted/40">
                {selectedStage?.associatedPortalPage || "Full Client Portal"}
              </Badge>
            )}
          </div>

          {/* Center / Controls */}
          <div className="flex items-center gap-3">
            {/* Persona Switcher */}
            <div className="flex items-center gap-1.5 bg-muted/50 border border-border/70 rounded-lg px-2 py-1">
              <span className="text-[11px] font-medium text-muted-foreground hidden sm:inline">
                Simulated Persona:
              </span>
              <select
                value={activePersonaIndex}
                onChange={(e) => setActivePersonaIndex(Number(e.target.value))}
                className="text-xs font-bold bg-transparent border-0 focus:ring-0 text-foreground cursor-pointer pr-1"
              >
                {SAMPLE_CLIENT_PERSONAS.map((p, idx) => (
                  <option key={p.id} value={idx} className="bg-background text-foreground">
                    {p.name.split(" (")[0]} — {p.state}
                  </option>
                ))}
              </select>
            </div>

            {/* Viewport Width selector */}
            <div className="hidden sm:flex items-center gap-1 bg-muted/50 border border-border/70 rounded-lg p-1">
              <Button
                size="sm"
                variant={deviceMode === "full" ? "default" : "ghost"}
                onClick={() => setDeviceMode("full")}
                className={`h-7 px-2.5 text-xs font-semibold gap-1 ${deviceMode === "full" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                title="Full Client Screen"
              >
                <Laptop className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Full Screen</span>
              </Button>
              <Button
                size="sm"
                variant={deviceMode === "tablet" ? "default" : "ghost"}
                onClick={() => setDeviceMode("tablet")}
                className={`h-7 px-2 text-xs font-semibold ${deviceMode === "tablet" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                title="Tablet Viewport"
              >
                <Tablet className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant={deviceMode === "mobile" ? "default" : "ghost"}
                onClick={() => setDeviceMode("mobile")}
                className={`h-7 px-2 text-xs font-semibold ${deviceMode === "mobile" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                title="Mobile Viewport"
              >
                <Smartphone className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Right: Collapse toggle & Exit Full Screen */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsBarCollapsed(!isBarCollapsed)}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hidden md:flex"
              title={isBarCollapsed ? "Expand Admin Bar" : "Minimize Admin Bar"}
            >
              {isBarCollapsed ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
            </Button>

            <Button
              size="sm"
              variant="default"
              onClick={() => onOpenChange(false)}
              className="h-8 text-xs font-bold gap-1.5 bg-destructive/90 hover:bg-destructive text-destructive-foreground shadow-sm"
              title="Close full-screen preview (or press ESC)"
            >
              <X className="h-4 w-4" />
              <span>Exit Preview</span>
              <kbd className="hidden lg:inline text-[9px] bg-destructive-foreground/20 px-1 py-0.5 rounded font-mono">
                ESC
              </kbd>
            </Button>
          </div>
        </div>
      </header>

      {/* ── FULL SCREEN CLIENT PORTAL VIEWPORT ─────────────────────────────── */}
      <main className="flex-1 overflow-y-auto bg-muted/20 relative">
        <div className={getContainerWidth()}>
          
          {/* Authentic Portal Navbar */}
          <div className="border-b border-border/60 bg-card/95 backdrop-blur-md sticky top-0 z-40 px-6 py-3.5 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-white font-bold shadow-sm">
                <Compass className="h-5 w-5" />
              </div>
              <div>
                <span className="font-extrabold text-base tracking-tight text-foreground block">
                  WAYPOINT ADVOCATES
                </span>
                <span className="text-[10px] block text-muted-foreground font-semibold uppercase tracking-wider -mt-0.5">
                  Client Portal Experience
                </span>
              </div>
            </div>

            {/* Portal Action Elements */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end text-right">
                <span className="font-semibold text-foreground text-xs">
                  {currentPersona.name.split(" (")[0]}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {currentPersona.email}
                </span>
              </div>
              
              <div className="h-9 w-9 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center border border-primary/20 shadow-xs text-sm">
                {currentPersona.name[0]}
              </div>
            </div>
          </div>

          {/* Authentic Client Experience Content */}
          <div className="p-6 md:p-10 lg:p-12 space-y-10 max-w-6xl mx-auto pb-28">
            
            {/* ========================================================================= */}
            {/* DISCOVERY SCHEDULED STAGE (Experience 01)                                 */}
            {/* ========================================================================= */}
            {currentPersona.state === "DISCOVERY_SCHEDULED" && (
              <div className="space-y-10 animate-in fade-in duration-300">
                
                {/* Hero Header */}
                <div className="border-b border-border/60 pb-8">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold mb-3.5 border border-amber-500/25">
                    <Sparkles className="h-3.5 w-3.5" />
                    Pre-Advocacy Client Workspace
                  </div>
                  <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
                    Welcome to Waypoint, {currentPersona.name.split(" ")[0]}
                  </h1>
                  <p className="text-sm md:text-base text-muted-foreground mt-2 max-w-3xl leading-relaxed">
                    We are looking forward to reviewing {currentPersona.students[0]?.name || "your student"}'s educational advocacy needs and charting a clear, structured path to IEP success.
                  </p>
                </div>

                {/* Scheduled Discovery Call Card */}
                <Card className="border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-card to-background shadow-lg overflow-hidden">
                  <CardHeader className="bg-amber-500/15 border-b border-amber-500/25 p-6 pb-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shrink-0">
                          <Calendar className="h-6 w-6" />
                        </div>
                        <div>
                          <CardTitle className="text-xl font-extrabold text-foreground">
                            Your Scheduled Discovery Call
                          </CardTitle>
                          <CardDescription className="text-xs text-muted-foreground mt-0.5">
                            Confirmed with Byron Honea · Master IEP Coach®
                          </CardDescription>
                        </div>
                      </div>

                      <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold text-xs py-1.5 px-3.5 self-start sm:self-auto shadow-xs">
                        Confirmed & Scheduled
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="p-6 md:p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/40 p-5 rounded-xl border border-border/50 text-xs">
                      <div className="space-y-1">
                        <span className="text-muted-foreground font-semibold flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                          <Calendar className="h-3.5 w-3.5 text-primary" />
                          Appointment Date
                        </span>
                        <p className="font-extrabold text-foreground text-base">
                          {currentPersona.appointment?.date || "Tuesday, September 15, 2026"}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <span className="text-muted-foreground font-semibold flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                          <Clock className="h-3.5 w-3.5 text-primary" />
                          Scheduled Time
                        </span>
                        <p className="font-extrabold text-foreground text-base">
                          {currentPersona.appointment?.time || "2:00 PM - 2:30 PM EDT"}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <span className="text-muted-foreground font-semibold flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                          <Video className="h-3.5 w-3.5 text-primary" />
                          Meeting Location
                        </span>
                        <p className="font-extrabold text-foreground text-base truncate">
                          Video via Google Meet
                        </p>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <Info className="h-4 w-4 text-amber-500 shrink-0" />
                        <span>A Google Calendar invite and secure video link were sent to <strong className="text-foreground">{currentPersona.email}</strong>.</span>
                      </div>

                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <Button variant="outline" size="sm" className="flex-1 sm:flex-none text-xs font-semibold h-9 border-border/80">
                          Manage Appointment
                        </Button>
                        <Button size="sm" className="flex-1 sm:flex-none text-xs font-bold gap-2 h-9 px-5 bg-amber-600 hover:bg-amber-700 text-white shadow-md">
                          <Video className="h-4 w-4" />
                          Join Video Call
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* What Happens Next Visual Progression */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-amber-500" />
                        What Happens Next
                      </h2>
                      <p className="text-xs text-muted-foreground">The Waypoint representation journey roadmap</p>
                    </div>
                    <Badge variant="outline" className="text-[11px] font-mono">5 Steps to Success</Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                    {[
                      { step: "1", title: "Discovery Call", sub: "30-min strategy review", active: true, done: false },
                      { step: "2", title: "Choose Support", sub: "Select advocacy tier", active: false, done: false },
                      { step: "3", title: "Add Student(s)", sub: "Profile & district setup", active: false, done: false },
                      { step: "4", title: "Complete Setup", sub: "Upload IEPs & evals", active: false, done: false },
                      { step: "5", title: "Begin Advocacy", sub: "Case Compass launched", active: false, done: false },
                    ].map((item, idx) => (
                      <div
                        key={idx}
                        className={`p-4 rounded-xl border flex flex-col justify-between text-xs transition-all shadow-xs ${
                          item.active
                            ? "border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/30"
                            : "border-border/60 bg-card/60 opacity-85"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                            item.active ? "bg-amber-500 text-white shadow-xs" : "bg-muted text-muted-foreground"
                          }`}>
                            {item.step}
                          </span>
                          {item.active && (
                            <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] py-0 px-2 font-extrabold">
                              Current Step
                            </Badge>
                          )}
                        </div>
                        <div>
                          <p className="font-extrabold text-foreground text-sm">{item.title}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{item.sub}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Future Workspaces Teasers */}
                <div className="space-y-4 pt-2">
                  <div>
                    <h2 className="text-lg font-bold text-foreground">
                      Explore Your Future Advocacy Workspace
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Get a preview of the tools activated once representation begins.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Teaser 1: Student Workspace */}
                    <Card className="border-border/70 bg-card/80 shadow-sm relative overflow-hidden group hover:border-primary/40 transition-all">
                      <div className="absolute top-4 right-4">
                        <Badge variant="outline" className="text-[10px] gap-1 bg-background text-muted-foreground border-amber-500/30">
                          <Lock className="h-3 w-3 text-amber-500" />
                          Unlocks with Advocacy
                        </Badge>
                      </div>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base font-bold flex items-center gap-2.5">
                          <GraduationCap className="h-5 w-5 text-primary" />
                          Student Workspace
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="text-xs text-muted-foreground space-y-3">
                        <p className="leading-relaxed font-medium text-foreground/90">
                          "Your student's advocacy workspace will appear here when you begin services."
                        </p>
                        <div className="p-3 rounded-lg bg-muted/40 border border-border/40 text-[11px] space-y-1">
                          <div>• Complete IEP Goal Tracker & Objective Measurability Analysis</div>
                          <div>• Classroom Accommodations & Testing Modifications Roster</div>
                          <div>• Specialized Instruction Minutes & Related Services Ledger</div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Teaser 2: Document Vault */}
                    <Card className="border-border/70 bg-card/80 shadow-sm relative overflow-hidden group hover:border-primary/40 transition-all">
                      <div className="absolute top-4 right-4">
                        <Badge variant="outline" className="text-[10px] gap-1 bg-background text-muted-foreground border-amber-500/30">
                          <Lock className="h-3 w-3 text-amber-500" />
                          Unlocks with Advocacy
                        </Badge>
                      </div>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base font-bold flex items-center gap-2.5">
                          <FolderOpen className="h-5 w-5 text-primary" />
                          Document Vault & Comparator
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="text-xs text-muted-foreground space-y-3">
                        <p className="leading-relaxed font-medium text-foreground/90">
                          "Your IEPs, evaluations, school records, and Waypoint documents will live here."
                        </p>
                        <div className="p-3 rounded-lg bg-muted/40 border border-border/40 text-[11px] space-y-1">
                          <div>• Year-over-Year Side-by-Side Visual IEP Comparator</div>
                          <div>• Encrypted Cloudflare R2 School Record Archive</div>
                          <div>• OCR Searchable Psychological & Multidisciplinary Evals</div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Teaser 3: Meetings & Strategy */}
                    <Card className="border-border/70 bg-card/80 shadow-sm relative overflow-hidden group hover:border-primary/40 transition-all">
                      <div className="absolute top-4 right-4">
                        <Badge variant="outline" className="text-[10px] gap-1 bg-background text-muted-foreground border-amber-500/30">
                          <Lock className="h-3 w-3 text-amber-500" />
                          Unlocks with Advocacy
                        </Badge>
                      </div>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base font-bold flex items-center gap-2.5">
                          <Users className="h-5 w-5 text-primary" />
                          Meetings & Strategy Hub
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="text-xs text-muted-foreground space-y-3">
                        <p className="leading-relaxed font-medium text-foreground/90">
                          "Upcoming meetings, preparation, and advocacy activity will appear here."
                        </p>
                        <div className="p-3 rounded-lg bg-muted/40 border border-border/40 text-[11px] space-y-1">
                          <div>• Pre-IEP Meeting Agendas & Customized Parent Talking Points</div>
                          <div>• Post-Meeting Debrief Worksheets & Follow-up Timelines</div>
                          <div>• Audio Recording Uploads & AI-assisted Transcriptions</div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Teaser 4: Advocacy Workspace & Case Compass */}
                    <Card className="border-border/70 bg-card/80 shadow-sm relative overflow-hidden group hover:border-primary/40 transition-all">
                      <div className="absolute top-4 right-4">
                        <Badge variant="outline" className="text-[10px] gap-1 bg-background text-muted-foreground border-amber-500/30">
                          <Lock className="h-3 w-3 text-amber-500" />
                          Unlocks with Advocacy
                        </Badge>
                      </div>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base font-bold flex items-center gap-2.5">
                          <Compass className="h-5 w-5 text-primary" />
                          Advocacy Workspace & Case Compass
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="text-xs text-muted-foreground space-y-3">
                        <p className="leading-relaxed font-medium text-foreground/90">
                          "This is where you and Waypoint will keep track of what is happening, what comes next, and what needs your attention."
                        </p>
                        <div className="p-3 rounded-lg bg-muted/40 border border-border/40 text-[11px] space-y-1">
                          <div>• Real-time Case Compass 6-Stage Milestone Progress Indicator</div>
                          <div>• Action Taskboard with Direct Notifications & Due Dates</div>
                          <div>• Direct Encrypted Messaging with Byron Honea</div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* PROGRESSIVE ONBOARDING STAGE                                              */}
            {/* ========================================================================= */}
            {currentPersona.state === "ONBOARDING" && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div className="border-b border-border/60 pb-6">
                  <Badge className="bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 mb-3 border-cyan-500/30 text-xs">
                    Progressive Onboarding Active
                  </Badge>
                  <h1 className="text-3xl font-extrabold text-foreground">
                    Welcome to the Waypoint Family, {currentPersona.name.split(" ")[0]}
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl leading-relaxed">
                    Complete these 5 independent steps to finalize student profile setup and schedule your Strategy Launch Call.
                  </p>
                </div>

                <div className="space-y-3.5">
                  {[
                    { name: "Account Created & Verified", status: "completed", desc: "Clerk credentials authenticated" },
                    { name: "Advocacy Retainer Payment", status: "completed", desc: "Payment received on household ledger" },
                    { name: "Sign Representation Agreement", status: "in_progress", desc: "Master Agreement & FERPA Authorization" },
                    { name: "Student Setup Profiles", status: "pending", desc: "2 Students: Noah & Maya Vance" },
                    { name: "Upload IEPs & Evals", status: "pending", desc: "Secure R2 document dropzone" },
                    { name: "Advocacy Priorities Intake", status: "pending", desc: "Parent concerns & meeting goals" },
                    { name: "Schedule Strategy Call", status: "locked", desc: "45-min video session with Byron" }
                  ].map((step, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl border flex items-center justify-between text-xs transition-all ${
                        step.status === "completed"
                          ? "bg-emerald-500/5 border-emerald-500/30 text-foreground"
                          : step.status === "in_progress"
                          ? "bg-primary/10 border-primary/50 shadow-sm"
                          : "bg-card/60 border-border/50 text-muted-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-extrabold ${
                          step.status === "completed"
                            ? "bg-emerald-500 text-white"
                            : step.status === "in_progress"
                            ? "bg-primary text-primary-foreground animate-pulse"
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {step.status === "completed" ? "✓" : idx + 1}
                        </div>
                        <div>
                          <p className="font-bold text-foreground text-sm">{step.name}</p>
                          <p className="text-[11px] text-muted-foreground">{step.desc}</p>
                        </div>
                      </div>

                      {step.status === "in_progress" ? (
                        <Button size="sm" className="h-8 text-xs font-bold gap-1.5 px-4">
                          Continue Step
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      ) : step.status === "completed" ? (
                        <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-500/30 font-semibold">
                          Saved & Stored
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-muted-foreground border-border/40">
                          Next Up
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* ACTIVE ADVOCACY STAGE                                                     */}
            {/* ========================================================================= */}
            {currentPersona.state === "ACTIVE" && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-6">
                  <div>
                    <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 mb-2.5 border-emerald-500/30 text-xs">
                      Active Representation
                    </Badge>
                    <h1 className="text-3xl font-extrabold text-foreground">
                      {currentPersona.students[0]?.name}'s Advocacy Command Center
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                      {currentPersona.activeCase?.caseTitle}
                    </p>
                  </div>

                  <Button size="sm" className="h-9 text-xs font-bold gap-2 px-4 shadow-sm">
                    <MessageSquare className="h-4 w-4" />
                    Message Byron
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Card className="p-5 border-border/70 bg-card/80 space-y-3 shadow-xs">
                    <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                      <Compass className="h-5 w-5 text-primary" />
                      Case Compass Status
                    </div>
                    <p className="text-xs text-muted-foreground font-semibold">
                      Stage 3: Evidence Gathering & IEP Proposal Formulation
                    </p>
                    <div className="text-xs bg-muted/40 p-3 rounded-lg border border-border/40 leading-relaxed">
                      {currentPersona.activeCase?.focus}
                    </div>
                  </Card>

                  <Card className="p-5 border-border/70 bg-card/80 space-y-3 shadow-xs">
                    <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                      <Calendar className="h-5 w-5 text-primary" />
                      Upcoming IEP Meeting
                    </div>
                    <p className="text-sm font-extrabold text-foreground">
                      {currentPersona.activeCase?.nextMeeting}
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Preparation agenda and parent talking points document will be finalized 48 hours prior.
                    </p>
                  </Card>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* CLOSING STAGE                                                             */}
            {/* ========================================================================= */}
            {currentPersona.state === "CLOSING" && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div className="border-b border-border/60 pb-6">
                  <Badge className="bg-teal-500/15 text-teal-600 dark:text-teal-400 mb-2.5 border-teal-500/30 text-xs">
                    Case Resolution & Archive
                  </Badge>
                  <h1 className="text-3xl font-extrabold text-foreground">
                    Advocacy Resolution Archive for {currentPersona.students[0]?.name}
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                    Your representation case has concluded with an amended and finalized IEP. Your documents remain permanently accessible.
                  </p>
                </div>

                <Card className="p-6 border-border/70 bg-card/80 space-y-4 shadow-sm">
                  <h3 className="text-base font-bold text-foreground">Download Complete Student Records Bundle</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Download a single encrypted ZIP file containing all IEP drafts, formal requests, psych evaluation notes, and meeting recordings.
                  </p>
                  <Button size="sm" variant="outline" className="text-xs font-bold gap-2 h-9 px-4">
                    <FolderOpen className="h-4 w-4" />
                    Download 2026 IEP Records Bundle (.ZIP)
                  </Button>
                </Card>
              </div>
            )}
          </div>
        </div>

        {/* ── FLOATING BOTTOM-RIGHT # PAGE ID BADGE ─────────────────────────── */}
        <div className="fixed bottom-5 right-6 z-50">
          <InteractivePageIdPill
            pageId={currentPageId}
            name={currentStageName}
            showName={true}
            size="default"
            className="shadow-xl border-primary/50 bg-background/95 backdrop-blur-md px-3 py-1.5 font-bold"
          />
        </div>
      </main>
    </div>
  );
}
