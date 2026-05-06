import { useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Upload, GitCompare, CheckCircle2, Lock, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

interface IepDocumentBlocksProps {
  contactId: number;
}

export function IepDocumentBlocks({ contactId }: IepDocumentBlocksProps) {
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: iepDoc, isLoading } = trpc.iep.get.useQuery(
    { contactId },
    { enabled: !!contactId }
  );

  const uploadMutation = trpc.iep.upload.useMutation({
    onSuccess: () => {
      toast.success("IEP/504 uploaded successfully");
      utils.iep.get.invalidate({ contactId });
      setUploading(false);
    },
    onError: (e) => {
      toast.error("Upload failed: " + e.message);
      setUploading(false);
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    try {
      // Step 1: Get presigned upload URL
      const presignRes = await fetch("/api/files/iep-presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, fileSize: file.size }),
      });
      if (!presignRes.ok) {
        const err = await presignRes.json().catch(() => ({}));
        throw new Error(err.error || "Failed to get upload URL");
      }
      const { uploadUrl, fileKey, fileUrl } = await presignRes.json();

      // Step 2: Upload directly to S3
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!uploadRes.ok) throw new Error("Failed to upload file to storage");

      // Step 3: Save metadata via tRPC
      uploadMutation.mutate({
        contactId,
        fileKey,
        fileName: file.name,
        fileUrl,
      });
    } catch (err: any) {
      toast.error("Upload failed: " + (err?.message ?? "Unknown error"));
      setUploading(false);
    }

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const hasCurrent = !!(iepDoc?.currentFileKey);
  const hasPrevious = !!(iepDoc?.previousFileKey);
  const compareUnlocked = hasCurrent && hasPrevious;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading IEP documents…
      </div>
    );
  }

  return (
    <div className="mb-6">
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
        IEP / 504 Documents
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Block 1: Current IEP on file */}
        <Card className="p-4 rounded-xl border border-border flex flex-col gap-2">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <FileText className="h-4 w-4 flex-shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wide">Current IEP/504 on File</span>
          </div>
          {hasCurrent ? (
            <div className="flex flex-col gap-1 flex-1">
              <div className="flex items-start gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm font-semibold text-foreground break-all leading-tight">
                  {iepDoc!.currentFileName}
                </span>
              </div>
              {iepDoc!.currentUploadedAt && (
                <p className="text-xs text-muted-foreground pl-5">
                  Uploaded {new Date(iepDoc!.currentUploadedAt).toLocaleDateString()}
                </p>
              )}
              <a
                href={iepDoc!.currentFileUrl!}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-auto inline-flex items-center gap-1 text-xs text-accent hover:underline font-semibold pt-1"
              >
                <ExternalLink className="h-3 w-3" /> Open
              </a>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground flex-1">No IEP/504 on file yet.</p>
          )}
        </Card>

        {/* Block 2: Upload New/Amended IEP */}
        <Card className="p-4 rounded-xl border border-border flex flex-col gap-2">
          <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400">
            <Upload className="h-4 w-4 flex-shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wide">Upload New / Amended IEP</span>
          </div>
          <p className="text-xs text-muted-foreground flex-1">
            {hasCurrent
              ? "Uploading a new file will automatically archive the current one as the previous version."
              : "Upload the current IEP or 504 plan for this student."}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            size="sm"
            variant="outline"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="mt-auto inline-flex items-center gap-1.5 text-xs"
          >
            {uploading ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…</>
            ) : (
              <><Upload className="h-3.5 w-3.5" /> {hasCurrent ? "Upload Amended IEP" : "Upload IEP/504"}</>
            )}
          </Button>
        </Card>

        {/* Block 3: Compare IEP to Previous */}
        <Card
          className={`p-4 rounded-xl border flex flex-col gap-2 transition-colors ${
            compareUnlocked
              ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20"
              : "border-border opacity-60"
          }`}
        >
          <div className={`flex items-center gap-2 ${compareUnlocked ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
            {compareUnlocked ? (
              <GitCompare className="h-4 w-4 flex-shrink-0" />
            ) : (
              <Lock className="h-4 w-4 flex-shrink-0" />
            )}
            <span className="text-xs font-bold uppercase tracking-wide">Compare IEP to Previous</span>
          </div>
          {compareUnlocked ? (
            <>
              <div className="text-xs text-muted-foreground flex-1 space-y-1">
                <p className="font-medium text-foreground">Two versions available:</p>
                <p className="truncate">Current: {iepDoc!.currentFileName}</p>
                <p className="truncate">Previous: {iepDoc!.previousFileName}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setLocation(`/tools?contactId=${contactId}`)}
                className="mt-auto inline-flex items-center gap-1.5 text-xs border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
              >
                <GitCompare className="h-3.5 w-3.5" /> Compare IEP/504 →
              </Button>
            </>
          ) : (
            <p className="text-xs text-muted-foreground flex-1">
              {hasCurrent
                ? "Upload a second version to unlock comparison."
                : "Upload an IEP/504 to unlock comparison."}
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
