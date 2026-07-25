import { createContext, useContext } from "react";
import type { RailSectionKey } from "@shared/complaintEngine";

export interface WorkspaceContextType {
  caseDbId: number;
  section: RailSectionKey;
  goTo: (section: RailSectionKey) => void;
}

export const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspace must be used within a WorkspaceContext.Provider");
  }
  return ctx;
}
