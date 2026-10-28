import React, { useState, useEffect, useRef, useMemo } from "react";
import { 
  User, Pencil, GraduationCap, School, 
  ArrowRight, ShieldCheck, Award, Activity, Globe,
  Landmark, Star, AlertTriangle, CheckCircle2, Clock,
  Check, X, Loader2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export interface StudentProfileDossierProps {
  student: any;
  studentInitials: string;
  fullName: string;
  parentName: string;
  parentPhone: string;
  calculatedAge: string;
  cleanGrade: string;
  displayDistrict?: string;
  currentSchool?: string;
  originalSchool?: string;
  transferSchool?: string;
  gtidValue: string;
  displayEligibility: string;
  displayMedicalDiagnoses: string;
  clientTime: string;
  onEditDetails?: () => void;
  offset?: { x: number; y: number };
  reviewStatus?:
    | "none"
    | "eligible"
    | "scheduled"
    | "draft"
    | "requested"
    | "sent"
    | "awaiting_confirmation"
    | "review_confirmed"
    | "verified"
    | "declined"
    | "suppressed"
    | "delivery_failed"
    | "followup_due";
  onOpenReviews?: () => void;
  contactConcernStatus?: "active" | "resolved" | null;
  hasPendingVerification?: boolean;
  isContactUpdated?: boolean;
  onOpenContactHistory?: () => void;
}

const US_STATES = [
  "Georgia", "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
  "Delaware", "Florida", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas",
  "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
  "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey",
  "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon",
  "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas",
  "Utah", "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming",
  "District of Columbia"
];

const GRADE_OPTIONS = [
  "Pre-K",
  "Kindergarten",
  "1st Grade",
  "2nd Grade",
  "3rd Grade",
  "4th Grade",
  "5th Grade",
  "6th Grade",
  "7th Grade",
  "8th Grade",
  "9th Grade",
  "10th Grade",
  "11th Grade",
  "12th Grade",
  "Post-Secondary / Transition",
  "Grade Not Specified"
];

const ELIGIBILITY_OPTIONS = [
  "Autism Spectrum Disorder (ASD)",
  "Specific Learning Disability (SLD)",
  "Other Health Impairment (OHI / ADHD)",
  "Speech-Language Impairment (SLI)",
  "Emotional & Behavioral Disorder (EBD)",
  "Developmental Delay (DD)",
  "Intellectual Disability (ID)",
  "Orthopedic Impairment (OI)",
  "Visual Impairment / Blindness",
  "Hearing Impairment / Deafness",
  "Deaf-Blindness",
  "Traumatic Brain Injury (TBI)",
  "Multiple Disabilities",
  "Section 504 Plan Only",
  "Assessment Pending",
  "Advocacy Client"
];

function toDateInputValue(str?: string): string {
  if (!str) return "";
  const clean = str.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
  const mdy = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (mdy) {
    const mm = mdy[1].padStart(2, "0");
    const dd = mdy[2].padStart(2, "0");
    return `${mdy[3]}-${mm}-${dd}`;
  }
  const d = new Date(clean);
  if (!isNaN(d.getTime())) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
  return clean;
}

function computeLiveAge(dateStr?: string): string {
  if (!dateStr) return "--";
  const clean = dateStr.trim();
  const plainAgeMatch = clean.match(/^(?:age\s*[:\-\s]*)?(\d{1,2})(?:\s*(?:years?|yrs?|yo|y\/o))?$/i);
  if (plainAgeMatch) return plainAgeMatch[1];

  let dob: Date | null = null;
  const parts = clean.split(/[\/\-.]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      dob = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    } else {
      const year = parseInt(parts[2], 10);
      const fullYear = year < 100 ? (year > 50 ? 1900 + year : 2000 + year) : year;
      dob = new Date(fullYear, parseInt(parts[0], 10) - 1, parseInt(parts[1], 10));
    }
  } else {
    const parsed = new Date(clean);
    if (!isNaN(parsed.getTime())) dob = parsed;
  }

  if (!dob || isNaN(dob.getTime())) return "--";
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return `${Math.max(0, age)}`;
}

