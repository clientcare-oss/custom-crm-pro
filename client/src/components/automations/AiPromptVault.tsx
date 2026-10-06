import React, { useState, useEffect, useMemo } from "react";
import {
  Lock,
  Unlock,
  Shield,
  ShieldCheck,
  KeyRound,
  Sparkles,
  Bot,
  Zap,
  Save,
  RotateCcw,
  Copy,
  Check,
  Plus,
  Trash2,
  Sliders,
  Search,
  ExternalLink,
  ChevronRight,
  Code,
  FileText,
  AlertCircle,
  Play,
  Layers,
  Fingerprint,
  Info,
  Compass,
  Phone,
  Users,
  Scale,
  TrendingUp,
  Mail,
  Briefcase,
  Target,
  Clock,
  User,
  History,
  Pencil,
  MoreHorizontal,
  MapPin,
  X,
  CheckCircle2,
  CornerDownRight,
  HelpCircle,
  Eye,
  SlidersHorizontal,
  ArrowLeft
} from "lucide-react";
import {
  DEFAULT_AI_PROMPTS,
  AiPromptRecord,
  ContextVariable,
  VAULT_STORAGE_KEY,
  VAULT_LOCK_STATUS_KEY,
  VAULT_MASTER_PIN
} from "./defaultAiPrompts";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { broadcastPageId } from "@/lib/pageIdRegistry";

interface AiPromptVaultProps {
  onUnlockChange?: (unlocked: boolean) => void;
  onSwitchToWorkflows?: () => void;
}

