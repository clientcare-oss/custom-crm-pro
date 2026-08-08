import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Wand2, Sparkles, Plus, Trash2, Download, Upload, Printer, Check,
  Compass, Brain, FileText, RefreshCw, Palette, Edit3, Eye, Settings,
  ArrowLeft, CheckSquare, GraduationCap, Clock, Heart, ArrowRight,
  School, Milestone, X, Info, Smile, Meh, Frown, Save, FolderOpen, LayoutGrid, HelpCircle, AlignLeft, Grid, User, RotateCcw,
  Calendar, Search, FilePlus2, CloudRain, Cloud, Sun
} from "lucide-react";

// Theme Configurations
const THEMES = {
  navy: {
    name: "Classic Navy & Gold",
    primaryBg: "bg-[#0F2537]",
    primaryText: "text-[#0F2537]",
    primaryBorder: "border-[#0F2537]",
    accentBg: "bg-[#D4AF37]",
    accentText: "text-[#D4AF37]",
    accentBorder: "border-[#D4AF37]",
    accentHex: "#D4AF37",
    paperBg: "bg-[#F8FAFC]",
    hoverBg: "hover:bg-[#0F2537]/5",
  },
  emerald: {
    name: "Deep Emerald & Gold",
    primaryBg: "bg-[#064E3B]",
    primaryText: "text-[#064E3B]",
    primaryBorder: "border-[#064E3B]",
    accentBg: "bg-[#EAB308]",
    accentText: "text-[#EAB308]",
    accentBorder: "border-[#EAB308]",
    accentHex: "#EAB308",
    paperBg: "bg-[#F4F6F5]",
    hoverBg: "hover:bg-[#064E3B]/5",
  },
  slate: {
    name: "Sleek Slate & Bronze",
    primaryBg: "bg-[#1E293B]",
    primaryText: "text-[#1E293B]",
    primaryBorder: "border-[#1E293B]",
    accentBg: "bg-[#B45309]",
    accentText: "text-[#B45309]",
    accentBorder: "border-[#B45309]",
    accentHex: "#B45309",
    paperBg: "bg-[#F1F5F9]",
    hoverBg: "hover:bg-[#1E293B]/5",
  },
  burgundy: {
    name: "Royal Burgundy & Gold",
    primaryBg: "bg-[#4C0519]",
    primaryText: "text-[#4C0519]",
    primaryBorder: "border-[#4C0519]",
    accentBg: "bg-[#F59E0B]",
    accentText: "text-[#F59E0B]",
    accentBorder: "border-[#F59E0B]",
    accentHex: "#F59E0B",
    paperBg: "bg-[#FFFBEB]",
    hoverBg: "hover:bg-[#4C0519]/5",
  }
};

type ThemeKey = keyof typeof THEMES;

const DEFAULT_BRAND = {
  title: "WAYPOINT",
  subtitle: "ADVOCATES",
  docMainTitle: "PREPARE FOR YOUR DISCOVERY CALL",
  docTagline: "Helping us understand your student before we meet.",
  phone: "(317) 743-0500",
  website: "waypointadvocates.com",
  location: "Indiana",
  aiDirective: "Ensure tone is highly professional, warm, empathetic, and clear for families seeking special education guidance.",
  logoHeight: 64,
};

// ── PRE-BUILT WORKSHEET SCHEMAS ─────────────────────────────────────────────

const TEMPLATE_DISCOVERY = {
  docMainTitle: "PREPARE FOR YOUR DISCOVERY CALL",
  docTagline: "Helping us understand your student before we meet.",
  quote: "Thank you! We look forward to meeting with you.",
  metaFields: [
    { label: "Student:", valueKey: "student_name" },
    { label: "Date:", valueKey: "doc_date" },
    { label: "Caregiver:", valueKey: "caregiver_name" }
  ],
  dontNeedTo: {
    title: "YOU DON'T NEED TO:",
    items: [
      "Know special education law before we meet.",
      "Have the perfect words.",
      "Have every document ready."
    ],
    script: "Just tell us your story.\nWe'll help you navigate the rest."
  },
  introText: "Thank you for scheduling your Discovery Call with Waypoint Advocates. This worksheet is designed to help you organize your thoughts before our conversation. There are no right or wrong answers. Complete as much or as little as you'd like.",
  sections: [
    {
      id: "story",
      type: "text_prompts",
      title: "1. TELL US YOUR STORY",
      subtitle: "Take a few minutes to tell us about your student.",
      prompts: [
        "What has been happening?",
        "What concerns you the most?",
        "What has the school tried?",
        "What has worked?",
        "What hasn't?"
      ]
    },
    {
      id: "questions",
      type: "questions",
      title: "2. TOP QUESTIONS",
      subtitle: "What are the three biggest questions you'd like answered?",
      prompts: ["First Question", "Second Question", "Third Question"]
    },
    {
      id: "topics",
      type: "checkbox_groups",
      title: "3. WHAT WOULD YOU LIKE TO DISCUSS?",
      subtitle: "Check any topics you'd like to discuss during your Discovery Call.",
      categories: [
        {
          id: "learning",
          title: "LEARNING & ACADEMICS",
          icon: "GraduationCap",
          items: ["Reading", "Writing", "Math", "Executive Functioning", "Homework", "Gifted / Twice Exceptional (2e)"]
        },
        {
          id: "evaluations",
          title: "EVALUATIONS & SCHOOL SUPPORTS",
          icon: "FileText",
          items: ["Evaluation Request", "IEE", "Eligibility", "IEP", "Section 504", "Accommodations", "Related Services", "Placement", "LRE", "Progress Monitoring", "Assistive Tech", "AAC / Communication Device"]
        },
        {
          id: "neuro",
          title: "NEURODEVELOPMENT & BEHAVIOR",
          icon: "Brain",
          items: ["Autism", "ADHD", "Rare Disability / Diagnosis", "Developmental Delay", "Intellectual Disability", "Medical Condition", "Anxiety", "Depression", "Behavioral Concerns", "Emotional Regulation", "Sensory Needs", "Social Skills", "Self-Advocacy", "Other Diagnosis"]
        },
        {
          id: "therapies",
          title: "THERAPIES & RELATED SERVICES",
          icon: "Heart",
          items: ["Speech Therapy", "Occupational Therapy (OT)", "Physical Therapy (PT)", "Counseling / Mental Health", "Behavioral Supports", "Vision", "Hearing"]
        },
        {
          id: "environment",
          title: "SCHOOL ENVIRONMENT",
          icon: "School",
          items: ["Bullying", "Discipline / Suspension", "Safety Concerns", "Transportation", "Communication with School", "Parent Participation"]
        },
        {
          id: "schoolday",
          title: "PARTS OF THE SCHOOL DAY",
          icon: "Clock",
          items: ["Arrival", "Bus", "Hallways", "Classroom", "Class Transitions", "Small Groups", "Lunch", "Recess", "Art / Music / PE", "Assemblies", "Bathroom / Toileting", "Feeding / Eating", "Dismissal", "After-School Program", "Field Trips"]
        },
        {
          id: "dailyliving",
          title: "DAILY LIVING & INDEPENDENCE",
          icon: "Heart",
          items: ["Bathroom / Toileting", "Feeding / Eating", "Dressing", "Fine Motor Skills", "Handwriting", "Organization", "Following Directions", "Independence"]
        },
        {
          id: "transitions",
          title: "SCHOOL TRANSITIONS",
          icon: "Milestone",
          items: ["Preschool → Kindergarten", "Elementary → Middle School", "Middle → High School", "Graduation / Transition Planning"]
        }
      ]
    },
    {
      id: "hoping_changes",
      type: "text_area",
      title: "4. WHAT ARE YOU HOPING CHANGES?",
      subtitle: "When our Discovery Call is over... What would make you feel like our time together was successful?"
    },
    {
      id: "one_last_question",
      type: "text_area",
      title: "5. ONE LAST QUESTION",
      subtitle: "If your child's teacher could understand just ONE thing about your child before school started tomorrow... What would you want them to know?"
    },
    {
      id: "documents",
      type: "document_request",
      title: "6. DOCUMENTS WE MAY REQUEST AFTER YOUR CALL",
      subtitle: "After your Discovery Call, we may ask you to upload documents through your secure Waypoint Client Portal, such as:",
      items: ["Current IEP or 504 Plan", "Progress Reports", "Behavior Plans", "Medical or Therapy Reports", "Evaluations", "Report Cards", "School Emails", "Other Educational Records"],
      bubbleText: "Don't worry about gathering these before your Discovery Call. We'll let you know exactly which documents are helpful after we better understand your situation."
    }
  ]
};

const TEMPLATE_MELTDOWN = {
  docMainTitle: "MELTDOWN REFLECTION WORKSHEET",
  docTagline: "Understand. Support. Strengthen.",
  quote: "Reflection is not about perfection. It's about progress. Your love and consistency make the biggest difference.",
  metaFields: [
    { label: "Child's Name:", valueKey: "child_name" },
    { label: "Date of Incident:", valueKey: "incident_date" },
    { label: "Age:", valueKey: "child_age" },
    { label: "Time of Incident:", valueKey: "incident_time" },
    { label: "Location of Incident:", valueKey: "incident_location" }
  ],
  dontNeedTo: null,
  introText: "Use this worksheet to reflect on a recent meltdown. Understanding what happened can help you support your child more effectively in the future.",
  sections: [
    {
      id: "before",
      type: "text_area",
      title: "1. BEFORE THE MELTDOWN",
      subtitle: "What happened leading up to the meltdown? Consider events, transitions, demands, environments, or anything that may have contributed."
    },
    {
      id: "triggers",
      type: "checkbox_groups",
      title: "2. TRIGGERS",
      subtitle: "What do you think may have triggered the meltdown? Check all that apply.",
      categories: [
        {
          id: "triggers_list",
          title: "POTENTIAL TRIGGERS",
          icon: "Milestone",
          items: ["Transition / Change", "Communication Difficulty", "Overstimulation", "Task Demands", "Sensory Overload", "Fatigue / Tiredness", "Hunger / Thirst", "Other"]
        }
      ]
    },
    {
      id: "during",
      type: "text_area",
      title: "3. DURING THE MELTDOWN",
      subtitle: "What behaviors did you observe?"
    },
    {
      id: "response",
      type: "text_area",
      title: "4. HOW YOU RESPONDED",
      subtitle: "What strategies did you use to support your child?"
    },
    {
      id: "helped",
      type: "text_area",
      title: "5. WHAT HELPED",
      subtitle: "What, if anything, helped reduce or end the meltdown?"
    },
    {
      id: "next_time",
      type: "text_area",
      title: "6. WHAT YOU WILL TRY NEXT TIME",
      subtitle: "What can you do differently next time to help prevent or better support your child?"
    },
    {
      id: "additional_notes",
      type: "text_area",
      title: "ADDITIONAL NOTES",
      subtitle: "Any other thoughts, observations, or important details."
    }
  ]
};

const TEMPLATE_BEHAVIOR_LOG = {
  docMainTitle: "DAILY BEHAVIOR & WELLNESS LOG",
  docTagline: "POST-CRISIS HOME MONITORING",
  quote: "You're doing an important job. Small steps forward matter.",
  metaFields: [
    { label: "Student:", valueKey: "student_name" },
    { label: "Date:", valueKey: "log_date" },
    { label: "Caregiver:", valueKey: "caregiver_name" }
  ],
  dontNeedTo: null,
  introText: "This worksheet is intended to help families observe patterns, support recovery, and communicate with healthcare providers, therapists, and school teams.",
  sections: [
    {
      id: "overview_day",
      type: "smiley_overview",
      title: "OVERVIEW OF THE DAY",
      subtitle: "Rate the overall day:"
    },
    {
      id: "basic_metrics",
      type: "checkbox_groups",
      title: "DAILY METRICS & WELLNESS",
      subtitle: "Log key physiological indicators for today:",
      categories: [
        {
          id: "sleep",
          title: "SLEEP LAST NIGHT",
          icon: "Clock",
          items: ["Restful sleep", "Interrupted sleep", "Difficulty falling asleep", "Nightmares"]
        },
        {
          id: "appetite",
          title: "APPETITE TODAY",
          icon: "Heart",
          items: ["Poor appetite", "Fair appetite", "Good appetite"]
        },
        {
          id: "energy",
          title: "ENERGY LEVEL",
          icon: "Milestone",
          items: ["Low energy", "Normal energy", "High energy"]
        }
      ]
    },
    {
      id: "emotional_behavioral",
      type: "checkbox_groups",
      title: "EMOTIONAL CHECK-IN & OBSERVED BEHAVIORS",
      subtitle: "Document observed moods, behaviors, and triggers noticed today:",
      categories: [
        {
          id: "moods",
          title: "MOOD & ANXIETY",
          icon: "Brain",
          items: ["Happy", "Calm", "Neutral", "Worried", "Sad", "Angry", "Overwhelmed", "Mild Anxiety", "Moderate Anxiety", "High Anxiety"]
        },
        {
          id: "behaviors",
          title: "BEHAVIORS OBSERVED",
          icon: "GraduationCap",
          items: ["Calm / Cooperative", "Restless / Withdrawn", "Irritable / Easily Frustrated", "Tearful / Social", "Arguing / Aggressive", "Elopement Attempt", "Self-Injury / Talked about Self-Harm"]
        },
        {
          id: "triggers",
          title: "TRIGGERS NOTICED",
          icon: "Milestone",
          items: ["Change in Routine", "School/Academic Stress", "Family Conflict", "Sensory Overload", "Loud Noise", "Hunger / Fatigue", "Screen Time", "Being Told 'No'"]
        }
      ]
    },
    {
      id: "observations_table",
      type: "events_table",
      title: "EVENTS & OBSERVATIONS LOG",
      subtitle: "List key events, behaviors, and responses throughout the day:",
      headers: ["TIME", "SITUATION / WHAT HAPPENED?", "CHILD'S RESPONSE", "PARENT / CAREGIVER RESPONSE"]
    },
    {
      id: "coping_safety",
      type: "checkbox_groups",
      title: "COPING SKILLS & SAFETY OBSERVATIONS",
      subtitle: "Coping skills utilized and safety metrics observed today:",
      categories: [
        {
          id: "coping",
          title: "COPING SKILLS USED",
          icon: "Heart",
          items: ["Deep Breathing", "Quiet Space", "Walk / Exercise", "Music", "Reading", "Weighted Blanket", "Fidget / Sensory Item", "Journal / Mindfulness"]
        },
        {
          id: "safety",
          title: "SAFETY OBSERVATIONS",
          icon: "FileText",
          items: ["No Safety Concerns Today", "Needed Extra Support", "Emotional Escalation", "Verbal Threats", "Unsafe Behavior", "Emergency Services Needed"]
        }
      ]
    },
    {
      id: "notes_goals",
      type: "text_prompts",
      title: "NOTES & TOMORROW'S GOALS",
      subtitle: "Caregiver notes and goals for tomorrow:",
      prompts: [
        "Positive Moments Today:",
        "Parent / Caregiver Notes:",
        "Tomorrow's Goals & Focus:"
      ]
    },
    {
      id: "recovery_progress",
      type: "recovery_progress",
      title: "RECOVERY PROGRESS STATUS",
      subtitle: "Mark recovery progress cycle status for today:"
    }
  ]
};