export function StudentProfileDossier({
  student,
  studentInitials,
  fullName,
  parentName,
  parentPhone,
  calculatedAge,
  cleanGrade,
  displayDistrict,
  currentSchool,
  originalSchool,
  transferSchool,
  gtidValue,
  displayEligibility,
  displayMedicalDiagnoses,
  clientTime,
  onEditDetails,
  offset = { x: -34, y: -10 },
  reviewStatus = "none",
  onOpenReviews,
  contactConcernStatus = null,
  hasPendingVerification = false,
  isContactUpdated = false,
  onOpenContactHistory,
}: StudentProfileDossierProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  // Form State for Inline Editing
  const [formState, setFormState] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    gradeLevel: "",
    state: "Georgia",
    countyDistrict: "",
    schoolName: "",
    previousSchool: "",
    gtid: "",
    iepEligibility: "",
    medicalDiagnoses: "",
  });

  const initialValuesRef = useRef(formState);
  const utils = trpc.useUtils();

  const updateMutation = trpc.contacts.updateStudentProfile.useMutation({
    onSuccess: () => {
      utils.contacts.detail.invalidate();
      utils.contacts.list.invalidate();
      utils.caseActivity.list.invalidate();
      setIsSaving(false);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2400);
      toast.success("Student profile updated", { duration: 2000 });
    },
    onError: (err) => {
      setIsSaving(false);
      toast.error(`Save failed: ${err.message}`);
    },
  });

  // Populate or reset form values whenever editing mode toggles or incoming student updates
  const syncFromProps = () => {
    const fresh = {
      firstName: student?.firstName || "",
      lastName: student?.lastName || "",
      dateOfBirth: toDateInputValue(student?.dateOfBirth),
      gradeLevel: student?.gradeLevel || cleanGrade || "5th Grade",
      state: student?.state || "Georgia",
      countyDistrict: student?.countyDistrict || displayDistrict || "",
      schoolName: student?.schoolName || currentSchool || "",
      previousSchool: student?.previousSchool || originalSchool || "",
      gtid: gtidValue || "",
      iepEligibility: student?.iepEligibility || displayEligibility || "Assessment Pending",
      medicalDiagnoses: displayMedicalDiagnoses === "Advocacy Client" ? "" : (displayMedicalDiagnoses || ""),
    };
    setFormState(fresh);
    initialValuesRef.current = fresh;
  };

  useEffect(() => {
    if (!isEditing) {
      syncFromProps();
    }
  }, [
    isEditing,
    student?.firstName,
    student?.lastName,
    student?.dateOfBirth,
    student?.gradeLevel,
    student?.state,
    student?.countyDistrict,
    student?.schoolName,
    student?.previousSchool,
    student?.iepEligibility,
    displayDistrict,
    currentSchool,
    originalSchool,
    gtidValue,
    displayEligibility,
    displayMedicalDiagnoses,
  ]);

  const liveCalculatedAge = useMemo(() => {
    return computeLiveAge(formState.dateOfBirth);
  }, [formState.dateOfBirth]);

  const isDirty = useMemo(() => {
    const init = initialValuesRef.current;
    return Object.keys(init).some(
      (k) => (formState as any)[k] !== (init as any)[k]
    );
  }, [formState]);

  const isDiagnosesDirty = useMemo(() => {
    return formState.medicalDiagnoses !== initialValuesRef.current.medicalDiagnoses;
  }, [formState.medicalDiagnoses]);

  // Execute Save
  const handleSave = async (shouldExit = false, overrides: Partial<typeof formState> = {}) => {
    if (!student?.id) return;
    const dataToSave = { ...formState, ...overrides };

    // Check if anything actually changed
    const init = initialValuesRef.current;
    const hasChanges = Object.keys(dataToSave).some(
      (k) => (dataToSave as any)[k] !== (init as any)[k]
    );

    if (!hasChanges) {
      if (shouldExit) setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await updateMutation.mutateAsync({
        id: student.id,
        firstName: dataToSave.firstName,
        lastName: dataToSave.lastName,
        dateOfBirth: dataToSave.dateOfBirth,
        gradeLevel: dataToSave.gradeLevel,
        state: dataToSave.state,
        countyDistrict: dataToSave.countyDistrict,
        schoolName: dataToSave.schoolName,
        previousSchool: dataToSave.previousSchool,
        gtid: dataToSave.gtid,
        iepEligibility: dataToSave.iepEligibility,
        medicalDiagnoses: dataToSave.medicalDiagnoses,
      });
      initialValuesRef.current = { ...dataToSave };
      if (shouldExit) {
        setIsEditing(false);
      }
    } catch {
      // Retain the entered values and do not exit on error
    }
  };

  const handleChange = (field: keyof typeof formState, val: string) => {
    setFormState((prev) => ({ ...prev, [field]: val }));
  };

  const handleDropdownChange = (field: keyof typeof formState, val: string) => {
    setFormState((prev) => {
      const next = { ...prev, [field]: val };
      handleSave(false, { [field]: val });
      return next;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave(false);
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleSaveDiagnoses = () => {
    handleSave(false);
  };

  const handleDoneEditing = async () => {
    await handleSave(true);
  };

  const handleCancel = () => {
    setFormState({ ...initialValuesRef.current });
    setIsEditing(false);
    toast.info("Edits reverted");
  };

  const handleStartEditing = () => {
    syncFromProps();
    setIsEditing(true);
    if (onEditDetails) {
      // Notify parent without opening popup
    }
  };

  return (
    <div 
      className="w-full max-w-[275px] mx-auto flex flex-col justify-between relative transition-all text-left"
      style={{
        transform: `translate(${offset.x}px, ${offset.y}px)`,
      }}
    >
      {/* Golden Glowing Avatar Badge Centered on Top */}
      <div className="flex flex-col items-center text-center mb-2.5">
        <div className="relative mb-1.5 mt-0.5">
          <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full border-2 border-[#D4AF37] bg-gradient-to-br from-[#122847] to-[#081628] flex items-center justify-center text-[#F4D068] font-bold text-xl shadow-[0_0_20px_rgba(212,175,55,0.4)] ring-4 ring-[#081b35]/50">
            {isEditing && (formState.firstName || formState.lastName)
              ? ((formState.firstName?.[0] || "") + (formState.lastName?.[0] || "")).toUpperCase() || studentInitials
              : studentInitials}
          </div>
        </div>

        {/* Student Name — Display in View Mode, Inline Inputs in Edit Mode */}
        {!isEditing ? (
          <h2 
            className="text-xl sm:text-2xl font-bold tracking-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {fullName}
          </h2>
        ) : (
          <div className="flex items-center gap-1.5 my-0.5 w-full max-w-[245px] justify-center">
            <input
              type="text"
              value={formState.firstName}
              onChange={(e) => handleChange("firstName", e.target.value)}
              onBlur={() => handleSave(false)}
              onKeyDown={handleKeyDown}
              placeholder="First"
              title="Student First Name (Enter or blur to save, Esc to cancel)"
              className="w-1/2 bg-[#020A17] border border-sky-500/50 focus:border-sky-400 focus:ring-1 focus:ring-sky-400/40 text-white rounded px-2 py-1 text-sm font-bold outline-none transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)] text-center"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            />
            <input
              type="text"
              value={formState.lastName}
              onChange={(e) => handleChange("lastName", e.target.value)}
              onBlur={() => handleSave(false)}
              onKeyDown={handleKeyDown}
              placeholder="Last"
              title="Student Last Name (Enter or blur to save, Esc to cancel)"
              className="w-1/2 bg-[#020A17] border border-sky-500/50 focus:border-sky-400 focus:ring-1 focus:ring-sky-400/40 text-white rounded px-2 py-1 text-sm font-bold outline-none transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)] text-center"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            />
          </div>
        )}

        {/* Pill Badges */}
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap justify-center">
          <Badge className="bg-[#123159]/85 text-sky-200 border border-sky-400/40 text-[9px] font-bold tracking-wider px-2 py-0.5 rounded-full">
            IEP
          </Badge>
          <Badge className="bg-[#093527]/85 text-emerald-300 border border-emerald-500/40 text-[9px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
            <span>{student?.studentStatus || "Active"}</span>
          </Badge>

          {/* Contextual Contact Concern Pill */}
          {contactConcernStatus === "active" && (
            <button
              type="button"
              onClick={onOpenContactHistory}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-rose-500/20 border border-rose-500/50 text-rose-200 hover:bg-rose-500/30 transition-all cursor-pointer animate-pulse"
              title="Active Contact Concern — Click to open Contact History"
            >
              <AlertTriangle className="w-2.5 h-2.5 text-rose-400" />
              <span>Contact Concern</span>
            </button>
          )}

          {/* Contextual Verification Pending Pill */}
          {hasPendingVerification && contactConcernStatus !== "active" && (
            <button
              type="button"
              onClick={onOpenContactHistory}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-sky-500/20 border border-sky-400/40 text-sky-200 hover:bg-sky-500/30 transition-all cursor-pointer"
              title="Verification Pending — Proposed email/phone change requires verification"
            >
              <Clock className="w-2.5 h-2.5 text-sky-300" />
              <span>Verification Pending</span>
            </button>
          )}

          {/* Contextual Contact Updated Pill */}
          {isContactUpdated && !hasPendingVerification && contactConcernStatus !== "active" && (
            <button
              type="button"
              onClick={onOpenContactHistory}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/30 transition-all cursor-pointer"
              title="Contact Updated — Recent contact changes recorded"
            >
              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-300" />
              <span>Contact Updated</span>
            </button>
          )}

          {/* Contextual Review Status Pill (Section 5.C) */}
          {reviewStatus === "eligible" && (
            <button
              type="button"
              onClick={onOpenReviews}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 border border-[#F1CB6C]/60 text-[#FFE394] hover:bg-amber-500/30 transition-all shadow-[0_0_10px_rgba(241,203,108,0.25)] cursor-pointer"
              title="Review Opportunity — Click to view Reviews"
            >
              <Star className="w-2.5 h-2.5 fill-[#F1CB6C] text-[#F1CB6C]" />
              <span>Review Opportunity</span>
            </button>
          )}
          {(reviewStatus === "verified" || reviewStatus === "review_confirmed") && (
            <button
              type="button"
              onClick={onOpenReviews}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-amber-500/15 border border-[#F1CB6C]/40 text-[#FFE394] hover:bg-amber-500/25 transition-all shadow-[0_0_8px_rgba(241,203,108,0.2)] cursor-pointer"
              title="Review Confirmed — Click to view Reviews"
            >
              <Star className="w-2.5 h-2.5 fill-[#F1CB6C] text-[#F1CB6C]" />
              <span>Review Confirmed</span>
            </button>
          )}
          {(reviewStatus === "requested" || reviewStatus === "sent") && (
            <button
              type="button"
              onClick={onOpenReviews}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-sky-500/15 border border-sky-400/35 text-sky-200 hover:bg-sky-500/25 transition-all cursor-pointer"
              title="Request Sent — Click to view Reviews"
            >
              <Star className="w-2.5 h-2.5 fill-[#38BDF8] text-[#38BDF8]" />
              <span>Request Sent</span>
            </button>
          )}
          {reviewStatus === "awaiting_confirmation" && (
            <button
              type="button"
              onClick={onOpenReviews}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-indigo-500/15 border border-indigo-400/35 text-indigo-200 hover:bg-indigo-500/25 transition-all cursor-pointer"
              title="Awaiting Confirmation — Click to view Reviews"
            >
              <Star className="w-2.5 h-2.5 fill-[#818CF8] text-[#818CF8]" />
              <span>Awaiting Confirmation</span>
            </button>
          )}
          {reviewStatus === "followup_due" && (
            <button
              type="button"
              onClick={onOpenReviews}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-amber-500/20 border border-amber-500/50 text-amber-200 hover:bg-amber-500/30 transition-all cursor-pointer animate-pulse"
              title="Follow-Up Due — Click to view Reviews"
            >
              <Star className="w-2.5 h-2.5 fill-[#FBBF24] text-[#FBBF24]" />
              <span>Follow-Up Due</span>
            </button>
          )}
        </div>
      </div>

      {/* ── STUDENT PROFILE Info (Tight, Transparent on Leather) ── */}
      <div className="w-full space-y-1.5 px-0.5 bg-transparent border-0 shadow-none text-[11px]">
        {/* Section Header */}
        <div className="flex items-center justify-between pb-1 border-b border-white/15">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-300 flex items-center gap-1">
              <User className="h-3 w-3 text-[#38BDF8]" />
              <span>STUDENT PROFILE</span>
            </span>
            {isEditing && (
              <span className="text-[8.5px] px-1.5 py-0.2 bg-sky-500/20 text-sky-300 border border-sky-400/30 rounded font-semibold tracking-wide">
                Direct Edit
              </span>
            )}
          </div>

          {!isEditing ? (
            <button
              type="button"
              onClick={handleStartEditing}
              className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#38BDF8] hover:text-sky-300 transition-colors cursor-pointer"
              title="Activate inline profile editing"
            >
              <Pencil className="h-2.5 w-2.5" />
              <span>Edit Details</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleDoneEditing}
              disabled={isSaving}
              className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-300 hover:text-emerald-200 transition-colors cursor-pointer bg-emerald-500/20 border border-emerald-400/40 px-2 py-0.5 rounded shadow-[0_1px_4px_rgba(0,0,0,0.5)]"
              title="Save pending changes and finish editing"
            >
              {isSaving ? (
                <Loader2 className="h-2.5 w-2.5 animate-spin" />
              ) : (
                <Check className="h-2.5 w-2.5 text-emerald-400" />
              )}
              <span>Done Editing</span>
            </button>
          )}
        </div>

        {/* Age / Date of Birth */}
        <div className="flex items-center justify-between gap-1.5 py-0.5">
          <div className="flex items-center gap-1.5 text-slate-300 shrink-0">
            <User className="h-3 w-3 text-[#38BDF8]" />
            <span>Age:</span>
          </div>
          {!isEditing ? (
            <span className="font-bold text-white text-right">
              {calculatedAge}
            </span>
          ) : (
            <div className="flex items-center gap-1.5 justify-end">
              <input
                type="date"
                value={formState.dateOfBirth}
                onChange={(e) => handleChange("dateOfBirth", e.target.value)}
                onBlur={() => handleSave(false)}
                onKeyDown={handleKeyDown}
                title="Date of Birth (calculates age automatically)"
                className="bg-[#020A17] border border-sky-500/50 focus:border-sky-400 focus:ring-1 focus:ring-sky-400/40 text-white text-[10.5px] rounded px-1.5 py-0.5 outline-none max-w-[120px] font-mono cursor-pointer"
              />
              <span className="font-bold text-amber-300 text-[10.5px] shrink-0" title="Auto-calculated age in years">
                ({liveCalculatedAge} yrs)
              </span>
            </div>
          )}
        </div>

        {/* Grade */}
        <div className="flex items-center justify-between gap-1.5 py-0.5">
          <div className="flex items-center gap-1.5 text-slate-300 shrink-0">
            <GraduationCap className="h-3 w-3 text-[#38BDF8] shrink-0" />
            <span>Grade:</span>
          </div>
          {!isEditing ? (
            <span className="font-bold text-white text-right">
              {cleanGrade}
            </span>
          ) : (
            <select
              value={formState.gradeLevel}
              onChange={(e) => handleDropdownChange("gradeLevel", e.target.value)}
              className="bg-[#020A17] border border-sky-500/50 focus:border-sky-400 focus:ring-1 focus:ring-sky-400/40 text-white text-[11px] font-semibold rounded px-1.5 py-0.5 outline-none max-w-[155px] cursor-pointer"
            >
              {GRADE_OPTIONS.map((g) => (
                <option key={g} value={g} className="bg-[#07162B] text-white">
                  {g}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* State */}
        <div className="flex items-center justify-between gap-1.5 py-0.5">
          <div className="flex items-center gap-1.5 text-slate-300 shrink-0">
            <Globe className="h-3 w-3 text-[#38BDF8]" />
            <span>State:</span>
          </div>
          {!isEditing ? (
            <span className="font-bold text-white text-right">
              {student?.state || "Georgia"}
            </span>
          ) : (
            <select
              value={formState.state}
              onChange={(e) => handleDropdownChange("state", e.target.value)}
              className="bg-[#020A17] border border-sky-500/50 focus:border-sky-400 focus:ring-1 focus:ring-sky-400/40 text-white text-[11px] font-semibold rounded px-1.5 py-0.5 outline-none max-w-[155px] cursor-pointer"
            >
              {US_STATES.map((s) => (
                <option key={s} value={s} className="bg-[#07162B] text-white">
                  {s}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* District */}
        <div className="flex items-center justify-between gap-1.5 py-0.5">
          <div className="flex items-center gap-1.5 text-slate-300 shrink-0">
            <Landmark className="h-3 w-3 text-[#38BDF8] shrink-0" />
            <span>District:</span>
          </div>
          {!isEditing ? (
            <span 
              className="font-bold text-white truncate max-w-[145px] text-right" 
              title={displayDistrict || student?.countyDistrict || "Paulding County School District"}
            >
              {displayDistrict || student?.countyDistrict || "Paulding County School District"}
            </span>
          ) : (
            <input
              type="text"
              value={formState.countyDistrict}
              onChange={(e) => handleChange("countyDistrict", e.target.value)}
              onBlur={() => handleSave(false)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. Paulding County"
              className="bg-[#020A17] border border-sky-500/50 focus:border-sky-400 focus:ring-1 focus:ring-sky-400/40 text-white text-[11px] font-semibold rounded px-1.5 py-0.5 outline-none max-w-[155px] text-right"
            />
          )}
        </div>

        {/* Current School */}
        <div className="flex items-center justify-between gap-1.5 py-0.5">
          <div className="flex items-center gap-1.5 text-slate-300 shrink-0">
            <School className="h-3 w-3 text-[#38BDF8] shrink-0" />
            <span>Current School:</span>
          </div>
          {!isEditing ? (
            <span 
              className="font-bold text-white truncate max-w-[145px] text-right" 
              title={student?.schoolName || currentSchool || "Connie Dugan Elementary"}
            >
              {student?.schoolName || currentSchool || "Connie Dugan Elementary"}
            </span>
          ) : (
            <input
              type="text"
              value={formState.schoolName}
              onChange={(e) => handleChange("schoolName", e.target.value)}
              onBlur={() => handleSave(false)}
              onKeyDown={handleKeyDown}
              placeholder="Current School"
              className="bg-[#020A17] border border-sky-500/50 focus:border-sky-400 focus:ring-1 focus:ring-sky-400/40 text-white text-[11px] font-semibold rounded px-1.5 py-0.5 outline-none max-w-[155px] text-right"
            />
          )}
        </div>

        {/* Original School */}
        <div className="flex items-center justify-between gap-1.5 py-0.5">
          <div className="flex items-center gap-1.5 text-slate-300 shrink-0">
            <ArrowRight className="h-3 w-3 text-[#38BDF8] shrink-0" />
            <span>Original School:</span>
          </div>
          {!isEditing ? (
            <span 
              className="font-bold text-white truncate max-w-[130px] text-right" 
              title={originalSchool || student?.previousSchool || student?.schoolName || "The Lovett School"}
            >
              {originalSchool || student?.previousSchool || student?.schoolName || "The Lovett School"}
            </span>
          ) : (
            <input
              type="text"
              value={formState.previousSchool}
              onChange={(e) => handleChange("previousSchool", e.target.value)}
              onBlur={() => handleSave(false)}
              onKeyDown={handleKeyDown}
              placeholder="Original School"
              className="bg-[#020A17] border border-sky-500/50 focus:border-sky-400 focus:ring-1 focus:ring-sky-400/40 text-white text-[11px] font-semibold rounded px-1.5 py-0.5 outline-none max-w-[155px] text-right"
            />
          )}
        </div>

        {/* GTID (Preserving leading zeros) */}
        <div className="flex items-center justify-between gap-1.5 py-0.5">
          <div className="flex items-center gap-1.5 text-slate-300 shrink-0">
            <ShieldCheck className="h-3 w-3 text-[#38BDF8] shrink-0" />
            <span>GTID:</span>
          </div>
          {!isEditing ? (
            <span className="font-bold text-white font-mono text-right">
              {gtidValue}
            </span>
          ) : (
            <input
              type="text"
              value={formState.gtid}
              onChange={(e) => handleChange("gtid", e.target.value)}
              onBlur={() => handleSave(false)}
              onKeyDown={handleKeyDown}
              placeholder="State ID (00123...)"
              title="GTID / State ID (Preserves leading zeros)"
              className="bg-[#020A17] border border-sky-500/50 focus:border-sky-400 focus:ring-1 focus:ring-sky-400/40 text-white font-mono text-[11px] font-bold rounded px-1.5 py-0.5 outline-none max-w-[130px] text-right"
            />
          )}
        </div>

        {/* Eligibility */}
        <div className="flex items-center justify-between gap-1.5 py-0.5">
          <div className="flex items-center gap-1.5 text-slate-300 shrink-0">
            <Award className="h-3 w-3 text-[#38BDF8] shrink-0" />
            <span>Eligibility:</span>
          </div>
          {!isEditing ? (
            <span className="font-bold text-white text-right truncate max-w-[140px]" title={displayEligibility}>
              {displayEligibility}
            </span>
          ) : (
            <select
              value={formState.iepEligibility}
              onChange={(e) => handleDropdownChange("iepEligibility", e.target.value)}
              className="bg-[#020A17] border border-sky-500/50 focus:border-sky-400 focus:ring-1 focus:ring-sky-400/40 text-white text-[11px] font-semibold rounded px-1.5 py-0.5 outline-none max-w-[155px] cursor-pointer"
            >
              {ELIGIBILITY_OPTIONS.map((opt) => (
                <option key={opt} value={opt} className="bg-[#07162B] text-white">
                  {opt}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Medical Diagnoses */}
        <div className="pt-1.5 border-t border-white/10">
          <div className="flex items-center justify-between gap-1.5 text-slate-300 mb-0.5">
            <div className="flex items-center gap-1.5">
              <Activity className="h-3 w-3 text-[#38BDF8] shrink-0" />
              <span>Medical Diagnoses:</span>
            </div>
            {isEditing && isDiagnosesDirty && (
              <button
                type="button"
                onClick={handleSaveDiagnoses}
                disabled={isSaving}
                className="px-2 py-0.5 bg-[#C5A059] hover:bg-[#DFBE77] text-slate-950 font-bold text-[9px] rounded flex items-center gap-1 transition-all cursor-pointer shadow-[0_1px_4px_rgba(0,0,0,0.6)]"
                title="Explicitly save medical diagnoses"
              >
                {isSaving ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Check className="w-2.5 h-2.5" />}
                <span>Save Diagnoses</span>
              </button>
            )}
          </div>
          {!isEditing ? (
            <div className="pl-4">
              <span className="font-bold text-white text-left block leading-snug break-words text-[10.5px]" title={displayMedicalDiagnoses}>
                {displayMedicalDiagnoses}
              </span>
            </div>
          ) : (
            <div className="mt-1">
              <textarea
                value={formState.medicalDiagnoses}
                onChange={(e) => handleChange("medicalDiagnoses", e.target.value)}
                onBlur={() => handleSave(false)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.preventDefault();
                    handleCancel();
                  } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handleSaveDiagnoses();
                  }
                }}
                rows={3}
                placeholder="Enter medical diagnoses or clinical history (Ctrl+Enter to save)..."
                className="w-full bg-[#020A17] border border-sky-500/50 focus:border-sky-400 focus:ring-1 focus:ring-sky-400/40 text-white text-[10.5px] rounded p-1.5 outline-none resize-y leading-snug"
              />
            </div>
          )}
        </div>

        {/* Inline Editing Status & Confirmation Footer */}
        {isEditing && (
          <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[10px]">
            <div className="flex items-center gap-1">
              {savedFlash ? (
                <span className="text-emerald-400 flex items-center gap-1 font-semibold animate-pulse">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  Saved to CRM
                </span>
              ) : isSaving ? (
                <span className="text-sky-300 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin text-sky-400" />
                  Saving...
                </span>
              ) : isDirty ? (
                <span className="text-amber-300/90">Unsaved edits (Enter to save)</span>
              ) : (
                <span className="text-slate-400">All changes saved</span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCancel}
                className="text-slate-400 hover:text-rose-300 transition-colors cursor-pointer text-[10px] px-1"
                title="Revert unsaved edits (Esc)"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDoneEditing}
                disabled={isSaving}
                className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 hover:bg-emerald-500/30 text-[10px] font-bold rounded flex items-center gap-1 transition-all cursor-pointer"
              >
                <Check className="w-2.5 h-2.5" />
                <span>Done Editing</span>
              </button>
            </div>
          </div>
        )}

        {/* Client Time */}
        <div className="pt-1.5 border-t border-white/10">
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Globe className="h-3 w-3 text-[#38BDF8] shrink-0" />
              <span>Client Time:</span>
              <strong className="text-white font-semibold">{clientTime}</strong>
              <span className="text-white/60 text-[10px]">(Eastern)</span>
            </div>
          </div>
          <div className="flex items-center justify-between pl-4 pt-0.5 text-[10px]">
            <span className="text-slate-400">Same time as you</span>
            <span className="text-[9px] font-semibold text-emerald-300 bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Good to call
            </span>
          </div>
        </div>

        {/* Parent / Guardian Row */}
        <div className="pt-1.5 border-t border-white/10 space-y-1">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onOpenContactHistory}
              title="Click to view Parent Profile, Contact History & Concerns"
              className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors text-left group cursor-pointer"
            >
              <User className="h-3 w-3 text-white/50 group-hover:text-[#D4AF37] transition-colors" />
              <span>Parent: <strong className="text-white group-hover:text-[#FFE394] transition-colors underline decoration-dotted decoration-white/30">{parentName}</strong></span>
            </button>
            <a href={`tel:${parentPhone}`} className="text-sky-300 hover:text-amber-300 transition-colors font-medium">
              {parentPhone}
            </a>
          </div>

          {/* Contextual Account Review Status Pill (Section 5.C) */}
          {reviewStatus && reviewStatus !== "none" && (
            <div className="flex items-center justify-between pt-0.5 text-[10px]">
              <span className="text-slate-400">Account Review:</span>
              {reviewStatus === "eligible" && (
                <button
                  type="button"
                  onClick={onOpenReviews}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 border border-[#F1CB6C]/60 text-[#FFE394] hover:bg-amber-500/30 transition-all shadow-[0_0_10px_rgba(241,203,108,0.25)] cursor-pointer"
                  title="Review Opportunity — Click to view in Reviews"
                >
                  <Star className="w-2.5 h-2.5 fill-[#F1CB6C] text-[#F1CB6C]" />
                  <span>Review Opportunity</span>
                </button>
              )}
              {(reviewStatus === "verified" || reviewStatus === "review_confirmed") && (
                <button
                  type="button"
                  onClick={onOpenReviews}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-amber-500/15 border border-[#F1CB6C]/40 text-[#FFE394] hover:bg-amber-500/25 transition-all shadow-[0_0_8px_rgba(241,203,108,0.2)] cursor-pointer"
                  title="Review Confirmed — Click to view in Reviews"
                >
                  <Star className="w-2.5 h-2.5 fill-[#F1CB6C] text-[#F1CB6C]" />
                  <span>Review Confirmed</span>
                </button>
              )}
              {(reviewStatus === "requested" || reviewStatus === "sent") && (
                <button
                  type="button"
                  onClick={onOpenReviews}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-sky-500/15 border border-sky-400/35 text-sky-200 hover:bg-sky-500/25 transition-all cursor-pointer"
                  title="Request Sent — Click to view in Reviews"
                >
                  <Star className="w-2.5 h-2.5 fill-[#38BDF8] text-[#38BDF8]" />
                  <span>Request Sent</span>
                </button>
              )}
              {reviewStatus === "awaiting_confirmation" && (
                <button
                  type="button"
                  onClick={onOpenReviews}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-indigo-500/15 border border-indigo-400/35 text-indigo-200 hover:bg-indigo-500/25 transition-all cursor-pointer"
                  title="Awaiting Confirmation — Click to view in Reviews"
                >
                  <Star className="w-2.5 h-2.5 fill-[#818CF8] text-[#818CF8]" />
                  <span>Awaiting Confirmation</span>
                </button>
              )}
              {reviewStatus === "followup_due" && (
                <button
                  type="button"
                  onClick={onOpenReviews}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-amber-500/20 border border-amber-500/50 text-amber-200 hover:bg-amber-500/30 transition-all cursor-pointer animate-pulse"
                  title="Follow-Up Due — Click to view in Reviews"
                >
                  <Star className="w-2.5 h-2.5 fill-[#FBBF24] text-[#FBBF24]" />
                  <span>Follow-Up Due</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
