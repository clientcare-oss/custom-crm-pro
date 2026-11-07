import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

export interface StartScreenShortcutItem {
  id: string;
  label: string;
  path: string;
  iconKey: string;
  requiredModuleId?: string | null;
  description: string;
}

interface WorkspaceLockContextValue {
  isLoading: boolean;
  isLocked: boolean;
  isStartScreenOpen: boolean;
  hasPinSet: boolean;
  shortcutIds: string[];
  shortcuts: StartScreenShortcutItem[];
  availableCatalog: StartScreenShortcutItem[];
  maxShortcuts: number;
  previousPath: string;
  idleTimeoutMinutes: number;
  supportedIdleTimeouts: number[];
  failedAttempts: number;
  cooldownRemainingSeconds: number;
  requiresReauth: boolean;
  pendingDestinationPath: string | null;
  setPendingDestinationPath: (path: string | null) => void;
  openStartScreen: () => void;
  enterWorkspace: (targetPath?: string) => void;
  lockWorkspace: (overridePreviousPath?: string) => Promise<{ needsPinSetup: boolean }>;
  unlockWorkspaceWithPin: (
    pin: string,
    destinationOverride?: string | null
  ) => Promise<{
    ok: boolean;
    error?: string;
    destinationPath?: string;
    cooldownRemainingSeconds?: number;
    requiresReauth?: boolean;
  }>;
  setupPin: (
    pin: string,
    confirmPin: string,
    lockAfterSetup?: boolean
  ) => Promise<{ ok: boolean; error?: string }>;
  resetPinWithReauth: (
    confirmEmail: string,
    newPin: string,
    confirmPin: string
  ) => Promise<{ ok: boolean; error?: string }>;
  updateShortcuts: (nextIds: string[]) => Promise<void>;
  updateIdleTimeout: (minutes: number) => Promise<void>;
}

const DEFAULT_SHORTCUTS_FALLBACK: StartScreenShortcutItem[] = [
  {
    id: "new_client",
    label: "New Client",
    path: "/leads?newClient=1",
    iconKey: "user-plus",
    requiredModuleId: "lead-center",
    description: "Create a new prospective family or client intake record",
  },
  {
    id: "dashboard",
    label: "Dashboard",
    path: "/",
    iconKey: "dashboard",
    requiredModuleId: "home",
    description: "Personal employee dashboard & Crew Quarters (PG-038)",
  },
  {
    id: "students",
    label: "Students",
    path: "/students",
    iconKey: "students",
    requiredModuleId: "students",
    description: "Student case files and IEP advocacy roster",
  },
  {
    id: "calendar",
    label: "Calendar",
    path: "/calendar",
    iconKey: "calendar",
    requiredModuleId: "calendar",
    description: "Appointments, IEP meetings, and team schedule",
  },
];

const SESSION_ENTERED_KEY = "waypoint_crm_workspace_entered_v1";
const LAST_ACTIVITY_STORAGE_KEY = "waypoint_crm_last_activity_ts_v1";
const LAST_ACTIVE_PATH_STORAGE_KEY = "waypoint_crm_last_active_path_v1";

const WorkspaceLockContext = createContext<WorkspaceLockContextValue | null>(null);

function isPublicOrPortalPath(pathname: string): boolean {
  return (
    pathname === "/portal" ||
    pathname === "/client-portal" ||
    pathname === "/portal/book" ||
    pathname === "/book" ||
    pathname === "/intake" ||
    pathname === "/get-started" ||
    pathname.startsWith("/form/") ||
    pathname.startsWith("/give") ||
    pathname.startsWith("/receipt/") ||
    pathname.startsWith("/portal/receipt/") ||
    pathname.startsWith("/smart-files/response/") ||
    pathname.startsWith("/first-mate/popout")
  );
}

