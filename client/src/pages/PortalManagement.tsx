import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  Compass, 
  Search, 
  Key, 
  UserCheck, 
  UserMinus,
  ExternalLink, 
  Laptop, 
  Smartphone, 
  Tablet, 
  Loader2, 
  Eye, 
  Check, 
  Copy,
  Info
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import ScopedErrorBoundary from "@/components/ScopedErrorBoundary";

type ViewMode = "desktop" | "tablet" | "mobile";

export default function PortalManagement() {
  const { user } = useAuth();
  
  // States
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [provisionOpen, setProvisionOpen] = useState(false);
  const [provisioningContact, setProvisioningContact] = useState<any>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("desktop");
  const [customPassword, setCustomPassword] = useState("TestParent2026!");
  const [copyingLink, setCopyingLink] = useState(false);

  // Queries
  const { data: contacts, isLoading: loadingContacts, refetch: refetchContacts } = 
    trpc.contacts.list.useQuery(undefined, {
      enabled: user?.role === "admin",
    });

  // Mutations
  const provisionMutation = trpc.portalProvisioning.provisionPortalAccess.useMutation({
    onSuccess: (data) => {
      toast.success("Client Portal successfully provisioned!");
      setProvisionOpen(false);
      refetchContacts();
      // Auto-select the newly provisioned contact to show preview
      const updatedContact = contacts?.find(c => c.id === data.contactId);
      if (updatedContact) {
        setSelectedContact({ ...updatedContact, portalUserId: data.portalUserId });
      }
    },
    onError: (err) => {
      toast.error(`Provisioning failed: ${err.message}`);
    }
  });

  const handleOpenProvision = (contact: any) => {
    setProvisioningContact(contact);
    setCustomPassword(`WP-${contact.lastName}-${Math.floor(1000 + Math.random() * 9000)}!`);
    setProvisionOpen(true);
  };

  const handleConfirmProvision = () => {
    if (!provisioningContact) return;
    
    provisionMutation.mutate({
      contactId: provisioningContact.id,
      email: provisioningContact.email || "",
      password: customPassword,
      skipEmailVerification: true,
    });
  };

  const handleCopyPortalLink = (contact: any) => {
    setCopyingLink(true);
    const origin = window.location.origin;
    const link = `${origin}/portal`;
    navigator.clipboard.writeText(link);
    toast.success("Portal link copied to clipboard!");
    setTimeout(() => setCopyingLink(false), 1000);
  };

  // Filtered contact list
  const filteredContacts = contacts?.filter((c) => {
    const fullName = `${c.firstName || ""} ${c.lastName || ""}`.toLowerCase();
    const email = (c.email || "").toLowerCase();
    const query = searchTerm.toLowerCase();
    return fullName.includes(query) || email.includes(query);
  });

  const getViewportWidth = () => {
    switch (viewMode) {
      case "mobile":
        return "max-w-[375px]";
      case "tablet":
        return "max-w-[768px]";
      case "desktop":
      default:
        return "w-full";
    }
  };

  if (user?.role !== "admin") {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Card className="max-w-md border-destructive/20 bg-destructive/5 text-center">
          <CardHeader>
            <CardTitle className="text-destructive">Access Restricted</CardTitle>
            <CardDescription>
              Only administrator accounts are permitted to manage the Client Portal.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <ScopedErrorBoundary>
      <div className="flex flex-col gap-6 p-6 h-full max-w-[1600px] mx-auto">
        {/* Top Header Row */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/40 pb-5">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Client Portal Cockpit
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage parent accounts, provision secure logins, and preview the client experience.
            </p>
          </div>
          <Button
            onClick={() => window.open("/portal", "_blank")}
            variant="outline"
            className="flex items-center gap-2 hover:bg-muted"
          >
            <ExternalLink className="h-4 w-4" />
            Open Portal Page
          </Button>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Client Directory */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <Card className="shadow-lg border-border/60 overflow-hidden">
              <CardHeader className="bg-muted/15 pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-primary" />
                  Client & Parent Directory
                </CardTitle>
                <CardDescription>
                  List of contacts and their portal authorization status.
                </CardDescription>
                <div className="relative mt-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 bg-background/80"
                  />
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {loadingContacts ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span>Retrieving directory...</span>
                  </div>
                ) : filteredContacts && filteredContacts.length > 0 ? (
                  <div className="divide-y divide-border max-h-[60vh] overflow-y-auto">
                    {filteredContacts.map((contact) => {
                      const isSelected = selectedContact?.id === contact.id;
                      const hasAccess = Boolean(contact.portalUserId);

                      return (
                        <div
                          key={contact.id}
                          onClick={() => setSelectedContact(contact)}
                          className={`flex items-center justify-between p-4 cursor-pointer transition-all duration-200 hover:bg-muted/30 ${
                            isSelected ? "bg-primary/5 border-l-4 border-primary" : ""
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-primary/10 to-primary/20 flex items-center justify-center font-bold text-primary shrink-0">
                              {contact.firstName?.[0] || ""}{contact.lastName?.[0] || ""}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-foreground truncate">
                                {contact.firstName} {contact.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {contact.email || "No email address"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {hasAccess ? (
                              <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20 py-1">
                                Active Portal
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-amber-500/20 py-1">
                                No Access
                              </Badge>
                            )}
                            
                            {!hasAccess && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenProvision(contact);
                                }}
                                className="h-8 px-2 text-xs font-semibold gap-1 hover:bg-primary hover:text-primary-foreground transition-all"
                              >
                                <Key className="h-3.5 w-3.5" />
                                Grant
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-16 text-muted-foreground">
                    <p className="font-semibold">No contacts found</p>
                    <p className="text-sm">Create a contact to get started.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Status Info card */}
            <Card className="bg-muted/15 border-border/40">
              <CardContent className="p-4 flex gap-3 text-sm text-muted-foreground">
                <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground">How Access Works</p>
                  <p className="mt-1 leading-relaxed">
                    Granting access creates a secure user profile linked directly to the parent contact. 
                    They can log in at <span className="font-mono bg-background px-1 py-0.5 rounded text-xs">/portal</span> 
                    to view documents, sign contracts, and complete tasks.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Portal Preview Viewport */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <Card className="shadow-lg border-border/60 overflow-hidden flex flex-col h-[75vh]">
              <CardHeader className="bg-muted/15 border-b border-border/40 pb-3 flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Compass className="h-5 w-5 text-primary" />
                    Live Portal Viewport
                  </CardTitle>
                  <CardDescription>
                    {selectedContact 
                      ? `Previewing portal for ${selectedContact.firstName} ${selectedContact.lastName}`
                      : "General Portal View"
                    }
                  </CardDescription>
                </div>

                {/* Viewport size controls */}
                <div className="flex items-center gap-1.5 bg-background border border-border/60 rounded-lg p-1 shrink-0">
                  <Button
                    size="sm"
                    variant={viewMode === "desktop" ? "secondary" : "ghost"}
                    onClick={() => setViewMode("desktop")}
                    className="h-8 w-8 p-0"
                    title="Desktop width"
                  >
                    <Laptop className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant={viewMode === "tablet" ? "secondary" : "ghost"}
                    onClick={() => setViewMode("tablet")}
                    className="h-8 w-8 p-0"
                    title="Tablet width"
                  >
                    <Tablet className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant={viewMode === "mobile" ? "secondary" : "ghost"}
                    onClick={() => setViewMode("mobile")}
                    className="h-8 w-8 p-0"
                    title="Mobile width"
                  >
                    <Smartphone className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>

              {/* Viewport container */}
              <div className="bg-muted/20 flex-1 flex items-center justify-center p-4 overflow-hidden relative">
                <div className={`w-full h-full bg-background rounded-lg border border-border shadow-md transition-all duration-300 flex flex-col ${getViewportWidth()}`}>
                  
                  {/* Viewport Header Address bar */}
                  <div className="bg-muted/30 border-b border-border/60 px-4 py-2 flex items-center justify-between text-xs text-muted-foreground select-none shrink-0">
                    <div className="flex gap-1.5 shrink-0">
                      <span className="w-2.5 h-2.5 rounded-full bg-muted/60" />
                      <span className="w-2.5 h-2.5 rounded-full bg-muted/60" />
                      <span className="w-2.5 h-2.5 rounded-full bg-muted/60" />
                    </div>
                    <div className="bg-background border border-border/40 rounded px-8 py-0.5 text-center truncate max-w-[280px]">
                      {selectedContact ? `client-portal?contactId=${selectedContact.id}` : "client-portal"}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleCopyPortalLink(selectedContact)} 
                      className="h-5 px-1.5 text-[10px] gap-1 hover:bg-muted"
                    >
                      {copyingLink ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                      Copy Link
                    </Button>
                  </div>

                  {/* Embed Iframe */}
                  <div className="flex-1 bg-background relative overflow-hidden">
                    <iframe
                      src={selectedContact 
                        ? `/client-portal?preview=true&contactId=${selectedContact.id}` 
                        : `/client-portal?preview=true`
                      }
                      className="w-full h-full border-0"
                      title="Client Portal Live View"
                      key={selectedContact?.id || "general"}
                    />
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Dialog for provisioning confirmation */}
        <Dialog open={provisionOpen} onOpenChange={setProvisionOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Grant Client Portal Access</DialogTitle>
              <DialogDescription>
                This will create login credentials and enable portal authorization for:
                <span className="block font-semibold text-foreground mt-1">
                  {provisioningContact?.firstName} {provisioningContact?.lastName} ({provisioningContact?.email})
                </span>
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4 py-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Generated Login Password</label>
                <Input
                  value={customPassword}
                  onChange={(e) => setCustomPassword(e.target.value)}
                  placeholder="Enter custom password..."
                />
                <p className="text-[11px] text-muted-foreground">
                  The client will log in using their email and this password. They can change it later.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setProvisionOpen(false)} disabled={provisionMutation.isPending}>
                Cancel
              </Button>
              <Button onClick={handleConfirmProvision} disabled={provisionMutation.isPending} className="gap-1">
                {provisionMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm & Activate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ScopedErrorBoundary>
  );
}
