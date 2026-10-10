import React, { useState, useMemo } from "react";
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Download,
  Users,
  Building,
  RefreshCw,
  FolderArchive,
  Layers,
  Sparkles,
  MapPin,
  Compass,
  FileText,
  HelpCircle,
  X,
  ExternalLink,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import PageIdBadge from "@/components/PageIdBadge";
import { ExpressStudentSetupCard } from "./ExpressStudentSetupCard";

// CRM Source Profiles
export interface CrmPreset {
  id: string;
  name: string;
  category: string;
  badge: string;
  description: string;
  sampleTip: string;
}

export const CRM_PRESETS: CrmPreset[] = [
  {
    id: "honeybook",
    name: "HoneyBook",
    category: "Coaching / Solo",
    badge: "Popular",
    description: "Export Contacts & Projects from HoneyBook workspace. Auto-detects parent and student fields.",
    sampleTip: "Exports as contacts.csv with Project Name, Client Email, and Phone columns.",
  },
  {
    id: "dubsado",
    name: "Dubsado",
    category: "Client Management",
    badge: "Supported",
    description: "Export Address Book or Jobs CSV from Dubsado. Maps custom fields to IEP & school notes.",
    sampleTip: "Includes Client Name, Organization, Alternate Contacts, and Custom Fields.",
  },
  {
    id: "hubspot",
    name: "HubSpot",
    category: "CRM Platform",
    badge: "Supported",
    description: "Direct export of HubSpot Contacts list with lifecycle stages, street addresses, and phone numbers.",
    sampleTip: "Headers include First Name, Last Name, Email, Phone Number, City, and State/Region.",
  },
  {
    id: "clio",
    name: "Clio / Legal Practice",
    category: "Advocacy / Legal",
    badge: "Specialized",
    description: "Legal practice contact exports. Preserves hourly billing rates, client matter IDs, and case notes.",
    sampleTip: "Includes Client First/Last Name, Primary Phone, Billing Rate, and Matter Reference.",
  },
  {
    id: "practice_better",
    name: "Practice Better / SimplePractice",
    category: "Allied Health",
    badge: "Supported",
    description: "Client rosters from health and allied pediatric practices. Maps diagnosis, DOB, and guardian info.",
    sampleTip: "Includes Guardian Name, Dependent Name, DOB, and Clinical Notes.",
  },
  {
    id: "generic_csv",
    name: "Universal CSV / Excel",
    category: "Spreadsheet",
    badge: "Universal",
    description: "Any CSV or Excel file exported from Google Sheets, Microsoft Excel, or Apple Numbers.",
    sampleTip: "Supports any column header names with smart fuzzy matching.",
  },
];

// Sample Practice Roster for 1-Click Instant Testing
const SAMPLE_CRM_CLIENTS = [
  {
    firstName: "Sarah",
    lastName: "Jenkins",
    email: "sarah.jenkins@familymail.example",
    phone: "(404) 555-0182",
    company: "Jenkins Family",
    jobTitle: "Parent",
    address: "742 Evergreen Terrace",
    city: "Atlanta",
    state: "GA",
    zipCode: "30308",
    country: "USA",
    studentFirstName: "Liam",
    studentLastName: "Jenkins",
    schoolName: "Midtown High School",
    gradeLevel: "9th Grade",
    dateOfBirth: "2010-04-14",
    diagnosis: "ADHD (Combined), Dyslexia",
    iepEligibility: "Specific Learning Disability (SLD)",
    planType: "IEP",
    planTier: "$105",
    pipelineStage: "Active",
    hourlyRate: 150,
    howHeardAboutUs: "Parent Support Group Atlanta",
    notes: "Transitioning from middle school IEP. Parent concerned about co-taught English accommodations.",
  },
  {
    firstName: "Marcus",
    lastName: "Vance",
    email: "m.vance@techcorp.example",
    phone: "(678) 555-0194",
    company: "Vance Household",
    jobTitle: "Father / Guardian",
    address: "1284 Oakridge Drive",
    city: "Marietta",
    state: "GA",
    zipCode: "30062",
    country: "USA",
    studentFirstName: "Maya",
    studentLastName: "Vance",
    schoolName: "Wheeler High School",
    gradeLevel: "11th Grade",
    dateOfBirth: "2008-11-22",
    diagnosis: "Autism Spectrum Disorder (Level 1), Anxiety",
    iepEligibility: "Autism",
    planType: "IEP",
    planTier: "$55",
    pipelineStage: "Active",
    hourlyRate: 150,
    howHeardAboutUs: "Pediatrician Referral",
    notes: "Requires sensory breaks and executive function coaching. Annual review scheduled for November.",
  },
  {
    firstName: "Elena",
    lastName: "Rostova",
    email: "elena.rostova@designstudio.example",
    phone: "(770) 555-0133",
    company: "Rostova Consulting",
    jobTitle: "Mother",
    address: "520 North Point Pkwy",
    city: "Alpharetta",
    state: "GA",
    zipCode: "30022",
    country: "USA",
    studentFirstName: "Julian",
    studentLastName: "Rostova",
    schoolName: "Alpharetta Middle School",
    gradeLevel: "7th Grade",
    dateOfBirth: "2012-08-09",
    diagnosis: "Auditory Processing Disorder, Speech Impairment",
    iepEligibility: "Speech or Language Impairment",
    planType: "IEP",
    planTier: "$105",
    pipelineStage: "Active",
    hourlyRate: 175,
    howHeardAboutUs: "Speech Therapist",
    notes: "School proposed reducing speech therapy from 60 to 30 min. Parent requesting PWN and advocate review.",
  },
  {
    firstName: "David",
    lastName: "Kim",
    email: "david.kim@healthfirst.example",
    phone: "(404) 555-0158",
    company: "Kim Family",
    jobTitle: "Parent",
    address: "310 Ponce De Leon Ave",
    city: "Decatur",
    state: "GA",
    zipCode: "30030",
    country: "USA",
    studentFirstName: "Leilani",
    studentLastName: "Kim",
    schoolName: "Decatur High School",
    gradeLevel: "10th Grade",
    dateOfBirth: "2009-02-17",
    diagnosis: "Generalized Anxiety Disorder, Orthopedic Impairment",
    iepEligibility: "Other Health Impairment (OHI)",
    planType: "504 Plan",
    planTier: "$55",
    pipelineStage: "Active",
    hourlyRate: 150,
    howHeardAboutUs: "Waypoint Advocates Official Website",
    notes: "504 Plan accommodation verification needed for standardized testing (SAT/ACT time extension).",
  },
  {
    firstName: "Rachel",
    lastName: "Washington",
    email: "rachel.w@atlanta-advocate.example",
    phone: "(470) 555-0142",
    company: "Washington Family",
    jobTitle: "Guardian",
    address: "880 Cascade Road SW",
    city: "Atlanta",
    state: "GA",
    zipCode: "30311",
    country: "USA",
    studentFirstName: "Tariq",
    studentLastName: "Washington",
    schoolName: "Mays High School",
    gradeLevel: "8th Grade",
    dateOfBirth: "2011-06-30",
    diagnosis: "Specific Learning Disability in Mathematics",
    iepEligibility: "Specific Learning Disability (SLD)",
    planType: "IEP",
    planTier: "Scholarship",
    pipelineStage: "Onboarding",
    hourlyRate: 0,
    howHeardAboutUs: "Community Advocate Network",
    notes: "Waypoint scholarship recipient. Seeking initial manifestation determination support.",
  },
];

