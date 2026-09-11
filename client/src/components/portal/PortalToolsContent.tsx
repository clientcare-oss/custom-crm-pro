/**
 * PortalToolsContent — PG-023-TLS
 * Waypoint Advocacy Tools & Mini-Apps Suite
 * Features authentic Waypoint branding (serif + italic bold accent + golden wave ribbon)
 * and rich, interactive mini-app consoles for families.
 */

import React, { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { openWaypointScan } from "@/lib/waypointScanEvents";
import PageIdBadge from "@/components/PageIdBadge";
import { WaypointWaveIcon } from "@/components/portal/WaypointWavyBackdrop";
import { Button } from "@/components/ui/button";
import {
  Camera,
  GitCompare,
  CheckCircle2,
  Lock,
  Info,
  Sparkles,
  FileText,
  CheckSquare,
  Shield,
  ArrowRight,
  Upload,
  Zap,
  FolderLock,
  Layers,
  FileCheck2,
  Calendar,
  Compass,
  FileDigit,
  Maximize2,
} from "lucide-react";

interface PortalToolsContentProps {
  contactId: number;
  studentName?: string;
  isAdminView?: boolean;
  isLight?: boolean;
  onNavigateTab?: (tab: string) => void;
}

export function PortalToolsContent({
  contactId,
  studentName = "Student",
  isAdminView = false,
  isLight = false,
  onNavigateTab,
}: PortalToolsContentProps) {
  const [, setLocation] = useLocation();
  const { data: iepDoc } = trpc.iep.get.useQuery({ contactId }, { enabled: !!contactId });
  const hasBothVersions = !!(iepDoc?.currentFileKey && iepDoc?.previousFileKey);

  // Mini-app interactive state demonstrations
  const [scanTab, setScanTab] = useState<"camera" | "upload" | "sign">("camera");
  const [diffFilter, setDiffFilter] = useState<"all" | "services" | "accommodations">("all");

  const navigateTo = (tab: string, fallbackUrl: string) => {
    if (onNavigateTab) {
      onNavigateTab(tab);
    } else {
      setLocation(fallbackUrl);
    }
  };

  return (
    <div className={`p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto ${isLight ? "text-slate-900" : "text-white"}`}>
      
      {/* ── Waypoint Branded Suite Hero Header ── */}
      <div className="relative overflow-hidden rounded-3xl border border-blue-900/50 bg-[#051427] shadow-[0_15px_45px_rgba(0,0,0,0.4)] p-6 sm:p-8">
        {/* Background wave texture */}
        <div
          className="absolute inset-0 bg-cover bg-center pointer-events-none opacity-25 mix-blend-screen"
          style={{ backgroundImage: `url('/waypoint-wave-bg.jpg')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#051427] via-[#071E3D]/80 to-[#051427]/90 pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-2xl sm:text-3xl font-serif text-white font-normal tracking-wide">
                  Waypoint
                </span>
                <span className="text-2xl sm:text-3xl font-serif text-amber-400 font-bold tracking-wide italic">
                  Advocacy Suite
                </span>
              </div>
              <PageIdBadge id="PG-023-TLS" name="Advocacy Tools" />
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Family Client Suite Active</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <WaypointWaveIcon className="w-10 h-3 text-amber-400/90" />
              <p className="text-xs sm:text-sm text-blue-200/90 font-medium">
                Dedicated client-side tools designed exclusively for <span className="text-amber-300 font-bold">{studentName}'s</span> family
              </p>
            </div>
          </div>

          {/* Executive Waypoint Status Pill */}
          <div className="shrink-0 flex items-center bg-[#071933]/90 backdrop-blur-md border border-blue-700/40 rounded-2xl p-2 sm:p-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.3)] ring-1 ring-blue-400/10">
            {/* Student Record Section */}
            <div className="flex items-center gap-3 px-3 py-1">
              <div className="p-2 rounded-xl bg-amber-400/15 text-amber-400 border border-amber-400/30 shrink-0 shadow-sm">
                <Shield className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-blue-300/80 uppercase tracking-wider font-bold whitespace-nowrap">
                  Student Record
                </div>
                <div className="text-sm font-bold text-white whitespace-nowrap truncate max-w-[160px] sm:max-w-[200px]">
                  {studentName}
                </div>
              </div>
            </div>

            {/* Elegant Vertical Divider */}
            <div className="h-8 w-px bg-blue-700/50 mx-1 shrink-0" />

            {/* Ready Tools Section */}
            <div className="flex items-center gap-3 px-3 py-1">
              <div className="p-2 rounded-xl bg-sky-400/15 text-sky-400 border border-sky-400/30 shrink-0 shadow-sm">
                <Sparkles className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </div>
              <div>
                <div className="text-[10px] text-blue-300/80 uppercase tracking-wider font-bold whitespace-nowrap">
                  Ready Tools
                </div>
                <div className="text-sm font-bold text-amber-300 whitespace-nowrap">
                  4 Mini-Apps
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Mini-Apps 2x2 Interactive Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ══════════════════════════════════════════════════════════════════════
            MINI-APP 1: WAYPOINT SCAN & DOCUMENT SUITE (PG-023-SCAN)
           ══════════════════════════════════════════════════════════════════════ */}
        <div className="group relative rounded-3xl border border-blue-900/60 hover:border-amber-400/60 bg-[#061830] transition-all duration-300 shadow-[0_12px_35px_rgba(0,0,0,0.35)] hover:shadow-[0_16px_45px_rgba(245,181,68,0.12)] flex flex-col justify-between overflow-hidden">
          {/* Subtle top ambient glow */}
          <div className="absolute top-0 right-0 w-64 h-32 bg-amber-400/10 rounded-full blur-3xl pointer-events-none group-hover:bg-amber-400/15 transition-all" />

          <div className="p-6 sm:p-7 space-y-5">
            {/* Top Bar: Brand Lockup + Page ID + Status */}
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xl sm:text-2xl font-serif text-white font-normal tracking-wide">
                    Waypoint
                  </span>
                  <span className="text-xl sm:text-2xl font-serif text-amber-400 font-bold tracking-wide italic">
                    Scan
                  </span>
                  <PageIdBadge id="PG-023-SCAN" name="Waypoint Scan" />
                </div>
                <WaypointWaveIcon className="w-9 h-2.5 text-amber-400/90 -mt-0.5" />
                <p className="text-xs text-blue-200/80 font-medium pt-1">
                  Scan it. Fill it out. Sign it. Send it.
                </p>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span>Live Scanner Ready</span>
              </div>
            </div>

            {/* Interactive Mini-App Viewport Display */}
            <div className="relative rounded-2xl bg-[#030F1E] border border-blue-800/60 p-4 overflow-hidden shadow-inner">
              {/* Scan simulation scanline */}
              <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-75 animate-pulse" />

              {/* Viewport Header Controls */}
              <div className="flex items-center justify-between pb-3 border-b border-blue-900/50 text-[11px]">
                <div className="flex items-center gap-2 text-blue-300 font-mono">
                  <Camera className="w-3.5 h-3.5 text-amber-400" />
                  <span>VIEWPORT: HD DOCUMENT DETECTOR</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="px-2 py-0.5 rounded bg-blue-950/80 border border-blue-800/50 text-blue-300 text-[10px]">
                    4:3 / 16:9
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                    AUTO-DESKEW
                  </span>
                </div>
              </div>

              {/* Viewport Canvas Frame with Corner Crop Brackets */}
              <div className="my-3 relative rounded-xl border border-dashed border-amber-400/40 bg-[#071E3D]/50 p-4 flex flex-col items-center justify-center text-center min-h-[130px]">
                {/* 4 Glowing Corner Target Brackets */}
                <div className="absolute top-2 left-2 text-amber-400 font-mono text-sm leading-none">⌜</div>
                <div className="absolute top-2 right-2 text-amber-400 font-mono text-sm leading-none">⌝</div>
                <div className="absolute bottom-2 left-2 text-amber-400 font-mono text-sm leading-none">⌞</div>
                <div className="absolute bottom-2 right-2 text-amber-400 font-mono text-sm leading-none">⌟</div>

                <div className="space-y-1.5 z-10">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-[11px] font-bold">
                    <CheckCircle2 className="w-3 h-3" /> 4 Corner Points Locked (99.6% Match)
                  </div>
                  <p className="text-xs text-white/90 font-medium">
                    Paper Edges Auto-Detected &amp; Perspective Corrected
                  </p>
                  <p className="text-[10px] text-blue-300/70">
                    Captures IEPs, PWNs, doctor letters &amp; school evaluations
                  </p>
                </div>
              </div>

              {/* Viewport Feature Badges */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-blue-900/40 text-[11px]">
                <div className="flex items-center gap-1.5 text-white/80">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Camera Scan</span>
                </div>
                <div className="flex items-center gap-1.5 text-white/80">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>PDF Finisher</span>
                </div>
                <div className="flex items-center gap-1.5 text-white/80">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>E-Sign &amp; Annotate</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-white/70 leading-relaxed">
              Use your phone or laptop camera to capture multi-page paper school records. Automatically straightens curled pages, removes shadows, and provides touch-drawn legal e-signatures.
            </p>
          </div>

          {/* Action Launch Footer */}
          <div className="p-6 sm:p-7 pt-0 border-t border-blue-900/40 bg-[#041021]/50 flex items-center justify-between gap-3">
            <span className="text-[11px] text-blue-300/80 font-medium">
              Mobile camera, PDF import &amp; signing
            </span>
            <Button
              size="sm"
              onClick={() => openWaypointScan({ studentId: contactId, studentName, category: "ieps-504s" })}
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl px-4 py-2 gap-2 shadow-[0_0_18px_rgba(245,181,68,0.3)] hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
            >
              <Camera className="h-4 w-4 stroke-[2.5]" />
              <span>Launch Waypoint Scan</span>
            </Button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            MINI-APP 2: WAYPOINT COMPARE — IEP & 504 COMPARATOR (PG-010-IEP)
           ══════════════════════════════════════════════════════════════════════ */}
        <div className="group relative rounded-3xl border border-blue-900/60 hover:border-sky-400/60 bg-[#061830] transition-all duration-300 shadow-[0_12px_35px_rgba(0,0,0,0.35)] hover:shadow-[0_16px_45px_rgba(56,189,248,0.12)] flex flex-col justify-between overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-32 bg-sky-400/10 rounded-full blur-3xl pointer-events-none group-hover:bg-sky-400/15 transition-all" />

          <div className="p-6 sm:p-7 space-y-5">
            {/* Top Bar: Brand Lockup + Page ID + Status */}
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xl sm:text-2xl font-serif text-white font-normal tracking-wide">
                    Waypoint
                  </span>
                  <span className="text-xl sm:text-2xl font-serif text-sky-400 font-bold tracking-wide italic">
                    Compare
                  </span>
                  <PageIdBadge id="PG-010-IEP" name="IEP Comparator" />
                </div>
                <WaypointWaveIcon className="w-9 h-2.5 text-sky-400/90 -mt-0.5" />
                <p className="text-xs text-blue-200/80 font-medium pt-1">
                  IEP &amp; 504 Automated Side-by-Side Diff Engine
                </p>
              </div>

              {hasBothVersions ? (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>2 Versions Ready</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Requires 2 IEPs</span>
                </div>
              )}
            </div>

            {/* Interactive Mini-App Viewport Display */}
            <div className="relative rounded-2xl bg-[#030F1E] border border-blue-800/60 p-4 overflow-hidden shadow-inner">
              <div className="flex items-center justify-between pb-3 border-b border-blue-900/50 text-[11px]">
                <div className="flex items-center gap-2 text-sky-300 font-mono">
                  <GitCompare className="w-3.5 h-3.5 text-sky-400" />
                  <span>DIFF CONSOLE: SIDE-BY-SIDE ANALYZER</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[10px] font-bold">
                  AI DELTA ENGINE
                </span>
              </div>

              {/* Side-by-Side Diff Mini Preview */}
              <div className="my-3 grid grid-cols-2 gap-2.5">
                {/* Left: Prior Year */}
                <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-2.5 space-y-1.5">
                  <div className="text-[10px] font-mono font-bold text-rose-300 flex items-center justify-between">
                    <span>PRIOR IEP</span>
                    <span className="text-rose-400/80">REMOVED / DECREASED</span>
                  </div>
                  <div className="text-[11px] text-rose-200/90 font-mono line-through truncate">
                    - 30 min/wk Speech Therapy
                  </div>
                  <div className="text-[10px] text-rose-300/70">
                    Proposed reduction flagged
                  </div>
                </div>

                {/* Right: Current Year */}
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-2.5 space-y-1.5">
                  <div className="text-[10px] font-mono font-bold text-emerald-300 flex items-center justify-between">
                    <span>CURRENT IEP</span>
                    <span className="text-emerald-400/80">ADDED / EXPANDED</span>
                  </div>
                  <div className="text-[11px] text-emerald-200/90 font-mono font-bold truncate">
                    + 60 min/wk Speech &amp; OT
                  </div>
                  <div className="text-[10px] text-emerald-300/70">
                    Advocate accommodation added
                  </div>
                </div>
              </div>

              {/* Diff Summary Strip */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-blue-900/40 text-[11px]">
                <div className="flex items-center gap-1.5 text-white/80">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>Goals Tracking</span>
                </div>
                <div className="flex items-center gap-1.5 text-white/80">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>Hours Audit</span>
                </div>
                <div className="flex items-center gap-1.5 text-white/80">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>Redline Report</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-white/70 leading-relaxed">
              Analyzes line-by-line differences between current and prior IEPs or 504 plans. Instantly exposes sneaky service hour reductions, removed accommodations, and altered goal criteria.
            </p>
          </div>

          {/* Action Launch Footer */}
          <div className="p-6 sm:p-7 pt-0 border-t border-blue-900/40 bg-[#041021]/50 flex items-center justify-between gap-3">
            <span className="text-[11px] text-blue-300/80 font-medium">
              {hasBothVersions ? "2 document versions linked on file" : "Upload current & prior IEPs to unlock"}
            </span>
            {hasBothVersions ? (
              <Button
                size="sm"
                onClick={() => setLocation(`/tools?contactId=${contactId}`)}
                className="bg-sky-400 hover:bg-sky-300 text-slate-950 font-bold text-xs rounded-xl px-4 py-2 gap-2 shadow-[0_0_18px_rgba(56,189,248,0.3)] hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
              >
                <GitCompare className="h-4 w-4 stroke-[2.5]" />
                <span>Launch Comparator</span>
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigateTo("smart-docs", `/portal?tab=smart-docs`)}
                className="border-blue-700/60 hover:bg-blue-900/40 text-blue-200 text-xs rounded-xl px-4 py-2 gap-2 cursor-pointer"
              >
                <FolderLock className="h-4 w-4 text-sky-400" />
                <span>Upload to Vault First</span>
              </Button>
            )}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            MINI-APP 3: WAYPOINT VAULT — DOCUMENT VAULT & RECORDS (PG-023-VAULT)
           ══════════════════════════════════════════════════════════════════════ */}
        <div className="group relative rounded-3xl border border-blue-900/60 hover:border-indigo-400/60 bg-[#061830] transition-all duration-300 shadow-[0_12px_35px_rgba(0,0,0,0.35)] hover:shadow-[0_16px_45px_rgba(129,140,248,0.12)] flex flex-col justify-between overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-32 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none group-hover:bg-indigo-400/15 transition-all" />

          <div className="p-6 sm:p-7 space-y-5">
            {/* Top Bar: Brand Lockup + Page ID + Status */}
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xl sm:text-2xl font-serif text-white font-normal tracking-wide">
                    Waypoint
                  </span>
                  <span className="text-xl sm:text-2xl font-serif text-indigo-400 font-bold tracking-wide italic">
                    Vault
                  </span>
                  <PageIdBadge id="PG-023-VAULT" name="Document Vault" />
                </div>
                <WaypointWaveIcon className="w-9 h-2.5 text-indigo-400/90 -mt-0.5" />
                <p className="text-xs text-blue-200/80 font-medium pt-1">
                  Encrypted School Records &amp; Medical Evaluations Repository
                </p>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-semibold">
                <Shield className="w-3.5 h-3.5" />
                <span>AES-256 Encrypted</span>
              </div>
            </div>

            {/* Interactive Mini-App Viewport Display */}
            <div className="relative rounded-2xl bg-[#030F1E] border border-blue-800/60 p-4 overflow-hidden shadow-inner">
              <div className="flex items-center justify-between pb-3 border-b border-blue-900/50 text-[11px]">
                <div className="flex items-center gap-2 text-indigo-300 font-mono">
                  <FolderLock className="w-3.5 h-3.5 text-indigo-400" />
                  <span>VAULT CONSOLE: CLOUD RECORD REPOSITORY</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold">
                  FERPA SECURE
                </span>
              </div>

              {/* Encrypted Vault Folder Rack Preview */}
              <div className="my-3 space-y-1.5">
                <div className="flex items-center justify-between p-2 rounded-xl bg-blue-950/40 border border-blue-800/40 text-xs">
                  <div className="flex items-center gap-2 text-white/90">
                    <FileText className="w-4 h-4 text-indigo-400" />
                    <span className="font-semibold">IEPs, 504 Plans &amp; BIPs</span>
                  </div>
                  <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/40">
                    Active &amp; Prior Archive
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-blue-950/40 border border-blue-800/40 text-xs">
                  <div className="flex items-center gap-2 text-white/90">
                    <Layers className="w-4 h-4 text-indigo-400" />
                    <span className="font-semibold">Psych, Speech &amp; OT Evals</span>
                  </div>
                  <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/40">
                    Clinical Assessments
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-blue-950/40 border border-blue-800/40 text-xs">
                  <div className="flex items-center gap-2 text-white/90">
                    <Shield className="w-4 h-4 text-indigo-400" />
                    <span className="font-semibold">Prior Written Notices (PWN)</span>
                  </div>
                  <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/40">
                    Legal Notice Trail
                  </span>
                </div>
              </div>

              {/* Vault Security Strip */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-blue-900/40 text-[11px]">
                <div className="flex items-center gap-1.5 text-white/80">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>Instant PDF View</span>
                </div>
                <div className="flex items-center gap-1.5 text-white/80">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>Advocate Sync</span>
                </div>
                <div className="flex items-center gap-1.5 text-white/80">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>Role Protected</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-white/70 leading-relaxed">
              Permanent cloud locker for all of {studentName}'s educational and clinical history. Instantly accessible to both you and your advocate team with end-to-end access controls.
            </p>
          </div>

          {/* Action Launch Footer */}
          <div className="p-6 sm:p-7 pt-0 border-t border-blue-900/40 bg-[#041021]/50 flex items-center justify-between gap-3">
            <span className="text-[11px] text-blue-300/80 font-medium">
              Encrypted cloud storage &amp; file viewer
            </span>
            <Button
              size="sm"
              onClick={() => navigateTo("smart-docs", `/portal?tab=smart-docs`)}
              className="bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs rounded-xl px-4 py-2 gap-2 shadow-[0_0_18px_rgba(99,102,241,0.3)] hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
            >
              <FolderLock className="h-4 w-4 stroke-[2.5]" />
              <span>Open Document Vault</span>
            </Button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            MINI-APP 4: WAYPOINT BRIEFING — MEETING PREP CENTER (PG-023-PREP)
           ══════════════════════════════════════════════════════════════════════ */}
        <div className="group relative rounded-3xl border border-blue-900/60 hover:border-emerald-400/60 bg-[#061830] transition-all duration-300 shadow-[0_12px_35px_rgba(0,0,0,0.35)] hover:shadow-[0_16px_45px_rgba(52,211,153,0.12)] flex flex-col justify-between overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-32 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none group-hover:bg-emerald-400/15 transition-all" />

          <div className="p-6 sm:p-7 space-y-5">
            {/* Top Bar: Brand Lockup + Page ID + Status */}
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xl sm:text-2xl font-serif text-white font-normal tracking-wide">
                    Waypoint
                  </span>
                  <span className="text-xl sm:text-2xl font-serif text-emerald-400 font-bold tracking-wide italic">
                    Briefing
                  </span>
                  <PageIdBadge id="PG-023-PREP" name="Meeting Prep Center" />
                </div>
                <WaypointWaveIcon className="w-9 h-2.5 text-emerald-400/90 -mt-0.5" />
                <p className="text-xs text-blue-200/80 font-medium pt-1">
                  Parent Meeting Agendas, Rights Checklists &amp; Strategy
                </p>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Family Guide Ready</span>
              </div>
            </div>

            {/* Interactive Mini-App Viewport Display */}
            <div className="relative rounded-2xl bg-[#030F1E] border border-blue-800/60 p-4 overflow-hidden shadow-inner">
              <div className="flex items-center justify-between pb-3 border-b border-blue-900/50 text-[11px]">
                <div className="flex items-center gap-2 text-emerald-300 font-mono">
                  <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                  <span>BRIEFING CONSOLE: IEP CONFERENCE DOSSIER</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                  CONFIDENCE: 100%
                </span>
              </div>

              {/* Strategy Checklist Preview */}
              <div className="my-3 space-y-1.5">
                <div className="flex items-center justify-between p-2 rounded-xl bg-blue-950/40 border border-blue-800/40 text-xs">
                  <div className="flex items-center gap-2 text-white/90">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Parent Input Statement &amp; Vision</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                    Prepared
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-blue-950/40 border border-blue-800/40 text-xs">
                  <div className="flex items-center gap-2 text-white/90">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Key Questions for District Reps</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                    Scripted
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-blue-950/40 border border-blue-800/40 text-xs">
                  <div className="flex items-center gap-2 text-white/90">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Procedural Safeguards &amp; Consent Rules</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                    Reviewed
                  </span>
                </div>
              </div>

              {/* Briefing Checklist Strip */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-blue-900/40 text-[11px]">
                <div className="flex items-center gap-1.5 text-white/80">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Meeting Agenda</span>
                </div>
                <div className="flex items-center gap-1.5 text-white/80">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Advocate Notes</span>
                </div>
                <div className="flex items-center gap-1.5 text-white/80">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Rights Checklist</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-white/70 leading-relaxed">
              Step-by-step conference preparation guides, meeting agendas, and rights checklists so you enter school meetings organized, poised, and backed by expert advocacy strategy.
            </p>
          </div>

          {/* Action Launch Footer */}
          <div className="p-6 sm:p-7 pt-0 border-t border-blue-900/40 bg-[#041021]/50 flex items-center justify-between gap-3">
            <span className="text-[11px] text-blue-300/80 font-medium">
              Upcoming conferences &amp; strategy guides
            </span>
            <Button
              size="sm"
              onClick={() => navigateTo("appointments", `/portal?tab=appointments`)}
              className="bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs rounded-xl px-4 py-2 gap-2 shadow-[0_0_18px_rgba(52,211,153,0.3)] hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
            >
              <Calendar className="h-4 w-4 stroke-[2.5]" />
              <span>View Appointments &amp; Prep</span>
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
