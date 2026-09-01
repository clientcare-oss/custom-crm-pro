import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckSquare, Image as ImageIcon, Loader2 } from "lucide-react";
import { BrainItem } from "./types";

export default function BrainDumpConvertToTaskDialog({
  item,
  open,
  onClose,
}: {
  item: BrainItem | null;
  open: boolean;
  onClose: () => void;
}) {
  const [selectedAssignee, setSelectedAssignee] = useState<string>("");
  const { data: teamUsers = [] } = trpc.internalTasks.getTeamUsers.useQuery();
  const { data: itemImages = [] } = trpc.brainDumpImages.listByItem.useQuery(
    { brainDumpItemId: item?.id ?? 0 },
    { enabled: !!item && open, refetchOnWindowFocus: false }
  );

  const createTaskMutation = trpc.internalTasks.create.useMutation({
    onSuccess: () => {
      toast.success("Task created from brain dump item!");
      onClose();
      setSelectedAssignee("");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleConvert = async () => {
    if (!item) return;
    if (!selectedAssignee) {
      toast.error("Please select an assignee");
      return;
    }

    let assigneeId: number | null = null;
    let assigneeContactId: number | null = null;

    if (selectedAssignee === "__none__") {
      // Unassigned
    } else if (selectedAssignee.startsWith("user-")) {
      assigneeId = parseInt(selectedAssignee.substring(5));
    } else if (selectedAssignee.startsWith("contact-")) {
      assigneeContactId = parseInt(selectedAssignee.substring(8));
    }

    // Build resources from attached images
    const resources = (itemImages as { id: number; imageUrl: string }[]).map((img) => ({
      label: "image",
      url: img.imageUrl,
    }));

    await createTaskMutation.mutateAsync({
      title: item.title,
      description: item.body || undefined,
      assigneeId: assigneeId || undefined,
      assigneeContactId: assigneeContactId || undefined,
      resources: resources.length > 0 ? JSON.stringify(resources) : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader className="pb-1 border-b border-border/60">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <div className="p-1 rounded-md bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <CheckSquare className="h-4 w-4" />
            </div>
            Convert Idea to Task
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2 text-sm">
          <div>
            <span className="text-xs font-semibold text-muted-foreground block mb-1">Task Title</span>
            <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60 text-sm font-medium text-foreground">
              {item?.title}
            </div>
          </div>

          {item?.body && (
            <div>
              <span className="text-xs font-semibold text-muted-foreground block mb-1">Description</span>
              <p className="text-xs text-muted-foreground line-clamp-3 bg-muted/20 p-2 rounded border border-border/40">
                {item.body}
              </p>
            </div>
          )}

          {itemImages.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                <ImageIcon className="h-3.5 w-3.5 text-blue-500" />
                {itemImages.length} image{itemImages.length > 1 ? "s" : ""} will attach to the task
              </p>
              <div className="flex gap-1.5 flex-wrap">
                {(itemImages as { id: number; imageUrl: string }[]).map((img) => (
                  <div key={img.id} className="w-10 h-10 rounded-md overflow-hidden border border-border shadow-2xs">
                    <img src={img.imageUrl} alt="img" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">Assign to</label>
            <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Select assignee…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" className="text-xs">
                  Unassigned
                </SelectItem>
                {teamUsers.length > 0 && (
                  <>
                    <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Staff
                    </div>
                    {teamUsers.map((user: any) => (
                      <SelectItem key={user.id} value={`user-${user.id}`} className="text-xs">
                        {user.name}
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 justify-end pt-3 border-t border-border/60">
            <Button variant="ghost" size="sm" onClick={onClose} className="text-xs h-8">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConvert}
              disabled={createTaskMutation.isPending || !selectedAssignee}
              className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              {createTaskMutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Converting…
                </>
              ) : (
                "Create Task"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
