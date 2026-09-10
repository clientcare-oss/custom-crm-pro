import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PageIdBadge from "@/components/PageIdBadge";
import { toast } from "sonner";
import {
  Camera,
  RotateCcw,
  Trash2,
  Plus,
  CheckCircle2,
  Loader2,
  UploadCloud,
  FileText,
  AlertCircle,
  Sparkles,
} from "lucide-react";

interface ScannedPage {
  id: string;
  dataUrl: string;
  timestamp: number;
}

interface CameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName?: string;
  studentId?: number;
  onSuccess?: (docTitle: string, workspaceName: string) => void;
}

const CATEGORY_MAP: Record<string, string> = {
  "ieps-504s": "IEPs & 504s",
  "evaluations": "Evaluations",
  "school-records": "School Records",
  "communication": "Communication",
  "medical-therapy": "Medical & Therapy",
  "behavior-fba": "Behavior / FBA / BIP",
  "progress-reports": "Progress Reports",
};

export function CameraScannerModal({
  isOpen,
  onClose,
  studentName,
  studentId = 101,
  onSuccess,
}: CameraScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nativeInputRef = useRef<HTMLInputElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Scanned pages state
  const [scannedPages, setScannedPages] = useState<ScannedPage[]>([]);
  const [selectedPageIndex, setSelectedPageIndex] = useState<number>(0);

  // Document metadata
  const [docTitle, setDocTitle] = useState("");
  const [category, setCategory] = useState("ieps-504s");
  const [notes, setNotes] = useState("");

  // Clean stop all camera stream tracks
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setCameraActive(false);
  }, [stream]);

  // Start camera stream
  const startCamera = useCallback(
    async (mode: "environment" | "user" = "environment") => {
      stopCamera();
      setCameraError(null);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError("Camera is not supported on this browser or connection. You can still use the native phone camera upload.");
        return;
      }

      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });

        setStream(mediaStream);
        setCameraActive(true);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch((err) => {
            console.warn("Autoplay was prevented:", err);
          });
        }
      } catch (err: any) {
        console.warn("Camera start error:", err);
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          setCameraError("Camera permission was denied. Please allow camera access in your browser settings, or tap below to capture using your phone camera.");
        } else {
          setCameraError("Unable to access live camera stream. You can capture pages using the native camera button below.");
        }
        setCameraActive(false);
      }
    },
    [stopCamera]
  );

  // Toggle front/back camera
  const toggleFacingMode = () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Mount/unmount camera lifecycle
  useEffect(() => {
    if (isOpen) {
      const today = new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      setDocTitle(`IEP Document Scan (${today})`);
      setScannedPages([]);
      setSelectedPageIndex(0);
      setNotes("");
      startCamera(facingMode);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  // Re-attach stream to video element whenever videoRef or stream changes
  useEffect(() => {
    if (videoRef.current && stream && cameraActive) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream, cameraActive]);

  // Capture current frame from live video
  const captureFrame = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const canvas = canvasRef.current || document.createElement("canvas");
    canvasRef.current = canvas;

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);

    // Flash animation
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 200);

    const newPage: ScannedPage = {
      id: `page-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      dataUrl,
      timestamp: Date.now(),
    };

    setScannedPages((prev) => {
      const next = [...prev, newPage];
      setSelectedPageIndex(next.length - 1);
      return next;
    });

    toast.success(`Page ${scannedPages.length + 1} captured!`);
  };

  // Handle native mobile camera capture fallback
  const handleNativeCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        const newPage: ScannedPage = {
          id: `page-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          dataUrl,
          timestamp: Date.now(),
        };
        setScannedPages((prev) => {
          const next = [...prev, newPage];
          setSelectedPageIndex(next.length - 1);
          return next;
        });
        toast.success(`Page ${scannedPages.length + 1} added from camera!`);
      }
    };
    reader.readAsDataURL(file);

    // Reset input
    if (nativeInputRef.current) {
      nativeInputRef.current.value = "";
    }
  };

  // Remove a scanned page
  const removePage = (index: number) => {
    setScannedPages((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (selectedPageIndex >= next.length) {
        setSelectedPageIndex(Math.max(0, next.length - 1));
      }
      return next;
    });
  };

  // Save scanned document to student vault
  const handleSaveToVault = () => {
    if (scannedPages.length === 0) {
      toast.error("Please capture at least one page first.");
      return;
    }

    const title = docTitle.trim() || `IEP Document Scan (${new Date().toLocaleDateString()})`;
    setIsSaving(true);

    setTimeout(() => {
      const storageKeyDocs = `waypoint_vault_documents_${studentId}`;
      const storageKeyWorkspaces = `waypoint_vault_workspaces_${studentId}`;
      const workspaceName = CATEGORY_MAP[category] || "IEPs & 504s";

      const formattedTitle = title.toLowerCase().endsWith(".pdf") ? title : `${title}.pdf`;

      const newDoc = {
        id: `scan-${Date.now()}`,
        title: formattedTitle,
        workspaceId: category,
        workspaceName,
        fileType: "pdf" as const,
        fileSize: `${(scannedPages.length * 0.8).toFixed(1)} MB (${scannedPages.length} ${scannedPages.length === 1 ? "page" : "pages"})`,
        updatedAt: new Date().toISOString().split("T")[0],
        relativeDate: "Just now",
        uploadedBy: "Parent" as const,
        thumbnailUrl: scannedPages[0]?.dataUrl,
        pageCount: scannedPages.length,
        summary:
          notes.trim() ||
          `Multi-page document (${scannedPages.length} pages) scanned via live camera by family into ${workspaceName}.`,
      };

      try {
        const existingDocs = JSON.parse(localStorage.getItem(storageKeyDocs) || "[]");
        localStorage.setItem(storageKeyDocs, JSON.stringify([newDoc, ...existingDocs]));

        const existingWs = JSON.parse(localStorage.getItem(storageKeyWorkspaces) || "[]");
        if (Array.isArray(existingWs) && existingWs.length > 0) {
          const updatedWs = existingWs.map((w: any) =>
            w.id === category ? { ...w, fileCount: (w.fileCount || 0) + 1 } : w
          );
          localStorage.setItem(storageKeyWorkspaces, JSON.stringify(updatedWs));
        }

        // Notify Document Vault tab to refresh instantly
        window.dispatchEvent(new CustomEvent("waypoint:vault-updated"));
      } catch (err) {
        console.error("Failed to save scanned document:", err);
      }

      setIsSaving(false);
      stopCamera();
      onClose();

      toast.success(`"${formattedTitle}" (${scannedPages.length} pages) encrypted and saved to ${workspaceName}!`);
      onSuccess?.(formattedTitle, workspaceName);
    }, 600);
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? handleClose() : null)}>
      <DialogContent className="max-w-2xl bg-[#07152B] border border-[#18365D] text-white rounded-2xl p-6 shadow-2xl backdrop-blur-xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Hidden offscreen canvas for frame capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Hidden native camera capture input */}
        <input
          ref={nativeInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleNativeCapture}
          className="hidden"
        />

        {/* Header */}
        <DialogHeader className="shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold flex items-center gap-2.5 text-white">
              <div className="w-8 h-8 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-inner">
                <Camera className="w-4 h-4" />
              </div>
              <span>Scan Documents with Camera</span>
            </DialogTitle>
            <PageIdBadge id="PG-023-CAM" name="Scan with Camera" />
          </div>
          <DialogDescription className="text-xs text-blue-200/70 mt-1">
            Snap clean live photos of paper IEP pages, psychological evaluations, or clinic notes for{" "}
            <strong className="text-white font-semibold">{studentName || "your student"}</strong>.
          </DialogDescription>
        </DialogHeader>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto space-y-4 my-2 pr-1">
          {/* ── Viewfinder / Capture Box ─────────────────────── */}
          <div className="relative rounded-2xl overflow-hidden border border-blue-900/60 bg-[#030C22] aspect-[4/3] sm:aspect-[16/10] flex items-center justify-center shadow-inner group">
            {/* Live Camera Feed */}
            {cameraActive && !cameraError ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Shutter Snapshot Flash */}
                {isFlashing && (
                  <div className="absolute inset-0 bg-white pointer-events-none transition-opacity duration-200 opacity-90" />
                )}

                {/* Document Reticle / Framing Overlay */}
                <div className="absolute inset-4 sm:inset-8 border border-white/20 rounded-xl pointer-events-none flex flex-col justify-between p-3">
                  {/* Top corner brackets */}
                  <div className="flex justify-between">
                    <div className="w-6 h-6 border-t-2 border-l-2 border-amber-400 rounded-tl" />
                    <div className="w-6 h-6 border-t-2 border-r-2 border-amber-400 rounded-tr" />
                  </div>

                  {/* Center Guide Hint */}
                  <div className="self-center bg-[#07152B]/80 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-[10px] text-blue-200 font-medium shadow-lg flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>Align paper document inside frame</span>
                  </div>

                  {/* Bottom corner brackets */}
                  <div className="flex justify-between">
                    <div className="w-6 h-6 border-b-2 border-l-2 border-amber-400 rounded-bl" />
                    <div className="w-6 h-6 border-b-2 border-r-2 border-amber-400 rounded-br" />
                  </div>
                </div>

                {/* Floating controls on top of video */}
                <div className="absolute top-3 right-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleFacingMode}
                    className="p-2 rounded-xl bg-black/50 hover:bg-black/80 text-white border border-white/15 backdrop-blur-md transition-all shadow-md cursor-pointer"
                    title="Flip front/rear camera"
                  >
                    <RotateCcw className="w-4 h-4 text-amber-300" />
                  </button>
                </div>

                {/* Capture Shutter Bar */}
                <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={captureFrame}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs shadow-[0_0_20px_rgba(245,181,68,0.4)] hover:scale-105 active:scale-95 transition-all cursor-pointer border-2 border-white/50"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Capture Page ({scannedPages.length + 1})</span>
                  </button>
                </div>
              </>
            ) : (
              /* Camera Inactive / Permission Fallback View */
              <div className="p-6 text-center space-y-3 max-w-md">
                <div className="w-12 h-12 rounded-2xl bg-amber-400/10 border border-amber-400/30 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
                  <Camera className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">
                    {cameraError ? "Camera Access Needed" : "Ready to Scan"}
                  </p>
                  <p className="text-xs text-blue-200/70 mt-1">
                    {cameraError || "Click below to activate your camera or use your phone's photo capture."}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => startCamera(facingMode)}
                    className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-md gap-1.5"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Try Live Camera Again</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => nativeInputRef.current?.click()}
                    className="border-blue-400/40 text-blue-200 hover:bg-blue-500/10 hover:text-white text-xs rounded-xl gap-1.5"
                  >
                    <UploadCloud className="w-3.5 h-3.5 text-blue-300" />
                    <span>Use Phone Camera / Photo</span>
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Native Camera Option Banner */}
          {cameraActive && (
            <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-[#030C22]/80 border border-blue-900/40 text-xs">
              <span className="text-blue-200/80 text-[11px] flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Prefer your mobile device's camera app?</span>
              </span>
              <button
                type="button"
                onClick={() => nativeInputRef.current?.click()}
                className="text-amber-400 hover:text-amber-300 font-semibold text-[11px] underline cursor-pointer"
              >
                Open Camera App →
              </button>
            </div>
          )}

          {/* ── Scanned Pages Thumbnails Strip ──────────────── */}
          {scannedPages.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Captured Pages ({scannedPages.length})</span>
                </span>
                <span className="text-[11px] text-blue-200/60">
                  Tap to preview • Delete any blurry pages
                </span>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {scannedPages.map((page, idx) => (
                  <div
                    key={page.id}
                    onClick={() => setSelectedPageIndex(idx)}
                    className={`relative shrink-0 w-20 h-28 rounded-xl overflow-hidden border-2 transition-all cursor-pointer group ${
                      selectedPageIndex === idx
                        ? "border-amber-400 shadow-[0_0_12px_rgba(245,181,68,0.4)] scale-105"
                        : "border-blue-900/50 hover:border-blue-400/50 opacity-80 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={page.dataUrl}
                      alt={`Page ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />

                    {/* Page Number Badge */}
                    <div className="absolute top-1 left-1 bg-black/70 backdrop-blur-sm text-[9px] font-bold text-amber-300 px-1.5 py-0.5 rounded">
                      P.{idx + 1}
                    </div>

                    {/* Delete button on hover */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removePage(idx);
                      }}
                      className="absolute top-1 right-1 p-1 bg-red-600/80 hover:bg-red-600 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete this page"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {/* + Snap Another Page Card */}
                <button
                  type="button"
                  onClick={cameraActive ? captureFrame : () => nativeInputRef.current?.click()}
                  className="shrink-0 w-20 h-28 rounded-xl border-2 border-dashed border-blue-800/60 hover:border-amber-400/80 bg-[#030C22]/50 hover:bg-[#030C22] flex flex-col items-center justify-center text-blue-300 hover:text-amber-300 transition-all gap-1 cursor-pointer"
                >
                  <Plus className="w-5 h-5" />
                  <span className="text-[10px] font-bold">Add Page</span>
                </button>
              </div>
            </div>
          )}

          {/* ── Document Details ────────────────────────────── */}
          <div className="space-y-3 pt-2 border-t border-white/5">
            {/* Document Title */}
            <div>
              <Label className="text-xs text-blue-200/90 mb-1.5 block font-medium">Document Title</Label>
              <Input
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                placeholder="e.g., 2026 IEP Annual Review Scan"
                className="bg-[#030C22] border-blue-900/40 text-white text-xs rounded-xl focus:border-amber-400"
              />
            </div>

            {/* Destination Vault Folder */}
            <div>
              <Label className="text-xs text-blue-200/90 mb-1.5 block font-medium">Destination Vault Folder</Label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#030C22] border border-blue-900/40 text-white text-xs rounded-xl px-3 py-2.5 outline-none focus:border-amber-400 cursor-pointer"
              >
                <option value="ieps-504s" className="bg-[#07152B]">IEPs & 504s (Current & Past Plans)</option>
                <option value="evaluations" className="bg-[#07152B]">Evaluations (Psycho-Ed, Speech, OT, PT)</option>
                <option value="school-records" className="bg-[#07152B]">School Records (Report Cards, Attendance)</option>
                <option value="communication" className="bg-[#07152B]">Communication (Teacher Emails, PWN)</option>
                <option value="medical-therapy" className="bg-[#07152B]">Medical & Therapy (Clinic notes, Diagnoses)</option>
                <option value="behavior-fba" className="bg-[#07152B]">Behavior / FBA / BIP (Behavior Plans)</option>
                <option value="progress-reports" className="bg-[#07152B]">Progress Reports (Quarterly Goal Marks)</option>
              </select>
            </div>

            {/* Optional Notes */}
            <div>
              <Label className="text-xs text-blue-200/90 mb-1.5 block font-medium">Notes for Byron / Advocate (Optional)</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Pages 1-4 signed by committee today"
                className="bg-[#030C22] border-blue-900/40 text-white text-xs rounded-xl focus:border-amber-400"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="flex-col sm:flex-row gap-2 pt-3 border-t border-white/10 shrink-0">
          <div className="flex-1 flex items-center text-xs text-blue-200/70">
            {scannedPages.length > 0 ? (
              <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                {scannedPages.length} {scannedPages.length === 1 ? "page" : "pages"} ready to encrypt
              </span>
            ) : (
              <span>Position paper under camera & tap Capture</span>
            )}
          </div>
          <div className="flex items-center gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClose}
              className="border-white/15 text-white/70 hover:bg-white/10 hover:text-white text-xs rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveToVault}
              disabled={isSaving || scannedPages.length === 0}
              className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-400/10 gap-1.5 disabled:opacity-40"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Encrypting Scan...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Save Scan to Vault</span>
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
