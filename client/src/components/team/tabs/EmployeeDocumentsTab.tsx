import { useState } from "react";
import {
  FileText,
  Upload,
  Download,
  Eye,
  Archive,
  Trash2,
  Plus,
  CheckCircle2,
  FileCheck,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { EmployeeDocument, EmployeeRecord } from "../teamTypes";
import { toast } from "sonner";

interface EmployeeDocumentsTabProps {
  employee: EmployeeRecord;
  onSave: (updated: EmployeeRecord) => void;
}

export default function EmployeeDocumentsTab({
  employee,
  onSave,
}: EmployeeDocumentsTabProps) {
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [docName, setDocName] = useState("");
  const [docCategory, setDocCategory] = useState<EmployeeDocument["category"]>("Employment Agreement");
  const [docSize, setDocSize] = useState("1.5 MB");

  const handleUploadDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docName.trim()) {
      toast.error("Document name required");
      return;
    }

    const newDoc: EmployeeDocument = {
      id: `doc-${Date.now()}`,
      name: docName.trim(),
      category: docCategory,
      uploadedDate: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      uploadedBy: "Byron Honea",
      size: docSize,
      status: "Active",
    };

    const updated: EmployeeRecord = {
      ...employee,
      documents: [newDoc, ...(employee.documents || [])],
      activity: [
        {
          id: `act-${Date.now()}`,
          timestamp: new Date().toLocaleString(),
          actor: "Byron Honea",
          action: "Document Uploaded",
          details: `Uploaded ${newDoc.category}: "${newDoc.name}".`,
        },
        ...employee.activity,
      ],
    };

    onSave(updated);
    setUploadModalOpen(false);
    setDocName("");
    toast.success("Document uploaded and recorded in employee file!");
  };

  const handleArchiveDocument = (docId: string) => {
    const updatedDocs = (employee.documents || []).map((d) =>
      d.id === docId ? { ...d, status: "Archived" as const } : d
    );
    const updated: EmployeeRecord = {
      ...employee,
      documents: updatedDocs,
      activity: [
        {
          id: `act-${Date.now()}`,
          timestamp: new Date().toLocaleString(),
          actor: "Byron Honea",
          action: "Document Archived",
          details: `Archived document id ${docId}.`,
        },
        ...employee.activity,
      ],
    };
    onSave(updated);
    toast.info("Document moved to archive");
  };

  return (
    <div className="space-y-6 text-xs text-white">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#000d2b] border border-blue-900/60 rounded-2xl p-4 shadow-lg">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-purple-400" />
            <h3 className="font-bold text-white text-sm">
              Employee Personnel Documents &amp; Legal Records
            </h3>
          </div>
          <p className="text-[11px] text-blue-200/70">
            Employment contracts, W-9/W-4 tax forms, FERPA confidentiality agreements, and verified credentials.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setUploadModalOpen(true)}
          className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl h-8 px-4 gap-1.5 shadow-md cursor-pointer shrink-0"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Upload Document</span>
        </Button>
      </div>

      {/* Documents List */}
      <div className="rounded-2xl border border-blue-900/50 bg-[#000820] p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-blue-900/40">
          <span className="font-bold text-white">
            Active Records ({(employee.documents || []).filter((d) => d.status === "Active").length})
          </span>
          <span className="text-[11px] text-slate-400">Encrypted Cloudflare R2 Storage</span>
        </div>

        <div className="space-y-2">
          {(employee.documents || []).map((doc) => (
            <div
              key={doc.id}
              className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors ${
                doc.status === "Archived"
                  ? "bg-[#000514]/60 border-blue-950/60 opacity-60"
                  : "bg-[#000d2b] border-blue-900/50 hover:border-blue-800"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-purple-950/60 border border-purple-800/40 text-purple-300 shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-white flex items-center gap-2 truncate">
                    <span>{doc.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800/60">
                      {doc.category}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-3">
                    <span>Uploaded {doc.uploadedDate}</span>
                    <span>By {doc.uploadedBy}</span>
                    <span>{doc.size}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => toast.info(`Viewing ${doc.name} in secure document viewer`)}
                  className="h-7 px-2 text-[10px] text-sky-400 hover:text-white hover:bg-sky-500/20 rounded-lg cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 mr-1" />
                  <span>View</span>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => toast.success(`Downloading ${doc.name}`)}
                  className="h-7 px-2 text-[10px] text-slate-300 hover:text-white hover:bg-blue-900/40 rounded-lg cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 mr-1" />
                  <span>Download</span>
                </Button>
                {doc.status === "Active" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleArchiveDocument(doc.id)}
                    className="h-7 px-2 text-[10px] text-slate-400 hover:text-red-400 rounded-lg cursor-pointer"
                    title="Archive Document"
                  >
                    <Archive className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}

          {(!employee.documents || employee.documents.length === 0) && (
            <div className="p-8 text-center space-y-1">
              <FileCheck className="w-6 h-6 text-slate-500 mx-auto" />
              <p className="text-sm font-semibold text-white">No documents uploaded yet</p>
              <p className="text-xs text-slate-400">
                Click "Upload Document" above to record employment agreements, W-4s, or certifications.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Upload Document Modal */}
      <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
        <DialogContent className="sm:max-w-md bg-[#000821] border border-blue-800 text-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-amber-400" />
              <span>Upload Personnel Document</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleUploadDocument} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-xs text-white">Document Name / Title</Label>
              <Input
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                placeholder="e.g. Advocacy Credentials Verification 2026, W-4 Form"
                className="bg-[#000d2b] border-blue-900/60 text-white text-xs h-9 rounded-xl"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-white">Document Category</Label>
              <Select value={docCategory} onValueChange={(v) => setDocCategory(v as any)}>
                <SelectTrigger className="bg-[#000d2b] border-blue-900/60 text-xs text-white h-9 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#000821] border border-blue-800 text-white text-xs">
                  <SelectItem value="Employment Agreement">Employment Agreement</SelectItem>
                  <SelectItem value="Contractor Agreement">Contractor Agreement</SelectItem>
                  <SelectItem value="W-9">W-9 Form</SelectItem>
                  <SelectItem value="W-4">W-4 Form</SelectItem>
                  <SelectItem value="I-9">I-9 Verification</SelectItem>
                  <SelectItem value="Policy Acknowledgment">Policy Acknowledgment</SelectItem>
                  <SelectItem value="Confidentiality">Confidentiality / NDA</SelectItem>
                  <SelectItem value="Certification">Training &amp; Certification</SelectItem>
                  <SelectItem value="Performance">Performance Review</SelectItem>
                  <SelectItem value="Other">Other Document</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-4 rounded-xl border border-dashed border-blue-800/60 bg-[#000d2b]/40 text-center space-y-1">
              <Upload className="w-6 h-6 text-sky-400 mx-auto" />
              <p className="text-xs font-semibold text-white">PDF, DOCX, or PNG up to 25MB</p>
              <p className="text-[10px] text-slate-400">Encrypted in transit and stored in Cloudflare R2</p>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setUploadModalOpen(false)}
                className="text-xs text-slate-400 hover:text-white rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl"
              >
                Save &amp; Index Document
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
