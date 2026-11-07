import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  UserPlus,
  LayoutGrid,
  GraduationCap,
  Calendar,
  Folder,
  Zap,
  Users,
  Video,
  TrendingUp,
  Headset,
  FileSignature,
  Home,
  Wrench,
  BookOpen,
  LayoutTemplate,
  Banknote,
  Sparkles,
  Activity,
  Shield,
  Settings,
  Pencil,
  Trash2,
  Lock,
  Plus,
  Check,
  Clock,
  KeyRound,
  ArrowRight,
  Delete,
  AlertCircle,
  X,
} from "lucide-react";
import {
  useWorkspaceLock,
  type StartScreenShortcutItem,
} from "@/contexts/WorkspaceLockContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

// ─── Custom SVG Icons Matching the Approved Waypoint Start Screen Reference ───
function WaypointShieldLogo() {
  return (
    <svg
      viewBox="0 0 36 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-7 h-8 shrink-0 drop-shadow-[0_0_10px_rgba(235,172,70,0.45)]"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="wp-shield-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFE199" />
          <stop offset="50%" stopColor="#E5A946" />
          <stop offset="100%" stopColor="#B87A22" />
        </linearGradient>
      </defs>
      <path
        d="M18 2.5L4.5 7.8V18.8C4.5 27.6 10.2 34.9 18 37.5C25.8 34.9 31.5 27.6 31.5 18.8V7.8L18 2.5Z"
        stroke="url(#wp-shield-gold)"
        strokeWidth="2.4"
        fill="rgba(9, 17, 44, 0.75)"
      />
      <path
        d="M12.5 20.2L16.3 24L24 15.5"
        stroke="url(#wp-shield-gold)"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SixDotDragHandle() {
  return (
    <svg
      viewBox="0 0 14 22"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-3.5 h-5 text-[#E5DFD3]/90 group-hover/handle:text-[#FFE199] transition-colors"
      aria-hidden="true"
    >
      {/* Left column of 3 dots */}
      <circle cx="4" cy="4" r="1.6" fill="currentColor" />
      <circle cx="4" cy="11" r="1.6" fill="currentColor" />
      <circle cx="4" cy="18" r="1.6" fill="currentColor" />
      {/* Right column of 3 dots */}
      <circle cx="10" cy="4" r="1.6" fill="currentColor" />
      <circle cx="10" cy="11" r="1.6" fill="currentColor" />
      <circle cx="10" cy="18" r="1.6" fill="currentColor" />
    </svg>
  );
}

function renderShortcutIcon(iconKey: string, className = "w-8 h-8") {
  const strokeProps = {
    className: `${className} text-[#E5A946] drop-shadow-[0_0_8px_rgba(229,169,70,0.3)]`,
    strokeWidth: 1.75,
  };
  switch (iconKey) {
    case "new_client":
    case "user-plus":
      return <UserPlus {...strokeProps} />;
    case "dashboard":
      return <LayoutGrid {...strokeProps} />;
    case "students":
      return <GraduationCap {...strokeProps} />;
    case "calendar":
      return <Calendar {...strokeProps} />;
    case "cases":
      return <Folder {...strokeProps} />;
    case "tasks":
      return <Zap {...strokeProps} />;
    case "contacts":
      return <Users {...strokeProps} />;
    case "meeting_workspace":
    case "meeting-workspace":
      return <Video {...strokeProps} />;
    case "leads":
    case "lead-center":
      return <TrendingUp {...strokeProps} />;
    case "call_center":
    case "call-center":
      return <Headset {...strokeProps} />;
    case "document_vault":
    case "document-vault":
      return <FileSignature {...strokeProps} />;
    case "crew_quarters":
    case "crew-quarters":
      return <Home {...strokeProps} />;
    case "tools":
      return <Wrench {...strokeProps} />;
    case "knowledge_base":
    case "knowledge-base":
      return <BookOpen {...strokeProps} />;
    case "templates":
      return <LayoutTemplate {...strokeProps} />;
    case "invoices":
      return <Banknote {...strokeProps} />;
    case "automations":
      return <Sparkles {...strokeProps} />;
    case "metrics":
      return <Activity {...strokeProps} />;
    case "team":
      return <Shield {...strokeProps} />;
    case "settings":
      return <Settings {...strokeProps} />;
    default:
      return <LayoutGrid {...strokeProps} />;
  }
}

type PinOverlayMode = "closed" | "unlock" | "setup_step1" | "setup_step2" | "reauth";

export default function WaypointStartScreen() {
  const { user } = useAuth();
  const {
    isLocked,
    hasPinSet,
    shortcuts,
    shortcutIds,
    availableCatalog,
    maxShortcuts,
    previousPath,
    idleTimeoutMinutes,
    supportedIdleTimeouts,
    cooldownRemainingSeconds: initialCooldownSeconds,
    requiresReauth: initialRequiresReauth,
    pendingDestinationPath,
    setPendingDestinationPath,
    enterWorkspace,
    lockWorkspace,
    unlockWorkspaceWithPin,
    setupPin,
    resetPinWithReauth,
    updateShortcuts,
    updateIdleTimeout,
  } = useWorkspaceLock();

  // Live clock & date state
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const formattedDate = useMemo(() => {
    return now
      .toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
      .toUpperCase();
  }, [now]);

  const formattedTime = useMemo(() => {
    return now.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }, [now]);

  // Pencil customization mode
  const [isEditing, setIsEditing] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // PIN overlay & flow state
  const [pinMode, setPinMode] = useState<PinOverlayMode>(() =>
    isLocked ? "unlock" : "closed"
  );
  const [pinDigits, setPinDigits] = useState<string>("");
  const [firstSetupPin, setFirstSetupPin] = useState<string>("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [isSubmittingPin, setIsSubmittingPin] = useState<boolean>(false);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(initialCooldownSeconds);
  const [requiresReauth, setRequiresReauth] = useState<boolean>(initialRequiresReauth);
  const [lockAfterSetup, setLockAfterSetup] = useState<boolean>(true);

  // Reauthentication form state (when 5 PIN attempts fail or Forgot PIN is clicked)
  const [reauthEmail, setReauthEmail] = useState<string>("");
  const [reauthNewPin, setReauthNewPin] = useState<string>("");
  const [reauthConfirmPin, setReauthConfirmPin] = useState<string>("");

  // Sync lock state into PIN mode
  useEffect(() => {
    if (isLocked) {
      setIsEditing(false);
      setIsAddModalOpen(false);
      if (initialRequiresReauth) {
        setRequiresReauth(true);
        setPinMode("reauth");
      } else if (pinMode === "closed") {
        setPinMode("unlock");
      }
    } else if (pinMode === "unlock") {
      setPinMode("closed");
      setPinDigits("");
      setPinError(null);
    }
  }, [isLocked, initialRequiresReauth, pinMode]);

  useEffect(() => {
    if (initialCooldownSeconds > 0) {
      setCooldownSeconds(initialCooldownSeconds);
    }
  }, [initialCooldownSeconds]);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const t = window.setInterval(() => {
      setCooldownSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(t);
  }, [cooldownSeconds]);

  // Resolve pending shortcut label if the employee clicked a shortcut while locked
  const pendingShortcut = useMemo(() => {
    if (!pendingDestinationPath) return null;
    return (
      shortcuts.find((s) => s.path === pendingDestinationPath) ||
      availableCatalog.find((s) => s.path === pendingDestinationPath) ||
      null
    );
  }, [pendingDestinationPath, shortcuts, availableCatalog]);

  // Resolve the active page where the employee was working before opening/locking Start Screen
  const resumeTargetPath = useMemo(() => {
    if (previousPath && previousPath !== "/start" && previousPath !== "/dashboard") {
      return previousPath;
    }
    return "/";
  }, [previousPath]);

  const handleResumePreviousWorkClick = useCallback(() => {
    setIsEditing(false);
    if (isLocked) {
      setPendingDestinationPath(resumeTargetPath);
      setPinDigits("");
      setPinError(null);
      setPinMode(requiresReauth ? "reauth" : "unlock");
      return;
    }
    enterWorkspace(resumeTargetPath);
  }, [isLocked, resumeTargetPath, requiresReauth, setPendingDestinationPath, enterWorkspace]);

  // Handle clicking a shortcut tile
  const handleShortcutClick = useCallback(
    (item: StartScreenShortcutItem) => {
      if (isEditing) return;

      if (isLocked) {
        setPendingDestinationPath(item.path);
        setPinDigits("");
        setPinError(null);
        setPinMode(requiresReauth ? "reauth" : "unlock");
        return;
      }

      enterWorkspace(item.path);
    },
    [isEditing, isLocked, requiresReauth, setPendingDestinationPath, enterWorkspace]
  );

  // Handle clicking Lock Workspace
  const handleLockWorkspaceClick = useCallback(async () => {
    setIsEditing(false);
    setPinDigits("");
    setPinError(null);

    if (!hasPinSet) {
      setLockAfterSetup(true);
      setFirstSetupPin("");
      setPinMode("setup_step1");
      return;
    }

    const res = await lockWorkspace();
    if (res.needsPinSetup) {
      setLockAfterSetup(true);
      setFirstSetupPin("");
      setPinMode("setup_step1");
    } else {
      setPinMode("unlock");
    }
  }, [hasPinSet, lockWorkspace]);

  // Handle PIN submission when 4 digits are entered
  const handleCompleteFourDigits = useCallback(
    async (fourDigits: string) => {
      if (isSubmittingPin || cooldownSeconds > 0) return;

      if (pinMode === "setup_step1") {
        setFirstSetupPin(fourDigits);
        setPinDigits("");
        setPinError(null);
        setPinMode("setup_step2");
        return;
      }

      if (pinMode === "setup_step2") {
        if (fourDigits !== firstSetupPin) {
          setPinError("PIN confirmation did not match. Please try again.");
          setPinDigits("");
          setFirstSetupPin("");
          setPinMode("setup_step1");
          return;
        }
        setIsSubmittingPin(true);
        const res = await setupPin(firstSetupPin, fourDigits, lockAfterSetup);
        setIsSubmittingPin(false);
        if (!res.ok) {
          setPinError(res.error || "Unable to save PIN");
          setPinDigits("");
          return;
        }
        setPinDigits("");
        setFirstSetupPin("");
        setPinError(null);
        if (lockAfterSetup) {
          toast.success("4-digit Workspace PIN configured and workspace locked");
          setPinMode("unlock");
        } else {
          toast.success("4-digit Workspace PIN updated");
          setPinMode("closed");
        }
        return;
      }

      if (pinMode === "unlock") {
        setIsSubmittingPin(true);
        const res = await unlockWorkspaceWithPin(fourDigits, pendingDestinationPath);
        setIsSubmittingPin(false);
        if (!res.ok) {
          setPinDigits("");
          setPinError(res.error || "Incorrect PIN");
          if (res.cooldownRemainingSeconds && res.cooldownRemainingSeconds > 0) {
            setCooldownSeconds(res.cooldownRemainingSeconds);
          }
          if (res.requiresReauth) {
            setRequiresReauth(true);
            setPinMode("reauth");
          }
          return;
        }
        setPinDigits("");
        setPinError(null);
        setPinMode("closed");
      }
    },
    [
      isSubmittingPin,
      cooldownSeconds,
      pinMode,
      firstSetupPin,
      lockAfterSetup,
      setupPin,
      unlockWorkspaceWithPin,
      pendingDestinationPath,
    ]
  );

  // Append a digit to current PIN entry
  const handleDigitInput = useCallback(
    (digit: string) => {
      if (pinMode === "closed" || pinMode === "reauth") return;
      if (isSubmittingPin || cooldownSeconds > 0) return;
      if (!/^\d$/.test(digit)) return;

      setPinError(null);
      setPinDigits((prev) => {
        if (prev.length >= 4) return prev;
        const next = prev + digit;
        if (next.length === 4) {
          window.setTimeout(() => {
            handleCompleteFourDigits(next);
          }, 80);
        }
        return next;
      });
    },
    [pinMode, isSubmittingPin, cooldownSeconds, handleCompleteFourDigits]
  );

  const handleBackspace = useCallback(() => {
    if (pinMode === "closed" || pinMode === "reauth" || isSubmittingPin) return;
    setPinError(null);
    setPinDigits((prev) => prev.slice(0, -1));
  }, [pinMode, isSubmittingPin]);

  const handleCancelPinOverlay = useCallback(() => {
    setPinDigits("");
    setPinError(null);
    setFirstSetupPin("");
    setPendingDestinationPath(null);
    // Even if locked, Cancel hides the keypad into Locked Standby so the clean landscape is visible;
    // clicking any shortcut or Unlock button reopens the keypad.
    setPinMode("closed");
  }, [setPendingDestinationPath]);

  // Physical keyboard support for PIN entry
  useEffect(() => {
    if (pinMode === "closed" || pinMode === "reauth") return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") {
        e.preventDefault();
        handleDigitInput(e.key);
      } else if (e.key === "Backspace") {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleCancelPinOverlay();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pinMode, handleDigitInput, handleBackspace, handleCancelPinOverlay]);

  // ─── Shortcut Customization Handlers (Reorder, Remove, Add) ────────────────
  const handleRemoveShortcut = useCallback(
    async (e: React.MouseEvent, idToRemove: string) => {
      e.stopPropagation();
      const next = shortcutIds.filter((id) => id !== idToRemove);
      await updateShortcuts(next);
    },
    [shortcutIds, updateShortcuts]
  );

  const handleAddShortcut = useCallback(
    async (idToAdd: string) => {
      if (shortcutIds.includes(idToAdd)) {
        toast.info("That shortcut is already on your Start Screen");
        return;
      }
      if (shortcutIds.length >= maxShortcuts) {
        toast.error(`Maximum of ${maxShortcuts} shortcuts allowed`);
        return;
      }
      const next = [...shortcutIds, idToAdd];
      await updateShortcuts(next);
      if (next.length >= maxShortcuts) {
        setIsAddModalOpen(false);
      }
    },
    [shortcutIds, maxShortcuts, updateShortcuts]
  );

  const handleMoveShortcut = useCallback(
    async (fromIndex: number, toIndex: number) => {
      if (
        fromIndex === toIndex ||
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= shortcutIds.length ||
        toIndex >= shortcutIds.length
      ) {
        return;
      }
      const next = [...shortcutIds];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      await updateShortcuts(next);
    },
    [shortcutIds, updateShortcuts]
  );

  const handleHandleKeyDown = useCallback(
    (e: React.KeyboardEvent, idx: number) => {
      if (!isEditing) return;
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        if (idx > 0) handleMoveShortcut(idx, idx - 1);
      } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        if (idx < shortcutIds.length - 1) handleMoveShortcut(idx, idx + 1);
      }
    },
    [isEditing, shortcutIds.length, handleMoveShortcut]
  );

  const handleReauthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    if (!/^\d{4}$/.test(reauthNewPin)) {
      setPinError("New PIN must be exactly 4 digits");
      return;
    }
    if (reauthNewPin !== reauthConfirmPin) {
      setPinError("New PIN and confirmation do not match");
      return;
    }
    setIsSubmittingPin(true);
    const res = await resetPinWithReauth(reauthEmail, reauthNewPin, reauthConfirmPin);
    setIsSubmittingPin(false);
    if (!res.ok) {
      setPinError(res.error || "Verification failed");
      return;
    }
    setRequiresReauth(false);
    setReauthEmail("");
    setReauthNewPin("");
    setReauthConfirmPin("");
    setPinMode("closed");
    toast.success("PIN reset and workspace unlocked");
  };

  // Destinations available to add (permitted & not already added)
  const addableDestinations = useMemo(() => {
    const currentSet = new Set(shortcutIds);
    return availableCatalog.filter((item) => !currentSet.has(item.id));
  }, [availableCatalog, shortcutIds]);

  const isPinOverlayActive = pinMode !== "closed";

  // Split shortcuts into left/right flanking pairs when the PIN pad is active (matching reference image 2)
  const leftFlankShortcuts = useMemo(() => shortcuts.slice(0, 2), [shortcuts]);
  const rightFlankShortcuts = useMemo(
    () => (shortcuts.length >= 4 ? shortcuts.slice(2, 4) : shortcuts.slice(2)),
    [shortcuts]
  );

  return (
    <div
      data-testid="waypoint-start-screen"
      className="relative h-screen w-full overflow-x-hidden overflow-y-auto lg:overflow-hidden bg-[#000820] text-white select-none flex flex-col justify-between"
    >
      {/* ── Canonical Atmospheric Sunset Mountain & Lake Background ── */}
      <div
        className="pointer-events-none fixed inset-0 z-0 bg-cover bg-center bg-no-repeat transition-transform duration-700"
        style={{
          backgroundImage: `url('/images/waypoint-start-landscape.jpg')`,
        }}
      />
      {/* Subtle atmospheric vignette to preserve crisp contrast across all viewports */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 34%, rgba(16, 18, 52, 0.14) 0%, rgba(3, 8, 30, 0.46) 65%, rgba(0, 8, 32, 0.82) 100%)",
        }}
      />

      {/* ── Top Header Bar ── */}
      <header className="relative z-10 w-full shrink-0 border-b border-[#8B9CE8]/20 bg-[#02081F]/30 backdrop-blur-[2px]">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 sm:px-10 py-2.5 sm:py-3">
          {/* Top-Left: Waypoint Shield + Divider + Wordmark */}
          <div className="flex items-center gap-3.5">
            <WaypointShieldLogo />
            <div className="h-5 w-[1px] bg-[#E5A946]/35" />
            <span className="font-serif text-lg sm:text-[20px] font-normal tracking-[0.22em] text-white">
              WAYPOINT
            </span>
          </div>

          {/* Top-Right: PRIVATE WORKSPACE */}
          <div className="flex items-center">
            <span className="text-xs sm:text-[13px] font-light tracking-[0.24em] text-[#B8C4F0]/90 uppercase">
              PRIVATE WORKSPACE
            </span>
          </div>
        </div>
      </header>

      {/* ── Upper-Right Pencil Customize Button (Floating cleanly so it never pushes the clock down) ── */}
      {!isLocked && !isPinOverlayActive && (
        <div className="pointer-events-none absolute top-[58px] sm:top-[64px] left-0 right-0 z-30 mx-auto w-full max-w-[1440px] px-6 sm:px-10 flex justify-end">
          <button
            type="button"
            data-testid="start-screen-customize-btn"
            onClick={() => {
              setIsEditing((prev) => !prev);
              setIsAddModalOpen(false);
            }}
            className={`pointer-events-auto group relative inline-flex items-center gap-2.5 rounded-full px-5 py-1.5 sm:py-2 text-xs sm:text-sm font-normal tracking-wide transition-all duration-200 cursor-pointer ${
              isEditing
                ? "bg-[#131F49]/95 text-[#FFE394] border border-[#F5B544] shadow-[0_0_22px_rgba(245,181,68,0.45)]"
                : "bg-[#081029]/85 text-white/95 hover:text-white border border-[#DFA348]/75 hover:border-[#F5B544] shadow-[0_4px_20px_rgba(0,0,0,0.65)]"
            }`}
          >
            {/* Top & Bottom Gold Rim Specular Flare */}
            <span className="pointer-events-none absolute -top-[1px] left-4 right-8 h-[1.5px] bg-gradient-to-r from-transparent via-[#FFE394] to-transparent opacity-95 shadow-[0_0_8px_#FFE394]" />
            <span className="pointer-events-none absolute -bottom-[1px] left-8 right-4 h-[1.5px] bg-gradient-to-r from-transparent via-[#E5A946] to-transparent opacity-90 shadow-[0_0_8px_#E5A946]" />

            {isEditing ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#FFE394]" />
                <span>Done</span>
              </>
            ) : (
              <>
                <Pencil className="w-3.5 h-3.5 text-[#E5A946] group-hover:scale-105 transition-transform" />
                <span>Customize</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* ── Main Center Stage ── */}
      <main className="relative z-30 flex-1 min-h-0 flex flex-col items-center justify-center px-5 sm:px-10 py-2">
        {!isPinOverlayActive ? (
          /* ══════════════════════════════════════════════════════════════════
             NORMAL / PENCIL CUSTOMIZE START SCREEN VIEW (Reference Image 1)
             ══════════════════════════════════════════════════════════════════ */
          <div className="w-full max-w-[920px] mx-auto flex flex-col items-center text-center">
            {/* Upper Clock & Date Stack */}
            <p
              data-testid="start-screen-date"
              className="text-[11px] sm:text-[13px] font-normal tracking-[0.26em] text-[#C8D0F0]/90 uppercase mb-1.5"
            >
              {formattedDate}
            </p>

            <h1
              data-testid="start-screen-clock"
              className="font-serif text-4xl sm:text-5xl md:text-[58px] font-normal text-white tracking-tight leading-none drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)]"
            >
              {formattedTime}
            </h1>

            {/* Luminous Thin Gold Accent Divider */}
            <div className="relative my-3 sm:my-3.5 flex items-center justify-center">
              <div className="w-24 h-[1.5px] bg-gradient-to-r from-transparent via-[#F7CA6D] to-transparent shadow-[0_0_14px_2px_rgba(245,181,68,0.85)]" />
              <div className="absolute w-8 h-[3px] rounded-full bg-[#FFF2C2] blur-[2px] opacity-90" />
            </div>

            {/* Welcome Message */}
            <h2 className="font-serif text-xl sm:text-2xl md:text-[30px] font-normal text-white tracking-wide leading-snug drop-shadow-[0_2px_12px_rgba(0,0,0,0.65)]">
              {isLocked ? "Workspace Locked." : "Your workspace awaits."}
            </h2>
            <p className="mt-1 text-xs sm:text-[14.5px] font-light text-[#B8C4F0]/85 tracking-wide">
              {isLocked
                ? "Select any destination or click Unlock Workspace below to enter your 4-digit PIN."
                : "A quieter way to begin your day."}
            </p>

            {/* Editing Mode Helper Pill + Idle Timeout / PIN Controls */}
            {isEditing && (
              <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2.5 rounded-xl border border-[#DFA348]/45 bg-[#060E28]/85 px-3.5 py-1.5 text-[11px] text-[#D8C7A5] backdrop-blur-md shadow-lg">
                <span className="flex items-center gap-1.5 text-[#FFE394] font-medium">
                  <Pencil className="w-3 h-3" />
                  Drag 6-dot handle to reorder
                </span>
                <span className="hidden sm:inline text-white/25">|</span>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#E5A946]" />
                  <span>Idle Lock:</span>
                  {supportedIdleTimeouts.map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => updateIdleTimeout(mins)}
                      className={`px-1.5 py-0.5 rounded text-[10.5px] font-medium transition-colors cursor-pointer ${
                        idleTimeoutMinutes === mins
                          ? "bg-[#E5A946] text-[#000820] font-semibold"
                          : "bg-white/5 text-white/75 hover:bg-white/10"
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
                <span className="hidden sm:inline text-white/25">|</span>
                <button
                  type="button"
                  onClick={() => {
                    setLockAfterSetup(false);
                    setFirstSetupPin("");
                    setPinDigits("");
                    setPinError(null);
                    setPinMode("setup_step1");
                  }}
                  className="inline-flex items-center gap-1 text-[#FFE394] hover:underline cursor-pointer"
                >
                  <KeyRound className="w-3 h-3" />
                  <span>{hasPinSet ? "Change PIN" : "Set PIN"}</span>
                </button>
              </div>
            )}

            {/* ── Customizable Quick-Navigation Tiles Grid (Max 6) ── */}
            <div
              data-testid="start-screen-shortcuts-grid"
              className="mt-4 sm:mt-5 w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4"
            >
              {shortcuts.map((item, idx) => {
                const isBeingDragged = draggedIndex === idx;
                const isDragTarget = dragOverIndex === idx && draggedIndex !== idx;

                return (
                  <div
                    key={item.id}
                    data-testid={`shortcut-tile-${item.id}`}
                    draggable={isEditing}
                    onDragStart={(e) => {
                      if (!isEditing) {
                        e.preventDefault();
                        return;
                      }
                      setDraggedIndex(idx);
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", String(idx));
                    }}
                    onDragOver={(e) => {
                      if (!isEditing) return;
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      if (dragOverIndex !== idx) setDragOverIndex(idx);
                    }}
                    onDragLeave={() => {
                      if (dragOverIndex === idx) setDragOverIndex(null);
                    }}
                    onDrop={(e) => {
                      if (!isEditing) return;
                      e.preventDefault();
                      const fromIdx =
                        draggedIndex !== null
                          ? draggedIndex
                          : parseInt(e.dataTransfer.getData("text/plain"), 10);
                      setDraggedIndex(null);
                      setDragOverIndex(null);
                      if (!Number.isNaN(fromIdx)) {
                        handleMoveShortcut(fromIdx, idx);
                      }
                    }}
                    onDragEnd={() => {
                      setDraggedIndex(null);
                      setDragOverIndex(null);
                    }}
                    onClick={() => handleShortcutClick(item)}
                    role={isEditing ? "group" : "button"}
                    tabIndex={isEditing ? -1 : 0}
                    onKeyDown={(e) => {
                      if (!isEditing && (e.key === "Enter" || e.key === " ")) {
                        e.preventDefault();
                        handleShortcutClick(item);
                      }
                    }}
                    className={`group relative h-[98px] sm:h-[110px] rounded-2xl transition-all duration-200 flex flex-col items-center justify-center px-6 select-none ${
                      isEditing
                        ? "border border-[#F5B544]/85 bg-gradient-to-b from-[#131D46]/90 via-[#0A122E]/92 to-[#060B1E]/95 shadow-[0_8px_28px_rgba(0,0,0,0.75),0_0_15px_rgba(229,169,70,0.18)]"
                        : "cursor-pointer border border-[#D89E43]/65 hover:border-[#F7CA6D] bg-gradient-to-b from-[#111A3D]/85 via-[#09102A]/90 to-[#060B1E]/95 hover:from-[#16224F]/90 hover:to-[#08102B]/95 shadow-[0_8px_28px_rgba(0,0,0,0.7)] hover:shadow-[0_10px_32px_rgba(0,0,0,0.85),0_0_20px_rgba(229,169,70,0.22)]"
                    } ${isBeingDragged ? "opacity-50 scale-[0.98]" : ""} ${
                      isDragTarget ? "ring-2 ring-[#FFE394] scale-[1.02]" : ""
                    } backdrop-blur-md`}
                  >
                    {/* Top & Bottom Gold Specular Rim Highlights */}
                    <span className="pointer-events-none absolute -top-[1px] left-10 right-10 h-[1.5px] bg-gradient-to-r from-transparent via-[#FFE394]/80 to-transparent" />
                    <span className="pointer-events-none absolute -bottom-[1px] left-12 right-12 h-[1.5px] bg-gradient-to-r from-transparent via-[#E5A946]/70 to-transparent" />

                    {/* PENCIL EDIT MODE: Left 6-Dot Drag Handle */}
                    {isEditing && (
                      <button
                        type="button"
                        data-testid={`shortcut-drag-handle-${item.id}`}
                        aria-label={`Reorder ${item.label} shortcut (use arrow keys or drag)`}
                        title="Drag to reorder or press Left/Right arrow keys"
                        onKeyDown={(e) => handleHandleKeyDown(e, idx)}
                        onClick={(e) => e.stopPropagation()}
                        className="group/handle absolute left-3.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg cursor-grab active:cursor-grabbing focus:outline-none focus:ring-1 focus:ring-[#FFE394]"
                      >
                        <SixDotDragHandle />
                      </button>
                    )}

                    {/* PENCIL EDIT MODE: Top-Right Trash Can Icon */}
                    {isEditing && (
                      <button
                        type="button"
                        data-testid={`shortcut-remove-${item.id}`}
                        aria-label={`Remove ${item.label} shortcut`}
                        title={`Remove ${item.label} from Start Screen`}
                        onClick={(e) => handleRemoveShortcut(e, item.id)}
                        className="absolute top-2.5 right-2.5 w-7 h-7 rounded-lg border border-[#D89E43]/65 bg-[#121B3A]/90 hover:bg-rose-950/80 hover:border-rose-400/70 flex items-center justify-center text-[#F3EDE0] hover:text-rose-200 transition-colors cursor-pointer shadow-sm"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Center Icon & Label */}
                    <div className="mb-1.5 transition-transform duration-200 group-hover:scale-105">
                      {renderShortcutIcon(item.iconKey, "w-7 h-7")}
                    </div>
                    <span className="text-[15px] sm:text-[16px] font-normal text-white tracking-wide">
                      {item.label}
                    </span>
                  </div>
                );
              })}

              {/* + Add Shortcut Tile (Only visible in Edit Mode when < 6 shortcuts exist) */}
              {isEditing && shortcuts.length < maxShortcuts && (
                <button
                  type="button"
                  data-testid="shortcut-add-tile"
                  onClick={() => setIsAddModalOpen(true)}
                  className="group relative h-[98px] sm:h-[110px] rounded-2xl border border-dashed border-[#DFA348]/70 hover:border-[#FFE394] bg-[#070F29]/70 hover:bg-[#0D183D]/85 transition-all duration-200 flex flex-col items-center justify-center px-6 cursor-pointer backdrop-blur-md"
                >
                  <div className="w-9 h-9 rounded-full border border-[#E5A946]/60 bg-[#111C42] flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                    <Plus className="w-4 h-4 text-[#FFE394]" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-[#FFE394] tracking-wide">
                    Add Shortcut ({shortcuts.length}/{maxShortcuts})
                  </span>
                </button>
              )}

              {/* Grid Cell: Lock Workspace (lined up directly in the same grid row next to Calendar) */}
              <button
                type="button"
                data-testid="lock-workspace-btn"
                onClick={() => {
                  if (isLocked) {
                    setPinDigits("");
                    setPinError(null);
                    setPinMode(requiresReauth ? "reauth" : "unlock");
                  } else {
                    handleLockWorkspaceClick();
                  }
                }}
                className="group relative h-[98px] sm:h-[110px] rounded-2xl transition-all duration-200 flex flex-col items-center justify-center px-6 select-none cursor-pointer border border-[#D89E43]/65 hover:border-[#F7CA6D] bg-gradient-to-b from-[#111A3D]/85 via-[#09102A]/90 to-[#060B1E]/95 hover:from-[#16224F]/90 hover:to-[#08102B]/95 shadow-[0_8px_28px_rgba(0,0,0,0.7)] hover:shadow-[0_10px_32px_rgba(0,0,0,0.85),0_0_20px_rgba(229,169,70,0.22)] backdrop-blur-md"
              >
                <span className="pointer-events-none absolute -top-[1px] left-10 right-10 h-[1.5px] bg-gradient-to-r from-transparent via-[#FFE394]/80 to-transparent" />
                <span className="pointer-events-none absolute -bottom-[1px] left-12 right-12 h-[1.5px] bg-gradient-to-r from-transparent via-[#E5A946]/70 to-transparent" />
                <div className="mb-1.5 transition-transform duration-200 group-hover:scale-105">
                  <Lock
                    className="w-7 h-7 text-[#E5A946] drop-shadow-[0_0_8px_rgba(229,169,70,0.3)]"
                    strokeWidth={1.75}
                  />
                </div>
                <span className="text-[15px] sm:text-[16px] font-normal text-white tracking-wide">
                  {isLocked ? "Unlock Workspace" : "Lock Workspace"}
                </span>
              </button>

              {/* Grid Cell: Return to Active Work (privacy-safe generic label) */}
              <button
                type="button"
                data-testid="resume-workspace-btn"
                onClick={handleResumePreviousWorkClick}
                title="Return to previous view"
                className="group relative h-[98px] sm:h-[110px] rounded-2xl transition-all duration-200 flex flex-col items-center justify-center px-6 select-none cursor-pointer border border-[#D89E43]/65 hover:border-[#F7CA6D] bg-gradient-to-b from-[#111A3D]/85 via-[#09102A]/90 to-[#060B1E]/95 hover:from-[#16224F]/90 hover:to-[#08102B]/95 shadow-[0_8px_28px_rgba(0,0,0,0.7)] hover:shadow-[0_10px_32px_rgba(0,0,0,0.85),0_0_20px_rgba(229,169,70,0.22)] backdrop-blur-md"
              >
                <span className="pointer-events-none absolute -top-[1px] left-10 right-10 h-[1.5px] bg-gradient-to-r from-transparent via-[#FFE394]/80 to-transparent" />
                <span className="pointer-events-none absolute -bottom-[1px] left-12 right-12 h-[1.5px] bg-gradient-to-r from-transparent via-[#E5A946]/70 to-transparent" />
                <div className="mb-1.5 transition-transform duration-200 group-hover:scale-105">
                  <ArrowRight
                    className="w-7 h-7 text-[#E5A946] drop-shadow-[0_0_8px_rgba(229,169,70,0.3)]"
                    strokeWidth={1.75}
                  />
                </div>
                <span className="text-[15px] sm:text-[16px] font-normal text-white tracking-wide">
                  Back to Work
                </span>
              </button>
            </div>
          </div>
        ) : (
          /* ══════════════════════════════════════════════════════════════════
             WORKSPACE LOCKED & 4-DIGIT PIN OVERLAY VIEW (Reference Image 2)
             ══════════════════════════════════════════════════════════════════ */
          <div
            data-testid="workspace-pin-overlay"
            className="w-full max-w-[1120px] mx-auto flex items-center justify-center gap-8 lg:gap-12"
          >
            {/* Left Blurred Flanking Shortcuts (Desktop) */}
            <div className="hidden lg:flex flex-col gap-5 w-[270px] shrink-0">
              {leftFlankShortcuts.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setPendingDestinationPath(item.path);
                    setPinError(null);
                  }}
                  title={`Unlock and open ${item.label}`}
                  className={`h-[118px] rounded-2xl border transition-all flex flex-col items-center justify-center px-5 backdrop-blur-md cursor-pointer ${
                    pendingDestinationPath === item.path
                      ? "border-[#F7CA6D]/80 bg-[#101A3E]/80 opacity-85 scale-[1.02]"
                      : "border-[#D89E43]/30 bg-[#0A112B]/65 opacity-55 blur-[1.5px] hover:opacity-80 hover:blur-0"
                  }`}
                >
                  <div className="mb-2">{renderShortcutIcon(item.iconKey, "w-7 h-7")}</div>
                  <span className="text-[15px] text-white/90">{item.label}</span>
                </button>
              ))}
            </div>

            {/* Center 4-Digit PIN Pad Column */}
            <div className="relative z-40 w-full max-w-[380px] flex flex-col items-center text-center">
              {/* Glowing Circular Gold Lock Emblem (brought to front above header) */}
              <div className="relative z-50 mb-3.5 flex items-center justify-center">
                <div className="relative z-50 w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-full border-2 border-[#E8A948] bg-[#070E26] flex items-center justify-center shadow-[0_0_28px_rgba(232,169,72,0.55),inset_0_0_14px_rgba(232,169,72,0.25)]">
                  <Lock className="w-8 h-8 text-[#F5C26B]" strokeWidth={1.9} />
                </div>
              </div>

              {/* Heading & Subtitle */}
              <h2 className="font-serif text-2xl sm:text-[32px] font-normal text-white tracking-wide leading-tight">
                {pinMode === "setup_step1"
                  ? "Create Workspace PIN"
                  : pinMode === "setup_step2"
                  ? "Confirm Your PIN"
                  : pinMode === "reauth"
                  ? "Account Verification"
                  : "Workspace Locked"}
              </h2>

              <p className="mt-1 text-xs sm:text-[14px] font-light text-[#C4CEEE]/90">
                {pinMode === "setup_step1"
                  ? "Choose a 4-digit privacy PIN for quick workspace lock & unlock"
                  : pinMode === "setup_step2"
                  ? "Re-enter your 4-digit PIN to confirm"
                  : pinMode === "reauth"
                  ? "Confirm your account email to reset your 4-digit Workspace PIN"
                  : pendingShortcut
                  ? `Enter your 4-digit PIN to open ${pendingShortcut.label}`
                  : "Enter your 4-digit PIN to return to work"}
              </p>

              {pinMode === "reauth" ? (
                /* ── Full Account Email Reauthentication Reset Form ── */
                <form
                  onSubmit={handleReauthSubmit}
                  className="mt-5 w-full space-y-3 rounded-2xl border border-[#DFA348]/55 bg-[#070F29]/90 p-5 text-left backdrop-blur-md shadow-xl"
                >
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-[#B8C4F0] mb-1">
                      Confirm Account Email ({user?.email || "Staff Email"})
                    </label>
                    <input
                      type="email"
                      required
                      value={reauthEmail}
                      onChange={(e) => setReauthEmail(e.target.value)}
                      placeholder={user?.email || "name@waypointadvocates.com"}
                      className="w-full rounded-lg border border-[#DFA348]/50 bg-[#04091C] px-3 py-2 text-sm text-white focus:border-[#FFE394] focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-[#B8C4F0] mb-1">
                        New 4-Digit PIN
                      </label>
                      <input
                        type="password"
                        inputMode="numeric"
                        maxLength={4}
                        required
                        value={reauthNewPin}
                        onChange={(e) =>
                          setReauthNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                        }
                        placeholder="••••"
                        className="w-full rounded-lg border border-[#DFA348]/50 bg-[#04091C] px-3 py-2 text-center text-base tracking-[0.4em] text-white focus:border-[#FFE394] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-[#B8C4F0] mb-1">
                        Confirm PIN
                      </label>
                      <input
                        type="password"
                        inputMode="numeric"
                        maxLength={4}
                        required
                        value={reauthConfirmPin}
                        onChange={(e) =>
                          setReauthConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                        }
                        placeholder="••••"
                        className="w-full rounded-lg border border-[#DFA348]/50 bg-[#04091C] px-3 py-2 text-center text-base tracking-[0.4em] text-white focus:border-[#FFE394] focus:outline-none"
                      />
                    </div>
                  </div>
                  {pinError && (
                    <div className="flex items-center gap-1.5 text-xs text-rose-300 bg-rose-950/60 border border-rose-500/40 rounded-lg px-3 py-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                      <span>{pinError}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPinError(null);
                        setPinMode("unlock");
                      }}
                      className="text-xs text-[#B8C4F0] hover:text-white underline cursor-pointer"
                    >
                      Back to PIN Pad
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingPin}
                      className="rounded-full border border-[#FFE394] bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] px-5 py-2 text-xs font-bold text-[#000820] shadow-md hover:brightness-110 cursor-pointer"
                    >
                      {isSubmittingPin ? "Verifying..." : "Reset PIN & Unlock"}
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  {/* ── 4 Masked PIN Indicator Boxes ── */}
                  <div
                    data-testid="pin-indicator-boxes"
                    className="mt-4 mb-4 flex items-center justify-center gap-3"
                  >
                    {[0, 1, 2, 3].map((slot) => {
                      const isFilled = pinDigits.length > slot;
                      return (
                        <div
                          key={slot}
                          data-testid={`pin-box-${slot}`}
                          className={`w-11 h-10 rounded-lg border transition-all duration-150 flex items-center justify-center ${
                            isFilled
                              ? "border-[#F7CA6D] bg-[#101B42]/95 shadow-[0_0_12px_rgba(247,202,109,0.45)]"
                              : "border-[#D89E43]/75 bg-[#070E26]/85"
                          }`}
                        >
                          {isFilled && (
                            <span className="w-2.5 h-2.5 rounded-full bg-[#FFE394] shadow-[0_0_8px_#FFE394]" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Error or Cooldown Banner */}
                  {(pinError || cooldownSeconds > 0) && (
                    <div
                      data-testid="pin-error-message"
                      className="mb-3 flex items-center justify-center gap-1.5 rounded-xl border border-rose-400/50 bg-rose-950/75 px-3.5 py-1.5 text-xs text-rose-200 shadow-lg"
                    >
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                      <span>
                        {cooldownSeconds > 0
                          ? `Too many failed attempts. Please wait ${cooldownSeconds}s or verify account below.`
                          : pinError}
                      </span>
                    </div>
                  )}

                  {/* ── 3x4 Numeric Keypad (1-9, Backspace, 0) ── */}
                  <div
                    data-testid="pin-numeric-keypad"
                    className="grid grid-cols-3 gap-2.5 sm:gap-3 w-full max-w-[300px]"
                  >
                    {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
                      <button
                        key={digit}
                        type="button"
                        data-testid={`pin-key-${digit}`}
                        disabled={isSubmittingPin || cooldownSeconds > 0}
                        onClick={() => handleDigitInput(digit)}
                        className="relative h-11 sm:h-[46px] rounded-xl border border-[#DFA348]/80 hover:border-[#FFE394] bg-gradient-to-b from-[#131D42]/90 to-[#080F26]/95 hover:from-[#1B2859]/95 hover:to-[#0C1636]/95 active:scale-95 transition-all text-lg sm:text-xl font-normal text-white shadow-[0_4px_14px_rgba(0,0,0,0.65)] cursor-pointer disabled:opacity-40"
                      >
                        <span className="pointer-events-none absolute -top-[1px] left-4 right-4 h-[1px] bg-gradient-to-r from-transparent via-[#FFE394]/80 to-transparent" />
                        {digit}
                      </button>
                    ))}

                    {/* Backspace Key */}
                    <button
                      type="button"
                      data-testid="pin-key-backspace"
                      aria-label="Backspace"
                      disabled={isSubmittingPin || cooldownSeconds > 0}
                      onClick={handleBackspace}
                      className="relative h-11 sm:h-[46px] rounded-xl border border-[#DFA348]/80 hover:border-[#FFE394] bg-gradient-to-b from-[#131D42]/90 to-[#080F26]/95 hover:from-[#1B2859]/95 hover:to-[#0C1636]/95 active:scale-95 transition-all flex items-center justify-center text-white shadow-[0_4px_14px_rgba(0,0,0,0.65)] cursor-pointer disabled:opacity-40"
                    >
                      <span className="pointer-events-none absolute -top-[1px] left-4 right-4 h-[1px] bg-gradient-to-r from-transparent via-[#FFE394]/80 to-transparent" />
                      <Delete className="w-4 h-4 text-white/90" />
                    </button>

                    {/* 0 Key */}
                    <button
                      type="button"
                      data-testid="pin-key-0"
                      disabled={isSubmittingPin || cooldownSeconds > 0}
                      onClick={() => handleDigitInput("0")}
                      className="relative h-11 sm:h-[46px] rounded-xl border border-[#DFA348]/80 hover:border-[#FFE394] bg-gradient-to-b from-[#131D42]/90 to-[#080F26]/95 hover:from-[#1B2859]/95 hover:to-[#0C1636]/95 active:scale-95 transition-all text-lg sm:text-xl font-normal text-white shadow-[0_4px_14px_rgba(0,0,0,0.65)] cursor-pointer disabled:opacity-40"
                    >
                      <span className="pointer-events-none absolute -top-[1px] left-4 right-4 h-[1px] bg-gradient-to-r from-transparent via-[#FFE394]/80 to-transparent" />
                      0
                    </button>

                    {/* Empty right cell matching Reference Image 2 */}
                    <div />
                  </div>

                  {/* Cancel & Forgot PIN Links */}
                  <div className="mt-3.5 flex flex-col items-center gap-1.5">
                    <button
                      type="button"
                      data-testid="pin-cancel-btn"
                      onClick={handleCancelPinOverlay}
                      className="text-xs sm:text-sm text-[#C8D0F0]/90 hover:text-white underline underline-offset-4 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>

                    {pinMode === "unlock" && (
                      <button
                        type="button"
                        data-testid="pin-forgot-btn"
                        onClick={() => {
                          setPinError(null);
                          setPinMode("reauth");
                        }}
                        className="text-xs text-[#D8C7A5]/70 hover:text-[#FFE394] transition-colors cursor-pointer"
                      >
                        Forgot PIN? Reauthenticate with account
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Right Blurred Flanking Shortcuts (Desktop) */}
            <div className="hidden lg:flex flex-col gap-5 w-[270px] shrink-0">
              {rightFlankShortcuts.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setPendingDestinationPath(item.path);
                    setPinError(null);
                  }}
                  title={`Unlock and open ${item.label}`}
                  className={`h-[118px] rounded-2xl border transition-all flex flex-col items-center justify-center px-5 backdrop-blur-md cursor-pointer ${
                    pendingDestinationPath === item.path
                      ? "border-[#F7CA6D]/80 bg-[#101A3E]/80 opacity-85 scale-[1.02]"
                      : "border-[#D89E43]/30 bg-[#0A112B]/65 opacity-55 blur-[1.5px] hover:opacity-80 hover:blur-0"
                  }`}
                >
                  <div className="mb-2">{renderShortcutIcon(item.iconKey, "w-7 h-7")}</div>
                  <span className="text-[15px] text-white/90">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Bottom spacer so flex-between centers main cleanly without a second layer of boxes */}
      <div className="h-4 shrink-0" />

      {/* ── Add Shortcut Modal (Permitted CRM Destinations) ── */}
      {isAddModalOpen && (
        <div
          data-testid="add-shortcut-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-[#DFA348]/70 bg-[#07102B]/95 p-6 text-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3.5">
              <div>
                <h3 className="font-serif text-xl text-white">Add Quick-Navigation Shortcut</h3>
                <p className="text-xs text-[#B8C4F0]/80 mt-0.5">
                  Select a permitted CRM destination ({shortcuts.length}/{maxShortcuts} active)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 max-h-[340px] overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2.5 pr-1">
              {addableDestinations.map((dest) => (
                <button
                  key={dest.id}
                  type="button"
                  data-testid={`add-shortcut-option-${dest.id}`}
                  onClick={() => handleAddShortcut(dest.id)}
                  className="flex items-center gap-3 rounded-xl border border-[#DFA348]/35 hover:border-[#FFE394] bg-[#0B1739]/80 hover:bg-[#132352]/90 p-3 text-left transition-all cursor-pointer"
                >
                  <div className="shrink-0">
                    {renderShortcutIcon(dest.iconKey, "w-6 h-6")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">{dest.label}</p>
                    <p className="text-[11px] text-[#B8C4F0]/75 truncate">{dest.description}</p>
                  </div>
                </button>
              ))}
              {addableDestinations.length === 0 && (
                <p className="col-span-2 py-6 text-center text-sm text-[#B8C4F0]/70">
                  All permitted destinations are already added.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
