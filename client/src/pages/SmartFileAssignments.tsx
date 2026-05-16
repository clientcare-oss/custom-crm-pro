import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, Plus, Send, Eye, CheckCircle, Clock, FileText, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  pending:   "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  viewed:    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  signed:    "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
};

export default function SmartFileAssignments() {
  const { id } = useParams<{ id: string }>();
  const templateId = Number(id);
  const [, navigate] = useLocation();

  const [showSend, setShowSend] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string>("");
  const [dueDate, setDueDate] = useState("");

  const { data: template } = trpc.smartFiles.getTemplate.useQuery({ templateId });
  const { data: allAssignments = [], refetch } = trpc.smartFiles.listAssignments.useQuery(undefined);
  const assignments = allAssignments.filter((a: any) => a.assignment.templateId === templateId);
  const { data: contacts = [] } = trpc.contacts.list.useQuery();

  const sendMutation = trpc.smartFiles.assignToClient.useMutation({
    onSuccess: () => {
      refetch();
      setShowSend(false);
      setSelectedContactId("");
      setDueDate("");
      toast.success("Smart File sent to client");
    },
    onError: () => toast.error("Failed to send"),
  });

  const parentContacts = contacts.filter((c: any) => c.type === "parent" || c.type === "contact");

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/smart-files/${templateId}`)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{template?.name ?? "Smart File"} — Assignments</h1>
            <p className="text-sm text-muted-foreground">Send this file to clients and track completion.</p>
          </div>
          <Button onClick={() => setShowSend(true)}>
            <Send className="w-4 h-4 mr-2" /> Send to Client
          </Button>
        </div>

        {assignments.length === 0 && (
          <div className="text-center py-16 border-2 border-dashed rounded-xl text-muted-foreground">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No assignments yet</p>
            <p className="text-sm mt-1">Send this Smart File to a client to get started.</p>
            <Button className="mt-4" onClick={() => setShowSend(true)}>
              <Send className="w-4 h-4 mr-2" /> Send to Client
            </Button>
          </div>
        )}

        <div className="space-y-3">
          {assignments.map((a: any) => (
            <Card key={a.id}>
              <CardContent className="flex items-center gap-4 py-4">
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{a.contactName ?? `Contact #${a.contactId}`}</p>
                  <p className="text-xs text-muted-foreground">
                    Sent {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                    {a.dueDate ? ` · Due ${new Date(a.dueDate).toLocaleDateString()}` : ""}
                  </p>
                </div>
                <Badge className={STATUS_COLORS[a.status] ?? ""} variant="outline">
                  {a.status}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/smart-files/response/${a.id}`)}
                >
                  <Eye className="w-3 h-3 mr-2" /> View
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Send Dialog */}
      <Dialog open={showSend} onOpenChange={setShowSend}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Smart File to Client</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Select Client (Parent)</Label>
              <Select value={selectedContactId} onValueChange={setSelectedContactId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Choose a contact..." />
                </SelectTrigger>
                <SelectContent>
                  {parentContacts.map((c: any) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name} {c.email ? `· ${c.email}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Due Date (optional)</Label>
              <Input className="mt-1" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSend(false)}>Cancel</Button>
            <Button
              disabled={!selectedContactId || sendMutation.isPending}
              onClick={() => sendMutation.mutate({
                templateId,
                contactId: Number(selectedContactId),
                dueDate: dueDate || undefined,
                sendNow: true,
              })}
            >
              {sendMutation.isPending ? "Sending..." : "Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
