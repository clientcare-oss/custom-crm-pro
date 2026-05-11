import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { FileText, Plus, CheckCircle, Clock, XCircle } from "lucide-react";
import VoiceTextarea from "@/components/VoiceTextarea";
import { useState } from "react";
import { toast } from "sonner";

interface Contract {
  id: number;
  ownerId: number;
  clientId: number | null;
  projectId: number | null;
  title: string;
  content: string;
  status: string;
  signedDate: Date | null;
  expiryDate: Date | null;
  signatureUrl: string | null;
  signatureKey: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export default function Contracts() {
  const [showCreate, setShowCreate] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [formData, setFormData] = useState({
    clientId: "",
    title: "",
    content: "",
  });

  const { data: contracts = [], refetch } = trpc.contracts.list.useQuery();
  const { data: contacts = [] } = trpc.contacts.list.useQuery();

  const createMutation = trpc.contracts.create.useMutation({
    onSuccess: () => {
      toast.success("Contract created!");
      setShowCreate(false);
      setFormData({ clientId: "", title: "", content: "" });
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.contracts.update.useMutation({
    onSuccess: () => {
      toast.success("Contract updated!");
      setEditingContract(null);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleCreate = () => {
    if (!formData.clientId || !formData.title) {
      toast.error("Please fill in all required fields");
      return;
    }
    createMutation.mutate({
      clientId: parseInt(formData.clientId),
      title: formData.title,
      content: formData.content || "",
    });
  };

  const handleStatusChange = (id: number, status: string) => {
    updateMutation.mutate({ id, status: status as "Draft" | "Sent" | "Signed" | "Cancelled" });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Draft": return <Clock className="h-4 w-4 text-gray-500" />;
      case "Sent": return <FileText className="h-4 w-4 text-blue-500" />;
      case "Signed": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "Cancelled": return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Draft": return "bg-gray-100 text-gray-800";
      case "Sent": return "bg-blue-100 text-blue-800";
      case "Signed": return "bg-green-100 text-green-800";
      case "Cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const draftContracts = contracts.filter((c: Contract) => c.status === "Draft");
  const sentContracts = contracts.filter((c: Contract) => c.status === "Sent");
  const signedContracts = contracts.filter((c: Contract) => c.status === "Signed");

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contracts & Proposals</h1>
          <p className="text-muted-foreground">Create, send, and track contracts with clients</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Contract
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Contract</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium">Client *</label>
                <Select value={formData.clientId} onValueChange={(v) => setFormData({ ...formData, clientId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {contacts.map((c: any) => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.firstName} {c.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="e.g., Service Agreement - IEP Advocacy"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Contract Content</label>
                <VoiceTextarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[200px] font-mono"
                  placeholder="Enter contract terms, pricing, and conditions..."
                />
              </div>
              <Button onClick={handleCreate} className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Contract"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gray-50 flex items-center justify-center">
                <Clock className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{draftContracts.length}</p>
                <p className="text-sm text-muted-foreground">Drafts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{sentContracts.length}</p>
                <p className="text-sm text-muted-foreground">Awaiting Signature</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{signedContracts.length}</p>
                <p className="text-sm text-muted-foreground">Signed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contracts List */}
      <Card>
        <CardHeader>
          <CardTitle>All Contracts</CardTitle>
        </CardHeader>
        <CardContent>
          {contracts.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No contracts yet. Create your first contract above.</p>
          ) : (
            <div className="space-y-3">
              {contracts.map((contract: Contract) => (
                <div key={contract.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-4">
                    {getStatusIcon(contract.status)}
                    <div>
                      <p className="font-medium">{contract.title}</p>
                      <p className="text-sm text-muted-foreground">
                        Created {new Date(contract.createdAt).toLocaleDateString()}
                        {contract.signedDate && ` · Signed ${new Date(contract.signedDate).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(contract.status)}`}>
                      {contract.status}
                    </span>
                    <Select
                      value={contract.status}
                      onValueChange={(v) => handleStatusChange(contract.id, v)}
                    >
                      <SelectTrigger className="w-[120px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Draft">Draft</SelectItem>
                        <SelectItem value="Sent">Sent</SelectItem>
                        <SelectItem value="Signed">Signed</SelectItem>
                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