interface SavedWorksheet {
  id: string;
  name: string;
  templateName: string;
  theme: ThemeKey;
  updatedAt: string;
  brand: typeof DEFAULT_BRAND;
  worksheet: any;
  fill: Record<string, any>;
}

const getSectionIcon = (type: string, index: number) => {
  switch (type) {
    case "text_prompts":
      return <User className="h-5 w-5 text-white" />;
    case "questions":
      if (index === 1) return <Compass className="h-5 w-5 text-white" />;
      if (index === 3) return <Heart className="h-5 w-5 text-white" />;
      return <HelpCircle className="h-5 w-5 text-white" />;
    case "smiley_overview":
      return <Smile className="h-5 w-5 text-white" />;
    case "recovery_progress":
      return <Sun className="h-5 w-5 text-white" />;
    case "checkbox_groups":
      return <CheckSquare className="h-5 w-5 text-white" />;
    case "text_area":
      return <FileText className="h-5 w-5 text-white" />;
    case "document_request":
      return <FolderOpen className="h-5 w-5 text-white" />;
    case "events_table":
      return <Calendar className="h-5 w-5 text-white" />;
    default:
      return <Compass className="h-5 w-5 text-white" />;
  }
};

const renderCategoryIcon = (iconName: string, className: string = "h-4 w-4") => {
  switch (iconName) {
    case "GraduationCap":
      return <GraduationCap className={className} />;
    case "FileText":
      return <FileText className={className} />;
    case "Brain":
      return <Brain className={className} />;
    case "Heart":
      return <Heart className={className} />;
    case "School":
      return <School className={className} />;
    case "Clock":
      return <Clock className={className} />;
    case "Milestone":
      return <Milestone className={className} />;
    default:
      return <Compass className={className} />;
  }
};

const defaultLighthouseSvg = (
  <svg viewBox="0 0 100 100" className="w-16 h-16 shrink-0 text-inherit" fill="currentColor">
    <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2.5" />
    <path d="M50 15 L62 45 L62 82 L38 82 L38 45 Z" fill="none" stroke="currentColor" strokeWidth="2.5" />
    <path d="M38 45 L62 45 M38 58 L62 58 M38 70 L62 70" stroke="currentColor" strokeWidth="2" />
    <path d="M47 25 L53 25 L53 35 L47 35 Z" fill="currentColor" />
    <circle cx="50" cy="21" r="3" fill="currentColor" />
    <path d="M50 21 L15 10 M50 21 L85 10" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6" />
    <path d="M32 82 L68 82" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
  </svg>
);

