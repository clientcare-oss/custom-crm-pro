import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Compass, Save, Clock, ChevronDown, ChevronUp, Loader2, Users } from "lucide-react";

export default function CaseCompassAdmin() {
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [formData, setFormData] = useState({
    currentStatus: "",
    lastMeetingSummary: "",
    nextStep: "",
    whoHasBall: "",
    nextMeetingDate: "",
  });

  // List of portal clients (users with role=client)
  const { data: portalClients } = trpc.caseCompass.portalClients.useQuery();

  const { data: compass, refetch: refetchCompass } = trpc.caseCompass.get.useQuery(
    { caseId: selectedCaseId! },
    { enabled: !!selectedCaseId }
  );

  // Populate form when compass data loads or client changes
  useEffect(() => {
    if (compass) {
      setFormData({
        currentStatus: compass.currentStatus || "",
        lastMeetingSummary: compass.lastMeetingSummary || "",
        nextStep: compass.nextStep || "",
        whoHasBall: compass.whoHasBall || "",
        nextMeetingDate: compass.nextMeetingDate
          ? new Date(compass.nextMeetingDate).toISOString().slice(0, 16)
          : "",
      });
    } else if (selectedCaseId) {
      setFormData({ currentStatus: "", lastMeetingSummary: "", nextStep: "", whoHasBall: "", nextMeetingDate: "" });
    }
  }, [compass, selectedCaseId]);

  const { data: history } = trpc.caseCompass.history.useQuery(
    { caseId: selectedCaseId! },
    { enabled: !!selectedCaseId && showHistory }
  );

  const upsertMutation = trpc.caseCompass.upsert.useMutation({
    onSuccess: () => {
      toast.success("Compass updated — previous version saved to history");
      refetchCompass();
    },
    onError: (err) => {
      toast.error("Failed to update Compass: " + err.message);
    },
  });

  const handleSave = () => {
    if (!selectedCaseId) return;
    upsertMutation.mutate({
      caseId: selectedCaseId,
      currentStatus: formData.currentStatus || undefined,
      lastMeetingSummary: formData.lastMeetingSummary || undefined,
      nextStep: formData.nextStep || undefined,
      whoHasBall: formData.whoHasBall || undefined,
      nextMeetingDate: formData.nextMeetingDate ? new Date(formData.nextMeetingDate) : null,
    });
  };

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
          <Compass className="h-5 w-5 text-accent" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Case Compass™ Admin</h1>
          <p className="text-sm text-muted-foreground">Edit the Compass from the student's detail page instead</p>
        </div>
      </div>

      {/* Client selector */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">Select Portal Client</span>
        </div>
        <select
          className="w-full border rounded-md px-3 py-2 text-sm bg-background"
          value={selectedCaseId ?? ""}
          onChange={(e) => setSelectedCaseId(e.target.value || null)}
        >
          <option value="">— Choose a client —</option>
          {portalClients?.map((c) => (
            <option key={c.id} value={String(c.id)}>
              {c.name || c.email || `User #${c.id}`}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground mt-2">
          Tip: Edit the Compass directly from the student's detail page for the best experience.
        </p>
      </Card>

      {selectedCaseId && (
        <>
          {/* Form */}
          <Card className="p-6 space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Current Status</label>
              <Textarea
                placeholder="Brief snapshot of where the case stands right now..."
                value={formData.currentStatus}
                onChange={(e) => setFormData({ ...formData, currentStatus: e.target.value })}
                rows={2}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Summary of Last Meeting</label>
              <Textarea
                placeholder="Key takeaways, decisions made, concerns raised..."
                value={formData.lastMeetingSummary}
                onChange={(e) => setFormData({ ...formData, lastMeetingSummary: e.target.value })}
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Next Step</label>
              <Textarea
                placeholder="The next action needed to move the case forward..."
                value={formData.nextStep}
                onChange={(e) => setFormData({ ...formData, nextStep: e.target.value })}
                rows={2}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Who Has the Ball</label>
              <Textarea
                placeholder="Parent / School / District / Evaluator / State / Waypoint (comma-separated)"
                value={formData.whoHasBall}
                onChange={(e) => setFormData({ ...formData, whoHasBall: e.target.value })}
                rows={2}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Next Meeting Date</label>
              <Input
                type="datetime-local"
                value={formData.nextMeetingDate}
                onChange={(e) => setFormData({ ...formData, nextMeetingDate: e.target.value })}
              />
            </div>
            <Button onClick={handleSave} disabled={upsertMutation.isPending} className="w-full">
              {upsertMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
              ) : (
                <><Save className="h-4 w-4 mr-2" /> Save Compass</>
              )}
            </Button>
          </Card>

          {/* History */}
          <Card className="p-4">
            <button
              className="flex items-center gap-2 w-full text-left"
              onClick={() => setShowHistory(!showHistory)}
            >
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">View History</span>
              {showHistory ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
            </button>
            {showHistory && (
              <div className="mt-4 space-y-3">
                {!history ? (
                  <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
                ) : history.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No history yet.</p>
                ) : (
                  history.map((h) => (
                    <div key={h.id} className="border rounded-md p-3 text-sm space-y-1">
                      <p className="text-xs text-muted-foreground font-medium">
                        {new Date(h.savedAt).toLocaleString()}
                      </p>
                      {h.currentStatus && <p><span className="font-medium">Status:</span> {h.currentStatus}</p>}
                      {h.nextStep && <p><span className="font-medium">Next Step:</span> {h.nextStep}</p>}
                      {h.whoHasBall && <p><span className="font-medium">Ball:</span> {h.whoHasBall}</p>}
                    </div>
                  ))
                )}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
