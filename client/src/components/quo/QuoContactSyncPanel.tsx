import { useState } from "react";
import {
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  RotateCcw,
  Download,
  Users,
  ShieldCheck,
  GitMerge,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

type DuplicateAction = "import" | "skip" | "merge" | "create_separate";

export default function QuoContactSyncPanel() {
  const utils = trpc.useUtils();
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [decisions, setDecisions] = useState<
    Record<string, { action: DuplicateAction; targetWaypointContactId?: number }>
  >({});

  const {
    data: syncConfig,
    refetch: refetchSyncConfig,
    isLoading: configLoading,
  } = trpc.quo.getContactSyncConfig.useQuery();

  const {
    data: previewItems,
    refetch: fetchPreview,
    isFetching: previewLoading,
  } = trpc.quo.previewExistingContacts.useQuery(undefined, {
    enabled: importModalOpen,
  });

  const setAutoSyncMutation = trpc.quo.setAutoSyncContacts.useMutation({
    onSuccess: (res) => {
      toast.success(
        res.autoSyncContacts
          ? "Automatic two-way contact sync enabled"
          : "Automatic two-way contact sync paused"
      );
      refetchSyncConfig();
    },
    onError: (err) => toast.error(err.message || "Failed to update automatic sync setting"),
  });

  const syncNowMutation = trpc.quo.syncContactsNow.useMutation({
    onSuccess: (res) => {
      toast.success(
        `Sync complete: ${res.summary.createdInQuo + res.summary.updatedInQuo} pushed, ${
          res.summary.createdInWaypoint + res.summary.updatedInWaypoint
        } pulled`
      );
      refetchSyncConfig();
      utils.contacts.list.invalidate();
    },
    onError: (err) => toast.error(err.message || "Manual sync failed"),
  });

  const executeImportMutation = trpc.quo.executeImportContacts.useMutation({
    onSuccess: (res) => {
      toast.success(
        `Quo Import finished: ${res.importedCount} imported, ${res.mergedCount} merged, ${res.skippedCount} skipped`
      );
      setImportModalOpen(false);
      refetchSyncConfig();
      utils.contacts.list.invalidate();
    },
    onError: (err) => toast.error(err.message || "Failed to import Quo contacts"),
  });

  const restoreContactMutation = trpc.quo.restoreContactToQuo.useMutation({
    onSuccess: (res) => {
      if (res.success) {
        toast.success(res.message || "Contact restored to Quo");
        refetchSyncConfig();
        utils.contacts.list.invalidate();
      } else {
        toast.error(res.message || "Failed to restore contact");
      }
    },
    onError: (err) => toast.error(err.message || "Failed to restore contact"),
  });

  const resolveConflictMutation = trpc.quo.resolveContactConflict.useMutation({
    onSuccess: (res) => {
      if (res.success) {
        toast.success(res.message || "Conflict resolved");
        refetchSyncConfig();
        utils.contacts.list.invalidate();
      } else {
        toast.error(res.message || "Failed to resolve conflict");
      }
    },
    onError: (err) => toast.error(err.message || "Failed to resolve conflict"),
  });

  const handleOpenImportModal = () => {
    setImportModalOpen(true);
    fetchPreview();
  };

  const getDecisionAction = (quoContactId: string, recommendedAction: DuplicateAction): DuplicateAction => {
    return decisions[quoContactId]?.action ?? recommendedAction;
  };

  const handleRunImport = () => {
    if (!previewItems?.length) {
      toast.info("No Quo contacts to import");
      return;
    }
    const payload = previewItems.map((item) => ({
      quoContactId: item.quoContactId,
      action: getDecisionAction(item.quoContactId, item.recommendedAction),
      targetWaypointContactId: item.matchedWaypointContact?.id,
    }));
    executeImportMutation.mutate({ decisions: payload });
  };

  return (
    <Card className="border-border/70 bg-[#06172F]/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
              <RefreshCw className="h-4 w-4 text-cyan-400" />
              Two-Way Contact Synchronization
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Keep Waypoint and Quo contacts in sync automatically while protecting against accidental deletions and duplicate merges.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleOpenImportModal}
              className="gap-1.5 border-amber-500/40 text-amber-300 hover:bg-amber-950/40 text-xs"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Import Existing Quo Contacts</span>
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => syncNowMutation.mutate({})}
              disabled={syncNowMutation.isPending}
              className="gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncNowMutation.isPending ? "animate-spin" : ""}`} />
              <span>{syncNowMutation.isPending ? "Syncing..." : "Sync Now"}</span>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-1">
        {/* Auto-sync toggle + Last Sync summary bar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/60 bg-background/40">
            <div className="space-y-0.5 pr-3">
              <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <span>Automatic Two-Way Contact Sync</span>
                <Badge
                  variant="outline"
                  className={
                    syncConfig?.autoSyncContacts ?? true
                      ? "text-[10px] bg-emerald-950/30 text-emerald-400 border-emerald-800"
                      : "text-[10px] bg-slate-900 text-slate-400 border-slate-700"
                  }
                >
                  {(syncConfig?.autoSyncContacts ?? true) ? "Active" : "Paused"}
                </Badge>
              </div>
              <div className="text-[11px] text-muted-foreground">
                Automatically sync new contacts and supported field edits between Waypoint and Quo.
              </div>
            </div>
            <Switch
              checked={syncConfig?.autoSyncContacts ?? true}
              disabled={setAutoSyncMutation.isPending || configLoading}
              onCheckedChange={(checked) => setAutoSyncMutation.mutate({ enabled: checked })}
            />
          </div>

          <div className="p-3.5 rounded-xl border border-border/60 bg-background/40 flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-cyan-400" />
                Last Successful Contact Sync
              </span>
              <span className="text-xs font-mono text-cyan-300">
                {syncConfig?.lastSuccessfulContactSyncAt
                  ? new Date(syncConfig.lastSuccessfulContactSyncAt).toLocaleString()
                  : "Never run"}
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
              <span>
                Synced: <strong className="text-emerald-400">{syncConfig?.syncedContactsCount ?? 0}</strong>
              </span>
              <span>•</span>
              <span>
                Conflicts: <strong className="text-amber-400">{syncConfig?.conflicts?.length ?? 0}</strong>
              </span>
              <span>•</span>
              <span>
                Removed from Quo:{" "}
                <strong className="text-slate-300">{syncConfig?.removedFromQuo?.length ?? 0}</strong>
              </span>
              <span>•</span>
              <span>
                Errors: <strong className="text-rose-400">{syncConfig?.syncErrors?.length ?? 0}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Deletion & Duplicate Safeguards Notice */}
        <div className="p-3 rounded-lg bg-emerald-950/15 border border-emerald-800/30 text-xs text-muted-foreground flex items-start gap-2.5">
          <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="font-semibold text-foreground text-xs">
              Deletion Protection & Anti-Loop Safeguards Active
            </div>
            <div className="text-[11px]">
              Deleting a contact in Quo never deletes or archives your Waypoint contact—it marks the record{" "}
              <span className="text-slate-300 font-medium">"Removed from Quo"</span> with an optional{" "}
              <span className="text-amber-300 font-medium">"Restore to Quo"</span> action. Deleting or archiving in Waypoint never deletes in Quo. Contacts are never merged by name alone.
            </div>
          </div>
        </div>

        {/* Conflicting Edits Review Queue */}
        {syncConfig?.conflicts && syncConfig.conflicts.length > 0 && (
          <div className="space-y-2 pt-1">
            <div className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
              <span>Conflicting Edits Flagged for Review ({syncConfig.conflicts.length})</span>
            </div>
            <div className="border border-amber-500/30 rounded-xl overflow-hidden divide-y divide-border/60 bg-amber-950/10">
              {syncConfig.conflicts.map((c) => (
                <div
                  key={c.contactId}
                  className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="text-xs font-semibold text-foreground">{c.contactName}</div>
                    <div className="text-[11px] text-amber-300 mt-0.5">
                      Conflicting fields: {c.conflictingFields.join(", ")}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={resolveConflictMutation.isPending}
                      onClick={() =>
                        resolveConflictMutation.mutate({
                          contactId: c.contactId,
                          resolution: "keep_waypoint",
                        })
                      }
                      className="h-7 text-[11px] border-cyan-800/60 text-cyan-300"
                    >
                      Keep Waypoint
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={resolveConflictMutation.isPending}
                      onClick={() =>
                        resolveConflictMutation.mutate({
                          contactId: c.contactId,
                          resolution: "accept_quo",
                        })
                      }
                      className="h-7 text-[11px] border-slate-700 text-slate-200"
                    >
                      Accept Quo
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={resolveConflictMutation.isPending}
                      onClick={() =>
                        resolveConflictMutation.mutate({
                          contactId: c.contactId,
                          resolution: "merge",
                        })
                      }
                      className="h-7 text-[11px] bg-amber-600 hover:bg-amber-500 text-white gap-1"
                    >
                      <GitMerge className="h-3 w-3" />
                      <span>Merge Both</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Removed From Quo List */}
        {syncConfig?.removedFromQuo && syncConfig.removedFromQuo.length > 0 && (
          <div className="space-y-2 pt-1">
            <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <RotateCcw className="h-3.5 w-3.5 text-amber-400" />
              <span>Removed from Quo — Preserved in Waypoint ({syncConfig.removedFromQuo.length})</span>
            </div>
            <div className="border border-border/60 rounded-xl overflow-hidden divide-y divide-border/60 bg-background/40">
              {syncConfig.removedFromQuo.map((rc) => (
                <div key={rc.contactId} className="p-2.5 px-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-medium text-foreground">{rc.contactName}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {rc.phone || "No phone"} • {rc.email || "No email"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="text-[10px] bg-slate-900 text-slate-300 border-slate-700"
                    >
                      Removed from Quo
                    </Badge>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={restoreContactMutation.isPending}
                      onClick={() => restoreContactMutation.mutate({ contactId: rc.contactId })}
                      className="h-7 text-[11px] border-amber-500/40 text-amber-300 hover:bg-amber-950/40 gap-1"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Restore to Quo</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sync Errors List */}
        {syncConfig?.syncErrors && syncConfig.syncErrors.length > 0 && (
          <div className="space-y-2 pt-1">
            <div className="text-xs font-semibold text-rose-400 flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>Sync Errors ({syncConfig.syncErrors.length})</span>
            </div>
            <div className="border border-rose-900/50 rounded-xl overflow-hidden divide-y divide-border/60 bg-rose-950/10">
              {syncConfig.syncErrors.map((errItem, idx) => (
                <div key={errItem.contactId || idx} className="p-2.5 px-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-medium text-foreground">{errItem.contactName}</div>
                    <div className="text-[11px] text-rose-300">{errItem.error}</div>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-rose-950/40 text-rose-300 border-rose-800">
                    Failed
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      {/* Import Existing Quo Contacts Modal with Preview & Duplicate Review */}
      <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col bg-[#06172F] border border-border/80 text-foreground p-0 overflow-hidden">
          <DialogHeader className="p-5 pb-3 border-b border-border/60 shrink-0">
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-cyan-400" />
              Import Existing Quo Contacts
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Review existing Quo contacts before importing. Contacts with only a matching name are flagged for review and never merged automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0">
            {previewLoading ? (
              <div className="py-12 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                <RefreshCw className="h-5 w-5 animate-spin text-cyan-400" />
                <span>Scanning Quo contacts and checking for duplicates...</span>
              </div>
            ) : previewItems && previewItems.length > 0 ? (
              <>
                <div className="flex items-center justify-between gap-2 p-3 rounded-lg bg-background/50 border border-border/60 text-xs">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span>
                      Total Found: <strong>{previewItems.length}</strong>
                    </span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => fetchPreview()}
                    className="h-7 text-xs gap-1"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>Refresh</span>
                  </Button>
                </div>

                <div className="border border-border/60 rounded-xl overflow-hidden divide-y divide-border/60">
                  {previewItems.map((item) => {
                    const currentAction = getDecisionAction(item.quoContactId, item.recommendedAction);
                    return (
                      <div
                        key={item.quoContactId}
                        className="p-3.5 bg-background/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-foreground">
                              {item.fullName}
                            </span>
                            {item.company && (
                              <span className="text-[11px] text-muted-foreground">• {item.company}</span>
                            )}
                            {item.matchStatus === "already_linked" && (
                              <Badge
                                variant="outline"
                                className="text-[10px] bg-emerald-950/30 text-emerald-400 border-emerald-800"
                              >
                                Already Linked
                              </Badge>
                            )}
                            {(item.matchStatus === "duplicate_phone" || item.matchStatus === "duplicate_email") && (
                              <Badge
                                variant="outline"
                                className="text-[10px] bg-amber-950/40 text-amber-300 border-amber-700"
                              >
                                {item.reason}
                              </Badge>
                            )}
                            {item.matchStatus === "same_name_only" && (
                              <Badge
                                variant="outline"
                                className="text-[10px] bg-blue-950/40 text-blue-300 border-blue-700"
                              >
                                Same Name Only — Not Auto-Merged
                              </Badge>
                            )}
                            {item.matchStatus === "new" && (
                              <Badge
                                variant="outline"
                                className="text-[10px] bg-cyan-950/30 text-cyan-300 border-cyan-800"
                              >
                                New Contact
                              </Badge>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-3 flex-wrap">
                            <span>
                              Phones:{" "}
                              <strong className="text-slate-300">
                                {item.phones.length > 0 ? item.phones.join(", ") : "None"}
                              </strong>
                            </span>
                            <span>•</span>
                            <span>
                              Emails:{" "}
                              <strong className="text-slate-300">
                                {item.emails.length > 0 ? item.emails.join(", ") : "None"}
                              </strong>
                            </span>
                          </div>
                        </div>

                        <div className="w-full sm:w-44 shrink-0">
                          <Select
                            value={currentAction}
                            onValueChange={(val: DuplicateAction) =>
                              setDecisions((prev) => ({
                                ...prev,
                                [item.quoContactId]: {
                                  action: val,
                                  targetWaypointContactId: item.matchedWaypointContact?.id,
                                },
                              }))
                            }
                          >
                            <SelectTrigger className="h-8 text-xs bg-background/80">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="import">Import</SelectItem>
                              <SelectItem value="skip">Skip</SelectItem>
                              {item.matchedWaypointContact && (
                                <SelectItem value="merge">Merge with Existing</SelectItem>
                              )}
                              <SelectItem value="create_separate">Create Separate</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="py-12 text-center text-xs text-muted-foreground">
                No contacts found in Quo directory.
              </div>
            )}
          </div>

          <div className="p-4 border-t border-border/60 bg-background/50 flex items-center justify-between gap-3 shrink-0">
            <div className="text-[11px] text-muted-foreground">
              Multiple phone numbers and emails are preserved automatically.
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setImportModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={executeImportMutation.isPending || previewLoading}
                onClick={handleRunImport}
                className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs gap-1.5"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>
                  {executeImportMutation.isPending ? "Applying Import..." : "Confirm & Run Import"}
                </span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
