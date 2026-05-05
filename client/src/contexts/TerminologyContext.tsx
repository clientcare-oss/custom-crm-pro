import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type ProjectLabel = "Project" | "Case" | "Student" | "Matter" | "Client File" | string;

const PRESET_OPTIONS: { value: ProjectLabel; label: string }[] = [
  { value: "Project", label: "Project (default)" },
  { value: "Case", label: "Case" },
  { value: "Student", label: "Student" },
  { value: "Matter", label: "Matter" },
  { value: "Client File", label: "Client File" },
];

const STORAGE_KEY = "crm_project_label";

type TerminologyContextType = {
  projectLabel: ProjectLabel;
  projectLabelPlural: string;
  setProjectLabel: (label: ProjectLabel) => void;
  presetOptions: typeof PRESET_OPTIONS;
};

const TerminologyContext = createContext<TerminologyContextType | null>(null);

function pluralize(label: string): string {
  if (label.endsWith("s")) return label;
  if (label.endsWith("y")) return label.slice(0, -1) + "ies";
  return label + "s";
}

export function TerminologyProvider({ children }: { children: ReactNode }) {
  const [projectLabel, setProjectLabelState] = useState<ProjectLabel>(() => {
    try {
      return (localStorage.getItem(STORAGE_KEY) as ProjectLabel) || "Project";
    } catch {
      return "Project";
    }
  });

  const setProjectLabel = (label: ProjectLabel) => {
    setProjectLabelState(label);
    try {
      localStorage.setItem(STORAGE_KEY, label);
    } catch {
      // ignore
    }
  };

  const projectLabelPlural = pluralize(projectLabel);

  return (
    <TerminologyContext.Provider
      value={{ projectLabel, projectLabelPlural, setProjectLabel, presetOptions: PRESET_OPTIONS }}
    >
      {children}
    </TerminologyContext.Provider>
  );
}

export function useTerminology() {
  const ctx = useContext(TerminologyContext);
  if (!ctx) throw new Error("useTerminology must be used within TerminologyProvider");
  return ctx;
}
