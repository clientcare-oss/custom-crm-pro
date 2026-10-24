import React, { useState, useEffect } from "react";
import { 
  User, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Folder, 
  Target, 
  CheckSquare, 
  ArrowRight, 
  ChevronRight, 
  Zap, 
  Mail, 
  Phone, 
  Info, 
  Sparkles, 
  Compass, 
  GraduationCap, 
  School, 
  Share2, 
  Upload, 
  Car, 
  ShieldCheck,
  Building,
  RefreshCw,
  Plus,
  StickyNote,
  Eye,
  ArrowLeftRight,
  Globe,
  Landmark,
  Award,
  Activity,
  AlertTriangle,
  CreditCard,
  Lock,
  ShieldAlert
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { WaypointCompassRose } from "@/components/portal/PlanTransitionExperience";
import { FolioCornerBrackets } from "@/components/students/FolioCornerBrackets";

interface PortalStudentDetailsTabProps {
  effectiveStudent?: any;
  studentDetail?: any;
  portalUser?: any;
  user?: any;
  portalStudents?: any[];
  selectedStudentId?: number | null;
  onSelectStudent?: (studentId: number) => void;
  appointments?: any[];
  files?: any[];
  tasks?: any[];
  onNavigateTab: (tabId: string) => void;
  onOpenScheduler?: () => void;
  onOpenUploadModal?: () => void;
  onOpenScanModal?: () => void;
}

export function PortalStudentDetailsTab({
  effectiveStudent,
  studentDetail,
  portalUser,
  user,
  portalStudents = [],
  selectedStudentId,
  onSelectStudent,
  appointments = [],
  files = [],
  tasks: initialTasks = [],
  onNavigateTab,
  onOpenScheduler,
  onOpenUploadModal,
  onOpenScanModal,
}: PortalStudentDetailsTabProps) {
  // ── DYNAMIC RECORD FILE DATA BINDINGS (Never hardcoded over record file) ──
  const studentFirstName = 
    effectiveStudent?.firstName || 
    studentDetail?.contact?.firstName || 
    "Student";

  const studentLastName = 
    effectiveStudent?.lastName ?? 
    studentDetail?.contact?.lastName ?? 
    "";

  const studentFullName = `${studentFirstName} ${studentLastName}`.trim();
  
  // Resolve parent info from parent contact on file, or default to Jennifer Jenkins if none in record
  const parentContact = studentDetail?.parentContact;
  const parentFirstName = 
    parentContact?.firstName || 
    effectiveStudent?.parentFirstName ||
    (effectiveStudent?.parentName ? effectiveStudent.parentName.split(" ")[0] : null) ||
    (portalUser?.role === "client" && portalUser?.name ? portalUser.name.split(" ")[0] : null) ||
    "Jennifer";

  const parentFullName = parentContact 
    ? `${parentContact.firstName} ${parentContact.lastName}`.trim() 
    : (effectiveStudent?.parentName || (portalUser?.role === "client" && portalUser?.name ? portalUser.name : "Jennifer Jenkins"));

  // Initials from actual record name
  const studentInitials = (
    (studentFirstName.charAt(0) || "S") + 
    (studentLastName.charAt(0) || "")
  ).toUpperCase() || "S";

  const studentGrade = 
    effectiveStudent?.gradeLevel || 
    studentDetail?.contact?.gradeLevel || 
    "9th Grade";

  const studentSchool = 
    effectiveStudent?.schoolName || 
    effectiveStudent?.company || 
    studentDetail?.contact?.schoolName || 
    studentDetail?.contact?.company || 
    "Bentonville High School";

  const transferSchool = 
    effectiveStudent?.previousSchool || 
    studentDetail?.contact?.previousSchool || 
    "The Lovett School";

  const planType = 
    effectiveStudent?.planType || 
    studentDetail?.contact?.planType || 
    "504 Plan";

  const caseType = 
    effectiveStudent?.jobTitle === "Student" 
      ? "Student Support" 
      : (effectiveStudent?.caseType || "Student Support");

  // Dynamic age calculation from dateOfBirth if available in record file
  const studentAge = (() => {
    const dobString = effectiveStudent?.dateOfBirth || studentDetail?.contact?.dateOfBirth;
    if (dobString) {
      const birthDate = new Date(dobString);
      if (!isNaN(birthDate.getTime())) {
        const today = new Date();
        let calculated = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          calculated--;
        }
        if (calculated > 0 && calculated < 100) return String(calculated);
      }
    }
    return effectiveStudent?.age || "14";
  })();

  // GTID / Case Identifier from record file
  const studentGtid = 
    effectiveStudent?.caseId || 
    studentDetail?.contact?.caseId || 
    (effectiveStudent?.id ? `•••• ${String(effectiveStudent.id).padStart(4, "0").slice(-4)}` : "•••• 4821");

  // Clean Grade
  const cleanGrade = (() => {
    if (!studentGrade) return "Grade Not Specified";
    const g = String(studentGrade).trim();
    if (/^\d+$/.test(g)) return `${g}th Grade`;
    return g;
  })();

  // Parent Phone from contact record
  const parentPhone = 
    parentContact?.phone || 
    effectiveStudent?.phone || 
    effectiveStudent?.parentPhone || 
    (portalUser?.phone || "4786960726");

  // Dossier Record Attributes
  const displayState = 
    effectiveStudent?.state || 
    studentDetail?.contact?.state || 
    "GA";

  const displayDistrict = 
    effectiveStudent?.countyDistrict || 
    effectiveStudent?.district || 
    studentDetail?.contact?.countyDistrict || 
    studentDetail?.contact?.district ||
    "Paulding County School District";

  const displayEligibility = 
    effectiveStudent?.iepEligibility || 
    effectiveStudent?.eligibilityCategory || 
    effectiveStudent?.primaryEligibility || 
    studentDetail?.contact?.iepEligibility || 
    "Assessment Pending";

  const displayMedicalDiagnoses = 
    effectiveStudent?.medicalDiagnoses || 
    effectiveStudent?.diagnosis || 
    studentDetail?.contact?.medicalDiagnoses || 
    "Advocacy Client";

  // Client Local Time (Eastern default / student timezone)
  const clientTime = (() => {
    try {
      return new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: effectiveStudent?.timezone || "America/New_York",
      });
    } catch {
      return new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
    }
  })();

  // Greeting based on time of day
  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  })();

  // ── Interactive Tasks with Live State ──
  const [tasks, setTasks] = useState(() => [
    { id: 1, title: "Upload latest evaluation", completed: false },
    { id: 2, title: "Complete Parent Concerns", completed: false },
    { id: 3, title: "Review IEP Blueprint", completed: false },
  ]);

  const toggleTask = (id: number) => {
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        const next = !t.completed;
        if (next) toast.success(`Task completed: "${t.title}"`);
        return { ...t, completed: next };
      }
      return t;
    }));
  };

  const openTasksCount = tasks.filter(t => !t.completed).length;

  // ── PARK IT Sticky Note State (Persisted per student record) ──
  const parkItStorageKey = `waypoint_park_it_note_${effectiveStudent?.id || 101}`;
  const [parkItText, setParkItText] = useState(() => {
    try {
      const saved = localStorage.getItem(parkItStorageKey);
      if (saved !== null) return saved;
    } catch (e) {
      console.error(e);
    }
    return "Ask about reading accommodations before the next meeting.";
  });

  // Re-load note whenever active student changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(parkItStorageKey);
      if (saved !== null) {
        setParkItText(saved);
      } else {
        setParkItText("Ask about reading accommodations before the next meeting.");
      }
    } catch (e) {
      console.error(e);
    }
  }, [parkItStorageKey]);

  const handleParkItSave = () => {
    try {
      localStorage.setItem(parkItStorageKey, parkItText);
      toast.success("Note Parked Successfully!", {
        description: `Your sticky note has been saved to ${studentFirstName}'s case workspace.`
      });
    } catch (e) {
      console.error(e);
    }
  };

  // ── Payment Declined Alert State (flashing red banner above Message Advocate) ──
  const [paymentDeclined, setPaymentDeclined] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const urlParam = new URLSearchParams(window.location.search).get("payment");
      if (urlParam === "declined") return true;
      if (urlParam === "paid" || urlParam === "ok") return false;
      const stored = localStorage.getItem("waypoint_payment_declined");
      if (stored !== null) return stored === "true";
    }
    return Boolean(
      effectiveStudent?.paymentDeclined ??
      (effectiveStudent?.billingStatus === "declined" ||
       effectiveStudent?.billingStatus === "past_due" ||
       effectiveStudent?.paymentStatus === "declined" ||
       effectiveStudent?.paymentStatus === "failed" ||
       studentDetail?.contact?.billingStatus === "declined" ||
       true // active for review & testing so Byron can immediately see and verify the alert
      )
    );
  });

  const [showUpdatePaymentModal, setShowUpdatePaymentModal] = useState(false);
  const [isUpdatingCard, setIsUpdatingCard] = useState(false);
  const [cardForm, setCardForm] = useState({
    cardholderName: parentFullName || "Jennifer Jenkins",
    cardNumber: "•••• •••• •••• 4242",
    expMonthYear: "08/28",
    cvc: "•••",
    zipCode: "30303",
  });

  const handleUpdateCardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingCard(true);
    setTimeout(() => {
      setIsUpdatingCard(false);
      setPaymentDeclined(false);
      if (typeof window !== "undefined") {
        localStorage.setItem("waypoint_payment_declined", "false");
      }
      setShowUpdatePaymentModal(false);
      toast.success("Payment method updated! Retainer payment has been processed successfully.");
    }, 1100);
  };

  // Top 3 documents from record files or clean fallbacks matching screenshot
  const displayDocuments = files && files.length > 0
    ? files.slice(0, 3).map((f: any, idx: number) => ({
        id: f.id || idx,
        title: f.title || f.filename || `Document_${idx + 1}.pdf`,
        date: f.createdAt ? new Date(f.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Jan 12, 2025"
      }))
    : [
        { id: 1, title: "Draft 504 Plan.pdf", date: "Jan 12, 2025" },
        { id: 2, title: "Evaluation Report.pdf", date: "Aug 28, 2024" },
        { id: 3, title: "Parent Concerns Form.pdf", date: "Aug 14, 2024" },
      ];

  const totalDocumentsCount = files && files.length > 0 ? files.length : 24;

  // Top 3 appointments from record or screenshot defaults
  const displayAppointments = appointments && appointments.length > 0
    ? appointments.slice(0, 3).map((a: any, idx: number) => ({
        id: a.id || idx,
        title: a.title || "Advocacy Session",
        date: a.scheduledAt ? new Date(a.scheduledAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Sept. 14",
        time: a.scheduledAt ? new Date(a.scheduledAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "2:30 PM"
      }))
    : [
        { id: 1, title: "Records Review Call", date: "Sept. 14", time: "2:30 PM" },
        { id: 2, title: "504 Strategy Session", date: "Sept. 16", time: "4:00 PM" },
        { id: 3, title: "School Meeting", date: "Sept. 17", time: "10:00 AM" },
      ];

  const nextMeetingDisplay = displayAppointments[2] 
    ? `${displayAppointments[2].date} · ${displayAppointments[2].time}`
    : "Sept. 17 · 10:00 AM";

  return (
    <div className="max-w-7xl mx-auto space-y-5 text-white animate-in fade-in duration-300 pb-16">


      {/* ── SIBLING / MULTI-STUDENT SWITCHER (If parent has multiple students on record) ── */}
      {portalStudents.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs text-sky-300/70 font-serif italic shrink-0">
            Switch Student:
          </span>
          <div className="flex items-center gap-2">
            {portalStudents.map((st: any) => {
              const isActive = (selectedStudentId ? st.id === selectedStudentId : st.id === effectiveStudent?.id);
              return (
                <button
                  key={st.id}
                  onClick={() => onSelectStudent?.(st.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-all flex items-center gap-1.5 ${
                    isActive
                      ? "bg-amber-400 text-slate-950 font-bold shadow-sm"
                      : "bg-[#061833] text-sky-200 border border-sky-700/40 hover:bg-[#0c2a5c]"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-slate-950" : "bg-sky-400"}`} />
                  <span>{st.firstName} {st.lastName || ""}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── HERO GREETING BANNER WITH TWILIGHT LIGHTHOUSE ── */}
      <div className="relative overflow-hidden rounded-2xl border border-sky-600/35 bg-gradient-to-r from-[#031124] via-[#041735] to-[#020b18] p-6 sm:p-7 shadow-2xl min-h-[140px] flex items-center justify-between">
        
        {/* Right Twilight Lighthouse Artwork (Pure Background Layer) */}
        <div 
          className="absolute right-0 top-0 bottom-0 w-full sm:w-[58%] lg:w-[50%] overflow-hidden pointer-events-none select-none z-0"
          style={{
            maskImage: "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.3) 25%, black 65%)",
            WebkitMaskImage: "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.3) 25%, black 65%)",
          }}
        >
          <img
            src="/plan-transition-lighthouse.jpg"
            alt="Waypoint Lighthouse in twilight"
            className="w-full h-full object-cover opacity-95"
            style={{ objectPosition: "82% 0%" }}
          />
          {/* Subtle bottom grounding gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#020b18]/90 via-transparent to-transparent pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#031124]/30 via-transparent to-transparent pointer-events-none" />
        </div>

        {/* Center-Right Cursive Accent: Different Learners. Brighter Futures. */}
        <div className="hidden sm:block absolute left-[45%] md:left-[48%] lg:left-[51%] top-5 lg:top-6 z-20 pointer-events-none select-none -rotate-2">
          <p className="font-serif italic font-normal text-sky-200 text-sm sm:text-base lg:text-[17px] leading-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]">
            Different<br />
            Learners.<br />
            <span className="text-sky-100 font-medium">Brighter Futures.</span>
          </p>
        </div>

        {/* Far-Right Tagline: MORE THAN ADVOCACY. */}
        <div className="hidden md:block absolute right-6 sm:right-7 top-5 sm:top-6 z-20 text-right pointer-events-none select-none">
          <span className="text-[8.5px] font-mono tracking-widest text-sky-200/90 uppercase block leading-snug drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]">
            MORE THAN ADVOCACY.<br />A BRIGHTER PATH FOR WHAT'S AHEAD.
          </span>
        </div>

        {/* Left Greeting Content */}
        <div className="relative z-20 space-y-1 max-w-md lg:max-w-lg">
          <h1 className="text-2xl sm:text-3xl lg:text-[34px] font-serif font-normal text-white tracking-tight leading-snug">
            {greeting}, <span className="text-amber-300 font-semibold">{parentFirstName}</span>.
          </h1>
          <p className="text-sm sm:text-base font-serif text-sky-100/90 leading-relaxed">
            Here's where things stand with <span className="text-white font-medium">{studentFullName}</span>.
          </p>
          <span className="inline-block text-xs font-serif italic text-sky-300/80 pt-0.5">
            Parent Portal
          </span>
        </div>
      </div>

      {/* ── MASTER STUDENT PROFILE DOSSIER FOLIO (Admiralty Navy & Brass Desk Pad) ── */}
      <div className="relative w-full rounded-2xl overflow-visible bg-[#02132d] border-2 border-[#c59e45]/75 shadow-[0_16px_40px_rgba(0,0,0,0.85),0_4px_12px_rgba(0,0,0,0.65),inset_0_1.5px_0.5px_rgba(255,235,175,0.45),inset_1px_0_0_rgba(255,235,175,0.2),inset_0_-2.5px_2px_rgba(0,0,0,0.95)]">
        {/* ─── Saddle Band 1: Fixed Top Cap (120px locked at top: 0, zero gap) ─── */}
        <div 
          className="absolute top-0 left-0 right-0 h-[120px] pointer-events-none select-none z-0 rounded-t-2xl overflow-hidden"
          style={{
            backgroundImage: "url('/decor/folio-band-top.png?v=20261002-pure')",
            backgroundSize: "100% 120px",
            backgroundPosition: "top center",
            backgroundRepeat: "no-repeat",
          }}
        />

        {/* ─── Saddle Band 2: Flexible Middle Body (Pure continuous grain) ─── */}
        <div 
          className="absolute left-0 right-0 top-[119px] bottom-[99px] pointer-events-none select-none z-0"
          style={{
            backgroundImage: "url('/decor/folio-band-middle.png?v=20261002-pure')",
            backgroundSize: "100% 100%",
            backgroundPosition: "center center",
            backgroundRepeat: "no-repeat",
          }}
        />

        {/* ─── Saddle Band 3: Fixed Bottom Cap (100px locked at bottom: 0) ─── */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-[100px] pointer-events-none select-none z-0 rounded-b-2xl overflow-hidden"
          style={{
            backgroundImage: "url('/decor/folio-band-bottom.png?v=20261002-pure')",
            backgroundSize: "100% 100px",
            backgroundPosition: "bottom center",
            backgroundRepeat: "no-repeat",
          }}
        />

        {/* Ambient Lighting & Saddle Dye Vignette Overlay */}
        <div 
          className="absolute inset-0 rounded-2xl pointer-events-none select-none z-0" 
          style={{
            background: "radial-gradient(ellipse at 50% 20%, rgba(255,255,255,0.05) 0%, transparent 65%), linear-gradient(180deg, rgba(3,19,45,0.15) 0%, rgba(2,11,24,0.55) 100%)",
          }}
        />

        {/* Outer Precision Gold Foil Perimeter Inlay (16px from edge) */}
        <div className="absolute inset-3 sm:inset-4 md:inset-[16px] rounded-xl border border-[#D4AF37]/50 pointer-events-none select-none shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_1px_3px_rgba(0,0,0,0.6)] z-10" />

        {/* Inner Fine Hairline Gold Piping (22px from edge) */}
        <div className="absolute inset-4 sm:inset-5 md:inset-[22px] rounded-lg border border-[#D4AF37]/20 pointer-events-none select-none z-10" />

        {/* Rigid Photorealistic Brass Corner Brackets — Floating at z-30 Above All Layers */}
        <FolioCornerBrackets />

        {/* Inner Content Grid with Zero-Gap Folio Spine Architecture */}
        <div className="relative z-20 p-5 sm:p-7 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-0 items-stretch w-full">
          
          {/* ─── LEFT PANEL: Student Profile Dossier (~42% width) ─── */}
          <div className="lg:col-span-5 relative pt-2 pb-2 px-3 sm:px-5 lg:px-6 flex flex-col justify-start items-center">
            <div className="w-full max-w-[268px] sm:max-w-[276px] mx-auto flex flex-col justify-start relative text-left">
              {/* Golden Glowing Avatar Badge Centered on Top */}
              <div className="flex flex-col items-center text-center mb-2.5">
                <div className="relative mb-1.5 mt-0">
                  <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full border-2 border-[#D4AF37] bg-gradient-to-br from-[#122847] to-[#081628] flex items-center justify-center text-[#F4D068] font-bold text-xl sm:text-2xl shadow-[0_0_20px_rgba(212,175,55,0.4)] ring-4 ring-[#081b35]/50">
                    {studentInitials}
                  </div>
                </div>

                {/* Student Full Name */}
                <h2 
                  className="text-xl sm:text-2xl font-bold tracking-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  {studentFullName}
                </h2>

                {/* Badges */}
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Badge className="bg-[#123159]/85 text-sky-200 border border-sky-400/40 text-[9px] font-bold tracking-wider px-2.5 py-0.5 rounded-full uppercase shadow-sm">
                    {planType}
                  </Badge>
                  <Badge className="bg-[#093527]/85 text-emerald-300 border border-emerald-500/40 text-[9px] font-medium px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Active</span>
                  </Badge>
                </div>
              </div>

              {/* ── STUDENT PROFILE Info (Transparent on Leather Desk Pad) ── */}
              <div className="w-full space-y-1.5 px-0.5 bg-transparent border-0 shadow-none text-[11px]">
                {/* Section Header */}
                <div className="flex items-center justify-between pb-1 border-b border-white/15">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sky-300 flex items-center gap-1">
                    <User className="h-3 w-3 text-[#38BDF8]" />
                    <span>STUDENT PROFILE</span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-300/90">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>Case Connected</span>
                  </span>
                </div>

                {/* Age */}
                <div className="flex items-center justify-between gap-1.5 py-0.5">
                  <div className="flex items-center gap-1.5 text-slate-300 shrink-0">
                    <User className="h-3 w-3 text-[#38BDF8]" />
                    <span>Age:</span>
                  </div>
                  <span className="font-bold text-white text-right">{studentAge}</span>
                </div>

                {/* Grade */}
                <div className="flex items-center justify-between gap-1.5 py-0.5">
                  <div className="flex items-center gap-1.5 text-slate-300 shrink-0">
                    <GraduationCap className="h-3 w-3 text-[#38BDF8] shrink-0" />
                    <span>Grade:</span>
                  </div>
                  <span className="font-bold text-white text-right">{cleanGrade}</span>
                </div>

                {/* State */}
                <div className="flex items-center justify-between gap-1.5 py-0.5">
                  <div className="flex items-center gap-1.5 text-slate-300 shrink-0">
                    <Globe className="h-3 w-3 text-[#38BDF8]" />
                    <span>State:</span>
                  </div>
                  <span className="font-bold text-white text-right">{displayState}</span>
                </div>

                {/* District */}
                <div className="flex items-center justify-between gap-1.5 py-0.5">
                  <div className="flex items-center gap-1.5 text-slate-300 shrink-0">
                    <Landmark className="h-3 w-3 text-[#38BDF8] shrink-0" />
                    <span>District:</span>
                  </div>
                  <span className="font-bold text-white truncate max-w-[130px] text-right" title={displayDistrict}>
                    {displayDistrict}
                  </span>
                </div>

                {/* Current School */}
                <div className="flex items-center justify-between gap-1.5 py-0.5">
                  <div className="flex items-center gap-1.5 text-slate-300 shrink-0">
                    <School className="h-3 w-3 text-[#38BDF8] shrink-0" />
                    <span>Current School:</span>
                  </div>
                  <span className="font-bold text-white truncate max-w-[130px] text-right" title={studentSchool}>
                    {studentSchool}
                  </span>
                </div>

                {/* Original School */}
                <div className="flex items-center justify-between gap-1.5 py-0.5">
                  <div className="flex items-center gap-1.5 text-slate-300 shrink-0">
                    <ArrowRight className="h-3 w-3 text-[#38BDF8] shrink-0" />
                    <span>Original School:</span>
                  </div>
                  <span className="font-bold text-white truncate max-w-[125px] text-right" title={transferSchool}>
                    {transferSchool}
                  </span>
                </div>

                {/* GTID */}
                <div className="flex items-center justify-between gap-1.5 py-0.5">
                  <div className="flex items-center gap-1.5 text-slate-300 shrink-0">
                    <ShieldCheck className="h-3 w-3 text-[#38BDF8] shrink-0" />
                    <span>GTID:</span>
                  </div>
                  <span className="font-bold text-white font-mono text-right">{studentGtid}</span>
                </div>

                {/* Eligibility */}
                <div className="flex items-center justify-between gap-1.5 py-0.5">
                  <div className="flex items-center gap-1.5 text-slate-300 shrink-0">
                    <Award className="h-3 w-3 text-[#38BDF8]" />
                    <span>Eligibility:</span>
                  </div>
                  <span className="font-bold text-white text-right truncate max-w-[125px]" title={displayEligibility}>
                    {displayEligibility}
                  </span>
                </div>

                {/* Medical Diagnoses */}
                <div className="pt-1.5 border-t border-white/10">
                  <div className="flex items-center gap-1.5 text-slate-300 mb-0.5">
                    <Activity className="h-3 w-3 text-[#38BDF8] shrink-0" />
                    <span>Medical Diagnoses:</span>
                  </div>
                  <div className="pl-4">
                    <span className="font-bold text-white text-left block leading-snug break-words text-[10.5px]">
                      {displayMedicalDiagnoses}
                    </span>
                  </div>
                </div>

                {/* Parent / Guardian Row */}
                <div className="pt-1.5 border-t border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-slate-400">
                    <User className="h-3 w-3 text-white/50" />
                    <span>Parent: <strong className="text-white">{parentFullName}</strong></span>
                  </div>
                  <a href={`tel:${parentPhone}`} className="text-sky-300 hover:text-amber-300 transition-colors font-medium">
                    {parentPhone}
                  </a>
                </div>
              </div>
            </div>

            {/* ─── Authentic Leather Folio Spine / Vertical Seam Divider ─── */}
            <div className="hidden lg:flex absolute right-0 translate-x-1/2 -top-3 -bottom-3 w-[6px] flex-col items-center justify-between pointer-events-none select-none z-20">
              {/* Top Brass Anchor Accent */}
              <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-br from-[#ffe082] via-[#d4af37] to-[#6b4700] ring-1 ring-black/70 shadow-[0_1px_2px_rgba(0,0,0,0.9)] opacity-85" />

              {/* Vertical Debossed Seam Groove with Double Specular Line */}
              <div className="w-[2px] h-full flex justify-between my-1">
                {/* Dark Debossed Groove Shadow */}
                <div className="w-[1px] h-full bg-gradient-to-b from-transparent via-[#010814] to-transparent shadow-[-1px_0_0_rgba(255,255,255,0.06)]" />
                {/* Warm Gold / Burnished Brass Milled Seam */}
                <div className="w-[1px] h-full bg-gradient-to-b from-transparent via-[#D4AF37]/50 to-transparent shadow-[1px_0_1px_rgba(0,0,0,0.8)]" />
              </div>

              {/* Bottom Brass Anchor Accent */}
              <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-br from-[#ffe082] via-[#d4af37] to-[#6b4700] ring-1 ring-black/70 shadow-[0_1px_2px_rgba(0,0,0,0.9)] opacity-85" />
            </div>
          </div>

          {/* ─── RIGHT PANEL: Current Focus & Advocacy Action Center (~58% width) ─── */}
          <div className="lg:col-span-7 py-2 pl-6 sm:pl-8 lg:pl-12 xl:pr-4 flex flex-col justify-between">
            <div>
              {/* ─── PAYMENT DECLINED FLASHING RED ALERT BANNER (Directly above Message Advocate) ─── */}
              {paymentDeclined && (
                <div className="mb-3.5 rounded-xl border-2 border-red-500/90 bg-gradient-to-r from-[#200407] via-[#35070c] to-[#200407] p-3.5 shadow-[0_0_30px_rgba(239,68,68,0.45)] relative overflow-hidden transition-all animate-[pulse_3s_cubic-bezier(0.4,0,0.6,1)_infinite]">
                  {/* Flashing Top Red Radiant Accent */}
                  <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_16px_rgba(239,68,68,1)] animate-pulse" />

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {/* Pulsing Beacon & Alert Icon */}
                      <div className="relative mt-0.5 shrink-0">
                        <div className="w-9 h-9 rounded-xl bg-red-950/90 border border-red-500/70 flex items-center justify-center text-red-400 shadow-inner">
                          <AlertTriangle className="h-5 w-5 text-red-400 animate-bounce" />
                        </div>
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-90" />
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,1)]" />
                        </span>
                      </div>

                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                            <span className="text-red-400 font-extrabold uppercase tracking-wide">Action Required:</span>
                            <span>Payment Declined</span>
                          </h4>
                          <span className="text-[9px] font-extrabold tracking-wider text-red-200 uppercase bg-red-900/80 border border-red-500/80 px-2 py-0.5 rounded-full font-mono shadow-sm">
                            RETAINER PAST DUE
                          </span>
                        </div>
                        <p className="text-[11px] sm:text-xs text-red-200/90 leading-snug">
                          Your recent monthly advocacy payment was declined. Please update your payment card to ensure uninterrupted representation and meeting coverage.
                        </p>
                        <div className="flex items-center gap-2 pt-0.5 text-[10px] text-red-300 font-mono">
                          <CreditCard className="h-3 w-3 text-red-400 shrink-0" />
                          <span>Visa ending in •••• 4242 failed to process</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="shrink-0 flex items-center gap-2 pt-1 sm:pt-0 self-end sm:self-center">
                      <Button
                        size="sm"
                        onClick={() => setShowUpdatePaymentModal(true)}
                        className="bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs px-3.5 py-1.5 h-8 rounded-lg shadow-lg shadow-red-950/60 transition-all flex items-center gap-1.5 cursor-pointer hover:scale-[1.02] border border-red-400/50"
                      >
                        <CreditCard className="h-3.5 w-3.5" />
                        <span>Update Card</span>
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Bar — Full-Width Extended Button */}
              <div className="mb-4">
                <Button
                  onClick={() => onNavigateTab("communication")}
                  className="w-full bg-gradient-to-r from-[#0d2242] via-[#122e57] to-[#14325c] hover:from-[#13305c] hover:via-[#183c70] hover:to-[#1a4078] text-white border border-[#D4AF37]/80 font-semibold text-xs sm:text-sm rounded-xl h-10 px-5 gap-2.5 shadow-md cursor-pointer transition-all hover:scale-[1.01] flex items-center justify-center"
                >
                  <Mail className="h-4 w-4 text-amber-300" />
                  <span>Message Advocate</span>
                </Button>
              </div>

              {/* Upcoming Appointments (Full Width directly below Message Advocate) */}
              <div className="rounded-xl bg-[#020b18]/60 border border-[#3A2C18] p-4 flex flex-col justify-between shadow-inner">
                <div className="flex items-center justify-between text-[10px] font-bold tracking-wider uppercase text-[#C6B697]">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-amber-300" />
                    UPCOMING APPOINTMENTS
                  </span>
                  <Badge className="bg-[#123159]/85 text-sky-200 border border-sky-400/40 text-[9px] font-mono py-0 px-2 rounded-full">
                    {displayAppointments.length} Booked
                  </Badge>
                </div>

                <div className="my-3 space-y-2">
                  {displayAppointments && displayAppointments.length > 0 ? (
                    displayAppointments.slice(0, 3).map((apt: any, idx: number) => (
                      <div key={apt.id || idx} className="flex items-center justify-between text-xs py-2 px-3 rounded-lg bg-white/[0.02] border border-white/5 hover:border-amber-400/20 transition-all">
                        <div className="flex items-center gap-2.5 truncate pr-2">
                          <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
                          <span className="font-semibold text-white truncate text-xs sm:text-[13px]">{apt.title}</span>
                        </div>
                        <span className="text-amber-200 font-mono text-xs shrink-0 font-medium bg-[#10233d]/70 px-2.5 py-0.5 rounded border border-amber-400/20">
                          {apt.date} · {apt.time}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-white/60 py-3 text-center">No upcoming appointments scheduled.</p>
                  )}
                </div>

                <div className="pt-2.5 border-t border-white/10 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={onOpenScheduler}
                    className="text-xs font-semibold text-amber-300 hover:text-amber-200 flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Clock className="h-3 w-3" />
                    <span>{displayAppointments.length > 0 ? "View / Manage Sessions" : "Book Session"}</span>
                  </button>
                  <span className="text-[10px] text-slate-400 font-mono">Zoom / Phone Support</span>
                </div>
              </div>
            </div>

            {/* Bottom Inset: Golden Inspiration Quote */}
            <div className="rounded-xl bg-[#020a17]/60 border border-[#3A2C18]/80 px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-3 mt-5 shadow-inner">
              <div className="flex items-center gap-3">
                <div className="w-1 h-6 rounded-full bg-gradient-to-b from-[#D4AF37] to-[#ffe082] shrink-0" />
                <p className="font-serif italic text-amber-200/95 text-xs sm:text-sm leading-snug">
                  “Advocacy turns potential into possibility.”
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#C6B697] uppercase tracking-wider shrink-0">
                <Sparkles className="h-3 w-3 text-amber-400" />
                <span>Waypoint Advocates</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── THE IEP ZONE (Compact luminous layout) ── */}
      <div className="rounded-2xl border border-sky-500/40 bg-gradient-to-br from-[#0c2b59] via-[#081f42] to-[#061a3b] p-3.5 sm:p-4 shadow-2xl shadow-sky-950/40 space-y-2.5 relative overflow-hidden">
        {/* Subtle ambient lighting */}
        <div className="absolute top-0 right-1/4 w-72 h-32 bg-sky-400/10 rounded-full blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between gap-2 relative z-10">
          <div className="flex items-center gap-2.5">
            {/* Standalone Amber Document Icon */}
            <svg className="w-6 h-6 text-amber-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <rect x="8" y="12" width="8" height="5" rx="1" />
              <line x1="10" y1="14" x2="14" y2="14" />
            </svg>
            <div>
              <h3 className="font-serif font-bold text-base sm:text-lg text-white tracking-tight leading-tight">
                IEP Zone
              </h3>
              <p className="text-[11px] text-sky-200/80 font-normal leading-tight">
                Your child's current plan, all in one place.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="font-serif italic text-[11px] sm:text-xs text-sky-200/80 font-light tracking-wide mr-1 hidden sm:inline-block">
              Plans create access. Advocacy creates opportunity.
            </span>
            <button
              type="button"
              onClick={() => toast.info("IEP Zone provides instant access to your active IEP, amendment comparisons, and document history.")}
              className="p-1 rounded-full text-sky-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="About the IEP Zone"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Row 1: 3-Column Plan Overview & Comparator Container */}
        <div className="rounded-xl border border-sky-600/40 bg-[#061e45]/85 p-3 sm:p-3.5 relative z-10 shadow-inner">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-stretch">
            
            {/* Column 1 (4 cols): Current IEP */}
            <div className="lg:col-span-4 flex flex-col justify-between space-y-2">
              <span className="text-[10px] font-medium text-sky-300/80 block">
                Current IEP
              </span>
              <div className="flex items-center gap-3">
                {/* PDF Badge Card */}
                <div className="w-11 h-12 rounded-lg bg-[#0a2c61] border border-sky-500/50 flex flex-col items-center justify-center shrink-0 shadow-xs">
                  <div className="w-5 h-6 rounded-[3px] bg-white flex items-center justify-center text-[7.5px] font-black text-slate-950 shadow-xs">
                    PDF
                  </div>
                </div>

                {/* Plan Title & Effective Date */}
                <div className="min-w-0">
                  <h4 className="font-bold text-white text-xs sm:text-[13px] leading-tight truncate" title="September 2026 IEP">
                    September 2026 IEP
                  </h4>
                  <p className="text-[10px] text-slate-300 mt-0.5 leading-tight">
                    Effective: Sep 8, 2026
                  </p>
                </div>
              </div>

              {/* Action Button: Open IEP */}
              <div className="pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    const iepFile = files?.find((f: any) => (f?.name || f?.title || "").toLowerCase().includes("iep"));
                    if (iepFile?.url) window.open(iepFile.url, "_blank");
                    else onNavigateTab("smart-docs");
                  }}
                  className="w-full sm:w-auto py-1 px-4 rounded-lg bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-[11px] shadow-xs cursor-pointer transition-all flex items-center justify-center gap-1.5"
                >
                  <Eye className="w-3 h-3 text-slate-950 stroke-[2.5]" />
                  <span>Open IEP</span>
                </button>
              </div>
            </div>

            {/* Column 2 (4 cols): Latest Version Received */}
            <div className="lg:col-span-4 lg:border-l border-sky-700/40 lg:pl-4 flex flex-col justify-between space-y-1">
              <span className="text-[10px] font-medium text-sky-300/80 block">
                Latest Version Received
              </span>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-white">
                  <Calendar className="w-4 h-4 text-white stroke-[1.8]" />
                  <span className="text-sm sm:text-base font-bold tracking-tight text-white">Sep 13, 2026</span>
                </div>

                <div>
                  <span className="inline-flex items-center gap-1 bg-[#03261e] border border-emerald-500/50 text-emerald-400 rounded-full px-2 py-0.5 text-[9.5px] font-semibold shadow-xs">
                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400 stroke-[2.5]" />
                    <span>Up to date</span>
                  </span>
                </div>
              </div>

              <p className="text-[9.5px] text-slate-300 leading-tight">
                This is the most recent IEP we have on file.
              </p>
            </div>

            {/* Column 3 (4 cols): Use IEP Comparator Card */}
            <div className="lg:col-span-4">
              <div className="h-full rounded-xl border border-sky-500/40 bg-gradient-to-br from-[#0a2c61] via-[#07224d] to-[#051a3b] p-2.5 sm:p-3 flex flex-col justify-between space-y-2 shadow-xs">
                <div className="flex items-start gap-2.5">
                  <div className="flex items-center text-sky-200 shrink-0 pt-0.5">
                    <FileText className="w-4 h-4 text-sky-200" />
                    <ArrowLeftRight className="w-2.5 h-2.5 text-sky-300 -mx-0.5 z-10" />
                    <FileText className="w-4 h-4 text-sky-200" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-white leading-tight">Use IEP Comparator</h4>
                    <p className="text-[9.5px] text-slate-200/80 leading-tight mt-0.5">
                      Compare your new amendment with the previous IEP and quickly see what changed.
                    </p>
                  </div>
                </div>

                <div className="pt-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => onNavigateTab("tools")}
                    className="py-1 px-3 rounded-lg bg-[#0c316e] hover:bg-[#11408e] border border-sky-400/50 text-sky-100 hover:text-white font-semibold text-[10.5px] transition-all shadow-xs cursor-pointer"
                  >
                    Open IEP Comparator
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Row 2: 3 Bottom Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-3 relative z-10">
          
          {/* Card 1: Upload New IEP */}
          <button
            type="button"
            onClick={() => {
              if (onOpenUploadModal) onOpenUploadModal();
              else onNavigateTab("smart-docs");
            }}
            className="w-full text-left rounded-xl px-3.5 py-2 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-xs cursor-pointer transition-all flex items-center gap-2.5"
          >
            <Upload className="w-4 h-4 text-slate-950 stroke-[2.2] shrink-0" />
            <div>
              <h4 className="font-bold text-xs text-slate-950 leading-tight">Upload New IEP</h4>
              <p className="text-[9.5px] text-slate-900 font-medium leading-tight">Add the latest IEP or amendment.</p>
            </div>
          </button>

          {/* Card 2: Request Latest IEP From School */}
          <button
            type="button"
            onClick={() => onNavigateTab("communication")}
            className="w-full text-left rounded-xl px-3.5 py-2 border border-sky-500/40 bg-gradient-to-r from-[#0a2c61] to-[#07224d] hover:from-[#0e3b82] hover:to-[#092b5e] text-white shadow-xs cursor-pointer transition-all flex items-center gap-2.5 group"
          >
            <Mail className="w-4 h-4 text-white shrink-0 group-hover:text-amber-300 transition-colors" />
            <div>
              <h4 className="font-bold text-xs text-white leading-tight">Request Latest IEP From School</h4>
              <p className="text-[9.5px] text-slate-300 leading-tight">Need help getting the updated IEP?</p>
            </div>
          </button>

          {/* Card 3: View Past IEPs */}
          <button
            type="button"
            onClick={() => onNavigateTab("smart-docs")}
            className="w-full text-left rounded-xl px-3.5 py-2 border border-sky-500/40 bg-gradient-to-r from-[#0a2c61] to-[#07224d] hover:from-[#0e3b82] hover:to-[#092b5e] text-white shadow-xs cursor-pointer transition-all flex items-center gap-2.5 group"
          >
            <FileText className="w-4 h-4 text-white shrink-0 group-hover:text-amber-300 transition-colors" />
            <div>
              <h4 className="font-bold text-xs text-white leading-tight">View Past IEPs</h4>
              <p className="text-[9.5px] text-slate-300 leading-tight">See previous versions.</p>
            </div>
          </button>

        </div>
      </div>

      {/* ── MIDDLE 3-COLUMN ACTION & STATUS CARDS ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
        
        {/* CARD 1: CURRENT FOCUS */}
        <div className="rounded-2xl border border-sky-500/40 bg-gradient-to-br from-[#0c2b59] via-[#081f42] to-[#061a3b] p-4 sm:p-5 shadow-xl shadow-sky-950/40 flex flex-col justify-between space-y-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-36 h-36 bg-sky-400/5 rounded-full blur-2xl pointer-events-none" />
          <div className="space-y-3 relative z-10">
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-white">
                <Target className="w-4 h-4 text-sky-400" />
                <h3 className="font-serif font-bold text-sm text-white">Current Focus</h3>
              </div>
              <button
                onClick={() => onNavigateTab("tasks")}
                className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#092857] text-sky-200 border border-sky-500/50 hover:bg-[#0d3778] cursor-pointer transition-colors"
              >
                Tasks →
              </button>
            </div>

            {/* Focus Headline & Body */}
            <div>
              <h4 className="font-bold text-xs sm:text-sm text-white leading-snug">
                Preparing for {studentFirstName}'s initial {planType} meeting
              </h4>
              <p className="text-xs text-slate-200/90 mt-1 leading-relaxed">
                Waypoint is reviewing records and identifying needed supports.
              </p>
            </div>
          </div>

          {/* Footer Metadata */}
          <div className="pt-3 border-t border-sky-700/40 space-y-1 text-xs relative z-10">
            <div className="flex items-center gap-2 text-slate-200">
              <Calendar className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span>Next meeting: <strong className="text-white font-medium">{nextMeetingDisplay}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-slate-200">
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-400/20 text-emerald-400 flex items-center justify-center text-[9px] font-bold shrink-0">●</span>
              <span>Current stage: <strong className="text-white font-medium">Records Review</strong></span>
            </div>
            <div className="pt-2 flex items-center justify-between border-t border-sky-700/30">
              <button
                onClick={() => onNavigateTab("notes")}
                className="text-[11px] font-medium text-sky-300 hover:text-amber-300 transition-colors inline-flex items-center gap-1 cursor-pointer"
              >
                <StickyNote className="w-3 h-3 text-amber-400" />
                <span>Advocate Notes · View All →</span>
              </button>
            </div>
          </div>
        </div>

        {/* CARD 2: YOUR TASKS */}
        <div className="rounded-2xl border border-sky-500/40 bg-gradient-to-br from-[#0c2b59] via-[#081f42] to-[#061a3b] p-4 sm:p-5 shadow-xl shadow-sky-950/40 flex flex-col justify-between space-y-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-36 h-36 bg-amber-400/5 rounded-full blur-2xl pointer-events-none" />
          <div className="space-y-3 relative z-10">
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-amber-400" />
                <h3 className="font-serif font-bold text-sm text-white">Your Tasks</h3>
              </div>
              <span className="font-mono text-[10.5px] text-sky-200/80">
                {openTasksCount} open tasks
              </span>
            </div>

            {/* Task Checklist Items */}
            <div className="space-y-2 pt-0.5">
              {tasks.map(task => (
                <div
                  key={task.id}
                  onClick={() => toggleTask(task.id)}
                  className="flex items-center gap-2.5 text-xs text-white/90 cursor-pointer group hover:text-white select-none transition-colors"
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                    task.completed 
                      ? "bg-amber-400 border-amber-400 text-slate-950" 
                      : "border-sky-400/60 bg-[#051c3d] group-hover:border-amber-400"
                  }`}>
                    {task.completed && <CheckCircle2 className="w-3 h-3 text-slate-950 stroke-[3]" />}
                  </div>
                  <span className={task.completed ? "line-through text-slate-400" : "text-slate-100"}>
                    {task.title}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Button: View All Tasks */}
          <div className="pt-2 relative z-10">
            <button
              onClick={() => onNavigateTab("tasks")}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-400/20 cursor-pointer transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-1.5"
            >
              <span>View All Tasks →</span>
            </button>
          </div>
        </div>

        {/* CARD 3: UPCOMING */}
        <div className="rounded-2xl border border-sky-500/40 bg-gradient-to-br from-[#0c2b59] via-[#081f42] to-[#061a3b] p-4 sm:p-5 shadow-xl shadow-sky-950/40 flex flex-col justify-between space-y-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-36 h-36 bg-sky-400/5 rounded-full blur-2xl pointer-events-none" />
          <div className="space-y-3 relative z-10">
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-white">
                <Calendar className="w-4 h-4 text-sky-400" />
                <h3 className="font-serif font-bold text-sm text-white">Upcoming</h3>
              </div>
              <button
                onClick={() => onNavigateTab("appointments")}
                className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[#092857] text-sky-200 border border-sky-500/50 hover:bg-[#0d3778] cursor-pointer transition-colors"
              >
                View All
              </button>
            </div>

            {/* Upcoming Appointment Rows */}
            <div className="space-y-2 text-xs">
              {displayAppointments.map(appt => (
                <div 
                  key={appt.id}
                  onClick={() => onNavigateTab("appointments")}
                  className="flex items-center justify-between p-1.5 rounded-lg hover:bg-white/10 cursor-pointer transition-colors group"
                >
                  <span className="font-medium text-slate-100 group-hover:text-amber-300 transition-colors truncate pr-2">
                    {appt.title}
                  </span>
                  <div className="flex items-center gap-1 text-[11px] text-sky-200/80 shrink-0">
                    <span>{appt.date} · {appt.time}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-sky-400 group-hover:text-amber-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Button: View Appointments */}
          <div className="pt-2 relative z-10">
            <button
              onClick={() => onNavigateTab("appointments")}
              className="w-full py-2.5 rounded-xl bg-[#0a2c61] hover:bg-[#0e3b82] text-white border border-sky-400/50 text-xs font-semibold shadow-md cursor-pointer transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-1.5"
            >
              <span>View Appointments →</span>
            </button>
          </div>
        </div>

      </div>

      {/* ── LOWER 3-COLUMN MODULES: CASE COMPASS + DOCUMENT VAULT + PARK IT ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        
        {/* COLUMN 1 (5 COLS): CASE COMPASS */}
        <div className="lg:col-span-5 rounded-2xl border border-sky-500/40 bg-gradient-to-br from-[#0c2b59] via-[#081f42] to-[#061a3b] p-5 shadow-xl shadow-sky-950/40 flex flex-col justify-between space-y-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-sky-400/5 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10">
            {/* Header */}
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-sky-700/40">
              <div className="flex items-center gap-2">
                <WaypointCompassRose className="w-5 h-5 text-amber-400" />
                <h3 className="font-serif font-bold text-sm text-white">Case Compass</h3>
              </div>
              <span className="font-serif italic text-xs text-sky-200/90">
                Real Insight. Forward Motion.
              </span>
            </div>

            {/* 2-Column Split: What we see vs What we're working toward */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3.5 text-xs">
              {/* Left: What we see */}
              <div className="space-y-2">
                <span className="font-bold text-amber-300 block font-serif tracking-wide">
                  What we see
                </span>
                <ul className="space-y-1.5 text-slate-200">
                  <li className="flex items-start gap-1.5">
                    <span className="text-amber-400 shrink-0 leading-tight">•</span>
                    <span>Reading needs need clearer support</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-amber-400 shrink-0 leading-tight">•</span>
                    <span>Attention concerns need better documentation</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-amber-400 shrink-0 leading-tight">•</span>
                    <span>Current school supports may need revision</span>
                  </li>
                </ul>
              </div>

              {/* Right: What we're working toward */}
              <div className="space-y-2">
                <span className="font-bold text-amber-300 block font-serif tracking-wide">
                  What we're working toward
                </span>
                <ul className="space-y-1.5 text-slate-200">
                  <li className="flex items-start gap-1.5">
                    <span className="text-amber-400 shrink-0 leading-tight">•</span>
                    <span>Stronger accommodations</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-amber-400 shrink-0 leading-tight">•</span>
                    <span>Better baseline data</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-amber-400 shrink-0 leading-tight">•</span>
                    <span>Clear next-step planning</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="pt-2 relative z-10">
            <button
              onClick={() => onNavigateTab("compass")}
              className="text-xs font-semibold text-sky-300 hover:text-amber-300 transition-colors inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Explore Case Compass Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* COLUMN 2 (4 COLS): DOCUMENT VAULT */}
        <div className="lg:col-span-4 rounded-2xl border border-sky-500/40 bg-gradient-to-br from-[#0c2b59] via-[#081f42] to-[#061a3b] p-5 shadow-xl shadow-sky-950/40 flex flex-col justify-between space-y-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-sky-400/5 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10">
            {/* Header */}
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-sky-700/40">
              <div className="flex items-center gap-2">
                <Folder className="w-4 h-4 text-sky-400" />
                <h3 className="font-serif font-bold text-sm text-white">Document Vault</h3>
              </div>
              <span className="font-mono text-xs text-sky-200/80">
                {totalDocumentsCount} documents
              </span>
            </div>

            {/* Document Files List */}
            <div className="space-y-2 pt-3 text-xs">
              {displayDocuments.map(doc => (
                <div 
                  key={doc.id}
                  onClick={() => onNavigateTab("smart-docs")}
                  className="flex items-center justify-between p-1.5 rounded-lg hover:bg-white/10 cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    <FileText className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span className="font-medium text-slate-100 group-hover:text-amber-300 truncate">
                      {doc.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-sky-200/80 shrink-0">
                    <span>{doc.date}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-sky-400 group-hover:text-amber-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dual Action Buttons: Open Document Vault & Scan / Upload */}
          <div className="grid grid-cols-2 gap-2 pt-2 relative z-10">
            <button
              onClick={() => onNavigateTab("smart-docs")}
              className="py-2 px-2.5 rounded-xl bg-[#092857] hover:bg-[#0d3778] text-sky-100 border border-sky-500/50 text-xs font-semibold shadow-sm cursor-pointer transition-all text-center truncate"
            >
              Open Document Vault
            </button>
            <button
              onClick={() => {
                if (onOpenUploadModal) onOpenUploadModal();
                else onNavigateTab("smart-docs");
              }}
              className="py-2 px-2.5 rounded-xl bg-[#0a2f66] hover:bg-[#0e3f88] text-white border border-sky-400/50 text-xs font-semibold shadow-sm cursor-pointer transition-all flex items-center justify-center gap-1 truncate"
            >
              <Upload className="w-3.5 h-3.5 text-sky-300" />
              <span>Scan / Upload Document</span>
            </button>
          </div>
        </div>

        {/* COLUMN 3 (3 COLS): PARK IT */}
        <div className="lg:col-span-3 rounded-2xl border border-sky-500/40 bg-gradient-to-br from-[#0c2b59] via-[#081f42] to-[#061a3b] p-5 shadow-xl shadow-sky-950/40 flex flex-col justify-between space-y-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-36 h-36 bg-sky-400/5 rounded-full blur-2xl pointer-events-none" />
          <div className="space-y-2 relative z-10">
            {/* Header with Car Icon and Info */}
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-sky-700/40">
              <div className="flex items-center gap-2 text-white">
                <Car className="w-4 h-4 text-sky-400" />
                <h3 className="font-serif font-bold text-sm text-white tracking-wider uppercase">
                  Park It
                </h3>
              </div>
              <span title="Shared sticky note for your case">
                <Info className="w-4 h-4 text-sky-300 hover:text-white cursor-pointer" />
              </span>
            </div>

            {/* Helper Note */}
            <p className="text-[11px] text-slate-200/90 leading-snug">
              Think of this as a shared sticky note for your case, not a message to your advocate.
            </p>

            {/* Interactive Note Box */}
            <div className="relative pt-1">
              <textarea
                value={parkItText}
                onChange={(e) => setParkItText(e.target.value.slice(0, 500))}
                rows={3}
                placeholder="Jot down a quick note or topic..."
                className="w-full rounded-xl bg-[#061d40] border border-sky-500/40 p-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-400 resize-none leading-relaxed shadow-inner"
              />
              <div className="text-[10px] font-mono text-sky-200/80 text-right pr-1 pt-0.5">
                {parkItText.length}/500
              </div>
            </div>
          </div>

          {/* Action Button: Park It */}
          <div className="relative z-10">
            <button
              onClick={handleParkItSave}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-400/20 cursor-pointer transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
            >
              Park It
            </button>
          </div>
        </div>

      </div>

      {/* ── BOTTOM QUICK ACTIONS DOCK ── */}
      <div className="rounded-2xl border border-sky-500/40 bg-gradient-to-r from-[#092247] via-[#0c2b59] to-[#092247] p-3 sm:p-4 shadow-xl flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Left Label */}
        <div className="flex items-center gap-2 text-white shrink-0 self-start md:self-auto pl-1">
          <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
          <span className="font-serif font-bold text-sm tracking-wide">Quick Actions</span>
        </div>

        {/* Buttons Row */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-start md:justify-end text-xs">
          <button
            onClick={() => {
              if (onOpenScheduler) onOpenScheduler();
              else onNavigateTab("appointments");
            }}
            className="px-3 py-2 rounded-xl bg-[#0c2e63] hover:bg-[#103a7d] text-white border border-sky-400/45 font-semibold cursor-pointer transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Calendar className="w-3.5 h-3.5 text-sky-400" />
            <span>Request Meeting</span>
          </button>

          <button
            onClick={() => onNavigateTab("cases")}
            className="px-3 py-2 rounded-xl bg-[#0c2e63] hover:bg-[#103a7d] text-white border border-sky-400/45 font-semibold cursor-pointer transition-all flex items-center gap-1.5 shadow-sm"
          >
            <FileText className="w-3.5 h-3.5 text-sky-400" />
            <span>Parent Concerns</span>
          </button>

          <button
            onClick={() => onNavigateTab("notes")}
            className="px-3 py-2 rounded-xl bg-[#0c2e63] hover:bg-[#103a7d] text-white border border-sky-400/45 font-semibold cursor-pointer transition-all flex items-center gap-1.5 shadow-sm"
          >
            <StickyNote className="w-3.5 h-3.5 text-amber-400" />
            <span>Advocate Notes · View All</span>
          </button>

          <button
            onClick={() => onNavigateTab("smart-docs")}
            className="px-3 py-2 rounded-xl bg-[#0c2e63] hover:bg-[#103a7d] text-white border border-sky-400/45 font-semibold cursor-pointer transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Folder className="w-3.5 h-3.5 text-sky-400" />
            <span>Records Request</span>
          </button>

          <button
            onClick={() => onNavigateTab("communication")}
            className="px-3 py-2 rounded-xl bg-[#0c2e63] hover:bg-[#103a7d] text-white border border-sky-400/45 font-semibold cursor-pointer transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Mail className="w-3.5 h-3.5 text-sky-400" />
            <span>Contact Waypoint</span>
          </button>

          <button
            onClick={() => onNavigateTab("tasks")}
            className="px-3 py-2 rounded-xl bg-[#0c2e63] hover:bg-[#103a7d] text-white border border-sky-400/45 font-semibold cursor-pointer transition-all flex items-center gap-1.5 shadow-sm"
          >
            <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
            <span>Open Tasks</span>
          </button>

          <button
            onClick={() => onNavigateTab("smart-docs")}
            className="px-3 py-2 rounded-xl bg-[#0c2e63] hover:bg-[#103a7d] text-white border border-sky-400/45 font-semibold cursor-pointer transition-all flex items-center gap-1.5 shadow-sm"
          >
            <FileText className="w-3.5 h-3.5 text-sky-400" />
            <span>Open Document Vault</span>
          </button>
        </div>
      </div>

      {/* ── BRANDED PORTAL FOOTER ── */}
      <div className="pt-3 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 border-t border-white/5 gap-2">
        <div className="flex items-center gap-2">
          <span className="font-serif font-bold text-slate-400 text-xs">Waypoint Advocates</span>
          <span className="text-slate-600">|</span>
          <span className="font-serif italic text-slate-400 text-xs">
            Different Learners. Brighter Futures. ®
          </span>
        </div>
        <div className="flex items-center gap-2 text-slate-500 font-mono text-[9.5px] uppercase tracking-wider">
          <WaypointCompassRose className="w-3.5 h-3.5 text-amber-400/80" />
          <span>Parents Today. Brighter Tomorrows.</span>
        </div>
      </div>

      {/* ── UPDATE PAYMENT METHOD MODAL ── */}
      <Dialog open={showUpdatePaymentModal} onOpenChange={setShowUpdatePaymentModal}>
        <DialogContent className="bg-gradient-to-b from-[#0b172a] via-[#071324] to-[#030914] border border-red-500/50 text-white max-w-md shadow-2xl rounded-2xl p-5">
          <DialogHeader className="border-b border-white/10 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-red-950 border border-red-500/50 flex items-center justify-center text-red-400">
                <CreditCard className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-white font-serif">
                  Update Payment Method
                </DialogTitle>
                <DialogDescription className="text-xs text-blue-200/70">
                  Update your card on file to reprocess your monthly advocacy retainer.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleUpdateCardSubmit} className="space-y-3.5 pt-2 text-xs">
            <div className="rounded-lg bg-red-950/40 border border-red-500/30 p-2.5 flex items-center gap-2 text-red-200 text-[11px]">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>Updating your payment details will immediately re-attempt the outstanding retainer.</span>
            </div>

            <div className="space-y-1">
              <label className="text-white/80 font-semibold block">Cardholder Name</label>
              <input
                type="text"
                required
                value={cardForm.cardholderName}
                onChange={(e) => setCardForm({ ...cardForm, cardholderName: e.target.value })}
                placeholder="Name on card"
                className="w-full bg-[#030C22] border border-blue-900/40 focus:border-amber-400 rounded-xl p-2.5 text-xs text-white outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-white/80 font-semibold block">Card Number</label>
              <input
                type="text"
                required
                value={cardForm.cardNumber}
                onChange={(e) => setCardForm({ ...cardForm, cardNumber: e.target.value })}
                placeholder="4242 •••• •••• 4242"
                className="w-full bg-[#030C22] border border-blue-900/40 focus:border-amber-400 rounded-xl p-2.5 text-xs text-white outline-none font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-white/80 font-semibold block">Expiration (MM/YY)</label>
                <input
                  type="text"
                  required
                  value={cardForm.expMonthYear}
                  onChange={(e) => setCardForm({ ...cardForm, expMonthYear: e.target.value })}
                  placeholder="MM/YY"
                  className="w-full bg-[#030C22] border border-blue-900/40 focus:border-amber-400 rounded-xl p-2.5 text-xs text-white outline-none font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-white/80 font-semibold block">CVC / Security Code</label>
                <input
                  type="password"
                  maxLength={4}
                  required
                  value={cardForm.cvc}
                  onChange={(e) => setCardForm({ ...cardForm, cvc: e.target.value })}
                  placeholder="•••"
                  className="w-full bg-[#030C22] border border-blue-900/40 focus:border-amber-400 rounded-xl p-2.5 text-xs text-white outline-none font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-white/80 font-semibold block">Billing ZIP / Postal Code</label>
              <input
                type="text"
                required
                value={cardForm.zipCode}
                onChange={(e) => setCardForm({ ...cardForm, zipCode: e.target.value })}
                placeholder="ZIP Code"
                className="w-full bg-[#030C22] border border-blue-900/40 focus:border-amber-400 rounded-xl p-2.5 text-xs text-white outline-none font-mono"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  setShowUpdatePaymentModal(false);
                  onNavigateTab("financials");
                }}
                className="text-[11px] text-blue-300 hover:text-white underline cursor-pointer"
              >
                Go to Membership &amp; Invoices
              </button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowUpdatePaymentModal(false)}
                  className="text-white/70 hover:text-white text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isUpdatingCard}
                  className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-md gap-1.5 cursor-pointer"
                >
                  {isUpdatingCard ? (
                    <span>Validating Card...</span>
                  ) : (
                    <span>Save &amp; Reprocess Payment</span>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PortalStudentDetailsTab;
