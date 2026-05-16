import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, Copy, Archive, Pencil, FileText, Send, Eye } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  archived: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

export default function SmartFiles() {
  const [, navigate] = useLocation();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const { data: templates = [], refetch } = trpc.smartFiles.listTemplates.useQuery();

  const createMutation = trpc.smartFiles.createTemplate.useMutation({
    onSuccess: (data) => {
      refetch();
      setShowCreate(false);
      setNewName("");
      setNewDesc("");
      navigate(`/smart-files/${data.id}`);
    },
    onError: () => toast.error("Failed to create template"),
  });

  const duplicateMutation = trpc.smartFiles.duplicateTemplate.useMutation({
    onSuccess: (data) => {
      refetch();
      toast.success("Template duplicated");
      navigate(`/smart-files/${data.id}`);
    },
    onError: () => toast.error("Failed to duplicate"),
  });

  const deleteMutation = trpc.smartFiles.deleteTemplate.useMutation({
    onSuccess: () => { refetch(); toast.success("Template archived"); },
    onError: () => toast.error("Failed to archive"),
  });

  const activeTemplates = templates.filter((t) => t.status !== "archived");
  const archivedTemplates = templates.filter((t) => t.status === "archived");

  return (
    <DashboardLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Smart Files</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Build interactive documents with conditional logic, e-signatures, and payment selection.
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Smart File
          </Button>
        </div>

        {activeTemplates.length === 0 && (
          <div className="text-center py-16 border-2 border-dashed rounded-xl text-muted-foreground">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No Smart Files yet</p>
            <p className="text-sm mt-1">Create your first template to get started.</p>
            <Button className="mt-4" onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-2" /> Create Template
            </Button>
          </div>
        )}

        {activeTemplates.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeTemplates.map((t) => (
              <Card key={t.id} className="hover:shadow-md transition-shadow cursor-pointer group">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">{t.name}</CardTitle>
                      {t.description && (
                        <CardDescription className="mt-1 text-xs line-clamp-2">{t.description}</CardDescription>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 shrink-0">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/smart-files/${t.id}`)}>
                          <Pencil className="w-4 h-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/smart-files/${t.id}/assignments`)}>
                          <Send className="w-4 h-4 mr-2" /> View Assignments
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => duplicateMutation.mutate({ templateId: t.id })}>
                          <Copy className="w-4 h-4 mr-2" /> Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => deleteMutation.mutate({ templateId: t.id })}
                        >
                          <Archive className="w-4 h-4 mr-2" /> Archive
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <Badge className={STATUS_COLORS[t.status] ?? ""} variant="outline">
                      {t.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(t.updatedAt), { addSuffix: true })}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-3"
                    onClick={() => navigate(`/smart-files/${t.id}`)}
                  >
                    <Pencil className="w-3 h-3 mr-2" /> Edit Template
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {archivedTemplates.length > 0 && (
          <div className="mt-8">
            <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Archived</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 opacity-60">
              {archivedTemplates.map((t) => (
                <Card key={t.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{t.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge className={STATUS_COLORS.archived} variant="outline">archived</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Smart File Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Template Name</Label>
              <Input
                className="mt-1"
                placeholder="e.g. IEP Service Agreement"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && newName.trim() && createMutation.mutate({ name: newName.trim(), description: newDesc })}
              />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Textarea
                className="mt-1"
                placeholder="Brief description of this template..."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button
              disabled={!newName.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate({ name: newName.trim(), description: newDesc })}
            >
              {createMutation.isPending ? "Creating..." : "Create & Edit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
