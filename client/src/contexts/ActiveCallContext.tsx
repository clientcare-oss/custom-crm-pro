import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export type CallerCategory =
  | "lead"
  | "client"
  | "other"
  | "new_lead"
  | "existing_client"
  | "other_contact"
  | null;

export interface CallerInfo {
  name: string;
  phone?: string;
  email?: string;
  preferredContact?: "phone" | "email" | "sms";
}

export interface StudentDraft {
  studentId?: number | null;
  studentName?: string;
  studentAge?: number;
  studentGrade?: string;
  schoolDistrict?: string;
  state?: string;
}

export interface ActiveCallState {
  isActive: boolean;
  startTime: number | null; // timestamp
  callerCategory: CallerCategory;
  callerInfo: CallerInfo;
  contactId?: number | null;
  contactName?: string | null;
  studentId?: number | null;
  studentName?: string | null;
  otherRole?: string | null;
  otherOrganization?: string | null;
  callType: string | null;
  currentStepIndex: number;
  completedStepIds: string[];
  stepNotes: Record<string, string>;
  generalNotes: string;
  // Specialized flow drafts
  selectedIssues: string[];
  advocacyNeeds?: {
    whatNeeded: string;
    handledBy: "staff" | "advocate" | "callback" | "appointment" | "urgent";
    isUrgent: boolean;
  };
  callbackRequest?: {
    advocateId?: string;
    advocateName?: string;
    priority: "Normal" | "Important" | "Urgent";
    reason: string;
    notes: string;
    bestPhone: string;
    preferredTime: string;
  };
  wrapUp?: {
    outcome: string;
    finalNotes: string;
    followUpNeeded: boolean;
    followUpTask?: {
      title: string;
      description: string;
      dueDate?: string;
      priority: "low" | "medium" | "high" | "urgent";
      assignedTo?: string;
    };
    attachToType?: "contact" | "student" | "lead" | "other";
    attachToId?: number;
  };
  isSimulated?: boolean;
}

const STORAGE_KEY = "waypoint_active_call_session_v1";

const initialCallState: ActiveCallState = {
  isActive: false,
  startTime: null,
  callerCategory: null,
  callerInfo: { name: "" },
  contactId: null,
  contactName: null,
  studentId: null,
  studentName: null,
  otherRole: null,
  otherOrganization: null,
  callType: null,
  currentStepIndex: 0,
  completedStepIds: [],
  stepNotes: {},
  generalNotes: "",
  selectedIssues: [],
};

interface ActiveCallContextType {
  call: ActiveCallState;
  startCall: (params?: Partial<ActiveCallState>) => void;
  updateCall: (params: Partial<ActiveCallState>) => void;
  setCallerCategory: (cat: CallerCategory) => void;
  setCallType: (type: string) => void;
  setStepIndex: (index: number) => void;
  toggleStepComplete: (stepId: string) => void;
  setStepNote: (stepId: string, note: string) => void;
  setGeneralNotes: (notes: string) => void;
  endCallSession: () => void;
  discardCallSession: () => void;
}

const ActiveCallContext = createContext<ActiveCallContextType | undefined>(undefined);

export function ActiveCallProvider({ children }: { children: React.ReactNode }) {
  const [call, setCall] = useState<ActiveCallState>(() => {
    if (typeof window === "undefined") return initialCallState;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.isActive) return parsed;
      }
    } catch (err) {
      console.warn("Failed to load active call session from storage:", err);
    }
    return initialCallState;
  });

  // Sync to localStorage
  useEffect(() => {
    try {
      if (call.isActive) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(call));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (err) {
      console.warn("Failed to persist active call session:", err);
    }
  }, [call]);

  const startCall = useCallback((params?: Partial<ActiveCallState>) => {
    setCall((prev) => ({
      ...initialCallState,
      ...params,
      isActive: true,
      startTime: params?.startTime || Date.now(),
    }));
  }, []);

  const updateCall = useCallback((params: Partial<ActiveCallState>) => {
    setCall((prev) => ({
      ...prev,
      ...params,
      isActive: true,
      startTime: prev.startTime || Date.now(),
    }));
  }, []);

  const setCallerCategory = useCallback((cat: CallerCategory) => {
    setCall((prev) => ({
      ...prev,
      callerCategory: cat,
      isActive: true,
      startTime: prev.startTime || Date.now(),
      // If lead selected, default callType to "New Lead / Sales"
      callType: cat === "lead" ? "New Lead / Sales" : prev.callType,
    }));
  }, []);

  const setCallType = useCallback((type: string) => {
    setCall((prev) => ({
      ...prev,
      callType: type,
      currentStepIndex: 0,
      completedStepIds: [],
      isActive: true,
      startTime: prev.startTime || Date.now(),
    }));
  }, []);

  const setStepIndex = useCallback((index: number) => {
    setCall((prev) => ({ ...prev, currentStepIndex: index }));
  }, []);

  const toggleStepComplete = useCallback((stepId: string) => {
    setCall((prev) => {
      const exists = prev.completedStepIds.includes(stepId);
      const nextCompleted = exists
        ? prev.completedStepIds.filter((id) => id !== stepId)
        : [...prev.completedStepIds, stepId];
      return { ...prev, completedStepIds: nextCompleted };
    });
  }, []);

  const setStepNote = useCallback((stepId: string, note: string) => {
    setCall((prev) => ({
      ...prev,
      stepNotes: {
        ...prev.stepNotes,
        [stepId]: note,
      },
    }));
  }, []);

  const setGeneralNotes = useCallback((notes: string) => {
    setCall((prev) => ({ ...prev, generalNotes: notes }));
  }, []);

  const endCallSession = useCallback(() => {
    setCall(initialCallState);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  const discardCallSession = useCallback(() => {
    setCall(initialCallState);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  return (
    <ActiveCallContext.Provider
      value={{
        call,
        startCall,
        updateCall,
        setCallerCategory,
        setCallType,
        setStepIndex,
        toggleStepComplete,
        setStepNote,
        setGeneralNotes,
        endCallSession,
        discardCallSession,
      }}
    >
      {children}
    </ActiveCallContext.Provider>
  );
}

export function useActiveCall() {
  const context = useContext(ActiveCallContext);
  if (!context) {
    throw new Error("useActiveCall must be used within an ActiveCallProvider");
  }
  return context;
}
