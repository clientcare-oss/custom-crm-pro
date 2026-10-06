import React, { useState, useEffect, useMemo } from "react";
import {
  Lock,
  Unlock,
  Shield,
  ShieldAlert,
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
  Info
} from "lucide-react";
import {
  DEFAULT_AI_PROMPTS,
  AiPromptRecord,
  VAULT_STORAGE_KEY,
  VAULT_LOCK_STATUS_KEY,
  VAULT_MASTER_PIN
} from "./defaultAiPrompts";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function AiPromptVault() {
  // Vault lock state: session-based
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    return sessionStorage.getItem(VAULT_LOCK_STATUS_KEY) === "true";
  });

  // PIN keypad state
  const [enteredPin, setEnteredPin] = useState<string>("");
  const [pinError, setPinError] = useState<boolean>(false);

  // Prompts state from localStorage or default
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

  // Selected prompt for editing/inspection
  const [selectedPromptId, setSelectedPromptId] = useState<string>(DEFAULT_AI_PROMPTS[0].id);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Test sandbox drawer state
  const [isTestingOpen, setIsTestingOpen] = useState<boolean>(false);
  const [testVariables, setTestVariables] = useState<Record<string, string>>({});
  const [testOutput, setTestOutput] = useState<string>("");

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

  // Sync test variables when selected prompt changes
  useEffect(() => {
    if (selectedPrompt) {
      const initialVars: Record<string, string> = {};
      selectedPrompt.variables.forEach((v) => {
        initialVars[v.name] = v.example;
      });
      setTestVariables(initialVars);
      setTestOutput("");
    }
  }, [selectedPromptId]);

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
          toast.success("Executive AI Vault Unlocked — Authorized Session Active");
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
    toast.success("Executive Passkey Verified — Byron Honea Session Active");
  };

  const handleRelock = () => {
    setIsUnlocked(false);
    sessionStorage.removeItem(VAULT_LOCK_STATUS_KEY);
    setEnteredPin("");
    toast.info("Executive AI Vault Re-Locked");
  };

  // Prompt update handlers
  const handleUpdateCurrentPrompt = (updates: Partial<AiPromptRecord>) => {
    if (selectedPrompt.isIndividualLocked && updates.systemPrompt !== undefined) {
      toast.error("This prompt is individually locked. Unlock it before editing the text.");
      return;
    }
    const updated = prompts.map((p) => {
      if (p.id === selectedPrompt.id) {
        return {
          ...p,
          ...updates,
          lastUpdated: new Date().toISOString().split("T")[0]
        };
      }
      return p;
    });
    savePromptsToStorage(updated);
    setIsDirty(true);
  };

  const handleSavePrompt = () => {
    setIsDirty(false);
    toast.success(`Saved revision for "${selectedPrompt.name}"`);
  };

  const handleToggleIndividualLock = (promptId: string) => {
    const updated = prompts.map((p) => {
      if (p.id === promptId) {
        const nextState = !p.isIndividualLocked;
        toast.info(nextState ? `Locked "${p.name}" against accidental edits` : `Unlocked "${p.name}" for modifications`);
        return { ...p, isIndividualLocked: nextState };
      }
      return p;
    });
    savePromptsToStorage(updated);
  };

  const handleCopyPrompt = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("System prompt copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleResetToDefaults = () => {
    if (confirm("Reset the entire AI Prompt Library to factory defaults? All custom changes will be overwritten.")) {
      savePromptsToStorage(DEFAULT_AI_PROMPTS);
      setSelectedPromptId(DEFAULT_AI_PROMPTS[0].id);
      setIsDirty(false);
      toast.success("Restored factory default prompts");
    }
  };

  const handleCreateNewPrompt = () => {
    const newId = `prompt-custom-${Date.now()}`;
    const newRecord: AiPromptRecord = {
      id: newId,
      name: "Custom Advocacy Prompt",
      key: `CUSTOM_PROMPT_${Date.now()}`,
      pageId: "PG-013-AI",
      category: "Strategy & Case",
      modelTier: "CF_MODELS.DEEP",
      modelName: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
      version: "v1.0.0",
      lastUpdated: new Date().toISOString().split("T")[0],
      author: "Byron Honea, Master IEP Coach®",
      description: "Custom user-defined AI behavioral prompt for specialized advocacy tasks.",
      temperature: 0.2,
      maxTokens: 1024,
      isIndividualLocked: false,
      systemPrompt: `You are a specialized Special Education Advocacy AI assisting Byron Honea (Master IEP Coach®).
Analyze the provided student documentation and provide clear, legally sound parent guidance.`,
      variables: [
        { name: "student_name", description: "Name of student", example: "Lucas" },
        { name: "case_details", description: "Pertinent case facts", example: "Pending eligibility determination" }
      ]
    };
    const updated = [newRecord, ...prompts];
    savePromptsToStorage(updated);
    setSelectedPromptId(newId);
    toast.success("Created new custom AI prompt");
  };

  const handleDeletePrompt = (id: string, name: string) => {
    if (confirm(`Are you sure you want to permanently delete the prompt "${name}"?`)) {
      const filtered = prompts.filter((p) => p.id !== id);
      savePromptsToStorage(filtered);
      if (selectedPromptId === id && filtered.length > 0) {
        setSelectedPromptId(filtered[0].id);
      }
      toast.success(`Deleted "${name}"`);
    }
  };

  // Filtered prompt list
  const filteredPrompts = useMemo(() => {
    return prompts.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.pageId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === "All" || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [prompts, searchQuery, selectedCategory]);

  const categories = ["All", "Live In-Meeting", "Document Audit", "Legal Dispute", "Intake & Triage", "Strategy & Case"];

  // =========================================================================
  // RENDER: 1. LOCKED VAULT GATEWAY
  // =========================================================================
  if (!isUnlocked) {
    return (
      <div className="w-full flex items-center justify-center py-10 px-4 select-none">
        <div className="max-w-md w-full bg-[#05142B]/95 border-2 border-[#5A4322] rounded-2xl p-7 shadow-[0_16px_48px_rgba(0,0,0,0.9),inset_0_1px_2px_rgba(255,255,255,0.08)] relative overflow-hidden backdrop-blur-xl">
          {/* Top brass highlight bar */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#E5C175] to-transparent shadow-[0_0_12px_rgba(229,193,117,0.7)]" />

          {/* Security Header */}
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1F1404] via-[#0A182F] to-[#040C1A] border border-[#C5A059]/60 flex items-center justify-center shadow-[0_0_24px_rgba(197,160,89,0.3)] mb-2">
              <Lock className="w-8 h-8 text-[#FFE394] drop-shadow-[0_0_8px_rgba(255,227,148,0.6)]" />
            </div>

            <span className="text-[10px] font-serif font-bold uppercase tracking-[0.22em] text-[#C5A059] px-2.5 py-0.5 rounded-full bg-[#1F1404]/80 border border-[#8C6418]/60">
              Executive AI Vault · Restricted Access
            </span>

            <h2 className="font-serif text-2xl font-bold text-[#FFF4D4] drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
              Locked AI Backend
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
  // RENDER: 2. UNLOCKED EXECUTIVE PROMPT LIBRARY CONSOLE
  // =========================================================================
  return (
    <div className="w-full flex flex-col space-y-6">
      {/* ─── Top Control Strip: Status, Counter, Search, Actions ─── */}
      <div className="w-full bg-[#05142B]/90 border border-[#3A2C18] rounded-xl p-4 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Left: Security Status Badge & Quick Summary */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#020A17] border border-[#3A2C18] flex items-center justify-center shadow-inner">
            <ShieldCheck className="w-5 h-5 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 shadow-[0_0_8px_rgba(52,211,153,0.25)]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Executive Session Unlocked
              </span>
              <span className="text-xs font-serif text-[#C6B697]">
                {prompts.length} Master Prompts Active
              </span>
            </div>
            <p className="text-xs text-[#A69371] font-serif mt-0.5">
              Cloudflare Workers AI Prompts · @cf/meta/llama-3.1-8b & llama-3.3-70b
            </p>
          </div>
        </div>

        {/* Right: Actions (Add Prompt, Reset Defaults, Lock Vault) */}
        <div className="flex items-center gap-2.5 flex-wrap w-full lg:w-auto">
          <button
            type="button"
            onClick={handleCreateNewPrompt}
            className="py-1.5 px-3 rounded-lg bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-serif font-bold text-xs border border-[#FFE394]/50 shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            New Prompt
          </button>

          <button
            type="button"
            onClick={handleResetToDefaults}
            className="py-1.5 px-3 rounded-lg border border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] font-serif text-xs transition-all cursor-pointer flex items-center gap-1.5"
            title="Restore original Waypoint prompt suite"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#C5A059]" />
            Factory Reset
          </button>

          <button
            type="button"
            onClick={handleRelock}
            className="py-1.5 px-3.5 rounded-lg border border-rose-500/40 bg-rose-950/40 text-rose-300 hover:bg-rose-900/60 font-serif font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-[0_0_10px_rgba(244,63,94,0.15)]"
            title="Immediately lock the vault"
          >
            <Lock className="w-3.5 h-3.5 text-rose-400" />
            Lock Vault
          </button>
        </div>
      </div>

      {/* ─── Search & Category Filter Pills ─── */}
      <div className="flex flex-col md:flex-row items-center gap-3">
        {/* Search Bar */}
        <div className="relative flex-1 w-full h-10 flex items-center">
          <Search className="absolute left-3.5 h-4 w-4 text-[#7E97B8] pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search prompts by title, system key, PG-badge, or model..."
            className="w-full h-full pl-10 pr-4 rounded-xl bg-[#030917]/95 border border-[#1e3250] text-xs sm:text-sm text-[#F0F6FC] placeholder:text-[#647C9D] focus:outline-none focus:border-[#4B70A6] focus:ring-1 focus:ring-[#4B70A6]/40 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {categories.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "py-1.5 px-3 rounded-lg text-xs font-serif whitespace-nowrap transition-all cursor-pointer",
                  isActive
                    ? "bg-[#C5A059]/20 text-[#FFE394] font-bold border border-[#C5A059]/60 shadow-[0_0_8px_rgba(197,160,89,0.3)]"
                    : "text-[#A69371] hover:text-[#FFF4D4] hover:bg-white/5 border border-transparent"
                )}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Master-Detail Workspace: Prompt List (Left) + Prompt Editor (Right) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: Prompt Cards List (5 columns) */}
        <div className="lg:col-span-5 space-y-3">
          {filteredPrompts.length === 0 ? (
            <div className="bg-[#05142B]/70 border border-[#3A2C18] rounded-xl p-8 text-center">
              <Bot className="w-8 h-8 text-[#A69371] mx-auto mb-2 opacity-50" />
              <p className="font-serif text-sm text-[#C6B697]">No matching prompts found</p>
            </div>
          ) : (
            filteredPrompts.map((p) => {
              const isSelected = selectedPrompt?.id === p.id;
              const isDeep = p.modelTier === "CF_MODELS.DEEP";
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedPromptId(p.id)}
                  className={cn(
                    "p-4 rounded-xl border transition-all cursor-pointer relative group text-left select-none",
                    isSelected
                      ? "bg-[#091D3B] border-[#C5A059] shadow-[0_4px_20px_rgba(0,0,0,0.8),0_0_12px_rgba(197,160,89,0.3)]"
                      : "bg-[#05142B]/80 hover:bg-[#07162B] border-[#3A2C18] hover:border-[#C5A059]/50 shadow-[0_4px_16px_rgba(0,0,0,0.6)]"
                  )}
                >
                  {/* Top Line: Page ID Badge, Category & Individual Lock */}
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#020A17] border border-[#3A2C18] text-[#FFE394]">
                        {p.pageId}
                      </span>
                      <span className="text-[10px] font-serif text-[#C6B697]">
                        {p.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleIndividualLock(p.id);
                        }}
                        className={cn(
                          "p-1 rounded-md transition-colors cursor-pointer",
                          p.isIndividualLocked
                            ? "text-[#FFE394] hover:bg-[#FFE394]/10"
                            : "text-[#A69371]/50 hover:text-[#A69371] hover:bg-white/5"
                        )}
                        title={p.isIndividualLocked ? "Individually locked (click to unlock)" : "Unlocked (click to lock)"}
                      >
                        {p.isIndividualLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Title & Key */}
                  <h4 className="font-serif text-sm font-bold text-[#FFF4D4] leading-snug group-hover:text-[#FFE394] transition-colors">
                    {p.name}
                  </h4>
                  <p className="font-mono text-[10px] text-[#8CA4C4] mt-0.5">
                    {p.key}
                  </p>

                  <p className="text-[11px] text-[#A69371] mt-1.5 line-clamp-2 leading-relaxed">
                    {p.description}
                  </p>

                  {/* Bottom Metadata: Model Tier & Version */}
                  <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-[#3A2C18]/60 text-[10px]">
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded font-mono font-semibold",
                        isDeep
                          ? "bg-purple-950/60 text-purple-300 border border-purple-500/30"
                          : "bg-sky-950/60 text-sky-300 border border-sky-500/30"
                      )}
                    >
                      {isDeep ? "Deep 70B FP8" : "Fast 8B"}
                    </span>
                    <span className="font-mono text-[#8CA4C4]">
                      {p.version} · {p.lastUpdated}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* RIGHT COLUMN: Selected Prompt Deep Editor & Context Inspector (7 columns) */}
        {selectedPrompt && (
          <div className="lg:col-span-7 bg-[#05142B]/95 border border-[#3A2C18] rounded-xl p-5 md:p-6 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] space-y-5 text-left">
            {/* Header: Title, Page ID, Lock Switch & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-[#3A2C18] pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-[#020A17] border border-[#3A2C18] text-[#FFE394]">
                    {selectedPrompt.pageId}
                  </span>
                  <span className="text-[11px] font-serif font-bold text-[#C6B697] uppercase tracking-wider">
                    {selectedPrompt.category}
                  </span>
                  {selectedPrompt.isIndividualLocked && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono text-amber-400 bg-amber-950/60 border border-amber-500/40 px-2 py-0.5 rounded">
                      <Lock className="w-2.5 h-2.5" /> Read-Only Locked
                    </span>
                  )}
                </div>

                <h3 className="font-serif text-xl font-bold text-[#FFF4D4]">
                  {selectedPrompt.name}
                </h3>
                <p className="text-xs text-[#C6B697] leading-relaxed">
                  {selectedPrompt.description}
                </p>
              </div>

              {/* Action Buttons: Copy, Test Sandbox, Save */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleCopyPrompt(selectedPrompt.systemPrompt, selectedPrompt.id)}
                  className="p-2 rounded-lg border border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] transition-all cursor-pointer"
                  title="Copy full prompt text"
                >
                  {copiedId === selectedPrompt.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={() => setIsTestingOpen(!isTestingOpen)}
                  className={cn(
                    "py-2 px-3 rounded-lg border font-serif text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5",
                    isTestingOpen
                      ? "bg-[#C5A059]/20 text-[#FFE394] border-[#C5A059]"
                      : "border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4]"
                  )}
                >
                  <Play className="w-3.5 h-3.5 text-[#C5A059]" />
                  {isTestingOpen ? "Close Sandbox" : "Test Runner"}
                </button>

                <button
                  type="button"
                  onClick={handleSavePrompt}
                  disabled={selectedPrompt.isIndividualLocked}
                  className="py-2 px-4 rounded-lg bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-serif font-bold text-xs border border-[#FFE394]/50 shadow-md hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Revision
                </button>
              </div>
            </div>

            {/* Config Metrics Bar: Model, Temperature, Max Tokens */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-[#020A17]/80 border border-[#3A2C18]/60">
              <div>
                <label className="text-[10px] font-serif uppercase tracking-wider text-[#A69371] block mb-1">
                  Engine Model
                </label>
                <div className="font-mono text-xs text-[#FFE394] truncate" title={selectedPrompt.modelName}>
                  {selectedPrompt.modelName}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-serif uppercase tracking-wider text-[#A69371]">
                    Temperature: {selectedPrompt.temperature}
                  </label>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  disabled={selectedPrompt.isIndividualLocked}
                  value={selectedPrompt.temperature}
                  onChange={(e) => handleUpdateCurrentPrompt({ temperature: parseFloat(e.target.value) })}
                  className="w-full accent-[#C5A059] cursor-pointer"
                />
              </div>

              <div>
                <label className="text-[10px] font-serif uppercase tracking-wider text-[#A69371] block mb-1">
                  Max Output Tokens
                </label>
                <div className="font-mono text-xs text-[#FFF4D4]">
                  {selectedPrompt.maxTokens} tokens
                </div>
              </div>
            </div>

            {/* Context Variables List */}
            {selectedPrompt.variables.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-serif font-bold uppercase tracking-wider text-[#C6B697] flex items-center gap-1.5">
                    <Code className="w-3.5 h-3.5 text-[#C5A059]" />
                    Context Variables (`{"{{var}}"}`)
                  </span>
                  <span className="text-[10px] text-[#A69371]">
                    Click pill to copy variable tag
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {selectedPrompt.variables.map((v) => (
                    <button
                      key={v.name}
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(`{{${v.name}}}`);
                        toast.success(`Copied {{${v.name}}} tag to clipboard`);
                      }}
                      className="px-2.5 py-1 rounded-md bg-[#020A17] border border-[#3A2C18] hover:border-[#C5A059]/60 text-[11px] font-mono text-[#FFE394] transition-all cursor-pointer flex items-center gap-1.5 group"
                      title={`${v.description} (Example: ${v.example})`}
                    >
                      <span>{`{{${v.name}}}`}</span>
                      <span className="text-[9px] text-[#A69371] group-hover:text-[#FFF4D4]">
                        · {v.description}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Master System Prompt Editor */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-serif font-bold uppercase tracking-wider text-[#C6B697] flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#C5A059]" />
                  Master System Prompt
                </label>
                <span className="font-mono text-[10px] text-[#8CA4C4]">
                  {selectedPrompt.systemPrompt.length} chars · ~{Math.round(selectedPrompt.systemPrompt.length / 4)} tokens
                </span>
              </div>

              <div className="relative">
                <textarea
                  rows={14}
                  value={selectedPrompt.systemPrompt}
                  readOnly={selectedPrompt.isIndividualLocked}
                  onChange={(e) => handleUpdateCurrentPrompt({ systemPrompt: e.target.value })}
                  placeholder="Enter master LLM system instructions, citations, and output schemas..."
                  className={cn(
                    "w-full rounded-xl bg-[#020A17] border font-mono text-xs text-[#F0F6FC] leading-relaxed p-4 focus:outline-none transition-all shadow-[inset_0_2px_8px_rgba(0,0,0,0.8)]",
                    selectedPrompt.isIndividualLocked
                      ? "border-[#3A2C18] opacity-85 cursor-not-allowed"
                      : "border-[#3A2C18] focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059]/40"
                  )}
                />
                {selectedPrompt.isIndividualLocked && (
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 rounded bg-[#07162B]/90 border border-amber-500/40 text-[10px] text-amber-300 font-serif">
                    <Lock className="w-3 h-3 text-amber-400" />
                    Locked against changes
                  </div>
                )}
              </div>
            </div>

            {/* Test Sandbox Drawer (When Opened) */}
            {isTestingOpen && (
              <div className="mt-4 p-4 rounded-xl bg-[#020A17] border border-[#C5A059]/40 space-y-3 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between border-b border-[#3A2C18] pb-2">
                  <span className="text-xs font-serif font-bold text-[#FFE394] flex items-center gap-1.5">
                    <Play className="w-3.5 h-3.5 text-[#C5A059]" />
                    Interactive Prompt Sandbox
                  </span>
                  <span className="text-[10px] font-mono text-[#8CA4C4]">
                    Local Template Interpolation
                  </span>
                </div>

                {/* Variable Inputs */}
                <div className="space-y-2">
                  {selectedPrompt.variables.map((v) => (
                    <div key={v.name} className="flex flex-col sm:flex-row sm:items-center gap-1.5">
                      <label className="w-40 font-mono text-[11px] text-[#C5A059] shrink-0">
                        {`{{${v.name}}}`}:
                      </label>
                      <input
                        type="text"
                        value={testVariables[v.name] || ""}
                        onChange={(e) =>
                          setTestVariables({
                            ...testVariables,
                            [v.name]: e.target.value
                          })
                        }
                        className="flex-1 h-8 px-2.5 rounded-lg bg-[#07162B] border border-[#1e3250] text-xs text-white focus:outline-none focus:border-[#C5A059]"
                      />
                    </div>
                  ))}
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      let resolved = selectedPrompt.systemPrompt;
                      Object.entries(testVariables).forEach(([k, val]) => {
                        resolved = resolved.replaceAll(`{{${k}}}`, val);
                      });
                      setTestOutput(resolved);
                      toast.success("Resolved prompt interpolated successfully");
                    }}
                    className="py-1.5 px-3 rounded-lg bg-[#C5A059] hover:bg-[#DFBE77] text-[#07162B] font-serif font-bold text-xs transition-all cursor-pointer"
                  >
                    Resolve & Preview Prompt
                  </button>
                </div>

                {testOutput && (
                  <div className="mt-3 space-y-1">
                    <label className="text-[10px] font-serif uppercase tracking-wider text-[#A69371] block">
                      Interpolated Output Preview:
                    </label>
                    <div className="p-3 rounded-lg bg-[#07162B] border border-[#3A2C18] font-mono text-xs text-slate-200 whitespace-pre-wrap max-h-56 overflow-y-auto">
                      {testOutput}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
