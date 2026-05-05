import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { File, Users, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useLocation } from "wouter";

export default function ClientFiles() {
  const [, setLocation] = useLocation();
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);

  // Get all contacts to show as clients
  const { data: contacts } = trpc.contacts.list.useQuery();

  // Get files for selected client
  const { data: clientFiles } = trpc.clientFiles.listForAdmin.useQuery(
    { clientId: selectedClientId! },
    { enabled: !!selectedClientId }
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Client Files
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            View documents uploaded by your clients
          </p>
        </div>
      </div>

      {selectedClientId ? (
        <div className="space-y-4">
          {/* Back button */}
          <Button
            onClick={() => setSelectedClientId(null)}
            variant="outline"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Clients
          </Button>

          {/* File list for selected client */}
          {clientFiles && clientFiles.length > 0 ? (
            <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
              {clientFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between px-6 py-4 border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <File className="h-8 w-8 text-red-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {file.fileName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {file.fileSize
                          ? `${(file.fileSize / 1024 / 1024).toFixed(2)} MB`
                          : "Unknown size"}{" "}
                        &middot; Uploaded{" "}
                        {new Date(file.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <a
                    href={file.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                  >
                    View / Download
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-muted/30 p-12 text-center">
              <File className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-sm font-semibold text-foreground mb-2">
                No files uploaded
              </p>
              <p className="text-xs text-muted-foreground">
                This client hasn't uploaded any files yet
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {contacts && contacts.length > 0 ? (
            contacts.map((contact) => (
              <Card
                key={contact.id}
                onClick={() => setSelectedClientId(contact.id)}
                className="cursor-pointer rounded-lg border border-border bg-card p-6 shadow-sm hover:shadow-md hover:border-accent/50 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {contact.firstName} {contact.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {contact.email || "No email"}
                    </p>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <div className="col-span-full rounded-lg border border-dashed border-border bg-muted/30 p-12 text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-sm font-semibold text-foreground mb-2">
                No clients yet
              </p>
              <p className="text-xs text-muted-foreground">
                Add contacts to see their uploaded files
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