// CSV Parsing Helper with proper quote handling
function parseCsvText(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if ((char === "," || char === "\t") && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const rawHeaders = parseLine(lines[0]);
  const headers = rawHeaders.map((h) => h.replace(/^["']|["']$/g, "").trim());

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    if (values.length === 1 && values[0] === "") continue;
    const rowObj: Record<string, string> = {};
    headers.forEach((header, idx) => {
      rowObj[header] = values[idx]?.replace(/^["']|["']$/g, "").trim() || "";
    });
    rows.push(rowObj);
  }

  return { headers, rows };
}

// Map parsed raw row to standardized client item
function mapRowToClient(row: Record<string, string>, fieldMap: Record<string, string>): any {
  const getVal = (targetField: string): string => {
    const csvHeader = Object.keys(fieldMap).find((k) => fieldMap[k] === targetField);
    if (!csvHeader) return "";
    return row[csvHeader] || "";
  };

  // If first and last name are combined in a "name" column
  let firstName = getVal("firstName");
  let lastName = getVal("lastName");
  if (!firstName && !lastName) {
    const fullName = getVal("fullName");
    if (fullName) {
      const parts = fullName.trim().split(/\s+/);
      firstName = parts[0] || "";
      lastName = parts.slice(1).join(" ") || "Client";
    }
  }

  // Student name handling
  let studentFirst = getVal("studentFirstName");
  let studentLast = getVal("studentLastName");
  if (!studentFirst && !studentLast) {
    const fullStudentName = getVal("studentName");
    if (fullStudentName) {
      const parts = fullStudentName.trim().split(/\s+/);
      studentFirst = parts[0] || "";
      studentLast = parts.slice(1).join(" ") || lastName;
    }
  }

  return {
    firstName: firstName || "Client",
    lastName: lastName || "Imported",
    email: getVal("email"),
    phone: getVal("phone"),
    company: getVal("company"),
    jobTitle: getVal("jobTitle") || "Client",
    address: getVal("address"),
    city: getVal("city"),
    state: getVal("state"),
    zipCode: getVal("zipCode"),
    country: getVal("country") || "USA",
    notes: getVal("notes"),
    studentFirstName: studentFirst,
    studentLastName: studentLast,
    schoolName: getVal("schoolName"),
    gradeLevel: getVal("gradeLevel"),
    dateOfBirth: getVal("dateOfBirth"),
    diagnosis: getVal("diagnosis"),
    iepEligibility: getVal("iepEligibility"),
    planType: getVal("planType") || "IEP",
    planTier: getVal("planTier") || "$55",
    pipelineStage: getVal("pipelineStage") || "Active",
    hourlyRate: getVal("hourlyRate") || "",
    howHeardAboutUs: getVal("howHeardAboutUs"),
    referredBy: getVal("referredBy"),
  };
}

// Auto-infer best field mapping from raw CSV header names
function inferFieldMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};

  const clean = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, "");

  headers.forEach((h) => {
    const norm = clean(h);

    if (norm === "firstname" || norm === "first" || norm === "fname" || norm === "parentfirstname" || norm === "guardianfirstname" || norm === "clientfirstname") {
      mapping[h] = "firstName";
    } else if (norm === "lastname" || norm === "last" || norm === "lname" || norm === "parentlastname" || norm === "guardianlastname" || norm === "clientlastname") {
      mapping[h] = "lastName";
    } else if (norm === "name" || norm === "clientname" || norm === "parentname" || norm === "contactname" || norm === "fullname") {
      mapping[h] = "fullName";
    } else if (norm.includes("email")) {
      mapping[h] = "email";
    } else if (norm.includes("phone") || norm === "mobile" || norm === "cell") {
      mapping[h] = "phone";
    } else if (norm.includes("studentfirst") || norm === "childfirst") {
      mapping[h] = "studentFirstName";
    } else if (norm.includes("studentlast") || norm === "childlast") {
      mapping[h] = "studentLastName";
    } else if (norm === "student" || norm === "child" || norm === "studentname" || norm === "childname") {
      mapping[h] = "studentName";
    } else if (norm.includes("school")) {
      mapping[h] = "schoolName";
    } else if (norm.includes("grade")) {
      mapping[h] = "gradeLevel";
    } else if (norm.includes("dob") || norm.includes("birth")) {
      mapping[h] = "dateOfBirth";
    } else if (norm.includes("diagnosis") || norm.includes("diagnoses")) {
      mapping[h] = "diagnosis";
    } else if (norm.includes("eligibility") || norm.includes("iepcategory")) {
      mapping[h] = "iepEligibility";
    } else if (norm.includes("plantype") || norm === "plan" || norm === "program") {
      mapping[h] = "planType";
    } else if (norm === "street" || norm === "address" || norm === "streetaddress" || norm === "addressline1") {
      mapping[h] = "address";
    } else if (norm === "city") {
      mapping[h] = "city";
    } else if (norm === "state" || norm === "province" || norm === "region") {
      mapping[h] = "state";
    } else if (norm === "zip" || norm === "zipcode" || norm === "postalcode" || norm === "postal") {
      mapping[h] = "zipCode";
    } else if (norm === "country") {
      mapping[h] = "country";
    } else if (norm.includes("tier") || norm.includes("package") || norm.includes("membership")) {
      mapping[h] = "planTier";
    } else if (norm.includes("stage") || norm.includes("pipeline") || norm.includes("status")) {
      mapping[h] = "pipelineStage";
    } else if (norm.includes("rate") || norm.includes("hourly") || norm.includes("price")) {
      mapping[h] = "hourlyRate";
    } else if (norm.includes("note") || norm.includes("comment") || norm.includes("detail")) {
      mapping[h] = "notes";
    } else if (norm.includes("company") || norm.includes("household") || norm.includes("account")) {
      mapping[h] = "company";
    } else if (norm.includes("referral") || norm.includes("referredby")) {
      mapping[h] = "referredBy";
    } else if (norm.includes("source") || norm.includes("hear")) {
      mapping[h] = "howHeardAboutUs";
    }
  });

  return mapping;
}

export function ClientCrmImportTab() {
  const utils = trpc.useUtils();
  const { data: contactsData } = trpc.contacts.list.useQuery();

  // State
  const [activeMode, setActiveMode] = useState<"express" | "batch">("express");
  const [selectedCrm, setSelectedCrm] = useState<string>("generic_csv");
  const [duplicateStrategy, setDuplicateStrategy] = useState<"skip" | "update" | "create_new">("skip");
  const [defaultPlanTier, setDefaultPlanTier] = useState<string>("$55");
  const [defaultPipelineStage, setDefaultPipelineStage] = useState<string>("Active");

  const [rawText, setRawText] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [searchFilter, setSearchFilter] = useState<string>("");

  // Direct import state
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  // Bulk Import Mutation
  const bulkImportMutation = trpc.contacts.bulkImport.useMutation({
    onSuccess: (data) => {
      setIsProcessing(false);
      setImportResult(data);
      utils.contacts.list.invalidate();
      utils.nationalCoverage.invalidate();
      toast.success(
        `Successfully imported ${data.importedCount} clients (${data.skippedCount} skipped, ${data.updatedCount} updated)`
      );
    },
    onError: (err) => {
      setIsProcessing(false);
      toast.error(err.message || "Bulk import failed. Please check field mappings.");
    },
  });

  // Calculate live preview of mapped clients
  const mappedClients = useMemo(() => {
    if (rawRows.length === 0) return [];
    return rawRows.map((row) => mapRowToClient(row, fieldMapping));
  }, [rawRows, fieldMapping]);

  // Filtered preview
  const filteredPreview = useMemo(() => {
    if (!searchFilter.trim()) return mappedClients;
    const term = searchFilter.toLowerCase();
    return mappedClients.filter(
      (c) =>
        c.firstName.toLowerCase().includes(term) ||
        c.lastName.toLowerCase().includes(term) ||
        (c.email && c.email.toLowerCase().includes(term)) ||
        (c.studentFirstName && c.studentFirstName.toLowerCase().includes(term)) ||
        (c.schoolName && c.schoolName.toLowerCase().includes(term)) ||
        (c.city && c.city.toLowerCase().includes(term))
    );
  }, [mappedClients, searchFilter]);

  // Handle file drop / upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        processUploadedCsv(content, file.name);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const processUploadedCsv = (content: string, name: string = "uploaded.csv") => {
    setRawText(content);
    setFileName(name);
    const { headers, rows } = parseCsvText(content);
    setCsvHeaders(headers);
    setRawRows(rows);
    const inferred = inferFieldMapping(headers);
    setFieldMapping(inferred);
    setImportResult(null);
    toast.success(`Parsed ${rows.length} records from ${name}`);
  };

  // Load sample demo data
  const handleLoadSample = () => {
    setFileName("sample-waypoint-crm-roster.csv");
    setSelectedCrm("honeybook");
    const headers = [
      "First Name",
      "Last Name",
      "Email",
      "Phone",
      "Address",
      "City",
      "State",
      "Zip Code",
      "Student First Name",
      "Student Last Name",
      "School Name",
      "Grade Level",
      "Diagnosis",
      "IEP Category",
      "Plan Tier",
      "Notes",
    ];

    const rows = SAMPLE_CRM_CLIENTS.map((c) => ({
      "First Name": c.firstName,
      "Last Name": c.lastName,
      Email: c.email,
      Phone: c.phone,
      Address: c.address,
      City: c.city,
      State: c.state,
      "Zip Code": c.zipCode,
      "Student First Name": c.studentFirstName,
      "Student Last Name": c.studentLastName,
      "School Name": c.schoolName,
      "Grade Level": c.gradeLevel,
      Diagnosis: c.diagnosis,
      "IEP Category": c.iepEligibility,
      "Plan Tier": c.planTier,
      Notes: c.notes,
    }));

    setCsvHeaders(headers);
    setRawRows(rows);
    const inferred = inferFieldMapping(headers);
    setFieldMapping(inferred);
    setImportResult(null);
    toast.success("Loaded 5 realistic IEP client records for instant testing");
  };

  // Download official Waypoint CSV Template
  const handleDownloadTemplate = () => {
    const csvContent = [
      "First Name,Last Name,Email,Phone,Street Address,City,State,Zip Code,Student First Name,Student Last Name,School Name,Grade Level,Diagnosis,Plan Type,Plan Tier,Notes",
      'Jane,Doe,jane.doe@example.com,(404) 555-0100,123 Main St,Atlanta,GA,30303,Alex,Doe,North Atlanta High,10th Grade,"ADHD, Dyslexia",IEP,$55,Sample imported client note',
      'Robert,Smith,robert.smith@example.com,(770) 555-0102,456 Oak Ave,Marietta,GA,30060,Emma,Smith,Walton High,8th Grade,Autism Spectrum,IEP,$105,Speech services review requested',
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "waypoint-crm-clients-import-template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Downloaded Waypoint CSV Template");
  };

  // Execute Bulk Import
  const handleExecuteImport = () => {
    if (mappedClients.length === 0) {
      toast.error("No valid client records to import. Please upload a CSV file or load sample data.");
      return;
    }

    setIsProcessing(true);
    bulkImportMutation.mutate({
      sourceCrm: CRM_PRESETS.find((p) => p.id === selectedCrm)?.name || "External CRM",
      duplicateStrategy,
      defaultPlanTier,
      defaultPipelineStage,
      clients: mappedClients,
    });
  };

  // Reset importer
  const handleReset = () => {
    setRawRows([]);
    setCsvHeaders([]);
    setFileName("");
    setRawText("");
    setImportResult(null);
  };

  return (
    <div className="space-y-6">
      {/* ── TOP ADMIRALTY BANNER ────────────────────────────────────────── */}
      <div className="rounded-xl border border-[#3A2C18] bg-[#05142B]/90 p-5 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)]">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-[#DFBE77] uppercase tracking-wider">
                Practice Rosters & Migration Hub
              </span>
              <PageIdBadge id="PG-024-IMP" name="Client CRM Import" />
              <Badge variant="outline" className="bg-[#020A17] text-[#FFE394] border border-[#3A2C18] text-[10px]">
                D1 Batch Ingestion
              </Badge>
            </div>
            <h2 className="text-lg md:text-xl font-serif font-bold text-[#FFF4D4] flex items-center gap-2">
              <UploadCloud className="h-5 w-5 text-[#FFE394]" />
              Import Existing Clients from Other CRM
            </h2>
            <p className="text-xs text-[#C6B697] max-w-3xl leading-relaxed">
              Seamlessly migrate historical families, students, and case notes into Waypoint Advocates. Automatically maps client contact info, child IEP details, generates official <code className="text-[#FFE394] font-mono">WP-2026-XXXX</code> Case IDs, and resolves national geographic coordinates.
            </p>
          </div>

          <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
            <Button
              onClick={handleDownloadTemplate}
              variant="outline"
              size="sm"
              className="border border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] text-xs h-9 font-semibold cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 mr-1.5 text-[#DFBE77]" />
              CSV Template
            </Button>
            <Button
              onClick={handleLoadSample}
              size="sm"
              className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs h-9 px-4 shadow-[0_3px_10px_rgba(0,0,0,0.8)] border border-[#FFE394]/50 hover:brightness-105 cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              Load Sample Roster (5 Clients)
            </Button>
          </div>
        </div>
      </div>

      {/* ── MODE SELECTOR TABS ────────────────────────────────────────── */}
      <div className="flex items-center gap-3 border-b border-[#3A2C18]/80 pb-4">
        <div className="flex items-center gap-2 p-1 rounded-xl bg-[#020A17] border border-[#3A2C18] w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveMode("express")}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeMode === "express"
                ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] shadow-[0_2px_8px_rgba(0,0,0,0.6)] font-bold"
                : "text-[#C6B697] hover:text-[#FFF4D4] hover:bg-[#07162B]"
            }`}
          >
            <Zap className={`w-3.5 h-3.5 ${activeMode === "express" ? "text-[#07162B] fill-current" : "text-[#DFBE77]"}`} />
            <span>⚡ 30-Second Quick Setup (Parent & Student Name)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMode("batch")}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeMode === "batch"
                ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] shadow-[0_2px_8px_rgba(0,0,0,0.6)] font-bold"
                : "text-[#C6B697] hover:text-[#FFF4D4] hover:bg-[#07162B]"
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>📁 Batch CRM / CSV Ingestion (Multiple Clients)</span>
          </button>
        </div>
      </div>

      {activeMode === "express" ? (
        <div className="space-y-4">
          <ExpressStudentSetupCard />
          <div className="p-4 rounded-xl border border-[#3A2C18] bg-[#020A17]/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#C6B697]">
            <div className="flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-[#DFBE77]" />
              <span>Have a complete CSV or client roster exported from HoneyBook, Dubsado, HubSpot, or Clio?</span>
            </div>
            <button
              onClick={() => setActiveMode("batch")}
              className="text-[#FFE394] hover:underline font-bold inline-flex items-center gap-1 cursor-pointer"
            >
              Switch to Batch CRM Ingestion →
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* ── STEP 1: SOURCE CRM PRESETS ─────────────────────────────────── */}
          <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-[#A69371] flex items-center gap-1.5">
            <span>Step 1: Choose Source CRM / Platform</span>
          </label>
          <span className="text-[11px] text-[#C6B697]">
            Active Preset: <span className="text-[#FFE394] font-bold">{CRM_PRESETS.find((p) => p.id === selectedCrm)?.name}</span>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {CRM_PRESETS.map((preset) => {
            const isSelected = selectedCrm === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => setSelectedCrm(preset.id)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? "bg-[#071E3D] border-2 border-[#FFE394] shadow-[0_0_16px_rgba(197,160,89,0.3)] text-[#FFF4D4]"
                    : "bg-[#05142B]/90 border border-[#3A2C18] text-[#C6B697] hover:border-[#C5A059]/60 hover:text-[#FFF4D4]"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-[#A69371]">{preset.category}</span>
                    <Badge variant="outline" className="text-[9px] px-1 py-0 bg-[#020A17] border-[#3A2C18] text-[#FFE394]">
                      {preset.badge}
                    </Badge>
                  </div>
                  <h4 className="text-xs font-serif font-bold text-[#FFF4D4] leading-tight pt-0.5">{preset.name}</h4>
                </div>
                {isSelected && (
                  <div className="mt-2 pt-1 border-t border-[#FFE394]/30 flex items-center gap-1 text-[10px] text-[#FFE394] font-bold">
                    <CheckCircle2 className="w-3 h-3" /> Selected
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── STEP 2: FILE UPLOAD OR DATA DROPZONE ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Dropzone */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="rounded-xl border border-[#3A2C18] bg-[#05142B]/90 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)]">
            <CardHeader className="pb-3 border-b border-[#3A2C18]/60">
              <CardTitle className="text-sm font-serif font-bold text-[#FFF4D4] flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-[#FFE394]" />
                  Step 2: Upload CSV File or Paste Spreadsheet Data
                </span>
                {fileName && (
                  <Badge variant="outline" className="bg-[#020A17] text-emerald-400 border-emerald-500/30 text-[10px]">
                    ✓ {fileName}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {/* Dropzone Box */}
              <div
                onClick={() => document.getElementById("crm-csv-file-input")?.click()}
                className="border-2 border-dashed border-[#3A2C18] hover:border-[#DFBE77] bg-[#020A17]/80 rounded-xl p-6 text-center cursor-pointer transition-all group"
              >
                <input
                  id="crm-csv-file-input"
                  type="file"
                  accept=".csv,.tsv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-xl bg-[#05142B] border border-[#3A2C18] flex items-center justify-center mx-auto mb-3 text-[#DFBE77] group-hover:scale-110 transition-transform">
                  <UploadCloud className="h-6 w-6" />
                </div>
                <h4 className="text-xs font-serif font-bold text-[#FFF4D4]">
                  Click to Browse or Drag & Drop CRM Export File
                </h4>
                <p className="text-[11px] text-[#A69371] mt-1">
                  Supports .csv, .tsv, and comma-delimited export files from HoneyBook, Dubsado, HubSpot, or Excel.
                </p>
                {rawRows.length > 0 && (
                  <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {rawRows.length} client rows parsed ready for ingestion
                  </div>
                )}
              </div>

              {/* Paste directly toggle */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-[#C6B697]">Or Paste CSV Text Directly:</label>
                  {rawText && (
                    <button
                      onClick={() => setRawText("")}
                      className="text-[10px] text-red-400 hover:underline cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <Textarea
                  value={rawText}
                  onChange={(e) => processUploadedCsv(e.target.value, "pasted-crm-data.csv")}
                  placeholder={`First Name,Last Name,Email,Phone,Student First Name,Grade Level,School Name,City,State\nSarah,Jenkins,sarah.j@example.com,(404) 555-0182,Liam,9th Grade,Midtown High,Atlanta,GA`}
                  rows={3}
                  className="bg-[#020A17] border border-[#3A2C18] text-[#FFF4D4] font-mono text-[11px] leading-relaxed placeholder:text-[#3A2C18]"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Ingestion & Duplicate Settings */}
        <div className="space-y-4">
          <Card className="rounded-xl border border-[#3A2C18] bg-[#05142B]/90 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)]">
            <CardHeader className="pb-3 border-b border-[#3A2C18]/60">
              <CardTitle className="text-sm font-serif font-bold text-[#FFF4D4] flex items-center gap-2">
                <Compass className="h-4 w-4 text-[#FFE394]" />
                Step 3: Migration Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-xs">
              {/* Duplicate Strategy */}
              <div className="space-y-1.5">
                <label className="font-bold text-[#A69371] uppercase tracking-wider text-[10px]">
                  Duplicate Contact Strategy
                </label>
                <Select
                  value={duplicateStrategy}
                  onValueChange={(val: any) => setDuplicateStrategy(val)}
                >
                  <SelectTrigger className="bg-[#020A17] border border-[#3A2C18] text-[#FFF4D4] text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#05142B] border border-[#3A2C18] text-[#FFF4D4]">
                    <SelectItem value="skip">🛡️ Skip Duplicates (Match by Email or Phone)</SelectItem>
                    <SelectItem value="update">🔄 Update Existing Records with New Info</SelectItem>
                    <SelectItem value="create_new">➕ Always Create New (Unique Case ID)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-[#C6B697]">
                  Waypoint will check against Byron&apos;s current {contactsData?.length || 0} contacts.
                </p>
              </div>

              {/* Default Plan Tier */}
              <div className="space-y-1.5">
                <label className="font-bold text-[#A69371] uppercase tracking-wider text-[10px]">
                  Default Waypoint Support Tier
                </label>
                <Select value={defaultPlanTier} onValueChange={setDefaultPlanTier}>
                  <SelectTrigger className="bg-[#020A17] border border-[#3A2C18] text-[#FFF4D4] text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#05142B] border border-[#3A2C18] text-[#FFF4D4]">
                    <SelectItem value="$55">$55/mo — Self-Advocacy Core</SelectItem>
                    <SelectItem value="$105">$105/mo — Active Case Management</SelectItem>
                    <SelectItem value="Scholarship">Scholarship / Pro Bono ($0/mo)</SelectItem>
                    <SelectItem value="Pay Per Use">Pay Per Use / Hourly</SelectItem>
                    <SelectItem value="Tools Only">Tools Only ($30/mo)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-[#C6B697]">
                  Applied if the imported row does not specify a support tier.
                </p>
              </div>

              {/* Default Pipeline Stage */}
              <div className="space-y-1.5">
                <label className="font-bold text-[#A69371] uppercase tracking-wider text-[10px]">
                  Default Pipeline Stage
                </label>
                <Select value={defaultPipelineStage} onValueChange={setDefaultPipelineStage}>
                  <SelectTrigger className="bg-[#020A17] border border-[#3A2C18] text-[#FFF4D4] text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#05142B] border border-[#3A2C18] text-[#FFF4D4]">
                    <SelectItem value="Active">Active Case</SelectItem>
                    <SelectItem value="Onboarding">Onboarding</SelectItem>
                    <SelectItem value="Discovery">Discovery</SelectItem>
                    <SelectItem value="Renewal Needed">Renewal Needed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── STEP 3: COLUMN MAPPING MATRIX (WHEN CSV LOADED) ─────────────── */}
      {csvHeaders.length > 0 && (
        <Card className="rounded-xl border border-[#3A2C18] bg-[#05142B]/90 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)]">
          <CardHeader className="pb-3 border-b border-[#3A2C18]/60">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="text-sm font-serif font-bold text-[#FFF4D4] flex items-center gap-2">
                  <Layers className="h-4 w-4 text-[#FFE394]" />
                  Step 4: Smart Column Mapping Matrix
                </CardTitle>
                <CardDescription className="text-xs text-[#C6B697] mt-0.5">
                  Confirm how fields in your {CRM_PRESETS.find((p) => p.id === selectedCrm)?.name} export connect to Waypoint database columns.
                </CardDescription>
              </div>
              <span className="text-[11px] font-mono text-[#FFE394] bg-[#020A17] px-2.5 py-1 rounded-md border border-[#3A2C18]">
                {Object.keys(fieldMapping).length} / {csvHeaders.length} Columns Mapped
              </span>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {csvHeaders.map((header) => {
                const currentMappedField = fieldMapping[header] || "none";
                return (
                  <div
                    key={header}
                    className="p-2.5 rounded-lg border border-[#3A2C18] bg-[#020A17]/80 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-mono text-[#FFF4D4] truncate font-semibold" title={header}>
                        {header}
                      </span>
                      {currentMappedField !== "none" ? (
                        <span className="text-emerald-400 font-bold text-[10px]">Mapped</span>
                      ) : (
                        <span className="text-[#A69371] text-[10px]">Ignored</span>
                      )}
                    </div>
                    <Select
                      value={currentMappedField}
                      onValueChange={(val) => {
                        setFieldMapping((prev) => ({
                          ...prev,
                          [header]: val === "none" ? "" : val,
                        }));
                      }}
                    >
                      <SelectTrigger className="bg-[#05142B] border border-[#3A2C18] text-[#FFF4D4] text-xs h-7">
                        <SelectValue placeholder="Map to Waypoint field" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#05142B] border border-[#3A2C18] text-[#FFF4D4] max-h-60">
                        <SelectItem value="none">-- Don&apos;t Import --</SelectItem>
                        <SelectItem value="firstName">Parent / Client First Name</SelectItem>
                        <SelectItem value="lastName">Parent / Client Last Name</SelectItem>
                        <SelectItem value="fullName">Full Name (Combined)</SelectItem>
                        <SelectItem value="email">Primary Email</SelectItem>
                        <SelectItem value="phone">Primary Phone</SelectItem>
                        <SelectItem value="studentFirstName">Student First Name</SelectItem>
                        <SelectItem value="studentLastName">Student Last Name</SelectItem>
                        <SelectItem value="studentName">Student Full Name</SelectItem>
                        <SelectItem value="schoolName">School Name</SelectItem>
                        <SelectItem value="gradeLevel">Grade Level</SelectItem>
                        <SelectItem value="dateOfBirth">Date of Birth</SelectItem>
                        <SelectItem value="diagnosis">Diagnosis / Medical</SelectItem>
                        <SelectItem value="iepEligibility">IEP Eligibility Category</SelectItem>
                        <SelectItem value="planType">Plan Type (IEP / 504)</SelectItem>
                        <SelectItem value="address">Street Address</SelectItem>
                        <SelectItem value="city">City</SelectItem>
                        <SelectItem value="state">State</SelectItem>
                        <SelectItem value="zipCode">Zip Code</SelectItem>
                        <SelectItem value="planTier">Plan Tier ($55 / $105)</SelectItem>
                        <SelectItem value="pipelineStage">Pipeline Stage</SelectItem>
                        <SelectItem value="hourlyRate">Hourly Rate ($)</SelectItem>
                        <SelectItem value="company">Company / Household</SelectItem>
                        <SelectItem value="notes">Historical Notes</SelectItem>
                        <SelectItem value="howHeardAboutUs">Lead Source</SelectItem>
                        <SelectItem value="referredBy">Referred By</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── STEP 4: LIVE ROSTER PREVIEW & ACTION BAR ─────────────────────── */}
      {mappedClients.length > 0 && (
        <Card className="rounded-xl border border-[#3A2C18] bg-[#05142B]/90 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)]">
          <CardHeader className="pb-3 border-b border-[#3A2C18]/60">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-serif font-bold text-[#FFF4D4] flex items-center gap-2">
                  <Users className="h-4 w-4 text-[#FFE394]" />
                  Step 5: Review {mappedClients.length} Clients Before Ingestion
                </CardTitle>
                <CardDescription className="text-xs text-[#C6B697] mt-0.5">
                  Confirm the roster before writing to the Cloudflare D1 database.
                </CardDescription>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Input
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Filter preview..."
                  className="bg-[#020A17] border border-[#3A2C18] text-[#FFF4D4] text-xs h-8 max-w-xs"
                />
                <Button
                  onClick={handleExecuteImport}
                  disabled={isProcessing}
                  className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs h-9 px-5 shadow-[0_3px_10px_rgba(0,0,0,0.8)] border border-[#FFE394]/50 hover:brightness-105 cursor-pointer shrink-0"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      Ingesting Roster...
                    </>
                  ) : (
                    <>
                      <UploadCloud className="h-3.5 w-3.5 mr-1.5" />
                      Import {mappedClients.length} Clients Now
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4 p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#020A17] text-[#A69371] uppercase text-[10px] font-bold border-b border-[#3A2C18]">
                  <tr>
                    <th className="py-2.5 px-4">#</th>
                    <th className="py-2.5 px-4">Client / Parent</th>
                    <th className="py-2.5 px-4">Student</th>
                    <th className="py-2.5 px-4">School & Grade</th>
                    <th className="py-2.5 px-4">Contact Info</th>
                    <th className="py-2.5 px-4">Location</th>
                    <th className="py-2.5 px-4">Plan Tier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#3A2C18]/60">
                  {filteredPreview.map((client, idx) => (
                    <tr key={idx} className="hover:bg-[#071E3D]/50 transition-colors">
                      <td className="py-2.5 px-4 text-[#A69371] font-mono text-[11px]">{idx + 1}</td>
                      <td className="py-2.5 px-4">
                        <div className="font-bold text-[#FFF4D4]">
                          {client.firstName} {client.lastName}
                        </div>
                        {client.company && (
                          <div className="text-[10px] text-[#A69371]">{client.company}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-4">
                        {client.studentFirstName ? (
                          <div>
                            <span className="font-bold text-[#FFE394]">
                              {client.studentFirstName} {client.studentLastName || client.lastName}
                            </span>
                            {client.diagnosis && (
                              <div className="text-[10px] text-[#C6B697] truncate max-w-xs" title={client.diagnosis}>
                                {client.diagnosis}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[#A69371] italic text-[11px]">Direct Client Profile</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="text-[#FFF4D4]">{client.schoolName || "—"}</div>
                        <div className="text-[10px] text-[#DFBE77]">{client.gradeLevel || client.planType || "IEP"}</div>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[11px]">
                        <div className="text-[#FFF4D4]">{client.email || "—"}</div>
                        <div className="text-[#C6B697] text-[10px]">{client.phone || "—"}</div>
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-1 text-[#FFF4D4]">
                          <MapPin className="h-3 w-3 text-[#DFBE77]" />
                          {client.city && client.state ? `${client.city}, ${client.state}` : client.city || "—"}
                        </div>
                        {client.zipCode && (
                          <div className="text-[10px] font-mono text-[#A69371]">{client.zipCode}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-4">
                        <Badge variant="outline" className="bg-[#020A17] text-[#FFE394] border-[#3A2C18] text-[10px]">
                          {client.planTier || defaultPlanTier}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── STEP 5: SUCCESS / SUMMARY TELEMETRY CARD ─────────────────────── */}
      {importResult && (
        <Card className="rounded-xl border-2 border-emerald-500/50 bg-[#05142B]/95 shadow-[0_12px_32px_rgba(0,0,0,0.9),0_0_24px_rgba(16,185,129,0.2)]">
          <CardHeader className="pb-3 border-b border-emerald-500/30 bg-emerald-950/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-900/60 border border-emerald-500 flex items-center justify-center text-emerald-300">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <CardTitle className="text-base font-serif font-bold text-[#FFF4D4]">
                    Migration Completed Successfully!
                  </CardTitle>
                  <CardDescription className="text-xs text-emerald-300/80">
                    Imported into Waypoint Advocates with D1 data integrity, Case IDs, and geocoding.
                  </CardDescription>
                </div>
              </div>
              <Button
                onClick={handleReset}
                variant="outline"
                size="sm"
                className="border border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] text-xs h-8 cursor-pointer"
              >
                Import Another Batch
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-5 space-y-5">
            {/* Stat Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl border border-[#3A2C18] bg-[#020A17] text-center">
                <div className="text-[10px] font-bold text-[#A69371] uppercase">Total Processed</div>
                <div className="text-xl font-serif font-bold text-[#FFF4D4] mt-1">{importResult.totalProcessed}</div>
              </div>
              <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-950/30 text-center">
                <div className="text-[10px] font-bold text-emerald-400 uppercase">Newly Created</div>
                <div className="text-xl font-serif font-bold text-emerald-300 mt-1">{importResult.importedCount}</div>
              </div>
              <div className="p-3 rounded-xl border border-sky-500/30 bg-sky-950/30 text-center">
                <div className="text-[10px] font-bold text-sky-400 uppercase">Updated Records</div>
                <div className="text-xl font-serif font-bold text-sky-300 mt-1">{importResult.updatedCount}</div>
              </div>
              <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-950/30 text-center">
                <div className="text-[10px] font-bold text-amber-400 uppercase">Duplicates Skipped</div>
                <div className="text-xl font-serif font-bold text-amber-300 mt-1">{importResult.skippedCount}</div>
              </div>
            </div>

            {/* Created Contacts List */}
            {importResult.createdContacts && importResult.createdContacts.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase text-[#DFBE77] tracking-wider">
                  Newly Created Waypoint Roster:
                </h4>
                <div className="max-h-48 overflow-y-auto space-y-1 rounded-lg border border-[#3A2C18] bg-[#020A17] p-2">
                  {importResult.createdContacts.map((c: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-1 px-2 rounded hover:bg-[#071E3D] text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-[#DFBE77] font-bold">{c.caseId}</span>
                        <span className="text-[#FFF4D4] font-medium">{c.name}</span>
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-[#00102F] border-[#3A2C18] text-[#FFE394]">
                          {c.role}
                        </Badge>
                      </div>
                      <span className="text-[#A69371] font-mono text-[10px]">{c.email || "No email"}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Skipped contacts if any */}
            {importResult.skippedContacts && importResult.skippedContacts.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase text-amber-400 tracking-wider">
                  Skipped Duplicates:
                </h4>
                <div className="max-h-32 overflow-y-auto space-y-1 rounded-lg border border-amber-500/20 bg-[#020A17] p-2 text-xs">
                  {importResult.skippedContacts.map((sc: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-[#C6B697]">
                      <span>{sc.name} ({sc.email || "Phone match"})</span>
                      <span className="text-amber-400 text-[10px]">{sc.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons to View Results Across CRM */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <a href="/contacts">
                <Button className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs px-4 h-9 shadow-sm cursor-pointer hover:brightness-105">
                  <Users className="w-3.5 h-3.5 mr-1.5" />
                  View in Contacts Ledger (PG-002)
                </Button>
              </a>
              <a href="/students">
                <Button variant="outline" className="border border-[#3A2C18] bg-[#020A17] text-[#FFE394] hover:bg-[#07162B] text-xs h-9 font-semibold cursor-pointer">
                  <FolderArchive className="w-3.5 h-3.5 mr-1.5 text-[#DFBE77]" />
                  View in Students Cabinet (PG-004)
                </Button>
              </a>
              <a href="/national-coverage">
                <Button variant="outline" className="border border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] text-xs h-9 font-semibold cursor-pointer">
                  <MapPin className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                  View on National Coverage Map (PG-041)
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>
      )}
        </>
      )}
    </div>
  );
}

