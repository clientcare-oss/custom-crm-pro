import { createContext, useContext, useState, ReactNode } from "react";

export type ProjectLabel = "Project" | "Case" | "Student" | "Matter" | "Client File" | string;

export type ProjectIconKey =
  | "GraduationCap"
  | "Briefcase"
  | "FolderOpen"
  | "BookOpen"
  | "Users"
  | "Star"
  | "Heart"
  | "Target"
  | "Compass"
  | "ClipboardList"
  | "FileText"
  | "Layers";

export const ICON_OPTIONS: { key: ProjectIconKey; label: string; emoji: string }[] = [
  { key: "GraduationCap", label: "Graduation Cap", emoji: "🎓" },
  { key: "Briefcase", label: "Briefcase", emoji: "💼" },
  { key: "FolderOpen", label: "Folder", emoji: "📂" },
  { key: "BookOpen", label: "Book", emoji: "📖" },
  { key: "Users", label: "People", emoji: "👥" },
  { key: "Star", label: "Star", emoji: "⭐" },
  { key: "Heart", label: "Heart", emoji: "❤️" },
  { key: "Target", label: "Target", emoji: "🎯" },
  { key: "Compass", label: "Compass", emoji: "🧭" },
  { key: "ClipboardList", label: "Clipboard", emoji: "📋" },
  { key: "FileText", label: "File", emoji: "📄" },
  { key: "Layers", label: "Layers", emoji: "🗂️" },
];

const PRESET_OPTIONS: { value: ProjectLabel; label: string }[] = [
  { value: "Project", label: "Project (default)" },
  { value: "Case", label: "Case" },
  { value: "Student", label: "Student" },
  { value: "Matter", label: "Matter" },
  { value: "Client File", label: "Client File" },
];

const LABEL_KEY = "crm_project_label";
const ICON_KEY = "crm_project_icon";

type TerminologyContextType = {
  projectLabel: ProjectLabel;
  projectLabelPlural: string;
  setProjectLabel: (label: ProjectLabel) => void;
  projectIconKey: ProjectIconKey;
  setProjectIconKey: (key: ProjectIconKey) => void;
  presetOptions: typeof PRESET_OPTIONS;
};

const TerminologyContext = createContext<TerminologyContextType | null>(null);

function pluralize(label: string): string {
  if (label.endsWith("s")) return label;
  if (label.endsWith("y")) return label.slice(0, -1) + "ies";
  return label + "s";
}

function readStorage(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

export function TerminologyProvider({ children }: { children: ReactNode }) {
  const [projectLabel, setProjectLabelState] = useState<ProjectLabel>(
    () => readStorage(LABEL_KEY, "Project") as ProjectLabel
  );
  const [projectIconKey, setProjectIconKeyState] = useState<ProjectIconKey>(
    () => readStorage(ICON_KEY, "GraduationCap") as ProjectIconKey
  );

  const setProjectLabel = (label: ProjectLabel) => {
    setProjectLabelState(label);
    writeStorage(LABEL_KEY, label);
  };

  const setProjectIconKey = (key: ProjectIconKey) => {
    setProjectIconKeyState(key);
    writeStorage(ICON_KEY, key);
  };

  return (
    <TerminologyContext.Provider
      value={{
        projectLabel,
        projectLabelPlural: pluralize(projectLabel),
        setProjectLabel,
        projectIconKey,
        setProjectIconKey,
        presetOptions: PRESET_OPTIONS,
      }}
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