export default function DiscoveryWorksheetBuilder() {
  const [, setLocation] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset all responses and return this worksheet to its default template structure?")) {
      pushToUndoStack(worksheetData);
      setFillState({});
      handleTemplateChange(activeTemplate);
      toast.info("Worksheet reset to template defaults.");
    }
  };
  const [view, setView] = useState<"hub" | "editor" | "saved-list" | "create-gallery">("hub");
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [activeTheme, setActiveTheme] = useState<ThemeKey>("navy");
  const [activeTemplate, setActiveTemplate] = useState<string>("discovery-call");
  
  // Custom states for default Settings (localStorage)
  const [defaultLogo, setDefaultLogo] = useState<string | null>(null);
  const [brandSettings, setBrandSettings] = useState(DEFAULT_BRAND);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Saved Worksheets List state
  const [savedWorksheets, setSavedWorksheets] = useState<SavedWorksheet[]>([]);
  const [activeWorksheetId, setActiveWorksheetId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Current active worksheet template data state
  const [worksheetData, setWorksheetData] = useState<any>(TEMPLATE_DISCOVERY);

  // Client interactive filled notes state (in Fill mode)
  const [fillState, setFillState] = useState<Record<string, any>>({});
  
  // Modal for AI Rephraser
  const [aiModal, setAiModal] = useState<{
    isOpen: boolean;
    text: string;
    path: string[];
  }>({ isOpen: false, text: "", path: [] });

  const [customAiPrompt, setCustomAiPrompt] = useState("");
  const [isAiRewriting, setIsAiRewriting] = useState(false);

  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | null>(null);
  const [selectedLine, setSelectedLine] = useState<{ sectionId: string; index: number } | null>(null);
  const [printAsBlank, setPrintAsBlank] = useState(true);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [undoStack, setUndoStack] = useState<any[]>([]);

  const pushToUndoStack = (currentState: any) => {
    setUndoStack((prev) => [...prev, JSON.parse(JSON.stringify(currentState))]);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) {
      toast.info("No actions to undo.");
      return;
    }
    const previous = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setWorksheetData(previous);
    toast.success("Action undone.");
  };

  // Autosave draft handler
  useEffect(() => {
    if (view !== "editor") return;
    setSaveStatus("saving");
    const timer = setTimeout(() => {
      localStorage.setItem(
        "waypoint_worksheet_draft",
        JSON.stringify({
          worksheet: worksheetData,
          fill: fillState,
          theme: activeTheme,
          activeId: activeWorksheetId,
        })
      );
      setSaveStatus("saved");
    }, 1200);

    return () => clearTimeout(timer);
  }, [worksheetData, fillState, activeTheme, activeWorksheetId, view]);

  const handleAddPageBreak = () => {
    pushToUndoStack(worksheetData);
    const updatedSections = [
      ...worksheetData.sections,
      {
        id: `page_break_${Date.now()}`,
        type: "page_break"
      }
    ];
    setWorksheetData({ ...worksheetData, sections: updatedSections });
    toast.success("New page boundary added!");
  };

  const handleDeletePageBreak = (pageBreakSectionId: string) => {
    if (window.confirm("Are you sure you want to remove this page break? This will merge this page's content with the previous page.")) {
      pushToUndoStack(worksheetData);
      const updatedSections = worksheetData.sections.filter((s) => s.id !== pageBreakSectionId);
      setWorksheetData({ ...worksheetData, sections: updatedSections });
      toast.info("Page break removed.");
    }
  };

  const handleAddLineBelow = (sectionId: string, index: number) => {
    pushToUndoStack(worksheetData);
    const sIdx = worksheetData.sections.findIndex((s) => s.id === sectionId);
    if (sIdx === -1) return;
    const updatedSections = [...worksheetData.sections];
    const prompts = [...(updatedSections[sIdx].prompts || [])];
    prompts.splice(index + 1, 0, "Custom Note Line");
    updatedSections[sIdx].prompts = prompts;
    setWorksheetData({ ...worksheetData, sections: updatedSections });
    toast.success("Added new note line below.");
  };

  const handleInsertElement = (type: string) => {
    pushToUndoStack(worksheetData);
    let newSection: any = null;
    const timestamp = Date.now();

    switch (type) {
      case "text_prompts":
        newSection = {
          id: `section_prompts_${timestamp}`,
          type: "text_prompts",
          title: "Student Information & Context",
          subtitle: "Please specify basic student demographics and meeting details",
          prompts: ["Student Name", "Current School", "Grade Level", "Parent / Guardian Name", "IEP / 504 Plan Date", "Meeting Date / Time"]
        };
        break;
      case "questions":
        newSection = {
          id: `section_questions_${timestamp}`,
          type: "questions",
          title: "Core Consultation Questions",
          subtitle: "Key concerns and outcomes requested by the family",
          prompts: [
            "What are your student's greatest strengths and positive qualities?",
            "What are your top three concerns regarding their current school support?",
            "What specific outcomes or goals do you want to achieve from this cycle?"
          ],
          rows: 3
        };
        break;
      case "smiley_overview":
        newSection = {
          id: `section_smiley_${timestamp}`,
          type: "smiley_overview",
          title: "Daily Regulation Overview",
          subtitle: "General emotional baseline and mood regulation rating"
        };
        break;
      case "recovery_progress":
        newSection = {
          id: `section_recovery_${timestamp}`,
          type: "recovery_progress",
          title: "Regulation & Behavior Progress Tracker",
          subtitle: "Visual tracking of stability and escalation across school days"
        };
        break;
      case "checkbox_groups":
        newSection = {
          id: `section_checklists_${timestamp}`,
          type: "checkbox_groups",
          title: "Support & Services Focus Areas",
          subtitle: "Select all domains requiring review or updates during this cycle",
          categories: [
            {
              id: `cat_acc_${timestamp}`,
              title: "Accommodations",
              icon: "Compass",
              items: ["Extra Time on Tests", "Graphic Organizers", "Frequent Breaks", "Visual Schedules"]
            },
            {
              id: `cat_rel_${timestamp}`,
              title: "Related Services",
              icon: "Speech",
              items: ["Speech-Language Therapy", "Occupational Therapy", "Physical Therapy", "School Counseling"]
            },
            {
              id: `cat_plc_${timestamp}`,
              title: "Placement Settings",
              icon: "Home",
              items: ["General Education Room", "Special Ed Resource Room", "Self-Contained Placement", "Private Day Placement"]
            },
            {
              id: `cat_adv_${timestamp}`,
              title: "Special Factors",
              icon: "Brain",
              items: ["Assistive Technology", "Transition Plan Review", "FBA / BIP Review", "ESY Eligibility"]
            }
          ]
        };
        break;
      case "text_area":
        newSection = {
          id: `section_notes_${timestamp}`,
          type: "text_area",
          title: "Advocate Session Notes",
          subtitle: "Detailed findings, meeting strategies, and legal arguments for school discussions",
          rows: 6
        };
        break;
      case "document_request":
        newSection = {
          id: `section_docs_${timestamp}`,
          type: "document_request",
          title: "Records Evaluation Checklist",
          subtitle: "Select records needed for comprehensive case file evaluation",
          items: [
            "Current IEP Document (fully signed)",
            "Latest Psychoeducational Evaluation",
            "Functional Behavior Assessment (FBA)",
            "Behavior Intervention Plan (BIP)",
            "Report Cards & State Test Data",
            "Disciplinary / Attendance Records"
          ],
          bubbleText: "Please gather these files in one place. If you are missing any, we can request them formally from the district."
        };
        break;
      case "events_table":
        newSection = {
          id: `section_events_${timestamp}`,
          type: "events_table",
          title: "Incident & Progress Timeline",
          subtitle: "Chronological list of key occurrences, parent communications, or school notices",
          headers: ["Date", "Trigger / Incident Description", "School Response Action", "Impact on Student"]
        };
        break;
      default:
        break;
    }

    if (newSection) {
      const updated = [...worksheetData.sections, newSection];
      setWorksheetData({ ...worksheetData, sections: updated });
      toast.success(`Inserted ${newSection.title} element!`);
    }
  };

  // Load custom defaults and saved list from LocalStorage on mount
  useEffect(() => {
    const savedLogo = localStorage.getItem("waypoint_default_logo");
    if (savedLogo) setDefaultLogo(savedLogo);

    const savedSettings = localStorage.getItem("waypoint_brand_settings");
    if (savedSettings) {
      try {
        setBrandSettings(JSON.parse(savedSettings));
      } catch (e) {}
    }

    const savedList = localStorage.getItem("waypoint_saved_worksheets");
    if (savedList) {
      try {
        setSavedWorksheets(JSON.parse(savedList));
      } catch (e) {}
    }

    const savedDraft = localStorage.getItem("waypoint_worksheet_draft");
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        if (parsed.worksheet) setWorksheetData(parsed.worksheet);
        if (parsed.fill) setFillState(parsed.fill);
        if (parsed.theme) setActiveTheme(parsed.theme);
        if (parsed.activeId) setActiveWorksheetId(parsed.activeId);
        // Automatically enter editor if draft is loaded
        setView("editor");
      } catch (e) {}
    }
  }, []);

  // Save current active worksheet to saved list (either create new or overwrite)
  const handleSaveWorksheet = (isSaveAs: boolean = false) => {
    let targetId = activeWorksheetId;
    let name = "";

    const list = [...savedWorksheets];

    if (!targetId || isSaveAs) {
      // Prompt for name
      const enteredName = window.prompt(
        "Enter a name for this worksheet:",
        activeWorksheetId ? `${list.find(w => w.id === activeWorksheetId)?.name} (Copy)` : `${worksheetData.docMainTitle} - ${new Date().toLocaleDateString()}`
      );
      if (!enteredName || !enteredName.trim()) return;
      name = enteredName.trim();
      targetId = `ws_${Date.now()}`;
    } else {
      const existing = list.find(w => w.id === targetId);
      name = existing ? existing.name : "Unnamed Worksheet";
    }

    const updatedWorksheet: SavedWorksheet = {
      id: targetId,
      name,
      templateName: activeTemplate,
      theme: activeTheme,
      updatedAt: new Date().toLocaleString(),
      brand: brandSettings,
      worksheet: worksheetData,
      fill: fillState,
    };

    const index = list.findIndex(w => w.id === targetId);
    if (index >= 0) {
      list[index] = updatedWorksheet;
      toast.success(`Worksheet "${name}" updated successfully!`);
    } else {
      list.push(updatedWorksheet);
      toast.success(`Worksheet "${name}" saved!`);
    }

    setSavedWorksheets(list);
    setActiveWorksheetId(targetId);
    localStorage.setItem("waypoint_saved_worksheets", JSON.stringify(list));
    
    // Save draft state
    localStorage.setItem(
      "waypoint_worksheet_draft",
      JSON.stringify({
        worksheet: worksheetData,
        fill: fillState,
        theme: activeTheme,
        activeId: targetId,
      })
    );
  };

  // Load a saved worksheet from the list
  const handleLoadWorksheet = (item: SavedWorksheet) => {
    setActiveWorksheetId(item.id);
    setActiveTemplate(item.templateName);
    setActiveTheme(item.theme);
    setBrandSettings(item.brand);
    setWorksheetData(item.worksheet);
    setFillState(item.fill);
    
    // Save current active draft
    localStorage.setItem(
      "waypoint_worksheet_draft",
      JSON.stringify({
        worksheet: item.worksheet,
        fill: item.fill,
        theme: item.theme,
        activeId: item.id,
      })
    );
    setView("editor");
    toast.success(`Loaded "${item.name}"`);
  };

  // Delete a saved worksheet
  const handleDeleteWorksheet = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to permanently delete this saved worksheet?")) {
      const filtered = savedWorksheets.filter(w => w.id !== id);
      setSavedWorksheets(filtered);
      localStorage.setItem("waypoint_saved_worksheets", JSON.stringify(filtered));
      
      if (activeWorksheetId === id) {
        setActiveWorksheetId(null);
        setFillState({});
        localStorage.removeItem("waypoint_worksheet_draft");
      }
      toast.info("Worksheet deleted.");
    }
  };

  // Start fresh/New Worksheet
  const handleNewWorksheet = (templateKey: string) => {
    setActiveWorksheetId(null);
    setFillState({});
    handleTemplateChange(templateKey);
    localStorage.removeItem("waypoint_worksheet_draft");
    setView("editor");
    toast.info("Created new custom worksheet canvas.");
  };

  // Change Logo File Picker
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setDefaultLogo(base64);
        localStorage.setItem("waypoint_default_logo", base64);
        toast.success("Default logo uploaded and saved!");
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleRemoveLogo = () => {
    setDefaultLogo(null);
    localStorage.removeItem("waypoint_default_logo");
    toast.success("Custom logo removed. Default logo active.");
  };

  // Save Settings handler
  const handleSaveSettings = () => {
    localStorage.setItem("waypoint_brand_settings", JSON.stringify(brandSettings));
    setIsSettingsOpen(false);
    toast.success("Company defaults saved!");
  };

  // JSON Import
  const handleJsonImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed.brand) {
            setBrandSettings((prev) => ({ ...prev, ...parsed.brand }));
          }
          if (parsed.sections) {
            setWorksheetData(parsed);
          }
          if (parsed.theme) {
            setActiveTheme(parsed.theme as ThemeKey);
          }
          setView("editor");
          toast.success("Template JSON imported successfully!");
        } catch (err) {
          toast.error("Invalid template JSON format.");
        }
      };
      reader.readAsText(e.target.files[0]);
    }
  };

  // JSON Export
  const handleJsonExport = () => {
    const exportObj = {
      brand: brandSettings,
      theme: activeTheme,
      docMainTitle: worksheetData.docMainTitle,
      docTagline: worksheetData.docTagline,
      quote: worksheetData.quote,
      metaFields: worksheetData.metaFields,
      dontNeedTo: worksheetData.dontNeedTo,
      introText: worksheetData.introText,
      sections: worksheetData.sections,
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${activeTemplate}-template-${activeTheme}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success("Template JSON exported!");
  };

  // Switch pre-built templates
  const handleTemplateChange = (templateName: string) => {
    setActiveTemplate(templateName);
    if (templateName === "discovery-call") {
      setWorksheetData(TEMPLATE_DISCOVERY);
    } else if (templateName === "meltdown-reflection") {
      setWorksheetData(TEMPLATE_MELTDOWN);
    } else if (templateName === "behavior-log") {
      setWorksheetData(TEMPLATE_BEHAVIOR_LOG);
    } else if (templateName === "scratch") {
      setWorksheetData({
        docMainTitle: "CUSTOM WORKSHEET",
        docTagline: "Custom worksheet template tag line details.",
        quote: "Thank you for collaborating with us.",
        metaFields: [
          { label: "Client Name:", valueKey: "client_name" },
          { label: "Date:", valueKey: "doc_date" }
        ],
        dontNeedTo: null,
        introText: "This is a clean workspace. Use Edit Mode to customize all headers, insert custom sections, and construct your own worksheet.",
        sections: [
          {
            id: "custom_section_1",
            type: "text_area",
            title: "SECTION TITLE",
            subtitle: "Describe instructions or context here."
          }
        ]
      });
    }
  };

  // Add Item to Checklists/Prompts
  const handleAddItem = (sectionIndex: number, categoryIndex?: number) => {
    pushToUndoStack(worksheetData);
    const updatedSections = [...worksheetData.sections];
    const section = updatedSections[sectionIndex];
    if (section.type === "text_prompts" || section.type === "questions") {
      section.prompts = [...(section.prompts || []), "New editable prompt question"];
    } else if (section.type === "checkbox_groups" && categoryIndex !== undefined && section.categories) {
      section.categories[categoryIndex].items = [...section.categories[categoryIndex].items, "New checklist topic"];
    } else if (section.type === "document_request") {
      section.items = [...(section.items || []), "New request file type"];
    }
    setWorksheetData({ ...worksheetData, sections: updatedSections });
    toast.info("Item added!");
  };

  // Delete Item from Checklists/Prompts
  const handleDeleteItem = (sectionIndex: number, itemIndex: number, categoryIndex?: number) => {
    pushToUndoStack(worksheetData);
    const updatedSections = [...worksheetData.sections];
    const section = updatedSections[sectionIndex];
    if (section.type === "text_prompts" || section.type === "questions") {
      section.prompts = (section.prompts || []).filter((_, idx) => idx !== itemIndex);
    } else if (section.type === "checkbox_groups" && categoryIndex !== undefined && section.categories) {
      section.categories[categoryIndex].items = section.categories[categoryIndex].items.filter((_, idx) => idx !== itemIndex);
    } else if (section.type === "document_request") {
      section.items = (section.items || []).filter((_, idx) => idx !== itemIndex);
    }
    setWorksheetData({ ...worksheetData, sections: updatedSections });
    toast.info("Item deleted!");
  };

  // Add Category to Checkbox Group Section
  const handleAddCategory = (sectionIndex: number) => {
    const updatedSections = [...worksheetData.sections];
    const section = updatedSections[sectionIndex];
    if (section.type === "checkbox_groups" && section.categories) {
      section.categories.push({
        id: `cat_${Date.now()}`,
        title: "NEW CHECKLIST CATEGORY",
        icon: "Compass",
        items: ["Checklist Item 1", "Checklist Item 2"]
      });
      setWorksheetData({ ...worksheetData, sections: updatedSections });
      toast.success("Category added!");
    }
  };

  // Delete Category from Checkbox Group Section
  const handleDeleteCategory = (sectionIndex: number, categoryIndex: number) => {
    pushToUndoStack(worksheetData);
    const updatedSections = [...worksheetData.sections];
    const section = updatedSections[sectionIndex];
    if (section.type === "checkbox_groups" && section.categories) {
      section.categories = section.categories.filter((_, idx) => idx !== categoryIndex);
      setWorksheetData({ ...worksheetData, sections: updatedSections });
      toast.info("Category deleted!");
    }
  };

  // Add a new section to worksheet
  const handleAddNewSection = (type: "text_prompts" | "questions" | "checkbox_groups" | "text_area" | "events_table") => {
    const newSec = {
      id: `sec_${Date.now()}`,
      type,
      title: "NEW WORKSHEET SECTION",
      subtitle: "Add descriptions or labels for your client.",
      ...(type === "text_prompts" && { prompts: ["Prompt question / field description"] }),
      ...(type === "questions" && { prompts: ["Question prompt 1", "Question prompt 2"] }),
      ...(type === "events_table" && { headers: ["TIME", "SITUATION / WHAT HAPPENED?", "CHILD'S RESPONSE", "PARENT RESPONSE"] }),
      ...(type === "checkbox_groups" && {
        categories: [{
          id: `cat_${Date.now()}`,
          title: "TOPICS CATEGORY",
          icon: "GraduationCap",
          items: ["Topic Option A", "Topic Option B"]
        }]
      })
    };
    setWorksheetData({
      ...worksheetData,
      sections: [...worksheetData.sections, newSec]
    });
    toast.success("New section added to the bottom!");
  };

  // Delete section
  const handleDeleteSection = (sectionIndex: number) => {
    if (window.confirm("Are you sure you want to delete this entire worksheet section?")) {
      pushToUndoStack(worksheetData);
      const updated = worksheetData.sections.filter((_, idx) => idx !== sectionIndex);
      setWorksheetData({ ...worksheetData, sections: updated });
      toast.info("Section deleted!");
    }
  };

  // Add metadata field
  const handleAddMetaField = () => {
    pushToUndoStack(worksheetData);
    const label = window.prompt("Enter new field label (e.g. Caregiver Name):");
    if (label) {
      const valueKey = `custom_meta_${Date.now()}`;
      setWorksheetData({
        ...worksheetData,
        metaFields: [...(worksheetData.metaFields || []), { label: label + ":", valueKey }]
      });
      toast.success("Branding info field added!");
    }
  };

  // Delete metadata field
  const handleDeleteMetaField = (idx: number) => {
    pushToUndoStack(worksheetData);
    const updated = (worksheetData.metaFields || []).filter((_: any, i: number) => i !== idx);
    setWorksheetData({ ...worksheetData, metaFields: updated });
    toast.info("Field deleted!");
  };

  // AI Rewrite tRPC Call Integration
  const rewriteMutation = trpc.ai.rewriteText.useMutation();

  const handleOpenAiRewrite = (currentText: string, pathArray: string[]) => {
    setAiModal({ isOpen: true, text: currentText, path: pathArray });
    setCustomAiPrompt(brandSettings.aiDirective);
  };

  const handleApplyAiRewrite = async () => {
    if (!aiModal.text.trim()) return;
    setIsAiRewriting(true);
    try {
      const prompt = `Rewrite this text in a custom template: "${aiModal.text}". Instruction directive: ${customAiPrompt}. Keep it professional.`;
      
      const response = await rewriteMutation.mutateAsync({
        text: prompt,
        mode: "rewrite",
      });

      const cleanText = String(response.text).replace(/^"|"$/g, '').trim();

      // Apply result directly to state path
      const [type, ...keys] = aiModal.path;
      if (type === "dontNeedTo") {
        const sub = keys[0];
        if (sub === "title") {
          setWorksheetData((prev: any) => ({
            ...prev,
            dontNeedTo: { ...prev.dontNeedTo, title: cleanText }
          }));
        } else if (sub === "script") {
          setWorksheetData((prev: any) => ({
            ...prev,
            dontNeedTo: { ...prev.dontNeedTo, script: cleanText }
          }));
        } else if (sub === "item") {
          const itemIdx = parseInt(keys[1], 10);
          const updatedItems = [...worksheetData.dontNeedTo.items];
          updatedItems[itemIdx] = cleanText;
          setWorksheetData((prev: any) => ({
            ...prev,
            dontNeedTo: { ...prev.dontNeedTo, items: updatedItems }
          }));
        }
      } else if (type === "introText") {
        setWorksheetData((prev: any) => ({ ...prev, introText: cleanText }));
      } else if (type === "docMainTitle") {
        setWorksheetData((prev: any) => ({ ...prev, docMainTitle: cleanText }));
      } else if (type === "docTagline") {
        setWorksheetData((prev: any) => ({ ...prev, docTagline: cleanText }));
      } else if (type === "section") {
        const secIdx = parseInt(keys[0], 10);
        const secField = keys[1];
        const updatedSecs = [...worksheetData.sections];
        if (secField === "title") {
          updatedSecs[secIdx].title = cleanText;
        } else if (secField === "subtitle") {
          updatedSecs[secIdx].subtitle = cleanText;
        } else if (secField === "bubbleText") {
          updatedSecs[secIdx].bubbleText = cleanText;
        } else if (secField === "prompt") {
          const pIdx = parseInt(keys[2], 10);
          if (updatedSecs[secIdx].prompts) {
            updatedSecs[secIdx].prompts![pIdx] = cleanText;
          }
        } else if (secField === "item") {
          const iIdx = parseInt(keys[2], 10);
          if (updatedSecs[secIdx].items) {
            updatedSecs[secIdx].items![iIdx] = cleanText;
          }
        } else if (secField === "category") {
          const catIdx = parseInt(keys[2], 10);
          const catField = keys[3];
          if (updatedSecs[secIdx].categories) {
            if (catField === "title") {
              updatedSecs[secIdx].categories![catIdx].title = cleanText;
            } else if (catField === "item") {
              const itemIdx = parseInt(keys[4], 10);
              updatedSecs[secIdx].categories![catIdx].items[itemIdx] = cleanText;
            }
          }
        }
        setWorksheetData((prev: any) => ({ ...prev, sections: updatedSecs }));
      }

      toast.success("AI rephrase applied successfully!");
      setAiModal({ isOpen: false, text: "", path: [] });
    } catch (e) {
      console.error(e);
      toast.error("AI rewrite failed. Try again.");
    } finally {
      setIsAiRewriting(false);
    }
  };

  // Global AI Directive applier
  const handleApplyGlobalAiDirective = async () => {
    if (!window.confirm("This will execute AI rephrasing on all primary titles/instructions to match your company's custom AI change directive. Proceed?")) {
      return;
    }
    toast.loading("Applying AI Change Directive...", { id: "global-ai" });
    try {
      const updatedSections = [...worksheetData.sections];
      for (let i = 0; i < updatedSections.length; i++) {
        const sec = updatedSections[i];
        if (sec.title) {
          const res = await rewriteMutation.mutateAsync({
            text: `Rewrite this section title to align with directive "${brandSettings.aiDirective}": "${sec.title}"`,
            mode: "rephrase"
          });
          sec.title = String(res.text).replace(/^"|"$/g, '').trim();
        }
        if (sec.subtitle) {
          const res = await rewriteMutation.mutateAsync({
            text: `Rewrite this section instruction/subtitle to align with directive "${brandSettings.aiDirective}": "${sec.subtitle}"`,
            mode: "rephrase"
          });
          sec.subtitle = String(res.text).replace(/^"|"$/g, '').trim();
        }
      }
      setWorksheetData({ ...worksheetData, sections: updatedSections });
      toast.success("AI Directive applied globally to worksheet structure!", { id: "global-ai" });
    } catch (e) {
      toast.error("AI rewrite failed during bulk updates.", { id: "global-ai" });
    }
  };

  // Trigger browser printing
  const handlePrint = () => {
    toast.info("Tip: For best results, enable 'Background Graphics' in your print settings to include colors and company logo.");
    window.print();
  };

  const selectedTheme = THEMES[activeTheme];

  // Filter saved worksheets list by query
  const filteredWorksheets = savedWorksheets.filter(w =>
    w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.templateName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Leave active editor view to go back to landing hub
  const handleBackToHub = () => {
    setView("hub");
  };

  // ── RENDER 1: STUDIO LANDING HUB ──────────────────────────────────────────
  if (view === "hub") {
    return (
      <div className="p-6 max-w-5xl mx-auto min-h-screen text-slate-100 bg-[#020813] font-sans flex flex-col justify-between">
        
        <div>
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/25">
              <Compass className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Worksheet Studio</h1>
              <p className="text-sm text-slate-400">Your intake and planning studio — customize, brand, and compile worksheets</p>
            </div>
          </div>

          {/* Core Hub Double Cards (Match Templates Hub Layout) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            {/* Card 1: Saved Worksheets */}
            <button
              onClick={() => setView("saved-list")}
              className="group text-left rounded-2xl border border-white/5 bg-[#07162B] p-6 hover:border-indigo-500/30 hover:shadow-lg transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="h-11 w-11 rounded-xl bg-indigo-500/15 flex items-center justify-center shrink-0 border border-indigo-500/20">
                  <FileText className="h-5 w-5 text-indigo-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-base text-white">Saved Worksheets</p>
                    <span className="text-xs font-medium text-slate-400 bg-slate-800 rounded-full px-2 py-0.5 border border-white/5">
                      {savedWorksheets.length}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">
                    Access and manage your saved custom worksheets — intake forms, reflection sheets, logs, and more.
                  </p>
                  <div className="flex items-center gap-1 mt-4 text-sm font-semibold text-indigo-400 group-hover:gap-2 transition-all">
                    View Worksheets <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </button>

            {/* Card 2: Create Worksheet */}
            <button
              onClick={() => setView("create-gallery")}
              className="group text-left rounded-2xl border border-white/5 bg-[#07162B] p-6 hover:border-emerald-500/30 hover:shadow-lg transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="h-11 w-11 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0 border border-emerald-500/20">
                  <FilePlus2 className="h-5 w-5 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-base text-white">Create Worksheet</p>
                  </div>
                  <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">
                    Build a new custom worksheet template from scratch, or jump-start with one of our pre-built specialized templates.
                  </p>
                  <div className="flex items-center gap-1 mt-4 text-sm font-semibold text-emerald-400 group-hover:gap-2 transition-all">
                    Create Now <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-white/10 pt-4 flex items-center justify-between text-xs">
          <Button
            variant="link"
            onClick={() => setLocation("/tools")}
            className="text-slate-400 p-0 hover:text-white flex items-center gap-1.5 text-xs font-semibold"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Tools Page
          </Button>
          <span className="text-[11px] text-slate-500 font-bold">Waypoint Advocates — ClientCare Pro</span>
        </div>

      </div>
    );
  }

  // ── RENDER 2: SAVED WORKSHEETS LIST ──────────────────────────────────────
  if (view === "saved-list") {
    return (
      <div className="p-6 max-w-4xl mx-auto min-h-screen text-slate-100 bg-[#020813] font-sans flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setView("hub")}
              className="border-white/10 hover:bg-white/5 text-slate-300 h-8"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              Back
            </Button>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">Your Saved Worksheets</h1>
              <p className="text-xs text-slate-400">Resume work, edit schemas, or delete items from storage</p>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search by worksheet name or template type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-[#07162B] border-white/10 text-white text-sm h-10 placeholder:text-slate-500 rounded-xl focus:ring-2 focus:ring-indigo-500 w-full"
            />
          </div>

          {/* List items */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredWorksheets.length === 0 ? (
              <div className="col-span-full border border-dashed border-white/10 rounded-2xl p-10 text-center text-slate-400">
                <FileText className="h-10 w-10 text-slate-500 mx-auto mb-2" />
                <p className="text-sm font-semibold">No worksheets found</p>
                <p className="text-xs text-slate-500 mt-1">Try a different search or create a new worksheet.</p>
              </div>
            ) : (
              filteredWorksheets.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleLoadWorksheet(item)}
                  className="group relative p-4 rounded-xl bg-[#07162B] border border-white/5 hover:border-white/15 cursor-pointer transition-all flex flex-col justify-between min-h-[110px]"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors pr-6 truncate">
                        {item.name}
                      </span>
                      <button
                        onClick={(e) => handleDeleteWorksheet(item.id, e)}
                        className="text-slate-400 hover:text-rose-400 p-1 rounded-md hover:bg-slate-900 absolute top-3 right-3 transition-colors"
                        title="Delete worksheet"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-slate-950/60 border border-white/5 text-slate-400">
                        {item.templateName.replace("-", " ")}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-4 border-t border-white/5 pt-2">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {item.updatedAt}
                    </span>
                    <span className="text-indigo-400 font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                      Open <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 pt-4 mt-8 flex items-center justify-between text-xs text-slate-500">
          <span>Waypoint Advocates CRM</span>
          <span className="font-bold">v1.2</span>
        </div>
      </div>
    );
  }

  // ── RENDER 3: TEMPLATES GALLERY (CREATE WORKSHEET) ──────────────────────
  if (view === "create-gallery") {
    const templates = [
      {
        id: "discovery-call",
        title: "Discovery Call Intake",
        description: "Standard Waypoint intake. Helps parents organize school concerns, diagnosis details, and core questions.",
        icon: Compass,
        iconColor: "text-indigo-400",
        iconBg: "bg-indigo-500/15"
      },
      {
        id: "meltdown-reflection",
        title: "Meltdown Reflection",
        description: "Post-crisis reflection sheet. Helps trace physiological triggers, behavioral notes, and coping techniques.",
        icon: Brain,
        iconColor: "text-rose-400",
        iconBg: "bg-rose-500/15"
      },
      {
        id: "behavior-log",
        title: "Daily Behavior Log",
        description: "Daily tracker. Rate physiological factors, sleep logs, behaviors, and tomorrow's goals.",
        icon: Clock,
        iconColor: "text-amber-400",
        iconBg: "bg-amber-500/15"
      },
      {
        id: "scratch",
        title: "Start From Scratch",
        description: "Completely blank page. Add custom text prompts, checkboxes, lists, tables, and headers dynamically.",
        icon: FilePlus2,
        iconColor: "text-emerald-400",
        iconBg: "bg-emerald-500/15"
      }
    ];

    return (
      <div className="p-6 max-w-4xl mx-auto min-h-screen text-slate-100 bg-[#020813] font-sans flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setView("hub")}
              className="border-white/10 hover:bg-white/5 text-slate-300 h-8"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              Back
            </Button>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">Create a New Worksheet</h1>
              <p className="text-xs text-slate-400">Choose a pre-built layout starter or design a blank sheet</p>
            </div>
          </div>

          {/* Grid Layout of Template Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((tpl) => {
              const Icon = tpl.icon;
              return (
                <div
                  key={tpl.id}
                  onClick={() => handleNewWorksheet(tpl.id)}
                  className="group p-5 rounded-2xl bg-[#07162B] border border-white/5 hover:border-indigo-500/30 hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between min-h-[140px]"
                >
                  <div className="flex items-start gap-4">
                    <div className={`h-10 w-10 rounded-xl ${tpl.iconBg} flex items-center justify-center border border-white/5 shrink-0`}>
                      <Icon className={`h-5 w-5 ${tpl.iconColor}`} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">
                        {tpl.title}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        {tpl.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end text-[11px] font-bold text-indigo-400 mt-4 border-t border-white/5 pt-2">
                    <span className="group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                      Select Template <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 pt-4 mt-8 flex items-center justify-between text-xs text-slate-500">
          <span>Waypoint Advocates CRM</span>
          <span className="font-bold">v1.2</span>
        </div>
      </div>
    );
  }

  // ── RENDER 4: WORKSHEET EDITOR VIEW ───────────────────────────────────────
  // Split sections into pages by "page_break" type
  const pages: any[][] = [];
  let currentPage: any[] = [];
  (worksheetData.sections || []).forEach((sec) => {
    if (sec.type === "page_break") {
      pages.push(currentPage);
      currentPage = [];
    } else {
      currentPage.push(sec);
    }
  });
  pages.push(currentPage);
  return (
    <div className={`min-h-screen text-slate-900 bg-[#020813] font-sans p-0 m-0 print:bg-white print:text-black flex flex-col`}>
      
      {/* Dynamic media print stylesheet to style the PDF beautifully */}
      <style>{`
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .print-full-width {
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background-color: transparent !important;
          }
          .print-paper {
            background-color: white !important;
            border: none !important;
            box-shadow: none !important;
            padding: 10px 0 !important;
            margin: 0 !important;
          }
          .print-sheet {
            page-break-after: always !important;
            break-after: page !important;
            border: none !important;
            box-shadow: none !important;
            background-color: white !important;
            padding: 0 !important;
            margin: 0 !important;
            min-height: 0 !important;
          }
          .bleed-container {
            padding: 0 !important;
            border: none !important;
            background-color: transparent !important;
            border-radius: 0 !important;
          }
          .print-clean-input {
            border: none !important;
            border-bottom: 1.5px solid #000 !important;
            background: transparent !important;
            box-shadow: none !important;
            color: black !important;
            padding-left: 5px !important;
          }
          .print-clean-textarea {
            border: none !important;
            border-bottom: 1px solid #777 !important;
            background: transparent !important;
            box-shadow: none !important;
            color: black !important;
          }
          input::placeholder,
          textarea::placeholder {
            color: transparent !important;
            opacity: 0 !important;
            -webkit-text-fill-color: transparent !important;
          }
        }
        .ruled-input {
          background: transparent !important;
          border: none !important;
          border-bottom: 1.5px solid #0F172A !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
          transition: all 0.2s ease;
        }
        .ruled-input:focus {
          border-bottom-color: #5f35e1 !important;
          background: transparent !important;
        }
        .ruled-textarea {
          background: transparent !important;
          border: none !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          line-height: 1.75rem !important;
          background-image: linear-gradient(transparent 96%, #0F172A 96%) !important;
          background-size: 100% 1.75rem !important;
          background-attachment: local !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
          transition: all 0.2s ease;
          resize: none;
        }
        .ruled-textarea:focus {
          background-image: linear-gradient(transparent 96%, #5f35e1 96%) !important;
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* Control Panel Toolbar (Full width, no left sidebar) */}
      <div className="no-print bg-[#09111E] border-b border-white/10 sticky top-0 z-40 shadow-md animate-fade-in">
        
        {/* Row 1: Primary Bar */}
        <div className="max-w-7xl mx-auto px-6 py-2.5 flex items-center justify-between border-b border-white/5 gap-4">
          {/* Left Title & Status */}
          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBackToHub}
              className="border-white/10 hover:bg-white/5 text-slate-300 h-8 font-semibold text-xs flex items-center gap-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Studio Hub
            </Button>
            <div className="flex items-center gap-2">
              <Compass className="h-4 w-4 text-indigo-400 animate-spin-slow shrink-0" />
              <span className="font-sans font-bold tracking-wider text-[11px] text-white uppercase opacity-90">
                Worksheet Studio
              </span>
              {saveStatus && (
                <div className="flex items-center gap-1 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-[9px] font-medium text-slate-300 ml-2 shrink-0 animate-fade-in">
                  <span className={`h-1.5 w-1.5 rounded-full ${saveStatus === "saving" ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`} />
                  {saveStatus === "saving" ? "Saving..." : "Autosaved"}
                </div>
              )}
            </div>
          </div>

          {/* Center Mode Switcher Segmented Control */}
          <div className="flex bg-[#050B14] border border-white/10 p-0.5 rounded-lg h-[32px] items-center shrink-0">
            <button
              onClick={() => {
                setIsEditMode(false);
                setPrintAsBlank(false); // Automatically make inputs typeable in Fill Mode
              }}
              className={`px-4 h-[26px] text-[11px] font-semibold rounded-md flex items-center gap-1.5 transition-all ${
                !isEditMode
                  ? "bg-white text-slate-900 shadow-sm font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              Fill Mode
            </button>
            <button
              onClick={() => setIsEditMode(true)}
              className={`px-4 h-[26px] text-[11px] font-semibold rounded-md flex items-center gap-1.5 transition-all ${
                isEditMode
                  ? "bg-white text-slate-900 shadow-sm font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Edit3 className="h-3.5 w-3.5" />
              Template Edit Mode
            </button>
          </div>

          {/* Right Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              onClick={handlePrint}
              className="bg-white hover:bg-slate-100 text-slate-900 font-bold h-[32px] text-[11px] px-3.5 rounded-lg shadow-sm"
            >
              <Printer className="h-3.5 w-3.5 mr-1.5" />
              Print / PDF
            </Button>
            <Button
              variant="outline"
              onClick={handleUndo}
              className="border-white/10 bg-[#0E1A2D] hover:bg-white/5 text-slate-200 h-[32px] text-[11px] px-3.5 rounded-lg font-bold flex items-center gap-1"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Undo
            </Button>
            <Button
              variant="outline"
              onClick={() => handleSaveWorksheet()}
              className="border-white/10 bg-[#0E1A2D] hover:bg-white/5 text-slate-200 h-[32px] text-[11px] px-3 rounded-lg font-bold"
            >
              <Save className="h-3.5 w-3.5 mr-1.5" />
              Save Draft
            </Button>
          </div>
        </div>

        {/* Row 2: Secondary Bar (Formatting, customization, settings) */}
        <div className="max-w-7xl mx-auto px-6 py-2 flex items-center justify-between gap-4">
          {/* Left Theme selection & Print Mode Selection */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-[#0E1A2D] border border-white/10 rounded-lg h-[32px] px-2.5 gap-2 shrink-0">
              <Palette className="h-3.5 w-3.5 text-slate-400 mr-1" />
              <span className="text-[10px] text-slate-455 font-bold uppercase tracking-wider">Style Theme:</span>
              <select
                value={activeTheme}
                onChange={(e) => setActiveTheme(e.target.value as ThemeKey)}
                className="bg-transparent border-0 text-white text-[11px] font-bold focus:ring-0 cursor-pointer pr-1 focus:outline-none"
              >
                {(Object.keys(THEMES) as ThemeKey[]).map((tKey) => (
                  <option key={tKey} value={tKey} className="bg-[#0E1A2D] text-white">
                    {THEMES[tKey].name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center bg-[#0E1A2D] border border-white/10 rounded-lg h-[32px] px-2.5 gap-2 shrink-0">
              <Printer className="h-3.5 w-3.5 text-slate-400 mr-1" />
              <span className="text-[10px] text-slate-455 font-bold uppercase tracking-wider">Print/Preview Version:</span>
              <select
                value={printAsBlank ? "blank" : "filled"}
                onChange={(e) => setPrintAsBlank(e.target.value === "blank")}
                className="bg-transparent border-0 text-white text-[11px] font-bold focus:ring-0 cursor-pointer pr-1 focus:outline-none"
              >
                <option value="filled" className="bg-[#0E1A2D] text-white">Filled Responses</option>
                <option value="blank" className="bg-[#0E1A2D] text-white">Blank Template (Fillable)</option>
              </select>
            </div>
          </div>

          {/* Right Secondary Utilities */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              onClick={handleJsonExport}
              className="border-white/10 bg-[#0E1A2D] hover:bg-white/5 text-slate-200 h-[32px] text-[11px] px-3 rounded-lg font-bold"
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Export Template
            </Button>

            <div className="relative">
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="border-white/10 bg-[#0E1A2D] hover:bg-white/5 text-slate-200 h-[32px] text-[11px] px-3 rounded-lg font-bold"
              >
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                Import Template
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                accept=".json"
                onChange={handleJsonImport}
                className="hidden"
              />
            </div>

            <Button
              variant="outline"
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className={`border-white/10 bg-[#0E1A2D] hover:bg-white/5 text-slate-200 h-[32px] text-[11px] px-3 rounded-lg font-bold sm:${
                isSettingsOpen ? "ring-2 ring-indigo-500 text-white bg-[#0E1A2D]/80" : ""
              }`}
            >
              <Settings className="h-3.5 w-3.5 mr-1.5" />
              Brand Details
            </Button>

            <Button
              variant="outline"
              onClick={handleReset}
              className="border-rose-500/20 bg-[#1E0F14] hover:bg-rose-500/10 text-rose-455 hover:text-rose-350 h-[32px] text-[11px] px-3 rounded-lg font-bold"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Reset Worksheet
            </Button>
          </div>
        </div>

      </div>

      {/* Editor Helpers Info (Only visible in edit mode) */}
      {isEditMode && (
        <div className="no-print bg-[#5F35E1]/10 border-b border-indigo-500/20 py-2 px-4">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-indigo-200 text-xs">
            <span className="flex items-center gap-2">
              <Info className="h-4 w-4 text-indigo-400" />
              <strong>Template Edit Mode:</strong> Click titles, instructions, or checklist topics to edit. AI rephrase directives run inline.
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={handleApplyGlobalAiDirective}
              className="border-indigo-400/35 hover:bg-indigo-500/10 text-indigo-300 h-7 text-[10px]"
            >
              <Sparkles className="h-3 w-3 mr-1" />
              Apply AI Directive Globally
            </Button>
          </div>
        </div>
      )}

      {/* Main Worksheet Editor / Builder Flex Row Container */}
      <div className="max-w-7xl mx-auto w-full px-4 py-8 flex flex-col lg:flex-row gap-8 items-start relative print:p-0 print:block">
        
        {/* Left Sidebar: Elements Zone (Always Visible) */}
        <div className="no-print w-full lg:w-64 bg-[#07162B] border border-white/10 rounded-2xl p-4 shrink-0 sticky top-28 self-start max-h-[80vh] overflow-y-auto space-y-4 animate-fade-in shadow-xl">
          
          {/* Active selection controls */}
          {selectedSectionId && (
            <div className="no-print border border-[#5F35E1]/30 bg-[#0E1A2D]/40 rounded-xl p-3.5 space-y-3.5 animate-fade-in text-slate-200">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block">Selected Element:</span>
                <button onClick={() => setSelectedSectionId(null)} className="text-slate-400 hover:text-white text-xs">Close</button>
              </div>

              {selectedSectionId === "dontNeedTo" ? (
                <>
                  <div className="text-white text-xs font-bold">"You Don't Need To" Callout</div>
                  
                  {/* Callout Card Width */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-350 block">Card Max Width (px)</label>
                    <input
                      type="range"
                      min="220"
                      max="450"
                      value={worksheetData.dontNeedTo?.width || 320}
                      onChange={(e) => {
                        pushToUndoStack(worksheetData);
                        setWorksheetData({
                          ...worksheetData,
                          dontNeedTo: { ...worksheetData.dontNeedTo, width: parseInt(e.target.value, 10) }
                        });
                      }}
                      className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-900 rounded-lg appearance-none"
                    />
                    <div className="text-[9px] text-right text-slate-400 font-bold">{worksheetData.dontNeedTo?.width || 320}px</div>
                  </div>

                  {/* Paste bullets list */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-355 block">Paste Bullets List (one per line):</label>
                    <Textarea
                      rows={4}
                      placeholder="Line 1&#10;Line 2&#10;Line 3"
                      value={worksheetData.dontNeedTo?.items.join("\n") || ""}
                      onChange={(e) => {
                        pushToUndoStack(worksheetData);
                        const items = e.target.value.split("\n").filter(Boolean);
                        setWorksheetData({
                          ...worksheetData,
                          dontNeedTo: { ...worksheetData.dontNeedTo, items }
                        });
                      }}
                      className="bg-slate-900 border-white/10 text-white text-xs"
                    />
                  </div>

                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      pushToUndoStack(worksheetData);
                      const updated = { ...worksheetData };
                      delete updated.dontNeedTo;
                      setWorksheetData(updated);
                      setSelectedSectionId(null);
                      toast.info("Removed callout card.");
                    }}
                    className="w-full h-8 text-[11px] font-bold bg-rose-600 hover:bg-rose-700 text-white"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete Callout
                  </Button>
                </>
              ) : (
                <>
                  <div className="text-white text-xs font-bold truncate">
                    {worksheetData.sections.find((s) => s.id === selectedSectionId)?.title || "Untitled Box"}
                  </div>

                  {/* Section card options */}
                  {(() => {
                    const secIdx = worksheetData.sections.findIndex((s) => s.id === selectedSectionId);
                    if (secIdx === -1) return null;
                    const sec = worksheetData.sections[secIdx];
                    
                    return (
                      <div className="space-y-3">
                        {/* Height (rows) slider */}
                        {(sec.type === "text_area" || sec.type === "questions") && (
                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-slate-350 block">Height (Ruled Lines Count)</label>
                            <input
                              type="range"
                              min="1"
                              max="16"
                              value={sec.rows || (sec.type === "questions" ? 2 : 4)}
                              onChange={(e) => {
                                pushToUndoStack(worksheetData);
                                const updated = [...worksheetData.sections];
                                updated[secIdx].rows = parseInt(e.target.value, 10);
                                setWorksheetData({ ...worksheetData, sections: updated });
                              }}
                              className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-900 rounded-lg appearance-none"
                            />
                            <div className="text-[9px] text-right text-slate-400 font-bold">{sec.rows || (sec.type === "questions" ? 2 : 4)} Lines</div>
                          </div>
                        )}

                        {/* Card Width Selection */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-slate-350 block">Card Width</label>
                          <select
                            value={sec.width || "full"}
                            onChange={(e) => {
                              pushToUndoStack(worksheetData);
                              const updated = [...worksheetData.sections];
                              updated[secIdx].width = e.target.value;
                              setWorksheetData({ ...worksheetData, sections: updated });
                            }}
                            className="bg-slate-900 border border-white/20 rounded px-2 py-1 text-white font-sans focus:outline-none cursor-pointer text-[10px] font-bold w-full"
                          >
                            <option value="full">Full Page Width</option>
                            <option value="compact">Compact Width (Centred)</option>
                          </select>
                        </div>

                        {/* Paste items list for prompts, questions, doc request */}
                        {(sec.type === "text_prompts" || sec.type === "questions" || sec.type === "document_request") && (
                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-slate-350 block">Paste Bullet Lines (one per line):</label>
                            <Textarea
                              rows={4}
                              placeholder="Line 1&#10;Line 2&#10;Line 3"
                              value={(sec.prompts || sec.items || []).join("\n")}
                              onChange={(e) => {
                                pushToUndoStack(worksheetData);
                                const newLines = e.target.value.split("\n").filter(Boolean);
                                const updated = [...worksheetData.sections];
                                if (sec.type === "document_request") {
                                  updated[secIdx].items = newLines;
                                } else {
                                  updated[secIdx].prompts = newLines;
                                }
                                setWorksheetData({ ...worksheetData, sections: updated });
                              }}
                              className="bg-slate-900 border-white/10 text-white text-xs"
                            />
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              pushToUndoStack(worksheetData);
                              handleDeleteSection(secIdx);
                              setSelectedSectionId(null);
                            }}
                            className="w-full h-8 text-[11px] font-bold bg-rose-600 hover:bg-rose-700 text-white"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete Box
                          </Button>
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          )}

          {/* Option to restore the callout card if it is missing */}
          {!worksheetData.dontNeedTo && (
            <button
              onClick={() => {
                pushToUndoStack(worksheetData);
                setWorksheetData({
                  ...worksheetData,
                  dontNeedTo: {
                    title: "YOU DON'T NEED TO:",
                    items: ["Know special education law before we meet.", "Have the perfect words.", "Have every document ready."],
                    script: "Just tell us your story.\nWe'll help you navigate the rest.",
                    width: 320
                  }
                });
                toast.success("Restored 'You Don't Need To' callout card!");
              }}
              className="w-full text-left bg-[#0E1A2D] hover:bg-[#1E2E4A] border border-indigo-500/20 text-indigo-400 p-2 rounded-xl transition-all flex items-center justify-center gap-1.5 text-[10px] font-bold cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Restore Callout Card
            </button>
          )}

          <div className="border-b border-white/5 pb-2">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 font-sans">
              <LayoutGrid className="h-4 w-4 text-indigo-400" />
              Elements Zone
            </h3>
            <p className="text-[10px] text-slate-400 mt-1 font-sans">
              Click to instantly insert pre-built modules at the bottom of the worksheet.
            </p>
          </div>
          
          <div className="flex flex-col gap-2">
            <button
              onClick={() => handleInsertElement("text_prompts")}
              className="w-full text-left bg-slate-900/60 hover:bg-slate-900 border border-white/5 hover:border-white/15 p-2.5 rounded-xl transition-all flex items-center gap-2.5 group cursor-pointer"
            >
              <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg group-hover:bg-indigo-500/20 shrink-0">
                <FileText className="h-3.5 w-3.5" />
              </div>
              <div className="overflow-hidden">
                <span className="text-[11px] font-bold text-white block truncate">Info Fields Box</span>
                <span className="text-[9px] text-slate-455 block truncate">Name, School, Demographics</span>
              </div>
            </button>

            <button
              onClick={() => handleInsertElement("questions")}
              className="w-full text-left bg-slate-900/60 hover:bg-slate-900 border border-white/5 hover:border-white/15 p-2.5 rounded-xl transition-all flex items-center gap-2.5 group cursor-pointer"
            >
              <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg group-hover:bg-indigo-500/20 shrink-0">
                <HelpCircle className="h-3.5 w-3.5" />
              </div>
              <div className="overflow-hidden">
                <span className="text-[11px] font-bold text-white block truncate">Question Box (1-2-3)</span>
                <span className="text-[9px] text-slate-455 block truncate">Core questions with notes</span>
              </div>
            </button>

            <button
              onClick={() => handleInsertElement("smiley_overview")}
              className="w-full text-left bg-slate-900/60 hover:bg-slate-900 border border-white/5 hover:border-white/15 p-2.5 rounded-xl transition-all flex items-center gap-2.5 group cursor-pointer"
            >
              <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg group-hover:bg-indigo-500/20 shrink-0">
                <Smile className="h-3.5 w-3.5" />
              </div>
              <div className="overflow-hidden">
                <span className="text-[11px] font-bold text-white block truncate">Smiley Scale Box</span>
                <span className="text-[9px] text-slate-455 block truncate">Mood regulation check</span>
              </div>
            </button>

            <button
              onClick={() => handleInsertElement("recovery_progress")}
              className="w-full text-left bg-slate-900/60 hover:bg-slate-900 border border-white/5 hover:border-white/15 p-2.5 rounded-xl transition-all flex items-center gap-2.5 group cursor-pointer"
            >
              <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg group-hover:bg-indigo-505/20 shrink-0">
                <CloudRain className="h-3.5 w-3.5" />
              </div>
              <div className="overflow-hidden">
                <span className="text-[11px] font-bold text-white block truncate">Sun/Cloud Tracker Box</span>
                <span className="text-[9px] text-slate-455 block truncate">Regulation weather icons</span>
              </div>
            </button>

            <button
              onClick={() => handleInsertElement("checkbox_groups")}
              className="w-full text-left bg-slate-900/60 hover:bg-slate-900 border border-white/5 hover:border-white/15 p-2.5 rounded-xl transition-all flex items-center gap-2.5 group cursor-pointer"
            >
              <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg group-hover:bg-indigo-500/20 shrink-0">
                <CheckSquare className="h-3.5 w-3.5" />
              </div>
              <div className="overflow-hidden">
                <span className="text-[11px] font-bold text-white block truncate">Checklist Box</span>
                <span className="text-[9px] text-slate-455 block truncate">Accommodations & Goals</span>
              </div>
            </button>

            <button
              onClick={() => handleInsertElement("text_area")}
              className="w-full text-left bg-slate-900/60 hover:bg-slate-900 border border-white/5 hover:border-white/15 p-2.5 rounded-xl transition-all flex items-center gap-2.5 group cursor-pointer"
            >
              <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg group-hover:bg-indigo-500/20 shrink-0">
                <AlignLeft className="h-3.5 w-3.5" />
              </div>
              <div className="overflow-hidden">
                <span className="text-[11px] font-bold text-white block truncate">Large Notes Box</span>
                <span className="text-[9px] text-slate-455 block truncate">Spacious observations box</span>
              </div>
            </button>

            <button
              onClick={() => handleInsertElement("document_request")}
              className="w-full text-left bg-slate-900/60 hover:bg-slate-900 border border-white/5 hover:border-white/15 p-2.5 rounded-xl transition-all flex items-center gap-2.5 group cursor-pointer"
              >
              <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg group-hover:bg-indigo-500/20 shrink-0">
                <FolderOpen className="h-3.5 w-3.5" />
              </div>
              <div className="overflow-hidden">
                <span className="text-[11px] font-bold text-white block truncate">Doc Request Box</span>
                <span className="text-[9px] text-slate-455 block truncate">Records request checklist</span>
              </div>
            </button>

            <button
              onClick={() => handleInsertElement("events_table")}
              className="w-full text-left bg-slate-900/60 hover:bg-slate-900 border border-white/5 hover:border-white/15 p-2.5 rounded-xl transition-all flex items-center gap-2.5 group cursor-pointer"
            >
              <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg group-hover:bg-indigo-500/20 shrink-0">
                <Grid className="h-3.5 w-3.5" />
              </div>
              <div className="overflow-hidden">
                <span className="text-[11px] font-bold text-white block truncate">Timeline Table Box</span>
                <span className="text-[9px] text-slate-455 block truncate">Chronological incident grid</span>
              </div>
            </button>
          </div>
        </div>

        {/* Worksheet Pages Canvas Container */}
        <div className="flex-1 flex flex-col gap-10 print:gap-0 w-full print:max-w-full">
        {pages.map((pageSections, pageIdx) => (
          <div key={pageIdx} className="relative group/page print-sheet print-full-width animate-fade-in">
            
            {/* Visual Bleed Border (US Letter) */}
            <div className={`bleed-container relative p-3 border-2 border-dashed ${
              isEditMode ? 'border-[#5F35E1]/50 bg-[#0E1A2D]/5 shadow-inner' : 'border-slate-350/50 bg-slate-50/10'
            } rounded-[24px]`}>
              
              {/* Bleed Badge Label */}
              <span className="absolute -top-2.5 left-6 bg-slate-900 border border-slate-700 px-2.5 py-0.5 rounded-full text-[8px] font-bold text-slate-350 select-none uppercase tracking-widest no-print z-20">
                US Letter Page Bleed Area
              </span>

              {/* Automatic Page Cutoff Fold Line */}
              <div className="absolute top-[1050px] left-0 right-0 border-t-2 border-dashed border-rose-500/40 no-print flex items-center justify-center z-35 pointer-events-none select-none">
                <span className="bg-rose-600 text-white text-[8px] font-sans font-black px-2 py-0.5 rounded-full uppercase tracking-widest shadow-md">
                  Automatic Page Cutoff Fold Line
                </span>
              </div>

              {/* Physical Print Sheet Card */}
              <div className={`print-paper rounded-2xl shadow-2xl overflow-hidden ${selectedTheme.paperBg} p-8 md:p-12 border ${selectedTheme.primaryBorder}/10 flex flex-col justify-between min-h-[1050px] print:min-h-0 print:border-none print:shadow-none print:p-0 w-full relative`}>
                
                <div>
                                    {/* Page Header */}
                  {pageIdx === 0 ? (
                    <div className="flex flex-col md:flex-row items-center justify-between border-b-2 pb-6 gap-6" style={{ borderColor: THEMES[activeTheme].accentHex || '#D4AF37' }}>
                      <div className="flex items-center gap-5 flex-1">
                        {/* Logo block */}
                        <div
                          className="flex items-center justify-center text-slate-100 shrink-0"
                          style={{
                            height: `${brandSettings.logoHeight || 64}px`,
                            width: `${brandSettings.logoHeight || 64}px`,
                          }}
                        >
                          {defaultLogo ? (
                            <img
                              src={defaultLogo}
                              alt="Logo"
                              className="object-contain rounded-xl"
                              style={{
                                height: `${brandSettings.logoHeight || 64}px`,
                                width: `${brandSettings.logoHeight || 64}px`,
                              }}
                            />
                          ) : (
                            <div className="h-full w-full p-2 bg-slate-900 rounded-xl flex items-center justify-center text-slate-100">
                              {defaultLighthouseSvg}
                            </div>
                          )}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-baseline gap-1.5">
                            <span
                              contentEditable={isEditMode}
                              suppressContentEditableWarning
                              onBlur={(e) => setBrandSettings({ ...brandSettings, title: e.target.innerText })}
                              className={`text-2xl font-black font-serif tracking-widest ${selectedTheme.primaryText} focus:outline-none focus:bg-white/50 px-1 rounded`}
                            >
                              {brandSettings.title}
                            </span>
                            <span
                              contentEditable={isEditMode}
                              suppressContentEditableWarning
                              onBlur={(e) => setBrandSettings({ ...brandSettings, subtitle: e.target.innerText })}
                              className={`text-base font-medium tracking-widest focus:outline-none focus:bg-white/50 px-1 rounded`}
                              style={{ color: THEMES[activeTheme].accentHex || '#D4AF37' }}
                            >
                              {brandSettings.subtitle}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <h1
                              contentEditable={isEditMode}
                              suppressContentEditableWarning
                              onBlur={(e) => setWorksheetData({ ...worksheetData, docMainTitle: e.target.innerText })}
                              className={`text-xl md:text-2xl font-bold tracking-tight mt-1 focus:outline-none focus:bg-white/50 px-1 rounded ${selectedTheme.primaryText}`}
                            >
                              {worksheetData.docMainTitle}
                            </h1>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <p
                              contentEditable={isEditMode}
                              suppressContentEditableWarning
                              onBlur={(e) => setWorksheetData({ ...worksheetData, docTagline: e.target.innerText })}
                              className="text-xs italic text-slate-555 mt-0.5 focus:outline-none focus:bg-white/50 px-1 rounded"
                            >
                              {worksheetData.docTagline}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Right Callout Panel */}
                      {worksheetData.dontNeedTo && (
                        <div
                          onClick={(e) => { if (isEditMode) { e.stopPropagation(); setSelectedSectionId("dontNeedTo"); } }}
                          className={`border rounded-2xl p-4 bg-white shadow-sm w-full relative flex flex-col justify-between min-h-[140px] cursor-pointer transition-all ${
                            selectedSectionId === "dontNeedTo" ? "ring-2 ring-[#5F35E1] border-transparent shadow-xl scale-[1.01]" : "border-slate-300 hover:border-slate-400"
                          }`}
                          style={{ maxWidth: worksheetData.dontNeedTo.width ? `${worksheetData.dontNeedTo.width}px` : "320px" }}
                        >
                          {isEditMode && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleOpenAiRewrite(worksheetData.dontNeedTo.title, ["dontNeedTo", "title"]); }}
                              className="no-print absolute top-1 right-1 p-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-md border border-indigo-500/20"
                              title="Rewrite title with AI"
                            >
                              <Sparkles className="h-3.5 w-3.5" />
                            </button>
                          )}
                          
                          <div>
                            <h4
                              contentEditable={isEditMode}
                              suppressContentEditableWarning
                              onBlur={(e) => {
                                pushToUndoStack(worksheetData);
                                setWorksheetData({
                                  ...worksheetData,
                                  dontNeedTo: { ...worksheetData.dontNeedTo, title: e.target.innerText }
                                });
                              }}
                              className={`text-[11px] font-bold tracking-wider mb-2 focus:outline-none focus:bg-slate-100 ${selectedTheme.primaryText}`}
                            >
                              {worksheetData.dontNeedTo.title}
                            </h4>
                            
                            <ul className="space-y-1">
                              {worksheetData.dontNeedTo.items.map((item, idx) => (
                                <li key={idx} className="flex items-start gap-1.5 text-[10px] text-slate-700">
                                  <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                  <span
                                    contentEditable={isEditMode}
                                    suppressContentEditableWarning
                                    onBlur={(e) => {
                                      pushToUndoStack(worksheetData);
                                      const updated = [...worksheetData.dontNeedTo.items];
                                      updated[idx] = e.target.innerText;
                                      setWorksheetData({
                                        ...worksheetData,
                                        dontNeedTo: { ...worksheetData.dontNeedTo, items: updated }
                                      });
                                    }}
                                    className="focus:outline-none focus:bg-slate-100 px-0.5 rounded w-full"
                                  >
                                    {item}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="border-t border-slate-100 pt-2 mt-2">
                            <p
                              contentEditable={isEditMode}
                              suppressContentEditableWarning
                              onBlur={(e) => {
                                pushToUndoStack(worksheetData);
                                setWorksheetData({
                                  ...worksheetData,
                                  dontNeedTo: { ...worksheetData.dontNeedTo, script: e.target.innerText }
                                });
                              }}
                              className="text-[10px] italic text-slate-600 font-serif leading-relaxed text-center whitespace-pre-line focus:outline-none focus:bg-slate-105"
                            >
                              {worksheetData.dontNeedTo.script}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Minimal running header for Page 2+ */
                    <div className="flex items-center justify-between border-b pb-3 gap-6 mb-8 text-[9px] font-bold text-slate-400 uppercase tracking-widest no-print">
                      <span>{worksheetData.docMainTitle}</span>
                      <span>Page {pageIdx + 1}</span>
                    </div>
                  )}

                  {/* Gated Cover Information (Only Page 1) */}
                  {pageIdx === 0 && (
                    <div className="space-y-6 mb-8">
                      {/* Student metadata info line fields */}
                      <div className="bg-slate-100/50 rounded-xl p-4 border border-slate-200">
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 justify-start relative">
                          {isEditMode && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleAddMetaField}
                              className="no-print absolute top-0 right-0 h-6 text-[9px]"
                            >
                              <Plus className="h-2.5 w-2.5 mr-1" /> Add Field
                            </Button>
                          )}

                          {(worksheetData.metaFields || []).map((field, fIdx) => {
                            const valKey = `meta_${field.valueKey}`;
                            return (
                              <div key={fIdx} className="flex items-center gap-2 text-xs relative group/meta">
                                <span className="font-bold text-slate-700 min-w-[70px]">
                                  {field.label}
                                </span>
                                {printAsBlank ? (
                                  <div className="border-b border-slate-800 w-36 h-8" />
                                ) : (
                                  <Input
                                    type="text"
                                    disabled={isEditMode}
                                    placeholder={`Click to type ${field.label.toLowerCase()}`}
                                    value={fillState[valKey] || ""}
                                    onChange={(e) => setFillState({ ...fillState, [valKey]: e.target.value })}
                                    className="h-8 text-xs bg-transparent border-none text-slate-900 focus:ring-0 focus:border-none p-0 w-36 font-semibold animate-fade-in"
                                  />
                                )}
                                {isEditMode && (
                                  <button
                                    onClick={() => handleDeleteMetaField(fIdx)}
                                    className="no-print opacity-0 group-hover/meta:opacity-100 p-0.5 hover:bg-rose-500/10 text-rose-550 rounded transition-all ml-1"
                                    title="Delete field"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Dynamic Worksheet Sections List */}
                  <div className="space-y-8 mt-6">
                    {pageSections.map((section) => {
                      const sIdx = worksheetData.sections.findIndex((s) => s.id === section.id);
                      const fillValKey = `section_${section.id}`;
                      
                      // Render each section type
                      return (
                        <div
                          key={section.id}
                          onClick={(e) => { if (isEditMode) { e.stopPropagation(); setSelectedSectionId(section.id); } }}
                          className={`relative group/section border-2 rounded-2xl overflow-hidden bg-white shadow-sm transition-all pb-4 cursor-pointer ${
                            selectedSectionId === section.id ? 'ring-2 ring-[#5F35E1] border-transparent shadow-xl scale-[1.005]' : 'border-slate-200 hover:border-slate-300/80'
                          } ${section.width === 'compact' ? 'max-w-2xl mx-auto' : 'w-full'}`}
                        >
                          
                          {/* Beautiful PDF Header Bar with floating circular gold ring badge */}
                          <div className="relative pt-3.5 px-4 mb-4">
                            <div className={`flex items-center gap-4 text-white rounded-xl p-3 pl-14 relative min-h-[56px] ${selectedTheme.primaryBg}`}>
                              
                              {/* Circular Icon Badge */}
                              <div className={`absolute -left-2 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full ${selectedTheme.primaryBg} border-[3px] border-[#D4AF37] flex items-center justify-center text-white shadow-md z-10`}>
                                {getSectionIcon(section.type, sIdx)}
                              </div>
                              
                              <div>
                                <h3 className="text-xs font-black tracking-widest text-white uppercase font-sans">
                                  {section.title}
                                </h3>
                                {section.subtitle && (
                                  <p className="text-[9px] text-slate-305 font-semibold mt-0.5 leading-tight font-sans">
                                    {section.subtitle}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Row height selector (only shown in Edit Mode in the header bar for simplicity) */}
                            {isEditMode && (section.type === "text_area" || section.type === "questions") && (
                              <div className="no-print absolute top-5 right-20 flex items-center gap-1.5 text-[10px] text-white/90 font-bold">
                                <span>Lines:</span>
                                <select
                                  value={section.rows || (section.type === "questions" ? 2 : 4)}
                                  onChange={(e) => {
                                    pushToUndoStack(worksheetData);
                                    const updated = [...worksheetData.sections];
                                    updated[sIdx].rows = parseInt(e.target.value, 10);
                                    setWorksheetData({ ...worksheetData, sections: updated });
                                  }}
                                  className="bg-slate-900 border border-white/20 rounded px-1.5 py-0.5 text-white font-sans focus:outline-none cursor-pointer text-[10px] font-bold"
                                >
                                  {[1, 2, 3, 4, 5, 6, 8, 10, 12, 16].map((r) => (
                                    <option key={r} value={r} className="bg-slate-950 text-white">{r}</option>
                                  ))}
                                </select>
                              </div>
                            )}

                            {/* Permanent float edit controls */}
                            {isEditMode && (
                              <div className="no-print absolute top-5 right-6 flex items-center gap-1.5 z-20 bg-slate-900/90 border border-white/20 p-1 rounded-lg shadow-sm">
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleOpenAiRewrite(section.title, ["sections", sIdx, "title"]); }}
                                  className="p-1 hover:bg-white/10 text-indigo-300 rounded"
                                  title="Rewrite title with AI"
                                >
                                  <Sparkles className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleOpenAiRewrite(section.subtitle, ["sections", sIdx, "subtitle"]); }}
                                  className="p-1 hover:bg-white/10 text-indigo-300 rounded"
                                  title="Rewrite instructions with AI"
                                >
                                  <Brain className="h-3 w-3" />
                                </button>
                                <span className="text-white/20 mx-0.5">|</span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDeleteSection(sIdx); }}
                                  className="p-1 hover:bg-white/10 text-rose-455 rounded"
                                  title="Delete Section"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Content Wrapper inside the card */}
                          <div className="px-6">

                          {section.type === "text_prompts" && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                                {(section.prompts || []).map((prompt, pIdx) => {
                                  const promptValKey = `${fillValKey}_prompt_${pIdx}`;
                                  return (
                                    <div key={pIdx} className="space-y-1.5 relative group/prompt">
                                      <div className="flex items-center justify-between">
                                        <label
                                          contentEditable={isEditMode}
                                          suppressContentEditableWarning
                                          onBlur={(e) => {
                                            pushToUndoStack(worksheetData);
                                            const updated = [...worksheetData.sections];
                                            updated[sIdx].prompts[pIdx] = e.target.innerText;
                                            setWorksheetData({ ...worksheetData, sections: updated });
                                          }}
                                          className="text-[10px] font-bold text-slate-700 tracking-wide focus:outline-none focus:bg-slate-105 px-0.5 rounded w-full"
                                        >
                                          {prompt}
                                        </label>
                                        {isEditMode && (
                                          <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteItem(sIdx, pIdx); }}
                                            className="no-print p-0.5 hover:bg-rose-500/10 text-rose-550 rounded transition-all shrink-0 ml-1"
                                            title="Delete Line"
                                          >
                                            <Trash2 className="h-2.5 w-2.5 text-rose-500 hover:text-rose-700" />
                                          </button>
                                        )}
                                      </div>
                                      
                                      <div className="flex items-center gap-2 w-full">
                                        {printAsBlank ? (
                                          <div className="flex-1 border-b border-dashed border-slate-800 h-8 mt-1" />
                                        ) : (
                                          <>
                                            <Input
                                              type="text"
                                              disabled={isEditMode}
                                              placeholder="Enter parent input notes..."
                                              value={fillState[promptValKey] || ""}
                                              onChange={(e) => setFillState({ ...fillState, [promptValKey]: e.target.value })}
                                              onFocus={() => setSelectedLine({ sectionId: section.id, index: pIdx })}
                                              onBlur={() => setTimeout(() => setSelectedLine((prev) => prev?.index === pIdx ? null : prev), 350)}
                                              className="flex-1 ruled-input text-xs h-9 focus:ring-0 disabled:opacity-100 font-medium font-serif italic text-slate-800"
                                            />
                                            {selectedLine?.sectionId === section.id && selectedLine?.index === pIdx && (
                                              <Button
                                                size="sm"
                                                onClick={(e) => { e.stopPropagation(); handleAddLineBelow(section.id, pIdx); }}
                                                className="no-print bg-[#5F35E1] hover:bg-indigo-755 text-white text-[9px] h-7 px-2.5 rounded shadow-sm shrink-0 flex items-center gap-1 animate-fade-in"
                                              >
                                                <Plus className="h-3 w-3" /> Add Line
                                              </Button>
                                            )}
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                              {isEditMode && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => { e.stopPropagation(); handleAddItem(sIdx); }}
                                  className="no-print text-[10px] h-7 mt-2"
                                >
                                  <Plus className="h-3 w-3 mr-1" /> Add Prompt Line
                                </Button>
                              )}
                            </div>
                          )}

                          {section.type === "smiley_overview" && (
                            <div className="space-y-4">
                              <div className="flex justify-around items-center py-4 bg-slate-50/50 rounded-xl border border-slate-200/50">
                                {[
                                  { val: "excellent", label: "Excellent", color: "text-emerald-600" },
                                  { val: "good", label: "Good", color: "text-blue-605" },
                                  { val: "fair", label: "Fair", color: "text-amber-500" },
                                  { val: "difficult", label: "Difficult", color: "text-orange-500" },
                                  { val: "crisis", label: "Crisis", color: "text-rose-500" }
                                ].map((sObj) => {
                                  const isSelected = !printAsBlank && fillState[`${fillValKey}_smiley`] === sObj.val;
                                  return (
                                    <button
                                      key={sObj.val}
                                      disabled={isEditMode}
                                      onClick={(e) => { e.stopPropagation(); setFillState({ ...fillState, [`${fillValKey}_smiley`]: sObj.val }); }}
                                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all cursor-pointer ${
                                        isSelected ? "bg-white border-2 border-indigo-655 scale-105 shadow-md" : "border-2 border-transparent opacity-70 hover:opacity-100"
                                      }`}
                                    >
                                      {sObj.val === "excellent" || sObj.val === "good" ? (
                                        <Smile className={`h-8 w-8 ${sObj.color}`} />
                                      ) : sObj.val === "fair" ? (
                                        <Meh className={`h-8 w-8 ${sObj.color}`} />
                                      ) : (
                                        <Frown className={`h-8 w-8 ${sObj.color}`} />
                                      )}
                                      <span className="text-[10px] font-black text-slate-700">{sObj.label}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {section.type === "recovery_progress" && (
                            <div className="space-y-4">
                              <div className="flex justify-around items-center py-4 bg-slate-50/50 rounded-xl border border-slate-200/50">
                                {[
                                  { val: "crisis_day", label: "Crisis Day", icon: <CloudRain className="h-6 w-6 text-blue-500 animate-pulse" /> },
                                  { val: "difficult_day", label: "Difficult Day", icon: <Cloud className="h-6 w-6 text-slate-500" /> },
                                  { val: "improving", label: "Improving", icon: <Sun className="h-6 w-6 text-orange-400" /> },
                                  { val: "stable", label: "Stable", icon: <Sun className="h-6 w-6 text-amber-500" /> },
                                  { val: "great_day", label: "Great Day", icon: <Sun className="h-6 w-6 text-yellow-500 animate-bounce" /> }
                                ].map((rObj) => {
                                  const isSelected = !printAsBlank && fillState[`${fillValKey}_recovery`] === rObj.val;
                                  return (
                                    <button
                                      key={rObj.val}
                                      disabled={isEditMode}
                                      onClick={(e) => { e.stopPropagation(); setFillState({ ...fillState, [`${fillValKey}_recovery`]: rObj.val }); }}
                                      className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all cursor-pointer ${
                                        isSelected ? "bg-white border-2 border-indigo-650 scale-105 shadow-md" : "border-2 border-transparent opacity-75 hover:opacity-100"
                                      }`}
                                    >
                                      {rObj.icon}
                                      <span className="text-[9px] font-bold text-slate-700">{rObj.label}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {section.type === "questions" && (
                            <div className="space-y-4">
                              <div className="space-y-4">
                                {(section.prompts || []).map((qPrompt, pIdx) => {
                                  const pValKey = `${fillValKey}_q_${pIdx}`;
                                  return (
                                    <div key={pIdx} className="space-y-1 relative group/question-line">
                                      <div className="flex items-center justify-between">
                                        <span
                                          contentEditable={isEditMode}
                                          suppressContentEditableWarning
                                          onBlur={(e) => {
                                            pushToUndoStack(worksheetData);
                                            const updated = [...worksheetData.sections];
                                            updated[sIdx].prompts[pIdx] = e.target.innerText;
                                            setWorksheetData({ ...worksheetData, sections: updated });
                                          }}
                                          className="text-xs font-bold text-slate-800 focus:outline-none focus:bg-slate-105 px-0.5 rounded w-full"
                                        >
                                          {qPrompt}
                                        </span>
                                        {isEditMode && (
                                          <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteItem(sIdx, pIdx); }}
                                            className="no-print p-0.5 hover:bg-rose-500/10 text-rose-555 rounded transition-all shrink-0 ml-1"
                                            title="Delete Question"
                                          >
                                            <Trash2 className="h-2.5 w-2.5 text-rose-500 hover:text-rose-700" />
                                          </button>
                                        )}
                                      </div>

                                      <div className="flex items-start gap-2 mt-1.5 w-full">
                                        {printAsBlank ? (
                                          <div className="flex-1 space-y-4 pt-1 mb-2">
                                            {Array.from({ length: section.rows || 2 }).map((_, lineIdx) => (
                                              <div key={lineIdx} className="border-b border-dashed border-slate-800 h-6 w-full" />
                                            ))}
                                          </div>
                                        ) : (
                                          <>
                                            <Textarea
                                              disabled={isEditMode}
                                              placeholder="Write detailed responses or notes here..."
                                              rows={section.rows || 2}
                                              value={fillState[pValKey] || ""}
                                              onChange={(e) => setFillState({ ...fillState, [pValKey]: e.target.value })}
                                              onFocus={() => setSelectedLine({ sectionId: section.id, index: pIdx })}
                                              onBlur={() => setTimeout(() => setSelectedLine((prev) => prev?.index === pIdx ? null : prev), 350)}
                                              className="flex-1 ruled-textarea text-xs focus:ring-0 disabled:opacity-100 font-medium font-serif italic text-slate-800"
                                            />
                                            {selectedLine?.sectionId === section.id && selectedLine?.index === pIdx && (
                                              <Button
                                                size="sm"
                                                onClick={(e) => { e.stopPropagation(); handleAddLineBelow(section.id, pIdx); }}
                                                className="no-print bg-[#5F35E1] hover:bg-indigo-755 text-white text-[9px] h-7 px-2.5 rounded shadow-sm shrink-0 flex items-center gap-1 animate-fade-in mt-1"
                                              >
                                                <Plus className="h-3 w-3" /> Add Line
                                              </Button>
                                            )}
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                              {isEditMode && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => { e.stopPropagation(); handleAddItem(sIdx); }}
                                  className="no-print text-[10px] h-7 mt-2"
                                >
                                  <Plus className="h-3 w-3 mr-1" /> Add Question
                                </Button>
                              )}
                            </div>
                          )}

                          {section.type === "checkbox_groups" && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                {(section.categories || []).map((cat, cIdx) => (
                                  <div key={cat.id || cIdx} className="space-y-3 relative group/cat border border-slate-200 rounded-xl overflow-hidden bg-slate-50/20 shadow-sm">
                                    
                                    {isEditMode && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleDeleteCategory(sIdx, cIdx); }}
                                        className="no-print absolute top-1.5 right-1.5 p-1 bg-rose-650 text-white rounded-full transition-all cursor-pointer z-10"
                                        title="Delete Category"
                                      >
                                        <X className="h-2.5 w-2.5" />
                                      </button>
                                    )}

                                    {/* Category Header */}
                                    <div className={`flex items-center gap-2 px-3 py-2 text-white shrink-0 ${selectedTheme.primaryBg}`}>
                                      <div className="text-white shrink-0">
                                        {renderCategoryIcon(cat.icon || "Compass")}
                                      </div>
                                      <span
                                        contentEditable={isEditMode}
                                        suppressContentEditableWarning
                                        onBlur={(e) => {
                                          pushToUndoStack(worksheetData);
                                          const updated = [...worksheetData.sections];
                                          updated[sIdx].categories[cIdx].title = e.target.innerText;
                                          setWorksheetData({ ...worksheetData, sections: updated });
                                        }}
                                        className="text-[9px] font-black focus:outline-none focus:bg-white/20 px-0.5 rounded w-full uppercase tracking-wider font-sans"
                                      >
                                        {cat.title}
                                      </span>
                                    </div>

                                    {/* Category Items */}
                                    <div className="px-3 pb-3 pt-1">
                                      <ul className="space-y-1.5">
                                        {(cat.items || []).map((item, oIdx) => {
                                          const optValKey = `${fillValKey}_check_${cat.id}_${oIdx}`;
                                          return (
                                            <li key={oIdx} className="flex items-start gap-2 text-xs relative group/opt">
                                              <input
                                                type="checkbox"
                                                disabled={isEditMode}
                                                checked={!printAsBlank && !!fillState[optValKey]}
                                                onChange={(e) => setFillState({ ...fillState, [optValKey]: e.target.checked })}
                                                className={`h-3.5 w-3.5 mt-0.5 rounded border-slate-350 ${selectedTheme.primaryText} focus:ring-slate-500 cursor-pointer disabled:opacity-100 disabled:cursor-default`}
                                              />
                                              <span
                                                contentEditable={isEditMode}
                                                suppressContentEditableWarning
                                                onBlur={(e) => {
                                                  pushToUndoStack(worksheetData);
                                                  const updated = [...worksheetData.sections];
                                                  updated[sIdx].categories[cIdx].items[oIdx] = e.target.innerText;
                                                  setWorksheetData({ ...worksheetData, sections: updated });
                                                }}
                                                className="text-[10px] text-slate-700 focus:outline-none focus:bg-slate-105 px-0.5 rounded w-full leading-normal font-sans"
                                              >
                                                {item}
                                              </span>
                                              {isEditMode && (
                                                <button
                                                  onClick={(e) => { e.stopPropagation(); handleDeleteItem(sIdx, oIdx, cIdx); }}
                                                  className="no-print p-0.5 hover:bg-rose-500/10 text-rose-550 rounded transition-all ml-1 shrink-0"
                                                  title="Delete Option"
                                                >
                                                  <Trash2 className="h-2.5 w-2.5 text-rose-500 hover:text-rose-700" />
                                                </button>
                                              )}
                                            </li>
                                          );
                                        })}
                                      </ul>
                                      {isEditMode && (
                                        <button
                                          onClick={(e) => { e.stopPropagation(); handleAddItem(sIdx, cIdx); }}
                                          className="no-print text-[9px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 mt-2"
                                        >
                                          <Plus className="h-2.5 w-2.5" /> Add Topic
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                              {isEditMode && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => { e.stopPropagation(); handleAddCategory(sIdx); }}
                                  className="no-print text-[10px] h-7 mt-2"
                                >
                                  <Plus className="h-3 w-3 mr-1" /> Add Topic Checklist Category
                                </Button>
                              )}
                            </div>
                          )}

                          {section.type === "text_area" && (
                            <div className="space-y-3">
                              {printAsBlank ? (
                                <div className="space-y-4 pt-1 mb-2">
                                  {Array.from({ length: section.rows || 4 }).map((_, lineIdx) => (
                                    <div key={lineIdx} className="border-b border-dashed border-slate-800 h-6 w-full" />
                                  ))}
                                </div>
                              ) : (
                                <Textarea
                                  disabled={isEditMode}
                                  placeholder={section.placeholder || "Write response details here..."}
                                  rows={section.rows || 4}
                                  value={fillState[`${fillValKey}_notes`] || ""}
                                  onChange={(e) => setFillState({ ...fillState, [`${fillValKey}_notes`]: e.target.value })}
                                  className="ruled-textarea text-xs focus:ring-0 disabled:opacity-100 font-medium font-serif italic text-slate-800"
                                />
                              )}
                            </div>
                          )}

                          {section.type === "document_request" && (
                            <div className="space-y-4">
                              <div className="flex flex-col lg:flex-row items-center justify-between gap-6 bg-slate-50/45 p-4 rounded-xl border border-slate-200/50">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 flex-1 w-full">
                                  {(section.items || []).map((docItem, dIdx) => {
                                    const fillKey = `${fillValKey}_doc_${dIdx}`;
                                    return (
                                      <div key={dIdx} className="flex items-center gap-2 group/item relative">
                                        <input
                                          type="checkbox"
                                          disabled={isEditMode}
                                          checked={!printAsBlank && (fillState[fillKey] || false)}
                                          onChange={(e) => setFillState({ ...fillState, [fillKey]: e.target.checked })}
                                          className="rounded text-indigo-650 focus:ring-indigo-500 border-slate-350 cursor-pointer h-4 w-4"
                                        />
                                        <span
                                          contentEditable={isEditMode}
                                          suppressContentEditableWarning
                                          onBlur={(e) => {
                                            pushToUndoStack(worksheetData);
                                            const updated = [...worksheetData.sections];
                                            updated[sIdx].items[dIdx] = e.target.innerText;
                                            setWorksheetData({ ...worksheetData, sections: updated });
                                          }}
                                          className="text-[11px] text-slate-800 font-semibold focus:outline-none focus:bg-slate-105 px-0.5 rounded w-full"
                                        >
                                          {docItem}
                                        </span>
                                        {isEditMode && (
                                          <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteItem(sIdx, dIdx); }}
                                            className="no-print p-0.5 hover:bg-rose-500/10 text-rose-550 rounded transition-all shrink-0 ml-1"
                                            title="Delete Doc Request"
                                          >
                                            <Trash2 className="h-2.5 w-2.5 text-rose-500 hover:text-rose-700" />
                                          </button>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>

                                <div className="border border-indigo-500/20 bg-indigo-500/5 rounded-2xl p-4 max-w-xs w-full relative flex flex-col justify-center shrink-0">
                                  {isEditMode && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleOpenAiRewrite(section.bubbleText || "", ["sections", sIdx, "bubbleText"]); }}
                                      className="no-print absolute top-1 right-1 p-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-md"
                                      title="Rewrite with AI"
                                    >
                                      <Sparkles className="h-3 w-3" />
                                    </button>
                                  )}
                                  <p
                                    contentEditable={isEditMode}
                                    suppressContentEditableWarning
                                    onBlur={(e) => {
                                      pushToUndoStack(worksheetData);
                                      const updated = [...worksheetData.sections];
                                      updated[sIdx].bubbleText = e.target.innerText;
                                      setWorksheetData({ ...worksheetData, sections: updated });
                                    }}
                                    className="text-[10px] text-indigo-900 italic leading-relaxed text-center focus:outline-none focus:bg-slate-105 p-1 rounded"
                                  >
                                    {section.bubbleText || "Don't worry about gathering these before your call."}
                                  </p>
                                </div>
                              </div>
                              {isEditMode && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => { e.stopPropagation(); handleAddItem(sIdx); }}
                                  className="no-print text-[10px] h-7 mt-2"
                                >
                                  <Plus className="h-3 w-3 mr-1" /> Add Doc Request
                                </Button>
                              )}
                            </div>
                          )}

                          {section.type === "events_table" && (
                            <div className="space-y-4">
                              <div className="flex items-start justify-between border-b pb-2 mb-4">
                                <th className="no-print block">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      const currentRows = fillState[`${fillValKey}_rows`] || [{}];
                                      setFillState({ ...fillState, [`${fillValKey}_rows`]: [...currentRows, {}] });
                                    }}
                                    className="h-6 text-[10px] py-0 px-2"
                                  >
                                    <Plus className="h-3 w-3 mr-1" /> Add Row
                                  </Button>
                                </th>
                              </div>

                              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                                <table className="w-full text-left border-collapse">
                                  <thead>
                                    <tr className={`border-b text-[10px] font-bold uppercase tracking-wider bg-slate-50/70 ${selectedTheme.primaryText}`}>
                                      {(section.headers || []).map((h, hIdx) => (
                                        <th key={hIdx} className="p-3">
                                          <span
                                            contentEditable={isEditMode}
                                            suppressContentEditableWarning
                                            onBlur={(e) => {
                                              pushToUndoStack(worksheetData);
                                              const updated = [...worksheetData.sections];
                                              updated[sIdx].headers[hIdx] = e.target.innerText;
                                              setWorksheetData({ ...worksheetData, sections: updated });
                                            }}
                                            className="focus:outline-none focus:bg-white px-0.5 rounded"
                                          >
                                            {h}
                                          </span>
                                        </th>
                                      ))}
                                      <th className="no-print p-3 text-[10px] font-bold text-slate-500 w-12 text-center">Action</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(fillState[`${fillValKey}_rows`] || [{}, {}, {}]).map((row, rowIdx) => (
                                      <tr key={rowIdx} className="border-b last:border-0 border-slate-150">
                                        {(section.headers || []).map((_, hIdx) => {
                                          const cellValKey = `cell_${rowIdx}_${hIdx}`;
                                          return (
                                            <td key={hIdx} className="p-2 border-r last:border-0 border-slate-200">
                                              {printAsBlank ? (
                                                <div className="h-8 w-full border-b border-dashed border-slate-800" />
                                              ) : (
                                                <Input
                                                  type="text"
                                                  disabled={isEditMode}
                                                  placeholder="..."
                                                  value={row[cellValKey] || ""}
                                                  onChange={(e) => {
                                                    const rows = [...(fillState[`${fillValKey}_rows`] || [{}, {}, {}])];
                                                    rows[rowIdx] = { ...rows[rowIdx], [cellValKey]: e.target.value };
                                                    setFillState({ ...fillState, [`${fillValKey}_rows`]: rows });
                                                  }}
                                                  className="bg-transparent border-none text-xs h-8 focus:ring-0 p-1 print-clean-input font-medium font-serif italic text-slate-808"
                                                />
                                              )}
                                            </td>
                                          );
                                        })}
                                        <td className="no-print p-2 text-center">
                                          <button
                                            onClick={(e) => { e.stopPropagation(); const rows = (fillState[`${fillValKey}_rows`] || [{}, {}, {}]).filter((_, i) => i !== rowIdx); setFillState({ ...fillState, [`${fillValKey}_rows`]: rows }); }}
                                            className="text-rose-455 hover:text-rose-650"
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          </div>

                        </div>
                      );
                    })}
                  </div>

                </div>

                {/* Printable Footer / Brand details */}
                <div className="border-t pt-6 flex flex-col items-center space-y-4 shrink-0 mt-8">
                  <span
                    contentEditable={isEditMode}
                    suppressContentEditableWarning
                    onBlur={(e) => {
                      pushToUndoStack(worksheetData);
                      setWorksheetData({ ...worksheetData, quote: e.target.innerText });
                    }}
                    className="text-xs font-semibold tracking-wide text-slate-700 italic focus:outline-none focus:bg-white/50 px-1 rounded"
                  >
                    {worksheetData.quote}
                  </span>
                  
                  <div className="flex flex-wrap items-center justify-center gap-6 text-[10px] text-slate-555 font-bold tracking-wider">
                    {/* Phone */}
                    <span
                      contentEditable={isEditMode}
                      suppressContentEditableWarning
                      onBlur={(e) => setBrandSettings({ ...brandSettings, phone: e.target.innerText })}
                      className="focus:outline-none focus:bg-slate-105 px-1 rounded"
                    >
                      {brandSettings.phone}
                    </span>
                    
                    <span className="text-slate-300">|</span>
                    
                    {/* Website */}
                    <span
                      contentEditable={isEditMode}
                      suppressContentEditableWarning
                      onBlur={(e) => setBrandSettings({ ...brandSettings, website: e.target.innerText })}
                      className="focus:outline-none focus:bg-slate-105 px-1 rounded"
                    >
                      {brandSettings.website}
                    </span>
                    
                    <span className="text-slate-300">|</span>
                    
                    {/* Location */}
                    <span
                      contentEditable={isEditMode}
                      suppressContentEditableWarning
                      onBlur={(e) => setBrandSettings({ ...brandSettings, location: e.target.innerText })}
                      className="focus:outline-none focus:bg-slate-105 px-1 rounded"
                    >
                      {brandSettings.location}
                    </span>
                  </div>
                </div>

              </div>
            </div>
            
            {/* Page number indicators and delete page break option */}
            <div className="no-print mt-3 flex items-center justify-between text-xs text-slate-505 px-6 select-none">
              <span>Page {pageIdx + 1} of {pages.length}</span>
              {pageIdx > 0 && isEditMode && (
                <button
                  onClick={() => handleDeletePageBreak(pageSections[0]?.id || "")}
                  className="text-rose-455 hover:text-rose-600 font-bold flex items-center gap-1 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  title="Remove this page boundary break"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remove Page Break
                </button>
              )}
            </div>

          </div>
        ))}

        {/* Add Page Break button (Visible below the last page) */}
        {isEditMode && (
          <div className="no-print flex justify-center pb-12">
            <Button
              onClick={handleAddPageBreak}
              className="bg-indigo-650 hover:bg-indigo-700 text-white font-bold px-6 py-2.5 rounded-xl shadow-lg flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Plus className="h-4 w-4" /> Add New Page
            </Button>
          </div>
        )}
      </div>
      </div>{isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#07162B] border border-white/10 rounded-2xl w-full max-w-lg overflow-y-auto flex flex-col p-6 space-y-5 text-slate-200">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Settings className="h-4 w-4 text-indigo-400" />
                Customize Company Branding
              </h3>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-350">Company Name (Main)</label>
                  <Input
                    value={brandSettings.title}
                    onChange={(e) => setBrandSettings({ ...brandSettings, title: e.target.value })}
                    className="bg-slate-900 border-white/10 text-white text-xs h-9"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-350">Company Name (Sub)</label>
                  <Input
                    value={brandSettings.subtitle}
                    onChange={(e) => setBrandSettings({ ...brandSettings, subtitle: e.target.value })}
                    className="bg-slate-900 border-white/10 text-white text-xs h-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-350">Phone</label>
                  <Input
                    value={brandSettings.phone}
                    onChange={(e) => setBrandSettings({ ...brandSettings, phone: e.target.value })}
                    className="bg-slate-900 border-white/10 text-white text-xs h-9"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-350">Website</label>
                  <Input
                    value={brandSettings.website}
                    onChange={(e) => setBrandSettings({ ...brandSettings, website: e.target.value })}
                    className="bg-slate-900 border-white/10 text-white text-xs h-9"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-350">Location</label>
                  <Input
                    value={brandSettings.location}
                    onChange={(e) => setBrandSettings({ ...brandSettings, location: e.target.value })}
                    className="bg-slate-900 border-white/10 text-white text-xs h-9"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-350 block">Company Logo</label>
                <div className="flex items-center gap-3 mt-1.5">
                  <div className="w-12 h-12 bg-slate-900 border border-white/10 rounded-lg flex items-center justify-center text-slate-200">
                    {defaultLogo ? (
                      <img src={defaultLogo} alt="Logo" className="w-12 h-12 object-contain rounded-lg" />
                    ) : (
                      defaultLighthouseSvg
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <div className="relative">
                      <Button size="sm" variant="outline" className="border-white/10 text-slate-300 text-[10px] h-7">
                        Upload Custom Logo
                      </Button>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </div>
                    {defaultLogo && (
                      <Button
                        size="sm"
                        variant="link"
                        onClick={handleRemoveLogo}
                        className="text-[10px] text-rose-455 p-0 text-left h-auto hover:text-rose-600"
                      >
                        Reset to Default SVG
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-350">AI Change Directive</label>
                <Textarea
                  value={brandSettings.aiDirective}
                  onChange={(e) => setBrandSettings({ ...brandSettings, aiDirective: e.target.value })}
                  placeholder="e.g. Rephrase all items to sound highly supportive, encouraging, and legally accurate..."
                  rows={2}
                  className="bg-slate-900 border-white/10 text-white text-xs focus:ring-indigo-500"
                />
              </div>

            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-white/5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsSettingsOpen(false)}
                className="border-white/10 hover:bg-white/5 text-slate-300"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveSettings}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
              >
                Save defaults
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* AI Rewrite Modal Dialog */}
      {aiModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#07162B] border border-white/10 rounded-2xl w-full max-w-lg flex flex-col p-6 space-y-4 text-slate-200">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="h-4.5 w-4.5 text-indigo-400 animate-pulse" />
                Rewrite with Antigravity AI
              </h3>
              <button
                onClick={() => setAiModal({ isOpen: false, text: "", path: [] })}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-350">Original Text</label>
                <div className="p-3 bg-slate-900 border border-white/5 rounded-xl text-xs text-slate-300 leading-normal italic">
                  "{aiModal.text}"
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-350">AI Change Directive / Instructions</label>
                <Textarea
                  value={customAiPrompt}
                  onChange={(e) => setCustomAiPrompt(e.target.value)}
                  placeholder="Specify how you want to alter the text..."
                  rows={3}
                  className="bg-slate-900 border-white/10 text-white text-xs focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-white/5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAiModal({ isOpen: false, text: "", path: [] })}
                className="border-white/10 hover:bg-white/5 text-slate-300"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleApplyAiRewrite}
                disabled={isAiRewriting}
                className="bg-indigo-650 hover:bg-indigo-700 text-white font-bold"
              >
                {isAiRewriting ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1" />
                    Rewriting...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-3.5 w-3.5 mr-1" />
                    Apply AI Rewrite
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
