import { useWorkspace } from "../workspaceContext";

export function SectionOverview() {
  const { caseDbId } = useWorkspace();
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-slate-100">Case Overview</h2>
      <p className="mt-2 text-sm text-slate-400">Case ID: {caseDbId}</p>
      <p className="mt-4 text-slate-300">Welcome to the State Complaint Builder. Use the sections on the left to build your Georgia IDEA state complaint.</p>
    </div>
  );
}