export function WorkspaceLockProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [location, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const isStaffAuthenticated = Boolean(user && user.role !== "client");

  // Default to showing the Start Screen when an employee opens Waypoint CRM in a new tab/session,
  // or when navigating directly to /start.
  const [isStartScreenOpen, setIsStartScreenOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    if (isPublicOrPortalPath(window.location.pathname)) return false;
    if (window.location.pathname === "/start") return true;
    try {
      const alreadyEntered = sessionStorage.getItem(SESSION_ENTERED_KEY) === "1";
      // If user opened root "/" or "/start" fresh in this session, show Start Screen first
      if (!alreadyEntered && (window.location.pathname === "/" || window.location.pathname === "/start")) {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  });

  // Optimistic local lock flag so locking is instantaneous (0ms frame delay)
  const [optimisticLocked, setOptimisticLocked] = useState<boolean>(false);
  const [pendingDestinationPath, setPendingDestinationPath] = useState<string | null>(null);
  const [optimisticShortcutIds, setOptimisticShortcutIds] = useState<string[] | null>(null);
  const [lastKnownPath, setLastKnownPath] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const p = window.location.pathname + window.location.search;
      if (p && p !== "/start" && p !== "/dashboard" && !isPublicOrPortalPath(window.location.pathname)) {
        try {
          sessionStorage.setItem(LAST_ACTIVE_PATH_STORAGE_KEY, p);
        } catch {}
        return p;
      }
      try {
        const saved = sessionStorage.getItem(LAST_ACTIVE_PATH_STORAGE_KEY);
        if (saved && saved !== "/start" && saved !== "/dashboard") {
          return saved;
        }
      } catch {}
    }
    return "/";
  });

  const { data: lockState, isLoading: queryLoading } = trpc.workspaceLock.getState.useQuery(
    undefined,
    {
      enabled: isStaffAuthenticated,
      refetchOnWindowFocus: true,
      staleTime: 15_000,
    }
  );

  const updateShortcutsMutation = trpc.workspaceLock.updateShortcuts.useMutation({
    onSuccess: (data) => {
      setOptimisticShortcutIds(data.shortcutIds);
      utils.workspaceLock.getState.invalidate();
    },
    onError: (err) => {
      setOptimisticShortcutIds(null);
      toast.error(err.message || "Unable to save shortcut customization");
    },
  });

  const setupPinMutation = trpc.workspaceLock.setupPin.useMutation({
    onSuccess: () => {
      utils.workspaceLock.getState.invalidate();
    },
  });

  const lockMutation = trpc.workspaceLock.lock.useMutation({
    onSuccess: () => {
      utils.workspaceLock.getState.invalidate();
    },
  });

  const unlockMutation = trpc.workspaceLock.unlockWithPin.useMutation({
    onSuccess: (res) => {
      if (res.unlocked) {
        setOptimisticLocked(false);
        utils.workspaceLock.getState.invalidate();
      }
    },
  });

  const resetPinMutation = trpc.workspaceLock.resetPinWithReauth.useMutation({
    onSuccess: (res) => {
      if (res.success) {
        setOptimisticLocked(false);
        utils.workspaceLock.getState.invalidate();
      }
    },
  });

  const updateIdleTimeoutMutation = trpc.workspaceLock.updateIdleTimeout.useMutation({
    onSuccess: () => {
      utils.workspaceLock.getState.invalidate();
    },
  });

  const savePreviousPathMutation = trpc.workspaceLock.savePreviousPath.useMutation();

  const isLocked = Boolean(optimisticLocked || lockState?.isLocked);
  const hasPinSet = Boolean(lockState?.hasPinSet);
  const idleTimeoutMinutes = lockState?.idleTimeoutMinutes ?? 5;
  const supportedIdleTimeouts = lockState?.supportedIdleTimeouts ?? [2, 5, 10, 15];
  const maxShortcuts = lockState?.maxShortcuts ?? 6;

  // Keep /start route synchronized with Start Screen visibility
  useEffect(() => {
    if (location === "/start" && !isStartScreenOpen) {
      setIsStartScreenOpen(true);
    }
  }, [location, isStartScreenOpen]);

  // Whenever workspace is locked on the server, immediately force Start Screen open
  useEffect(() => {
    if (lockState?.isLocked) {
      setOptimisticLocked(true);
      setIsStartScreenOpen(true);
    }
  }, [lockState?.isLocked]);

  // Track last active CRM route when unlocked and inside the workspace
  useEffect(() => {
    if (!isStaffAuthenticated || isLocked || isStartScreenOpen) return;
    if (location === "/start" || isPublicOrPortalPath(location)) return;

    const fullPath =
      typeof window !== "undefined"
        ? window.location.pathname + window.location.search
        : location;

    if (fullPath && fullPath !== "/start") {
      setLastKnownPath(fullPath);
      try {
        sessionStorage.setItem(LAST_ACTIVE_PATH_STORAGE_KEY, fullPath);
      } catch {}
    }
  }, [location, isStaffAuthenticated, isLocked, isStartScreenOpen]);

  // Available catalog and resolved shortcuts
  const availableCatalog: StartScreenShortcutItem[] = useMemo(() => {
    if (lockState?.availableShortcuts && lockState.availableShortcuts.length > 0) {
      return lockState.availableShortcuts;
    }
    return DEFAULT_SHORTCUTS_FALLBACK;
  }, [lockState?.availableShortcuts]);

  const shortcutIds: string[] = useMemo(() => {
    if (optimisticShortcutIds) return optimisticShortcutIds;
    if (lockState?.shortcutIds && lockState.shortcutIds.length > 0) {
      return lockState.shortcutIds;
    }
    return DEFAULT_SHORTCUTS_FALLBACK.map((s) => s.id);
  }, [optimisticShortcutIds, lockState?.shortcutIds]);

  const shortcuts: StartScreenShortcutItem[] = useMemo(() => {
    const map = new Map(availableCatalog.map((item) => [item.id, item]));
    for (const def of DEFAULT_SHORTCUTS_FALLBACK) {
      if (!map.has(def.id)) map.set(def.id, def);
    }
    return shortcutIds
      .map((id) => map.get(id))
      .filter((item): item is StartScreenShortcutItem => Boolean(item))
      .slice(0, maxShortcuts);
  }, [shortcutIds, availableCatalog, maxShortcuts]);

  const openStartScreen = useCallback(() => {
    if (typeof window !== "undefined") {
      const currentFull = window.location.pathname + window.location.search;
      if (currentFull && currentFull !== "/start" && !isPublicOrPortalPath(window.location.pathname)) {
        setLastKnownPath(currentFull);
        try {
          sessionStorage.setItem(LAST_ACTIVE_PATH_STORAGE_KEY, currentFull);
        } catch {}
        if (isStaffAuthenticated && !isLocked) {
          savePreviousPathMutation.mutate({ path: currentFull });
        }
      }
    }
    setIsStartScreenOpen(true);
  }, [isStaffAuthenticated, isLocked, savePreviousPathMutation]);

  const enterWorkspace = useCallback(
    (targetPath?: string) => {
      if (isLocked) return;
      try {
        sessionStorage.setItem(SESSION_ENTERED_KEY, "1");
      } catch {
        // ignore storage errors
      }
      const rawDestination =
        targetPath ||
        pendingDestinationPath ||
        lastKnownPath ||
        lockState?.previousPath ||
        "/";
      const destination = rawDestination === "/dashboard" ? "/" : rawDestination;
      setPendingDestinationPath(null);
      setIsStartScreenOpen(false);

      const currentBrowserPath =
        typeof window !== "undefined"
          ? window.location.pathname + window.location.search
          : location;

      if (destination && destination !== "/start") {
        if (currentBrowserPath !== destination) {
          setLocation(destination);
        }
      } else if (currentBrowserPath !== "/") {
        setLocation("/");
      }
    },
    [isLocked, pendingDestinationPath, lastKnownPath, lockState?.previousPath, location, setLocation]
  );

  const lockWorkspace = useCallback(
    async (overridePreviousPath?: string): Promise<{ needsPinSetup: boolean }> => {
      const pathToSave =
        overridePreviousPath ||
        (typeof window !== "undefined" &&
        window.location.pathname !== "/start" &&
        !isPublicOrPortalPath(window.location.pathname)
          ? window.location.pathname + window.location.search
          : lastKnownPath || lockState?.previousPath || "/");

      setLastKnownPath(pathToSave);
      try {
        sessionStorage.setItem(LAST_ACTIVE_PATH_STORAGE_KEY, pathToSave);
      } catch {}
      setIsStartScreenOpen(true);

      if (!hasPinSet) {
        return { needsPinSetup: true };
      }

      setOptimisticLocked(true);
      try {
        await lockMutation.mutateAsync({ previousPath: pathToSave });
      } catch (err: any) {
        setOptimisticLocked(false);
        toast.error(err?.message || "Failed to lock workspace");
      }
      return { needsPinSetup: false };
    },
    [hasPinSet, lastKnownPath, lockState?.previousPath, lockMutation]
  );

  const setupPin = useCallback(
    async (
      pin: string,
      confirmPin: string,
      lockAfterSetup = true
    ): Promise<{ ok: boolean; error?: string }> => {
      try {
        await setupPinMutation.mutateAsync({
          pin,
          confirmPin,
          lockImmediately: lockAfterSetup,
          previousPath: lastKnownPath || "/",
        });
        if (lockAfterSetup) {
          setOptimisticLocked(true);
          setIsStartScreenOpen(true);
        }
        return { ok: true };
      } catch (err: any) {
        return { ok: false, error: err?.message || "Failed to set PIN" };
      }
    },
    [setupPinMutation, lastKnownPath]
  );

  const unlockWorkspaceWithPin = useCallback(
    async (
      pin: string,
      destinationOverride?: string | null
    ): Promise<{
      ok: boolean;
      error?: string;
      destinationPath?: string;
      cooldownRemainingSeconds?: number;
      requiresReauth?: boolean;
    }> => {
      try {
        const res = await unlockMutation.mutateAsync({
          pin,
          targetDestinationPath: destinationOverride || pendingDestinationPath || undefined,
        });
        if (!res.unlocked) {
          const cooldownRemainingSeconds =
            res.lockedUntilMs && res.lockedUntilMs > Date.now()
              ? Math.ceil((res.lockedUntilMs - Date.now()) / 1000)
              : 0;
          return {
            ok: false,
            error: res.errorMessage || "Incorrect PIN",
            cooldownRemainingSeconds,
            requiresReauth: res.requiresReauth,
          };
        }

        // Mark activity timestamp fresh upon unlock
        const now = Date.now();
        lastActivityRef.current = now;
        try {
          localStorage.setItem(LAST_ACTIVITY_STORAGE_KEY, String(now));
          sessionStorage.setItem(SESSION_ENTERED_KEY, "1");
        } catch {
          // ignore
        }

        setOptimisticLocked(false);
        const rawTarget =
          destinationOverride ||
          pendingDestinationPath ||
          res.redirectToPath ||
          lastKnownPath ||
          "/";
        const target = rawTarget === "/dashboard" || rawTarget === "/start" ? "/" : rawTarget;

        setPendingDestinationPath(null);
        setIsStartScreenOpen(false);
        const currentBrowserPath =
          typeof window !== "undefined"
            ? window.location.pathname + window.location.search
            : location;
        if (currentBrowserPath !== target) {
          setLocation(target);
        }

        return { ok: true, destinationPath: target };
      } catch (err: any) {
        return {
          ok: false,
          error: err?.message || "Failed to verify PIN",
        };
      }
    },
    [unlockMutation, pendingDestinationPath, lastKnownPath, location, setLocation]
  );

  const resetPinWithReauth = useCallback(
    async (
      confirmEmail: string,
      newPin: string,
      confirmPin: string
    ): Promise<{ ok: boolean; error?: string }> => {
      try {
        const res = await resetPinMutation.mutateAsync({
          confirmedEmail: confirmEmail,
          newPin,
          confirmNewPin: confirmPin,
        });
        if (!res.success) {
          return { ok: false, error: "Unable to reset PIN" };
        }
        setOptimisticLocked(false);
        const rawTarget = pendingDestinationPath || res.previousPath || lastKnownPath || "/";
        const target = rawTarget === "/dashboard" || rawTarget === "/start" ? "/" : rawTarget;
        setPendingDestinationPath(null);
        setIsStartScreenOpen(false);
        const currentBrowserPath =
          typeof window !== "undefined"
            ? window.location.pathname + window.location.search
            : location;
        if (currentBrowserPath !== target) {
          setLocation(target);
        }
        return { ok: true };
      } catch (err: any) {
        return { ok: false, error: err?.message || "Account verification failed" };
      }
    },
    [resetPinMutation, pendingDestinationPath, lastKnownPath, location, setLocation]
  );

  const updateShortcuts = useCallback(
    async (nextIds: string[]) => {
      setOptimisticShortcutIds(nextIds);
      await updateShortcutsMutation.mutateAsync({ shortcutIds: nextIds });
    },
    [updateShortcutsMutation]
  );

  const updateIdleTimeout = useCallback(
    async (minutes: number) => {
      const validMinutes = ([2, 5, 10, 15].includes(minutes) ? minutes : 5) as 2 | 5 | 10 | 15;
      await updateIdleTimeoutMutation.mutateAsync({ minutes: validMinutes });
      toast.success(`Automatic idle lock set to ${validMinutes} minutes`);
    },
    [updateIdleTimeoutMutation]
  );

  // ─── Automatic Idle Lock Engine ────────────────────────────────────────────
  const lastActivityRef = useRef<number>(Date.now());
  const idleLockInFlightRef = useRef<boolean>(false);

  const recordMeaningfulActivity = useCallback(() => {
    const now = Date.now();
    // Throttle updates to once per 1000ms
    if (now - lastActivityRef.current < 1000) return;
    lastActivityRef.current = now;
    try {
      localStorage.setItem(LAST_ACTIVITY_STORAGE_KEY, String(now));
    } catch {
      // ignore
    }
  }, []);

  const checkIdleElapsedAndLockIfNeeded = useCallback(() => {
    if (!isStaffAuthenticated || isLocked || idleLockInFlightRef.current) return;
    if (typeof window !== "undefined" && isPublicOrPortalPath(window.location.pathname)) return;

    let latestActivity = lastActivityRef.current;
    try {
      const stored = Number(localStorage.getItem(LAST_ACTIVITY_STORAGE_KEY) || "0");
      if (stored > latestActivity) {
        latestActivity = stored;
        lastActivityRef.current = stored;
      }
    } catch {
      // ignore
    }

    const timeoutMs = (idleTimeoutMinutes || 5) * 60 * 1000;
    const elapsed = Date.now() - latestActivity;

    if (elapsed >= timeoutMs) {
      // Conceal workspace immediately
      setIsStartScreenOpen(true);
      if (hasPinSet) {
        idleLockInFlightRef.current = true;
        setOptimisticLocked(true);
        const pathToSave =
          typeof window !== "undefined" &&
          window.location.pathname !== "/start" &&
          !isPublicOrPortalPath(window.location.pathname)
            ? window.location.pathname + window.location.search
            : lastKnownPath || "/";

        lockMutation
          .mutateAsync({ previousPath: pathToSave })
          .catch(() => {
            // Keep locally locked for privacy even if offline
          })
          .finally(() => {
            idleLockInFlightRef.current = false;
          });
      }
    }
  }, [
    isStaffAuthenticated,
    isLocked,
    idleTimeoutMinutes,
    hasPinSet,
    lastKnownPath,
    lockMutation,
  ]);

  useEffect(() => {
    if (!isStaffAuthenticated || typeof window === "undefined") return;

    // Initialize activity timestamp
    lastActivityRef.current = Date.now();
    try {
      localStorage.setItem(LAST_ACTIVITY_STORAGE_KEY, String(lastActivityRef.current));
    } catch {
      // ignore
    }

    const activityEvents: Array<keyof WindowEventMap> = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
      "wheel",
    ];

    const handleActivity = () => {
      if (!isLocked) {
        recordMeaningfulActivity();
      }
    };

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "visible") {
        // Immediately verify elapsed time before allowing any unlocked view
        checkIdleElapsedAndLockIfNeeded();
      }
    };

    for (const evt of activityEvents) {
      window.addEventListener(evt, handleActivity, { passive: true });
    }
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);
    window.addEventListener("focus", handleVisibilityOrFocus);

    const intervalId = window.setInterval(checkIdleElapsedAndLockIfNeeded, 4000);

    return () => {
      for (const evt of activityEvents) {
        window.removeEventListener(evt, handleActivity);
      }
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      window.removeEventListener("focus", handleVisibilityOrFocus);
      window.clearInterval(intervalId);
    };
  }, [
    isStaffAuthenticated,
    isLocked,
    recordMeaningfulActivity,
    checkIdleElapsedAndLockIfNeeded,
  ]);

  const contextValue = useMemo<WorkspaceLockContextValue>(
    () => ({
      isLoading: authLoading || (isStaffAuthenticated && queryLoading && !lockState),
      isLocked,
      isStartScreenOpen: isLocked || isStartScreenOpen,
      hasPinSet,
      shortcutIds,
      shortcuts,
      availableCatalog,
      maxShortcuts,
      previousPath: lastKnownPath || lockState?.previousPath || "/",
      idleTimeoutMinutes,
      supportedIdleTimeouts,
      failedAttempts: lockState?.failedAttempts ?? 0,
      cooldownRemainingSeconds:
        lockState?.lockedUntilMs && lockState.lockedUntilMs > Date.now()
          ? Math.ceil((lockState.lockedUntilMs - Date.now()) / 1000)
          : 0,
      requiresReauth: Boolean(lockState?.requiresReauth),
      pendingDestinationPath,
      setPendingDestinationPath,
      openStartScreen,
      enterWorkspace,
      lockWorkspace,
      unlockWorkspaceWithPin,
      setupPin,
      resetPinWithReauth,
      updateShortcuts,
      updateIdleTimeout,
    }),
    [
      authLoading,
      isStaffAuthenticated,
      queryLoading,
      lockState,
      isLocked,
      isStartScreenOpen,
      hasPinSet,
      shortcutIds,
      shortcuts,
      availableCatalog,
      maxShortcuts,
      lastKnownPath,
      idleTimeoutMinutes,
      supportedIdleTimeouts,
      pendingDestinationPath,
      openStartScreen,
      enterWorkspace,
      lockWorkspace,
      unlockWorkspaceWithPin,
      setupPin,
      resetPinWithReauth,
      updateShortcuts,
      updateIdleTimeout,
    ]
  );

  return (
    <WorkspaceLockContext.Provider value={contextValue}>
      {children}
    </WorkspaceLockContext.Provider>
  );
}

export function useWorkspaceLock(): WorkspaceLockContextValue {
  const ctx = useContext(WorkspaceLockContext);
  if (!ctx) {
    throw new Error("useWorkspaceLock must be used within a WorkspaceLockProvider");
  }
  return ctx;
}