export default function AiPromptVault({ onUnlockChange, onSwitchToWorkflows }: AiPromptVaultProps = {}) {
  // Vault lock state: session-based
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    return sessionStorage.getItem(VAULT_LOCK_STATUS_KEY) === "true";
  });

  // PIN keypad state
  const [enteredPin, setEnteredPin] = useState<string>("");
  const [pinError, setPinError] = useState<boolean>(false);

  // Prompts state from localStorage or defaults
  const [prompts, setPrompts] = useState<AiPromptRecord[]>(() => {
    try {
      const stored = localStorage.getItem(VAULT_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error("Failed to load stored prompts", e);
    }
    return DEFAULT_AI_PROMPTS;
  });

  // Selected prompt for inspector
  const [selectedPromptId, setSelectedPromptId] = useState<string>(DEFAULT_AI_PROMPTS[0].id);
  const [selectedCategory, setSelectedCategory] = useState<string>("All Prompts");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [inspectorTab, setInspectorTab] = useState<"Overview" | "Instructions" | "Inputs" | "Output Format" | "History">("Overview");

  // Edit modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingPrompt, setEditingPrompt] = useState<AiPromptRecord | null>(null);

  // Test sandbox modal state
  const [isTestModalOpen, setIsTestModalOpen] = useState<boolean>(false);
  const [testInputs, setTestInputs] = useState<Record<string, string>>({});
  const [testOutput, setTestOutput] = useState<string>("");
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // Copied state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Sync Page ID when unlock state changes
  useEffect(() => {
    if (isUnlocked) {
      broadcastPageId({
        id: "PG-013-AI",
        name: "Locked AI Prompt Vault",
        category: "Automation",
        description: "Secure executive library prompts and AI model configuration"
      });
      onUnlockChange?.(true);
    }
  }, [isUnlocked]);

  // Persist prompt changes
  const savePromptsToStorage = (updated: AiPromptRecord[]) => {
    setPrompts(updated);
    try {
      localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to persist prompt library", e);
    }
  };

  const selectedPrompt = useMemo(() => {
    return prompts.find((p) => p.id === selectedPromptId) || prompts[0];
  }, [prompts, selectedPromptId]);

  // Unlock handlers
  const handleDigitPress = (digit: string) => {
    if (enteredPin.length < 4) {
      const newPin = enteredPin + digit;
      setEnteredPin(newPin);
      setPinError(false);

      if (newPin.length === 4) {
        if (newPin === VAULT_MASTER_PIN) {
          setIsUnlocked(true);
          sessionStorage.setItem(VAULT_LOCK_STATUS_KEY, "true");
          setEnteredPin("");
          broadcastPageId({
            id: "PG-013-AI",
            name: "Locked AI Prompt Vault",
            category: "Automation",
            description: "Secure executive library prompts and AI model configuration"
          });
          onUnlockChange?.(true);
          toast.success("Executive AI Vault Unlocked (PG-013-AI) — Authorized Session Active");
        } else {
          setPinError(true);
          toast.error("Incorrect Executive PIN. Access denied.");
          setTimeout(() => {
            setEnteredPin("");
            setPinError(false);
          }, 800);
        }
      }
    }
  };

  const handleBackspace = () => {
    setEnteredPin((prev) => prev.slice(0, -1));
    setPinError(false);
  };

  const handleExecutiveBypass = () => {
    setIsUnlocked(true);
    sessionStorage.setItem(VAULT_LOCK_STATUS_KEY, "true");
    setEnteredPin("");
    broadcastPageId({
      id: "PG-013-AI",
      name: "Locked AI Prompt Vault",
      category: "Automation",
      description: "Secure executive library prompts and AI model configuration"
    });
    onUnlockChange?.(true);
    toast.success("Executive Passkey Verified (PG-013-AI) — Byron Honea Session Active");
  };

  const handleRelock = () => {
    setIsUnlocked(false);
    sessionStorage.removeItem(VAULT_LOCK_STATUS_KEY);
    setEnteredPin("");
    broadcastPageId({
      id: "PG-013",
      name: "Automations Engine",
      category: "Automation",
      description: "Trigger-based action sequences, smart file routing, and workflows"
    });
    onUnlockChange?.(false);
    toast.info("Executive AI Vault Re-Locked");
  };

  // Filtered prompts
  const filteredPrompts = useMemo(() => {
    return prompts.filter((p) => {
      const matchCat =
        selectedCategory === "All Prompts" ||
        (selectedCategory === "Meeting Intel Engine" && p.category === "Meeting Intel") ||
        (selectedCategory === "Case Tools" && p.category === "Case Tools") ||
        (selectedCategory === "Communications" && p.category === "Communications") ||
        (selectedCategory === "Legal & Compliance" && p.category === "Legal & Compliance") ||
        (selectedCategory === "System" && p.category === "System");

      const matchQuery =
        searchQuery === "" ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.key.toLowerCase().includes(searchQuery.toLowerCase());

      return matchCat && matchQuery;
    });
  }, [prompts, selectedCategory, searchQuery]);

  // Copy helper
  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    toast.success(`Copied ${label} to clipboard`);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  // Open Edit Modal
  const handleOpenEdit = (prompt: AiPromptRecord) => {
    setEditingPrompt({ ...prompt });
    setIsEditModalOpen(true);
  };

  // Save Edit
  const handleSaveEdit = () => {
    if (!editingPrompt) return;
    const updated = prompts.map((p) => (p.id === editingPrompt.id ? editingPrompt : p));
    savePromptsToStorage(updated);
    setIsEditModalOpen(false);
    toast.success(`Prompt "${editingPrompt.name}" updated successfully`);
  };

  // Duplicate prompt
  const handleDuplicatePrompt = (prompt: AiPromptRecord) => {
    const copyId = `prompt-${Date.now()}`;
    const duplicated: AiPromptRecord = {
      ...prompt,
      id: copyId,
      name: `${prompt.name} (Copy)`,
      key: `${prompt.key}_COPY`,
      version: "1.0",
      lastUpdated: new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }),
      updatedBy: "Byron Honea",
      history: [
        {
          version: "1.0",
          date: new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }),
          author: "Byron Honea",
          notes: `Duplicated from ${prompt.name} v${prompt.version}`
        }
      ]
    };
    const updated = [duplicated, ...prompts];
    savePromptsToStorage(updated);
    setSelectedPromptId(duplicated.id);
    toast.success(`Duplicated "${prompt.name}" as new prompt`);
  };

  // Open Test Modal
  const handleOpenTest = (prompt: AiPromptRecord) => {
    const initialInputs: Record<string, string> = {};
    prompt.variables.forEach((v) => {
      initialInputs[v.name] = v.example;
    });
    setTestInputs(initialInputs);
    setTestOutput("");
    setIsTestModalOpen(true);
  };

  // Run Test Simulation
  const handleRunTest = async () => {
    setIsSimulating(true);
    setTestOutput("");

    setTimeout(() => {
      let output = `[Cloudflare Workers AI Response · Model: ${selectedPrompt.modelName}]\n\n`;
      if (selectedPrompt.key === "CHILD_FILE_ANALYSIS") {
        output += `### Executive Child Record Dossier: ${testInputs["student_name"] || "Lucas Miller"}\n\n`;
        output += `**1. Clinical & Neurodevelopmental Profile:**\n`;
        output += `- Primary Diagnosis: Other Health Impairment (ADHD-Combined) with Specific Learning Disorder in Reading (Phonological Processing Deficit).\n`;
        output += `- Sensory Dysregulation: Significant auditory defensiveness requiring proactive classroom transition protocols.\n\n`;
        output += `**2. Longitudinal Academic Benchmarks:**\n`;
        output += `| Academic Year | Standard Score (WJ-IV) | Percentile | Trajectory |\n`;
        output += `|---|---|---|---|\n`;
        output += `| 2023-2024 | 82 (Low Average) | 12th | Baseline |\n`;
        output += `| 2024-2025 | 78 (Well Below Average) | 7th | ⚠️ Documented Regression |\n`;
        output += `| 2025-2026 | 77 (Well Below Average) | 6th | ⚠️ Non-Responsive to Tier 2 |\n\n`;
        output += `**3. Strategic Advocate Leverage Points:**\n`;
        output += `- The LEA has maintained 30 mins/week consultative reading instruction despite 2 consecutive years of standardized score decline.\n`;
        output += `- Demand 1:1 direct Orton-Gillingham intervention (60 mins/day) and compensatory education under 34 CFR § 300.324.`;
      } else {
        output += `### ${selectedPrompt.name} Analysis Output\n\n`;
        output += `**Executive Findings:**\n`;
        output += `- Evaluated all parameters under ${selectedPrompt.category} statutory standards.\n`;
        output += `- Verified compliance across Georgia Special Education Rule 160-4-7 and IDEA 2004.\n`;
        output += `- Generated 4 procedural leverage items for Byron Honea's case file.\n\n`;
        output += `**Recommended Advocate Script:**\n`;
        output += `"Based on the student's documented performance data and statutory procedural safeguards, we respectfully request this accommodation be formalized into Section 5 of the IEP prior to closing today's session."`;
      }
      setTestOutput(output);
      setIsSimulating(false);
      toast.success("Simulation completed successfully via Cloudflare Workers AI");
    }, 1100);
  };

  // Helper icon for prompt list
  const getPromptIcon = (key: string) => {
    switch (key) {
      case "CHILD_FILE_ANALYSIS":
      case "IEP_INTEL_UNIT":
      case "PWN_DECODER":
        return <FileText className="w-4 h-4 text-[#10223D]" />;
      case "CASE_NOTES_PHONE_ANALYSIS":
        return <Phone className="w-4 h-4 text-[#10223D]" />;
      case "PARENT_CONCERNS_ANALYSIS":
        return <Users className="w-4 h-4 text-[#10223D]" />;
      case "MEETING_DIRECTION_LEAN":
        return <Compass className="w-4 h-4 text-[#10223D]" />;
      case "MEETING_ASSEMBLER":
        return <Sparkles className="w-4 h-4 text-[#10223D]" />;
      case "STATE_COMPLAINT_BUILDER":
        return <Scale className="w-4 h-4 text-[#10223D]" />;
      case "PROGRESS_MONITORING_ANALYZER":
        return <TrendingUp className="w-4 h-4 text-[#10223D]" />;
      case "COMMUNICATION_ANALYZER":
        return <Mail className="w-4 h-4 text-[#10223D]" />;
      default:
        return <Bot className="w-4 h-4 text-[#10223D]" />;
    }
  };

  // Helper for category pill color
  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case "Meeting Intel":
        return "bg-[#CCD9E8] text-[#1E375A] border border-[#B3C5DC]";
      case "Legal & Compliance":
        return "bg-[#EBDDC3] text-[#5C3E14] border border-[#DCB492]";
      case "Case Tools":
        return "bg-[#D1DCE5] text-[#283C4D] border border-[#BAC9D5]";
      case "Communications":
        return "bg-[#D4D9EE] text-[#222B55] border border-[#C0C7E5]";
      default:
        return "bg-[#E2DCCE] text-[#3E3424] border border-[#CFC5B4]";
    }
  };

  // =========================================================================
  // RENDER 1: LOCKED VAULT GATEWAY (PIN KEYPAD / PASSKEY)
  // =========================================================================
  if (!isUnlocked) {
    return (
      <div
        className="w-full min-h-screen flex items-center justify-center p-4 relative"
        style={{
          backgroundImage: "url('/images/steampunk-admiralty-bg.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center top",
          backgroundAttachment: "fixed"
        }}
      >
        <div className="max-w-md w-full bg-[#05142B]/95 border-2 border-[#5A4322] rounded-2xl p-7 shadow-[0_20px_50px_rgba(0,0,0,0.95),inset_0_1px_2px_rgba(255,255,255,0.08)] relative overflow-hidden backdrop-blur-xl">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#E5C175] to-transparent shadow-[0_0_12px_rgba(229,193,117,0.7)]" />

          {/* Security Header */}
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1F1404] via-[#0A182F] to-[#040C1A] border border-[#C5A059]/60 flex items-center justify-center shadow-[0_0_24px_rgba(197,160,89,0.3)] mb-2">
              <Lock className="w-8 h-8 text-[#FFE394] drop-shadow-[0_0_8px_rgba(255,227,148,0.6)]" />
            </div>

            <div className="flex items-center gap-1.5 flex-wrap justify-center">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#FFE394] px-2.5 py-0.5 rounded-full bg-[#1F1404] border border-[#8C6418]">
                PG-013-AI
              </span>
              <span className="text-[10px] font-serif font-bold uppercase tracking-[0.22em] text-[#C5A059] px-2.5 py-0.5 rounded-full bg-[#1F1404]/80 border border-[#8C6418]/60">
                Executive AI Vault · Restricted Access
              </span>
            </div>

            <h2 className="font-serif text-2xl font-bold text-[#FFF4D4] drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
              Waypoint AI · Prompt Library
            </h2>
            <p className="text-xs text-[#C6B697] max-w-xs leading-relaxed">
              Confidential prompt libraries, legal guardrails, and behavioral models for Byron Honea (Master IEP Coach®).
            </p>
          </div>

          {/* PIN Display Dots */}
          <div className="mt-6 flex flex-col items-center">
            <div className="flex items-center gap-3">
              {[0, 1, 2, 3].map((idx) => {
                const filled = enteredPin.length > idx;
                return (
                  <div
                    key={idx}
                    className={cn(
                      "w-4 h-4 rounded-full border transition-all duration-200",
                      filled
                        ? pinError
                          ? "bg-rose-500 border-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.7)] scale-110"
                          : "bg-gradient-to-r from-[#DFBE77] to-[#C5A059] border-[#FFE394] shadow-[0_0_10px_rgba(229,193,117,0.8)] scale-110"
                        : "border-[#3A2C18] bg-[#020A17]"
                    )}
                  />
                );
              })}
            </div>
            <p className="text-[11px] font-mono text-[#8CA4C4] mt-2 tracking-wide">
              {enteredPin.length === 0 ? "Enter 4-digit Master Vault PIN" : `${enteredPin.length} of 4 digits`}
            </p>
          </div>

          {/* Numeric Keypad */}
          <div className="grid grid-cols-3 gap-2.5 mt-5 max-w-[260px] mx-auto">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleDigitPress(digit)}
                className="h-12 rounded-xl bg-[#030E1F] hover:bg-[#0A2244] border border-[#2B2011] hover:border-[#C5A059]/60 text-lg font-serif font-bold text-[#F1E4C8] shadow-[0_2px_8px_rgba(0,0,0,0.6)] active:scale-95 transition-all cursor-pointer flex items-center justify-center"
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setEnteredPin("")}
              className="h-12 rounded-xl bg-[#030E1F] hover:bg-[#0A2244] border border-[#2B2011] text-[11px] font-serif font-semibold text-[#A69371] active:scale-95 transition-all cursor-pointer flex items-center justify-center"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => handleDigitPress("0")}
              className="h-12 rounded-xl bg-[#030E1F] hover:bg-[#0A2244] border border-[#2B2011] hover:border-[#C5A059]/60 text-lg font-serif font-bold text-[#F1E4C8] shadow-[0_2px_8px_rgba(0,0,0,0.6)] active:scale-95 transition-all cursor-pointer flex items-center justify-center"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              className="h-12 rounded-xl bg-[#030E1F] hover:bg-[#0A2244] border border-[#2B2011] text-xs font-serif font-semibold text-[#A69371] active:scale-95 transition-all cursor-pointer flex items-center justify-center"
              title="Delete last digit"
            >
              ⌫
            </button>
          </div>

          {/* Quick Executive Passkey Bypass Button */}
          <div className="mt-6 pt-5 border-t border-[#3A2C18]/60 flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={handleExecutiveBypass}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-serif font-bold text-xs uppercase tracking-wider border border-[#FFE394]/60 shadow-[0_4px_16px_rgba(0,0,0,0.8)] hover:brightness-110 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Fingerprint className="w-4 h-4 text-[#07162B]" />
              Unlock with Executive Passkey (Byron)
            </button>
            <span className="text-[10px] text-[#A69371] font-mono">
              Master PIN: 1984 or Executive Biometric Clearance
            </span>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER 2: FULL EDGE-TO-EDGE STEAMPUNK ADMIRALTY CONSOLE (UNLOCKED)
  // =========================================================================
  return (
    <div
      className="w-full min-h-screen relative text-[#2C2114] p-3 sm:p-5 lg:p-6 space-y-5"
      style={{
        backgroundImage: "url('/images/steampunk-admiralty-bg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center top",
        backgroundAttachment: "fixed",
        backgroundRepeat: "no-repeat"
      }}
    >
      {/* ─── 1. TOP ADMIRALTY HEADER DECK ─── */}
      <div className="w-full flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 relative z-10">
        {/* Main Header Plaque (Framed in Riveted Aged Brass) */}
        <div className="w-full lg:max-w-2xl bg-[#061426]/95 border-2 border-[#8C6418] rounded-xl p-4 sm:p-5 shadow-[0_16px_36px_rgba(0,0,0,0.9),inset_0_1px_2px_rgba(255,255,255,0.1)] relative">
          {/* Corner Screw Rivets */}
          <div className="absolute top-2 left-2 w-2.5 h-2.5 rounded-full bg-[#8C6418] border border-[#FFE394]/60 shadow-sm flex items-center justify-center text-[7px] text-[#2A1804] font-mono">
            +
          </div>
          <div className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-[#8C6418] border border-[#FFE394]/60 shadow-sm flex items-center justify-center text-[7px] text-[#2A1804] font-mono">
            +
          </div>
          <div className="absolute bottom-2 left-2 w-2.5 h-2.5 rounded-full bg-[#8C6418] border border-[#FFE394]/60 shadow-sm flex items-center justify-center text-[7px] text-[#2A1804] font-mono">
            +
          </div>
          <div className="absolute bottom-2 right-2 w-2.5 h-2.5 rounded-full bg-[#8C6418] border border-[#FFE394]/60 shadow-sm flex items-center justify-center text-[7px] text-[#2A1804] font-mono">
            +
          </div>

          <div className="flex items-start gap-4 pl-1 pr-1">
            {/* Diamond Compass Star Logo */}
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-[#1F1404] via-[#0E2442] to-[#040D1B] border border-[#C5A059]/70 flex items-center justify-center shadow-lg shrink-0 mt-0.5">
              <Compass className="w-6 h-6 sm:w-7 sm:h-7 text-[#FFE394] drop-shadow-[0_0_8px_rgba(255,227,148,0.7)]" />
            </div>

            <div className="space-y-0.5 min-w-0 flex-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="font-serif text-2xl sm:text-3xl lg:text-[30px] font-bold tracking-wide text-[#FFF8E7] drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] leading-none">
                  Waypoint AI
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#08172C] border border-[#8C6418] text-[#E5C175] text-[10px] font-mono font-bold tracking-wider shadow-sm">
                  <Lock className="w-3 h-3 text-[#E5C175]" />
                  ADMIN ONLY
                </span>
                <span className="font-mono text-[10px] font-bold text-[#E5C175] px-2 py-0.5 rounded bg-[#1F1404] border border-[#8C6418]">
                  PG-013-AI
                </span>
              </div>

              <div className="text-[10px] sm:text-[11px] font-serif font-bold uppercase tracking-[0.25em] text-[#C5A059] pt-0.5">
                PROMPT LIBRARY
              </div>

              <p className="font-serif text-xs sm:text-sm text-[#FFF4D4]/95 font-medium leading-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] pt-1">
                The engine behind Waypoint's intelligence.
              </p>
              <p className="font-serif text-[11px] sm:text-xs text-[#C6B697] leading-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                Manage, test, and version all AI prompts used across the platform.
              </p>
            </div>
          </div>
        </div>

        {/* Right Stack: 4 Embossed Stamped Brass Plates + Actions */}
        <div className="flex items-center gap-3 shrink-0 self-start lg:self-auto">
          {/* 4 Stamped Brass Plates */}
          <div className="flex flex-col gap-1.5 shrink-0">
            {["ANALYZE", "SYNTHESIZE", "REASON", "ADVOCATE"].map((pill) => (
              <div
                key={pill}
                className="bg-gradient-to-b from-[#2A1E0E] to-[#120B04] border border-[#7D5A1E] text-[#D8C7A5] font-serif text-[9px] sm:text-[10px] font-bold tracking-[0.22em] shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_2px_6px_rgba(0,0,0,0.8)] py-1 px-3 sm:px-4 rounded text-center whitespace-nowrap"
              >
                {pill}
              </div>
            ))}
          </div>

          {/* Quick Actions (Switch to Sequences + Lock) */}
          <div className="flex flex-col gap-2 shrink-0">
            {onSwitchToWorkflows && (
              <button
                type="button"
                onClick={onSwitchToWorkflows}
                className="py-1.5 px-3 rounded-xl border border-[#FFE394]/40 bg-[#0A1A2E]/90 text-[#FFE394] hover:bg-[#122A4A] font-serif font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-md whitespace-nowrap"
                title="Switch to Automation Sequences"
              >
                <Zap className="w-3.5 h-3.5 text-[#FFE394]" />
                <span>Sequences</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleRelock}
              className="py-1.5 px-3 rounded-xl border border-rose-500/40 bg-rose-950/70 text-rose-300 hover:bg-rose-900 font-serif font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md whitespace-nowrap"
              title="Lock Vault"
            >
              <Lock className="w-3.5 h-3.5 text-rose-400" />
              <span>Lock</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── 2. SUB-NAVIGATION FILTER SHELF ─── */}
      <div className="w-full bg-[#040D1B]/95 border border-[#3A2C18] rounded-xl p-2 sm:p-2.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xl backdrop-blur-md relative z-10">
        {/* Category Pills (Matching Mockup) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {[
            { label: "All Prompts", icon: Layers },
            { label: "Meeting Intel Engine", icon: Compass },
            { label: "Case Tools", icon: Briefcase },
            { label: "Communications", icon: Mail },
            { label: "Legal & Compliance", icon: Scale },
            { label: "System", icon: Users }
          ].map((cat) => {
            const isActive = selectedCategory === cat.label;
            const IconComp = cat.icon;
            return (
              <button
                key={cat.label}
                type="button"
                onClick={() => setSelectedCategory(cat.label)}
                className={cn(
                  "py-1.5 px-3 rounded-lg font-serif text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0",
                  isActive
                    ? "bg-[#DFBE77] text-[#171006] border border-[#FFE394] shadow-[0_2px_8px_rgba(223,190,119,0.5)]"
                    : "text-[#C6B697] hover:text-[#FFF4D4] hover:bg-white/5 border border-transparent"
                )}
              >
                <IconComp className={cn("w-3.5 h-3.5", isActive ? "text-[#171006]" : "text-[#C5A059]")} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search Bar + New Prompt Button */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="relative w-44 sm:w-56 shrink-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#7E97B8] pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search prompts..."
              className="w-full h-8 pl-8 pr-3 rounded-lg bg-[#061224] border border-[#2A3F60] text-xs text-[#F0F6FC] placeholder:text-[#647C9D] focus:outline-none focus:border-[#C5A059] transition-all shadow-inner"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              const newPrompt: AiPromptRecord = {
                id: `prompt-${Date.now()}`,
                name: "New Custom AI Prompt",
                key: `CUSTOM_PROMPT_${Date.now()}`,
                pageId: "PG-013-AI",
                category: "Meeting Intel",
                modelTier: "CF_MODELS.DEEP",
                modelName: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
                version: "1.0",
                lastUpdated: new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }),
                updatedBy: "Byron Honea",
                status: "Active",
                description: "Describe new prompt functionality.",
                purpose: "Define primary purpose and expected advocacy outcomes.",
                usedIn: ["Meeting Workspace"],
                systemPrompt: `You are an expert Special Education Advocate AI assisting Byron Honea (Master IEP Coach®).`,
                outputFormat: `Structured markdown summary with action items and statutory citations.`,
                variables: [{ name: "student_name", type: "string", description: "Name of student", example: "Lucas" }],
                history: [
                  {
                    version: "1.0",
                    date: new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }),
                    author: "Byron Honea",
                    notes: "Initial creation"
                  }
                ],
                temperature: 0.2,
                maxTokens: 1500,
                isIndividualLocked: false
              };
              const updated = [newPrompt, ...prompts];
              savePromptsToStorage(updated);
              setSelectedPromptId(newPrompt.id);
              handleOpenEdit(newPrompt);
            }}
            className="py-1.5 px-3 rounded-lg bg-[#DFBE77] hover:bg-[#D4AF60] text-[#171006] font-serif font-bold text-xs border border-[#FFE394] shadow-[0_2px_8px_rgba(223,190,119,0.5)] active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Prompt</span>
          </button>
        </div>
      </div>

      {/* ─── 3. TWO-COLUMN MASTER-DETAIL WORKSPACE (FIT AT 100% ZOOM) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 relative z-10 items-start">
        {/* ─── LEFT COLUMN: PROMPTS TABLE (PARCHMENT AESTHETIC) ─── */}
        <div className="lg:col-span-7 bg-[#F4ECDA] text-[#2C2114] border-2 border-[#543E1B] rounded-2xl p-3 sm:p-4 shadow-[0_16px_40px_rgba(0,0,0,0.9)] relative overflow-hidden">
          {/* Brass Corner Rivets */}
          <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-[#8C6418] border border-[#2C2114]/40 flex items-center justify-center text-[6px] text-[#2C2114] font-mono">
            +
          </div>
          <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#8C6418] border border-[#2C2114]/40 flex items-center justify-center text-[6px] text-[#2C2114] font-mono">
            +
          </div>
          <div className="absolute bottom-2 left-2 w-2 h-2 rounded-full bg-[#8C6418] border border-[#2C2114]/40 flex items-center justify-center text-[6px] text-[#2C2114] font-mono">
            +
          </div>
          <div className="absolute bottom-2 right-2 w-2 h-2 rounded-full bg-[#8C6418] border border-[#2C2114]/40 flex items-center justify-center text-[6px] text-[#2C2114] font-mono">
            +
          </div>

          <div className="w-full overflow-x-auto scrollbar-thin">
            <table className="w-full border-collapse table-fixed text-left min-w-[580px]">
              <colgroup>
                <col style={{ width: "38%" }} />
                <col style={{ width: "24%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "9%" }} />
                <col style={{ width: "5%" }} />
              </colgroup>
              <thead>
                <tr className="border-b border-[#C8B898] text-[#5C4524] text-[11px] font-serif font-bold uppercase tracking-wider">
                  <th className="py-2.5 px-3 whitespace-nowrap">Name</th>
                  <th className="py-2.5 px-2 whitespace-nowrap">Category</th>
                  <th className="py-2.5 px-1 text-center whitespace-nowrap">Version</th>
                  <th className="py-2.5 px-2 text-center whitespace-nowrap">Updated</th>
                  <th className="py-2.5 px-1 text-center whitespace-nowrap">Status</th>
                  <th className="py-2.5 px-1 text-right whitespace-nowrap">•••</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2D4B7]">
                {filteredPrompts.map((p) => {
                  const isSelected = p.id === selectedPrompt.id;
                  return (
                    <tr
                      key={p.id}
                      onClick={() => setSelectedPromptId(p.id)}
                      className={cn(
                        "group transition-all cursor-pointer",
                        isSelected
                          ? "bg-[#E6D7BA] shadow-inner font-semibold"
                          : "hover:bg-[#ECE1C9]"
                      )}
                    >
                      {/* Name + Icon + Snippet (Truncated cleanly) */}
                      <td className="py-2.5 px-3 align-middle">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="shrink-0 p-1.5 rounded bg-[#E4D7BC] border border-[#C6B697] text-[#1C140A]">
                            {getPromptIcon(p.key)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-serif text-xs sm:text-[13px] font-bold text-[#1C140A] group-hover:text-[#8C6418] transition-colors truncate">
                              {p.name}
                            </div>
                            <div className="font-serif text-[11px] text-[#6B5A43] truncate leading-tight mt-0.5">
                              {p.description}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category Badge */}
                      <td className="py-2.5 px-2 align-middle">
                        <div className="truncate">
                          <span className={cn("text-[10px] font-serif font-bold px-2 py-0.5 rounded-full inline-block truncate max-w-full text-center", getCategoryBadgeClass(p.category))}>
                            {p.category}
                          </span>
                        </div>
                      </td>

                      {/* Version */}
                      <td className="py-2.5 px-1 text-center font-mono text-xs text-[#4D3B26] whitespace-nowrap align-middle">
                        {p.version}
                      </td>

                      {/* Updated */}
                      <td className="py-2.5 px-2 text-center font-serif text-[11px] text-[#4D3B26] whitespace-nowrap align-middle">
                        {p.lastUpdated}
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-1 text-center whitespace-nowrap align-middle">
                        <span className="text-[10px] font-serif font-bold px-2 py-0.5 rounded-full bg-[#BDE8D3] text-[#0D4B2D] border border-[#96D9B6] inline-block">
                          {p.status}
                        </span>
                      </td>

                      {/* Context Menu Button */}
                      <td className="py-2.5 px-1 text-right align-middle">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEdit(p);
                          }}
                          className="p-1 rounded text-[#7B6A52] hover:text-[#1C140A] hover:bg-[#DCD0B5] transition-colors"
                          title="Options"
                        >
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ─── RIGHT COLUMN: PROMPT INSPECTOR & ACTION DECK ─── */}
        <div className="lg:col-span-5 bg-[#F4ECDA] text-[#2C2114] border-2 border-[#543E1B] rounded-2xl p-4 sm:p-5 shadow-[0_16px_40px_rgba(0,0,0,0.9)] relative overflow-hidden flex flex-col justify-between">
          {/* Brass Corner Rivets */}
          <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-[#8C6418] border border-[#2C2114]/40 flex items-center justify-center text-[6px] text-[#2C2114] font-mono">
            +
          </div>
          <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#8C6418] border border-[#2C2114]/40 flex items-center justify-center text-[6px] text-[#2C2114] font-mono">
            +
          </div>
          <div className="absolute bottom-2 left-2 w-2 h-2 rounded-full bg-[#8C6418] border border-[#2C2114]/40 flex items-center justify-center text-[6px] text-[#2C2114] font-mono">
            +
          </div>
          <div className="absolute bottom-2 right-2 w-2 h-2 rounded-full bg-[#8C6418] border border-[#2C2114]/40 flex items-center justify-center text-[6px] text-[#2C2114] font-mono">
            +
          </div>

          <div className="space-y-4">
            {/* Top Inspector Header */}
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#0D213B] border border-[#2B4B75] flex items-center justify-center shadow-inner shrink-0">
                    <FileText className="w-5 h-5 text-[#FFE394]" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-serif text-lg sm:text-xl font-bold text-[#1C140A] leading-tight break-words">
                        {selectedPrompt.name}
                      </h2>
                      <span className="text-[10px] font-serif font-bold px-2 py-0.5 rounded-full bg-[#BDE8D3] text-[#0D4B2D] border border-[#96D9B6] shrink-0">
                        {selectedPrompt.status}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenEdit(selectedPrompt)}
                  className="p-1 rounded text-[#7B6A52] hover:text-[#1C140A] hover:bg-[#DCD0B5] transition-colors shrink-0"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>

              {/* Description (Concise subtitle from description, matching mockup) */}
              <p className="font-serif text-xs text-[#5C482C] leading-relaxed mt-2.5 pb-3 border-b border-[#C8B898] break-words">
                {selectedPrompt.description}
              </p>
            </div>

            {/* Sub-Tabs: Overview, Instructions, Inputs, Output Format, History */}
            <div className="flex items-center gap-1 border-b border-[#C8B898] pb-2 overflow-x-auto scrollbar-none">
              {(["Overview", "Instructions", "Inputs", "Output Format", "History"] as const).map((tab) => {
                const isActive = inspectorTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setInspectorTab(tab)}
                    className={cn(
                      "py-1 px-2.5 rounded font-serif text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
                      isActive
                        ? "bg-[#0A1A30] text-[#FFF4D4] shadow-sm border border-[#2A4468]"
                        : "text-[#6B5A43] hover:text-[#1C140A] hover:bg-[#E4D7BC]"
                    )}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>

            {/* ── TAB 1: OVERVIEW ── */}
            {inspectorTab === "Overview" && (
              <div className="space-y-4">
                {/* Purpose Block - Clean, no enclosing box */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center gap-1.5 text-xs font-serif font-bold text-[#1C140A]">
                    <Target className="w-4 h-4 text-[#8C6418] shrink-0" />
                    <span>Purpose</span>
                  </div>
                  <p className="font-serif text-xs text-[#4D3B26] leading-relaxed break-words">
                    {selectedPrompt.purpose}
                  </p>
                </div>

                {/* 4 Metadata Columns with Top Icons - Clean, no enclosing boxes */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-3 border-y border-[#C8B898]/70">
                  {/* Category */}
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-[11px] font-serif font-semibold text-[#7B6A52]">
                      <Layers className="w-3.5 h-3.5 text-[#8C6418] shrink-0" />
                      <span className="truncate">Category</span>
                    </div>
                    <div>
                      <span className={cn("text-[10px] font-serif font-bold px-2 py-0.5 rounded-full inline-block truncate max-w-full", getCategoryBadgeClass(selectedPrompt.category))}>
                        {selectedPrompt.category}
                      </span>
                    </div>
                  </div>

                  {/* Current Version */}
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-[11px] font-serif font-semibold text-[#7B6A52]">
                      <MapPin className="w-3.5 h-3.5 text-[#8C6418] shrink-0" />
                      <span className="whitespace-nowrap">Current Version</span>
                    </div>
                    <div className="font-mono text-xs font-bold text-[#1C140A]">
                      {selectedPrompt.version}
                    </div>
                  </div>

                  {/* Last Updated */}
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-[11px] font-serif font-semibold text-[#7B6A52]">
                      <Clock className="w-3.5 h-3.5 text-[#8C6418] shrink-0" />
                      <span className="whitespace-nowrap">Last Updated</span>
                    </div>
                    <div className="font-serif text-xs font-bold text-[#1C140A]">
                      {selectedPrompt.lastUpdated}
                    </div>
                  </div>

                  {/* Updated By */}
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-[11px] font-serif font-semibold text-[#7B6A52]">
                      <User className="w-3.5 h-3.5 text-[#8C6418] shrink-0" />
                      <span className="whitespace-nowrap">Updated By</span>
                    </div>
                    <div className="font-serif text-xs font-bold text-[#1C140A] truncate">
                      {selectedPrompt.updatedBy}
                    </div>
                  </div>
                </div>

                {/* Used In Section */}
                <div className="space-y-1.5 pt-1">
                  <div className="text-xs font-serif font-bold text-[#1C140A]">
                    Used In
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedPrompt.usedIn.map((item) => (
                      <span
                        key={item}
                        className="py-1 px-2.5 rounded-lg bg-[#E2D4B7] border border-[#C6B697] font-serif text-[11px] font-semibold text-[#3D2E17] flex items-center gap-1.5 shadow-sm"
                      >
                        <Sparkles className="w-3 h-3 text-[#8C6418]" />
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 2: INSTRUCTIONS (SYSTEM PROMPT) ── */}
            {inspectorTab === "Instructions" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-serif font-semibold text-[#5C4524]">
                  <span>System Instructions ({selectedPrompt.modelTier})</span>
                  <button
                    type="button"
                    onClick={() => handleCopyText(selectedPrompt.systemPrompt, "System Prompt")}
                    className="text-[#8C6418] hover:text-[#1C140A] flex items-center gap-1 text-[11px]"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </button>
                </div>
                <div className="p-3 rounded-xl bg-[#091524] text-[#E8EDF5] font-mono text-xs leading-relaxed max-h-[250px] overflow-y-auto border border-[#2B3E58] shadow-inner select-text whitespace-pre-wrap break-words">
                  {selectedPrompt.systemPrompt}
                </div>
              </div>
            )}

            {/* ── TAB 3: INPUTS ── */}
            {inspectorTab === "Inputs" && (
              <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                {selectedPrompt.variables.map((v) => (
                  <div key={v.name} className="p-2.5 rounded-xl bg-[#EBE0C7] border border-[#C6B697] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-[#1C140A] bg-[#DFCFAF] px-1.5 py-0.5 rounded border border-[#C6B697]">
                        {`{${v.name}}`}
                      </span>
                      <span className="text-[10px] font-mono text-[#7B6A52] uppercase">
                        {v.type || "string"}
                      </span>
                    </div>
                    <p className="font-serif text-xs text-[#5C4524]">{v.description}</p>
                    <p className="font-serif text-[11px] text-[#7B6A52] italic truncate">
                      Example: {v.example}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* ── TAB 4: OUTPUT FORMAT ── */}
            {inspectorTab === "Output Format" && (
              <div className="p-3 rounded-xl bg-[#EBE0C7] border border-[#C6B697] space-y-1.5">
                <div className="text-xs font-serif font-bold text-[#1C140A]">
                  Expected Output Schema
                </div>
                <p className="font-serif text-xs text-[#4D3B26] leading-relaxed break-words">
                  {selectedPrompt.outputFormat}
                </p>
              </div>
            )}

            {/* ── TAB 5: HISTORY ── */}
            {inspectorTab === "History" && (
              <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                {selectedPrompt.history.map((h, i) => (
                  <div key={i} className="p-2.5 rounded-xl bg-[#EBE0C7] border border-[#C6B697] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-[#1C140A]">
                        v{h.version}
                      </span>
                      <span className="font-serif text-[11px] text-[#7B6A52]">
                        {h.date} · {h.author}
                      </span>
                    </div>
                    <p className="font-serif text-xs text-[#5C4524]">{h.notes}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ─── BOTTOM ACTION BUTTONS BAR (MATCHING MOCKUP) ─── */}
          <div className="pt-4 mt-3 border-t border-[#C8B898] flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => handleOpenEdit(selectedPrompt)}
              className="py-1.5 px-3.5 rounded-lg bg-[#DFBE77] hover:bg-[#D4AF60] text-[#171006] font-serif font-bold text-xs border border-[#FFE394] shadow-md active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Edit Prompt</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenTest(selectedPrompt)}
              className="py-1.5 px-3.5 rounded-lg bg-[#0B1A2F] hover:bg-[#122847] text-[#FFE394] font-serif font-bold text-xs border border-[#4A381E] shadow-md active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-[#FFE394]" />
              <span>Test Prompt</span>
            </button>

            <button
              type="button"
              onClick={() => handleDuplicatePrompt(selectedPrompt)}
              className="py-1.5 px-3.5 rounded-lg bg-[#0B1A2F] hover:bg-[#122847] text-[#FFE394] font-serif font-bold text-xs border border-[#4A381E] shadow-md active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Duplicate</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── MODAL 1: EDIT PROMPT MODAL ─── */}
      {isEditModalOpen && editingPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="max-w-2xl w-full bg-[#05142B] border-2 border-[#8C6418] rounded-2xl p-6 shadow-2xl text-[#FFF4D4] space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#3A2C18] pb-3">
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-[#FFE394]" />
                <h3 className="font-serif text-lg font-bold text-[#FFF4D4]">
                  Edit Prompt · {editingPrompt.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 font-serif">
              <div>
                <label className="text-xs text-[#C6B697] block mb-1">Prompt Name</label>
                <input
                  type="text"
                  value={editingPrompt.name}
                  onChange={(e) => setEditingPrompt({ ...editingPrompt, name: e.target.value })}
                  className="w-full h-9 rounded bg-[#020A17] border border-[#3A2C18] px-3 text-xs text-[#FFF4D4] focus:border-[#FFE394]"
                />
              </div>

              <div>
                <label className="text-xs text-[#C6B697] block mb-1">Purpose & Description</label>
                <textarea
                  rows={2}
                  value={editingPrompt.purpose}
                  onChange={(e) => setEditingPrompt({ ...editingPrompt, purpose: e.target.value })}
                  className="w-full rounded bg-[#020A17] border border-[#3A2C18] p-2.5 text-xs text-[#FFF4D4] focus:border-[#FFE394]"
                />
              </div>

              <div>
                <label className="text-xs text-[#C6B697] block mb-1">System Instructions (LLM Prompt)</label>
                <textarea
                  rows={8}
                  value={editingPrompt.systemPrompt}
                  onChange={(e) => setEditingPrompt({ ...editingPrompt, systemPrompt: e.target.value })}
                  className="w-full font-mono rounded bg-[#020A17] border border-[#3A2C18] p-2.5 text-xs text-[#FFF4D4] focus:border-[#FFE394]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#C6B697] block mb-1">Temperature ({editingPrompt.temperature})</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={editingPrompt.temperature}
                    onChange={(e) => setEditingPrompt({ ...editingPrompt, temperature: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#C6B697] block mb-1">Max Tokens</label>
                  <input
                    type="number"
                    value={editingPrompt.maxTokens}
                    onChange={(e) => setEditingPrompt({ ...editingPrompt, maxTokens: parseInt(e.target.value) || 1024 })}
                    className="w-full h-8 rounded bg-[#020A17] border border-[#3A2C18] px-2 text-xs text-[#FFF4D4]"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-4 border-t border-[#3A2C18]">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="py-2 px-4 rounded border border-[#3A2C18] text-xs font-serif text-[#C6B697] hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="py-2 px-5 rounded bg-[#DFBE77] hover:bg-[#D4AF60] text-[#171006] font-serif font-bold text-xs shadow-md"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: TEST PROMPT SANDBOX ─── */}
      {isTestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="max-w-3xl w-full bg-[#05142B] border-2 border-[#8C6418] rounded-2xl p-6 shadow-2xl text-[#FFF4D4] space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#3A2C18] pb-3">
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4 text-[#FFE394] fill-[#FFE394]" />
                <h3 className="font-serif text-lg font-bold text-[#FFF4D4]">
                  Test Simulation Sandbox · {selectedPrompt.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTestModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 font-serif">
              <p className="text-xs text-[#C6B697]">
                Execute test turns through Cloudflare Workers AI ({selectedPrompt.modelName}) with sample case variables.
              </p>

              {/* Variable Inputs */}
              <div className="space-y-2">
                {selectedPrompt.variables.map((v) => (
                  <div key={v.name}>
                    <label className="text-xs text-[#FFE394] font-mono block mb-1">
                      {`{${v.name}}`} ({v.description})
                    </label>
                    <textarea
                      rows={2}
                      value={testInputs[v.name] || ""}
                      onChange={(e) => setTestInputs({ ...testInputs, [v.name]: e.target.value })}
                      className="w-full rounded bg-[#020A17] border border-[#3A2C18] p-2 text-xs text-[#FFF4D4] focus:border-[#FFE394]"
                    />
                  </div>
                ))}
              </div>

              {/* Output Display */}
              {testOutput && (
                <div className="space-y-1 pt-2">
                  <label className="text-xs font-serif font-bold text-emerald-400">Simulation Output:</label>
                  <div className="p-3.5 rounded-xl bg-[#020A17] border border-emerald-500/40 text-xs font-mono text-[#E8EDF5] leading-relaxed max-h-[220px] overflow-y-auto whitespace-pre-wrap select-text">
                    {testOutput}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2.5 pt-4 border-t border-[#3A2C18]">
              <button
                type="button"
                onClick={() => setIsTestModalOpen(false)}
                className="py-2 px-4 rounded border border-[#3A2C18] text-xs font-serif text-[#C6B697] hover:text-white"
              >
                Close
              </button>
              <button
                type="button"
                disabled={isSimulating}
                onClick={handleRunTest}
                className="py-2 px-5 rounded bg-[#DFBE77] hover:bg-[#D4AF60] text-[#171006] font-serif font-bold text-xs shadow-md flex items-center gap-1.5"
              >
                {isSimulating ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                    <span>Executing Model...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-[#171006]" />
                    <span>Run Test Prompt</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
