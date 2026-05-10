import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Sparkles, Brain, Zap, Search, FileText, BookOpen, ClipboardList,
  Target, AlertCircle, CheckCircle, Star, MessageSquare, Layers, Compass,
  ListTodo, Loader2, Copy, ChevronDown, ChevronUp
} from "lucide-react";

// Icon map matching AiConnections.tsx
const ICON_MAP: Record<string, React.ElementType> = {
  Sparkles, Brain, Zap, Search, FileText, BookOpen, ClipboardList,
  Target, AlertCircle, CheckCircle, Star, MessageSquare, Layers, Compass, ListTodo,
};

// Color map
const COLOR_MAP: Record<string, { bg: string; text: string; border: string; hoverBg: string }> = {
  blue:   { bg: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-300",   hoverBg: "hover:bg-blue-100" },
  purple: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-300", hoverBg: "hover:bg-purple-100" },
  green:  { bg: "bg-green-50",  text: "text-green-700",  border: "border-green-300",  hoverBg: "hover:bg-green-100" },
  orange: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-300", hoverBg: "hover:bg-orange-100" },
  red:    { bg: "bg-red-50",    text: "text-red-700",    border: "border-red-300",    hoverBg: "hover:bg-red-100" },
  teal:   { bg: "bg-teal-50",   text: "text-teal-700",   border: "border-teal-300",   hoverBg: "hover:bg-teal-100" },
  pink:   { bg: "bg-pink-50",   text: "text-pink-700",   border: "border-pink-300",   hoverBg: "hover:bg-pink-100" },
  indigo: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-300", hoverBg: "hover:bg-indigo-100" },
};

function getColors(colorName: string) {
  return COLOR_MAP[colorName] || COLOR_MAP.blue;
}

interface AiButtonRunnerProps {
  /** The current student contact ID */
  contactId: number;
  /** The current project ID (optional) */
  projectId?: number;
  /** Which tab location to filter buttons for */
  location: "notes" | "compass" | "files" | "tasks" | "details" | "any";
  /** Student's name for prompt injection */
  studentName?: string;
  /** Case ID for prompt injection */
  caseId?: string;
  /** Compass content for prompt injection */
  compassContent?: string;
  /** Current note content for prompt injection */
  noteContent?: string;
  /** Callback when output should be saved as a note */
  onSaveAsNote?: (content: string, title: string) => void;
  /** Callback when output should update compass */
  onUpdateCompass?: (content: string) => void;
}

export default function AiButtonRunner({
  contactId,
  projectId,
  location,
  studentName,
  caseId,
  compassContent,
  noteContent,
  onSaveAsNote,
  onUpdateCompass,
}: AiButtonRunnerProps) {
  const utils = trpc.useUtils();

  // Fetch AI connections for this location
  const { data: allConnections = [] } = trpc.aiConnections.list.useQuery();
  const connections = allConnections.filter(
    (c: any) => c.isActive && (c.location === location || c.location === "any")
  );

  const runMutation = trpc.aiConnections.run.useMutation({
    onSuccess: (data) => {
      setRunResult(data.outputText);
      setRunningId(null);
    },
    onError: (e) => {
      toast.error("AI error: " + e.message);
      setRunningId(null);
    },
  });

  const createNoteMutation = trpc.notes.create.useMutation({
    onSuccess: () => {
      utils.notes.list.invalidate();
      toast.success("AI result saved as a note");
    },
    onError: (e) => toast.error("Failed to save note: " + e.message),
  });

  const updateCompassMutation = trpc.caseCompass.upsert.useMutation({
    onSuccess: () => {
      toast.success("Compass updated with AI result");
    },
    onError: (e: any) => toast.error("Failed to update compass: " + e.message),
  });

  const [runningId, setRunningId] = useState<number | null>(null);
  const [runResult, setRunResult] = useState<string | null>(null);
  const [activeConnection, setActiveConnection] = useState<any | null>(null);
  const [extraContext, setExtraContext] = useState("");
  const [showExtraContext, setShowExtraContext] = useState(false);
  const [resultDialogOpen, setResultDialogOpen] = useState(false);

  if (connections.length === 0) return null;

  const handleRun = async (conn: any) => {
    setRunningId(conn.id);
    setActiveConnection(conn);
    setRunResult(null);
    setResultDialogOpen(true);

    runMutation.mutate({
      connectionId: conn.id,
      contactId,
      projectId,
      contextData: {
        studentName,
        caseId,
        compassContent,
        noteContent,
        extraContext,
      },
    });
  };

  const handleSaveResult = () => {
    if (!runResult || !activeConnection) return;

    if (activeConnection.outputTarget === "note" && projectId) {
      if (onSaveAsNote) {
        onSaveAsNote(runResult, `AI: ${activeConnection.name}`);
      } else {
        createNoteMutation.mutate({
          projectId,
          title: `AI: ${activeConnection.name}`,
          content: runResult,
          isVisibleToClient: false,
        });
      }
      } else if (activeConnection.outputTarget === "compass") {
      if (onUpdateCompass) {
        onUpdateCompass(runResult);
      } else if (caseId) {
        updateCompassMutation.mutate({
          caseId,
          currentStatus: runResult,
        });
      }
    }
    setResultDialogOpen(false);
  };

  const handleCopyResult = () => {
    if (runResult) {
      navigator.clipboard.writeText(runResult);
      toast.success("Copied to clipboard");
    }
  };

  return (
    <>
      {/* AI Buttons Bar */}
      <div className="flex flex-wrap gap-2 py-2">
        {connections.map((conn: any) => {
          const IconComp = ICON_MAP[conn.icon] || Sparkles;
          const colors = getColors(conn.color);
          const isRunning = runningId === conn.id;

          return (
            <button
              key={conn.id}
              onClick={() => handleRun(conn)}
              disabled={runningId !== null}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all disabled:opacity-60 disabled:cursor-not-allowed ${colors.bg} ${colors.text} ${colors.border} ${colors.hoverBg}`}
              title={conn.description || conn.name}
            >
              {isRunning ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <IconComp className="h-3.5 w-3.5" />
              )}
              {conn.name}
            </button>
          );
        })}
      </div>

      {/* Result Dialog */}
      <Dialog open={resultDialogOpen} onOpenChange={(open) => {
        if (!open && runningId === null) {
          setResultDialogOpen(false);
          setRunResult(null);
          setActiveConnection(null);
          setExtraContext("");
          setShowExtraContext(false);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {activeConnection && (() => {
                const IconComp = ICON_MAP[activeConnection.icon] || Sparkles;
                const colors = getColors(activeConnection.color);
                return (
                  <>
                    <span className={`p-1 rounded ${colors.bg} ${colors.text}`}>
                      <IconComp className="h-4 w-4" />
                    </span>
                    {activeConnection.name}
                  </>
                );
              })()}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Extra Context (collapsible) */}
            <div>
              <button
                type="button"
                onClick={() => setShowExtraContext(v => !v)}
                className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground transition-colors"
              >
                {showExtraContext ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {showExtraContext ? "Hide" : "Add"} extra context for this run
              </button>
              {showExtraContext && (
                <div className="mt-2 space-y-1">
                  <Label className="text-xs">Extra Context</Label>
                  <Textarea
                    placeholder="Add any additional context, specific questions, or notes to include in this AI run..."
                    value={extraContext}
                    onChange={e => setExtraContext(e.target.value)}
                    className="text-sm min-h-[80px]"
                  />
                </div>
              )}
            </div>

            {/* Result Area */}
            {runningId !== null && !runResult ? (
              <div className="flex items-center justify-center py-12 gap-3 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Running AI analysis for {studentName || "student"}...</span>
              </div>
            ) : runResult ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">AI Result</Label>
                  <button
                    onClick={handleCopyResult}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                  >
                    <Copy className="h-3 w-3" />
                    Copy
                  </button>
                </div>
                <div className="bg-muted/40 rounded-lg p-4 border whitespace-pre-wrap text-sm leading-relaxed max-h-[400px] overflow-y-auto">
                  {runResult}
                </div>
                {activeConnection?.outputTarget && activeConnection.outputTarget !== "popup" && (
                  <p className="text-xs text-muted-foreground">
                    {activeConnection.outputTarget === "note"
                      ? "This result can be saved as a private note on this student."
                      : "This result can be used to update the student's Compass."}
                  </p>
                )}
              </div>
            ) : null}
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setResultDialogOpen(false);
                setRunResult(null);
                setActiveConnection(null);
                setExtraContext("");
                setShowExtraContext(false);
              }}
            >
              Close
            </Button>
            {runResult && activeConnection?.outputTarget !== "popup" && (
              <Button onClick={handleSaveResult}>
                {activeConnection?.outputTarget === "note" ? "Save as Note" : "Update Compass"}
              </Button>
            )}
            {runResult && (
              <Button
                variant="outline"
                onClick={() => {
                  // Re-run with same context
                  setRunResult(null);
                  handleRun(activeConnection);
                }}
              >
                Re-run
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
