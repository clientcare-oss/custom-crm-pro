import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Compass, Save, Clock, ChevronDown, ChevronUp, Loader2, Users } from "lucide-react";

export default function CaseCompassAdmin() {
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
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
    { clientId: selectedClientId! },
    { enabled: !!selectedClientId }
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
    } else if (selectedClientId) {
      setFormData({ currentStatus: "", lastMeetingSummary: "", nextStep: "", whoHasBall: "", nextMeetingDate: "" });
    }
  }, [compass, selectedClientId]);

  const { data: history } = trpc.caseCompass.history.useQuery(
    { clientId: selectedClientId! },
    { enabled: !!selectedClientId && showHistory }
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
    if (!selectedClientId) return;
    upsertMutation.mutate({
      clientId: selectedClientId,
      currentStatus: formData.currentStatus || undefined,
      lastMeetingSummary: formData.lastMeetingSummary || undefined,
      nextStep: formData.nextStep || undefined,
      whoHasBall: formData.whoHasBall || undefined,
      nextMeetingDate: formData.nextMeetingDate ? new Date(formData.nextMeetingDate) : null,
    });
  };

  const selectedClient = portalClients?.find((c) => c.id === selectedClientId);

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
          <Compass className="h-5 w-5 text-accent" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Case Compass™</h1>
          <p className="text-muted-foreground text-sm">
            Update each client's case status card — changes are auto-saved to history
          </p>
        </div>
      </div>

      {!selectedClientId ? (
        /* Portal client selector */
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Select a Portal Client</h2>
          <p className="text-sm text-muted-foreground">
            Only clients who have logged into the portal appear here.
          </p>
          {portalClients && portalClients.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {portalClients.map((client) => (
                <Card
                  key={client.id}
                  onClick={() => setSelectedClientId(client.id)}
                  className="cursor-pointer rounded-lg border border-border bg-card p-5 shadow-sm hover:shadow-md hover:border-accent/50 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent font-bold text-sm flex-shrink-0">
                      {client.name ? client.name.charAt(0).toUpperCase() : "?"}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{client.name || "Unnamed Client"}</p>
                      {client.email && (
                        <p className="text-xs text-muted-foreground">{client.email}</p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 p-12 text-center">
              <Users className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="font-semibold text-foreground">No portal clients yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Clients need to log into the portal before you can set their Compass.
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Compass editor */
        <div className="space-y-6">
          {/* Back + client name */}
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              variant="outline"
              onClick={() => { setSelectedClientId(null); setShowHistory(false); }}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold"
            >
              <ArrowLeft className="h-4 w-4" />
              All Clients
            </Button>
            <span className="text-lg font-semibold text-foreground">
              {selectedClient?.name || "Client"}
            </span>
            {compass?.updatedAt && (
              <span className="ml-auto text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Last updated {new Date(compass.updatedAt).toLocaleDateString()}
              </span>
            )}
          </div>

          {/* Edit form */}
          <Card className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <label className="block text-sm font-semibold text-foreground">Current Status</label>
                <Textarea
                  rows={2}
                  value={formData.currentStatus}
                  onChange={(e) => setFormData({ ...formData, currentStatus: e.target.value })}
                  placeholder="Brief snapshot of where the case stands right now..."
                  className="resize-none"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="block text-sm font-semibold text-foreground">Summary of Last Meeting</label>
                <Textarea
                  rows={3}
                  value={formData.lastMeetingSummary}
                  onChange={(e) => setFormData({ ...formData, lastMeetingSummary: e.target.value })}
                  placeholder="Key takeaways, decisions made, concerns raised..."
                  className="resize-none"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="block text-sm font-semibold text-foreground">Next Step</label>
                <Textarea
                  rows={2}
                  value={formData.nextStep}
                  onChange={(e) => setFormData({ ...formData, nextStep: e.target.value })}
                  placeholder="The next action needed to move the case forward..."
                  className="resize-none"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="block text-sm font-semibold text-foreground">Who Has the Ball</label>
                <Input
                  value={formData.whoHasBall}
                  onChange={(e) => setFormData({ ...formData, whoHasBall: e.target.value })}
                  placeholder="e.g. School (update IEP goals), Parent (sign consent), Waypoint (review draft)"
                />
                <p className="text-xs text-muted-foreground">
                  List all parties with open action items, separated by commas. AI will populate this from meeting transcripts in a future update.
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-foreground">Next Meeting Date</label>
                <Input
                  type="datetime-local"
                  value={formData.nextMeetingDate}
                  onChange={(e) => setFormData({ ...formData, nextMeetingDate: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                onClick={handleSave}
                disabled={upsertMutation.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2 font-semibold text-accent-foreground shadow-sm hover:shadow-md disabled:opacity-50"
              >
                {upsertMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Compass
              </Button>
            </div>
          </Card>

          {/* History toggle */}
          <div>
            <Button
              variant="outline"
              onClick={() => setShowHistory(!showHistory)}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold"
            >
              <Clock className="h-4 w-4" />
              {showHistory ? "Hide" : "View"} History
              {showHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>

            {showHistory && (
              <div className="mt-4 space-y-3">
                {history && history.length > 0 ? (
                  history.map((entry) => (
                    <Card key={entry.id} className="rounded-lg border border-border bg-muted/30 p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Snapshot</span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(entry.savedAt).toLocaleString()}
                        </span>
                      </div>
                      {entry.currentStatus && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground">Status</p>
                          <p className="text-sm text-foreground">{entry.currentStatus}</p>
                        </div>
                      )}
                      {entry.lastMeetingSummary && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground">Last Meeting</p>
                          <p className="text-sm text-foreground">{entry.lastMeetingSummary}</p>
                        </div>
                      )}
                      {entry.nextStep && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground">Next Step</p>
                          <p className="text-sm text-foreground">{entry.nextStep}</p>
                        </div>
                      )}
                      {entry.whoHasBall && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground">Who Had the Ball</p>
                          <p className="text-sm text-foreground">{entry.whoHasBall}</p>
                        </div>
                      )}
                    </Card>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No history yet — history is saved automatically each time you update the Compass.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
