import React from "react";
import { FileText, Download, Trash2, Upload, HardDrive } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface FileItem {
  id: number;
  fileName: string;
  fileSize?: number;
  fileUrl?: string;
  createdAt: string | Date;
}

interface ContactFilesTabProps {
  files?: FileItem[];
  onUploadClick?: () => void;
  onDeleteFile?: (fileId: number) => void;
}

export default function ContactFilesTab({ files = [], onUploadClick, onDeleteFile }: ContactFilesTabProps) {
  const formatBytes = (bytes?: number) => {
    if (!bytes) return "Unknown size";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Client Documents & Files</h3>
        </div>
        <Button onClick={onUploadClick} size="sm" className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs gap-1.5">
          <Upload className="w-3.5 h-3.5" /> Upload File
        </Button>
      </div>

      {files.length === 0 ? (
        <div className="text-center p-8 bg-[#0A1628]/60 rounded-xl border border-slate-800 text-slate-400 text-xs">
          No files uploaded for this contact yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {files.map((file) => (
            <Card key={file.id} className="border-slate-800 bg-[#0A1628]/80 text-slate-100 hover:border-slate-700 transition-all">
              <CardContent className="p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-400/30 text-blue-400 shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{file.fileName}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {formatBytes(file.fileSize)} • {new Date(file.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {file.fileUrl && (
                    <a
                      href={file.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 transition-colors"
                      title="Download File"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {onDeleteFile && (
                    <button
                      onClick={() => onDeleteFile(file.id)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-colors"
                      title="Delete File"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
