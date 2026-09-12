import React, { useState } from "react";
import {
  Settings,
  PhoneIncoming,
  Radio,
  UserCheck,
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
  Sliders,
  CheckCircle2,
  X,
  PhoneCall,
  UserPlus,
  Zap,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

export type CallerType = "Existing Client" | "Existing Lead" | "Known Contact" | "Unknown Caller";

export type CallScenario =
  | "New prospective client"
  | "Existing client question"
  | "Scheduling request"
  | "Needs advocate"
  | "School/provider calling"
  | "General inquiry";

export interface SimulatedCallState {
  isActive: boolean;
  isEnded: boolean;
  startedAt: Date;
  durationSeconds: number;
  callerType: CallerType;
  callerName: string;
  phoneNumber: string;
  relatedStudent: string;
  scenario: CallScenario;
  isCrmMatch: boolean;
  matchedContactId?: number;
}

interface CallCenterTestPanelProps {
  onStartSimulation: (sim: SimulatedCallState) => void;
  activeSimulation: SimulatedCallState | null;
  onResetSimulation: () => void;
}

const PRESET_CALLERS: Record<
  CallerType,
  { name: string; phone: string; student: string; isMatch: boolean; scenario: CallScenario }
> = {
  "Existing Client": {
    name: "Sarah Thompson",
    phone: "(770) 555-6789",
    student: "Lucas Thompson (5th Grade)",
    isMatch: true,
    scenario: "Existing client question",
  },
  "Existing Lead": {
    name: "Amy Jones",
    phone: "(678) 555-9876",
    student: "Maya Jones (3rd Grade)",
    isMatch: true,
    scenario: "New prospective client",
  },
  "Known Contact": {
    name: "Dr. Robert Sterling",
    phone: "(404) 555-3311",
    student: "Cobb County School District",
    isMatch: true,
    scenario: "School/provider calling",
  },
  "Unknown Caller": {
    name: "Unknown Caller",
    phone: "+1 (404) 555-0199",
    student: "",
    isMatch: false,
    scenario: "General inquiry",
  },
};

export function CallCenterTestPanel({
  onStartSimulation,
  activeSimulation,
  onResetSimulation,
}: CallCenterTestPanelProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [popoverOpen, setPopoverOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // Form State for Simulation
  const [callerType, setCallerType] = useState<CallerType>("Existing Client");
  const [callerName, setCallerName] = useState(PRESET_CALLERS["Existing Client"].name);
  const [phoneNumber, setPhoneNumber] = useState(PRESET_CALLERS["Existing Client"].phone);
  const [relatedStudent, setRelatedStudent] = useState(PRESET_CALLERS["Existing Client"].student);
  const [scenario, setScenario] = useState<CallScenario>(PRESET_CALLERS["Existing Client"].scenario);
  const [isCrmMatch, setIsCrmMatch] = useState(PRESET_CALLERS["Existing Client"].isMatch);

  // When caller type changes, fill realistic defaults
  const handleCallerTypeChange = (type: CallerType) => {
    setCallerType(type);
    const preset = PRESET_CALLERS[type];
    setCallerName(preset.name);
    setPhoneNumber(preset.phone);
    setRelatedStudent(preset.student);
    setIsCrmMatch(preset.isMatch);
    setScenario(preset.scenario);
  };

  const handleStartCall = () => {
    onStartSimulation({
      isActive: true,
      isEnded: false,
      startedAt: new Date(),
      durationSeconds: 0,
      callerType,
      callerName: callerName.trim() || (callerType === "Unknown Caller" ? "Unknown Caller" : "Test Caller"),
      phoneNumber: phoneNumber.trim() || "(770) 555-0199",
      relatedStudent: relatedStudent.trim(),
      scenario,
      isCrmMatch,
      matchedContactId: isCrmMatch ? 104 : undefined,
    });
    setModalOpen(false);
    setPopoverOpen(false);
    toast.success("SIMULATED INCOMING CALL STARTED", {
      description: `Testing event for ${callerName} (${phoneNumber}) — No real call placed.`,
    });
  };

  const handleQuickLaunch = (type: CallerType) => {
    const preset = PRESET_CALLERS[type];
    onStartSimulation({
      isActive: true,
      isEnded: false,
      startedAt: new Date(),
      durationSeconds: 0,
      callerType: type,
      callerName: preset.name,
      phoneNumber: preset.phone,
      relatedStudent: preset.student,
      scenario: preset.scenario,
      isCrmMatch: preset.isMatch,
      matchedContactId: preset.isMatch ? 104 : undefined,
    });
    setPopoverOpen(false);
    toast.success("SIMULATED INCOMING CALL STARTED", {
      description: `Instant test for ${preset.name} (${preset.phone})`,
    });
  };

  // Only render gear if user is admin / staff developer
  if (!isAdmin) {
    return null;
  }

  return (
    <>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 rounded-xl text-slate-400 hover:text-amber-300 hover:bg-amber-400/10 transition-colors"
            title="Call Center Developer & Test Controls"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          side="bottom"
          align="end"
          sideOffset={8}
          collisionPadding={16}
          className="w-80 max-w-[calc(100vw-2rem)] bg-[#061830] border-2 border-amber-400/40 text-slate-100 p-4 rounded-2xl shadow-2xl space-y-3 z-50"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-1.5 font-bold text-xs text-amber-300 tracking-wider uppercase">
              <Sliders className="h-3.5 w-3.5" />
              Call Center Testing
            </div>
            <Badge variant="outline" className="text-[9px] border-amber-400/40 text-amber-300 bg-amber-400/10 py-0">
              Dev Only
            </Badge>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Test and refine workstation layout, contact matching, and intake behavior when Quo reports an incoming call without placing a real phone call.
          </p>

          {activeSimulation?.isActive ? (
            <div className="p-2.5 rounded-xl bg-amber-400/10 border border-amber-400/30 space-y-2 text-xs">
              <div className="flex items-center justify-between font-semibold text-amber-300">
                <span className="flex items-center gap-1">
                  <Radio className="h-3 w-3 animate-pulse text-amber-400" />
                  Test Call in Progress
                </span>
              </div>
              <div className="text-[11px] text-slate-300 truncate font-mono">
                {activeSimulation.callerName} • {activeSimulation.phoneNumber}
              </div>
              <Button
                size="sm"
                onClick={onResetSimulation}
                variant="outline"
                className="w-full text-xs h-7 border-amber-400/40 text-amber-300 hover:bg-amber-400/20 gap-1"
              >
                <RotateCcw className="h-3 w-3" />
                Reset Test State
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {/* 1-Click Quick Simulators */}
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                1-Click Quick Simulators:
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleQuickLaunch("Existing Client")}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg bg-[#040D1A] border border-slate-800 hover:border-amber-400/50 hover:bg-amber-400/5 text-xs text-white flex items-center justify-between group transition-all"
                >
                  <span className="truncate">
                    <span className="font-bold text-amber-300">Client:</span> Sarah Thompson
                  </span>
                  <Zap className="h-3 w-3 text-amber-400 group-hover:scale-110 transition-transform" />
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLaunch("Existing Lead")}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg bg-[#040D1A] border border-slate-800 hover:border-sky-400/50 hover:bg-sky-400/5 text-xs text-white flex items-center justify-between group transition-all"
                >
                  <span className="truncate">
                    <span className="font-bold text-sky-300">Lead:</span> Amy Jones
                  </span>
                  <Zap className="h-3 w-3 text-sky-400 group-hover:scale-110 transition-transform" />
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLaunch("Unknown Caller")}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg bg-[#040D1A] border border-slate-800 hover:border-slate-600 hover:bg-slate-800/40 text-xs text-slate-300 flex items-center justify-between group transition-all"
                >
                  <span className="truncate">
                    <span className="font-bold text-slate-400">Unknown:</span> Inbound Caller
                  </span>
                  <Zap className="h-3 w-3 text-slate-400 group-hover:scale-110 transition-transform" />
                </button>
              </div>

              {/* Full Setup Modal Button */}
              <Button
                onClick={() => {
                  setPopoverOpen(false);
                  setModalOpen(true);
                }}
                className="w-full mt-1 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs h-8 rounded-xl gap-2 shadow-[0_0_15px_rgba(245,158,11,0.25)]"
              >
                <Sliders className="h-3.5 w-3.5" />
                Custom Test Rig Parameters...
              </Button>
            </div>
          )}

          <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800">
            Isolated memory only. Never dials external numbers or modifies production records.
          </div>
        </PopoverContent>
      </Popover>

      {/* ── SIMULATE INCOMING CALL SETUP MODAL (SCREEN-FITTING ARCHITECTURE) ── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent
          className="fixed !top-4 sm:!top-8 left-[50%] -translate-x-[50%] !translate-y-0 w-[94vw] max-w-md max-h-[calc(100dvh-2rem)] flex flex-col p-0 overflow-hidden bg-[#061830] border-2 border-amber-400 text-slate-100 rounded-2xl shadow-2xl z-50 gap-0"
        >
          {/* Fixed Header */}
          <div className="p-4 pb-2.5 border-b border-slate-800 flex-shrink-0 space-y-1 bg-[#040D1A]/80">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs tracking-wider uppercase">
              <PhoneIncoming className="h-3.5 w-3.5" />
              Simulate Incoming Quo Event
            </div>
            <DialogTitle className="text-base sm:text-lg font-bold text-white tracking-tight">
              Incoming Call Test Rig
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Configure simulated caller parameters to test matching, intake, and First Mate assistance.
            </DialogDescription>
          </div>

          {/* Scrollable Form Body (guaranteed to never exceed screen height) */}
          <div className="overflow-y-auto p-4 py-3 space-y-3 flex-1 text-xs">
            {/* Quick Preset Buttons */}
            <div className="space-y-1">
              <Label className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                Quick Caller Preset
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {(Object.keys(PRESET_CALLERS) as CallerType[]).map((type) => {
                  const isSelected = callerType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleCallerTypeChange(type)}
                      className={`px-2 py-1.5 rounded-lg border text-[11px] font-semibold text-center transition-all truncate ${
                        isSelected
                          ? "bg-amber-400 text-slate-950 border-amber-400 shadow-sm"
                          : "bg-[#040D1A] text-slate-300 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      {type}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Caller Name & Phone Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label className="text-xs text-slate-300 font-medium">Caller Name</Label>
                <Input
                  value={callerName}
                  onChange={(e) => setCallerName(e.target.value)}
                  placeholder="e.g. Sarah Thompson"
                  className="bg-[#040D1A] border-slate-800 text-white text-xs h-8 rounded-xl focus:border-amber-400"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-300 font-medium">Phone Number</Label>
                <Input
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="(770) 555-0199"
                  className="bg-[#040D1A] border-slate-800 text-white text-xs h-8 rounded-xl font-mono focus:border-amber-400"
                />
              </div>
            </div>

            {/* Related Student */}
            <div className="space-y-1">
              <Label className="text-xs text-slate-300 font-medium">Related Student (Optional)</Label>
              <Input
                value={relatedStudent}
                onChange={(e) => setRelatedStudent(e.target.value)}
                placeholder="e.g. Lucas Thompson (5th Grade)"
                className="bg-[#040D1A] border-slate-800 text-white text-xs h-8 rounded-xl focus:border-amber-400"
              />
            </div>

            {/* Call Scenario */}
            <div className="space-y-1">
              <Label className="text-xs text-slate-300 font-medium">Call Scenario</Label>
              <Select value={scenario} onValueChange={(v: CallScenario) => setScenario(v)}>
                <SelectTrigger className="bg-[#040D1A] border-slate-800 text-white rounded-xl h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#061830] border-slate-700 text-slate-100 z-50">
                  <SelectItem value="New prospective client">New prospective client</SelectItem>
                  <SelectItem value="Existing client question">Existing client question</SelectItem>
                  <SelectItem value="Scheduling request">Scheduling request</SelectItem>
                  <SelectItem value="Needs advocate">Needs advocate (Immediate Dispute)</SelectItem>
                  <SelectItem value="School/provider calling">School/provider calling</SelectItem>
                  <SelectItem value="General inquiry">General inquiry</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Simulate CRM Match Toggle */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-[#040D1A] border border-slate-800">
              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-white">Simulate CRM Match</div>
                <div className="text-[10px] text-slate-400">
                  Auto-resolves caller to an existing client profile with student record.
                </div>
              </div>
              <Switch checked={isCrmMatch} onCheckedChange={setIsCrmMatch} />
            </div>
          </div>

          {/* Fixed Footer (Always visible regardless of screen height) */}
          <div className="p-3 px-4 border-t border-slate-800 bg-[#040D1A] flex items-center justify-between gap-2 flex-shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setModalOpen(false)}
              className="text-slate-400 hover:text-white text-xs h-8 px-3"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleStartCall}
              className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs h-8 px-4 rounded-xl gap-1.5 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              Start Test Call
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default CallCenterTestPanel;
