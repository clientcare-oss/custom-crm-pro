/**
 * Waypoint Scan — Production-Ready Document Scanner & PDF Finishing Suite
 * Full 4-step client experience: Get Document → Review → Fill & Sign → Finish PDF
 * Styled throughout with the Blue Wavy Maritime Theme.
 * Page ID: PG-023-SCAN
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  CornerQuad,
  detectDocumentCorners,
  warpAndEnhanceDocument,
  calculateSharpnessScore,
  rotateCanvas,
  rotateCanvas90,
  autoOrientPortrait,
  getNativeFallbackCorners,
} from "@/lib/scannerEngine";
import {
  DocumentAnnotation,
  WaypointScanDraft,
  WaypointScanPageDraft,
  saveScanDraft,
  getScanDraft,
  clearScanDraft,
} from "@/lib/waypointScanStorage";
import {
  compileWaypointPdfs,
  savePdfToDevice,
  sharePdfFile,
  GeneratePdfResult,
} from "@/lib/pdfFinisher";
import { WaypointWavyBackdrop, WaypointWaveIcon } from "./WaypointWavyBackdrop";
import { WaypointScanHeader } from "./waypoint-scan/WaypointScanHeader";
import { WaypointScanStage1Get } from "./waypoint-scan/WaypointScanStage1Get";
import { WaypointScanStage2Review } from "./waypoint-scan/WaypointScanStage2Review";
import { WaypointScanStage3FillSign, AnnotationTool } from "./waypoint-scan/WaypointScanStage3FillSign";
import { WaypointScanStage4Finish } from "./waypoint-scan/WaypointScanStage4Finish";
import { WaypointSignaturePad } from "./WaypointSignaturePad";
import { WaypointAdjustEdgesModal } from "./WaypointAdjustEdgesModal";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Sparkles, Check, Type } from "lucide-react";

export interface WaypointScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName?: string;
  studentId?: number;
  category?: string;
  onSuccess?: (docTitle: string, workspaceName: string) => void;
}

type WorkflowStage = "get" | "review" | "fill-sign" | "finish";

const CATEGORY_MAP: Record<string, string> = {
  "ieps-504s": "IEPs & 504s",
  "evaluations": "Evaluations",
  "school-records": "School Records",
  "communication": "Communication",
  "medical-therapy": "Medical & Therapy",
  "behavior-fba": "Behavior / FBA / BIP",
  "progress-reports": "Progress Reports",
};

export function WaypointScanModal({
  isOpen,
  onClose,
  studentName,
  studentId = 101,
  category = "ieps-504s",
  onSuccess,
}: WaypointScanModalProps) {
  // Workflow Stage
  const [stage, setStage] = useState<WorkflowStage>("get");

  // Camera & Stream
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Raw Captured Photo & Corner Editing
  const [rawCaptureDataUrl, setRawCaptureDataUrl] = useState<string | null>(null);
  const [detectedCorners, setDetectedCorners] = useState<CornerQuad | null>(null);
  const [showAdjustEdgesModal, setShowAdjustEdgesModal] = useState(false);
  const [blurWarning, setBlurWarning] = useState<string | null>(null);

  // Pages & Multipage State
  const [pages, setPages] = useState<WaypointScanPageDraft[]>([]);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [isShowingOriginal, setIsShowingOriginal] = useState<boolean>(false);
  const [docTitle, setDocTitle] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(category);

  // Annotations & Tools
  const [annotations, setAnnotations] = useState<Record<string, DocumentAnnotation[]>>({});
  const [activeTool, setActiveTool] = useState<AnnotationTool>("none");
  const [parentInitials, setParentInitials] = useState("");
  const [parentSignatureUrl, setParentSignatureUrl] = useState<string | null>(null);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);

  // Text Prompt Modal
  const [textPromptOpen, setTextPromptOpen] = useState(false);
  const [pendingTextPos, setPendingTextPos] = useState<{ x: number; y: number } | null>(null);
  const [textInputValue, setTextInputValue] = useState("");

  // Initials Prompt Modal
  const [initialsPromptOpen, setInitialsPromptOpen] = useState(false);
  const [initialsInputValue, setInitialsInputValue] = useState("");

  // PDF Compilation & Vault
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [pdfResult, setPdfResult] = useState<GeneratePdfResult | null>(null);

  // Draft Recovery State
  const [existingDraft, setExistingDraft] = useState<WaypointScanDraft | null>(null);

  // Backend tRPC upload mutation
  const uploadFileMutation = trpc.clientFiles.upload.useMutation();

  // Stop camera tracks safely
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setStream(null);
    setCameraActive(false);
  }, []);

  // Start live camera
  const startCamera = useCallback(
    async (mode: "environment" | "user" = "environment") => {
      stopCamera();
      setCameraError(null);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError("Direct browser camera is unavailable on this device. You can capture using your phone camera.");
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

        streamRef.current = mediaStream;
        setStream(mediaStream);
        setCameraActive(true);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch(() => {});
        }
      } catch (err: any) {
        console.warn("Camera start error:", err);
        setCameraError("Camera access was blocked or interrupted. You can capture using the button below.");
        setCameraActive(false);
      }
    },
    [stopCamera]
  );

  // Lifecycle check & draft loading
  useEffect(() => {
    if (isOpen) {
      const today = new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      setDocTitle(`IEP Document (${today})`);
      setSelectedCategory(category);
      setPdfResult(null);

      getScanDraft(studentId).then((draft) => {
        if (draft && draft.pages && draft.pages.length > 0) {
          setExistingDraft(draft);
        } else {
          setStage("get");
          startCamera(facingMode);
        }
      });
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, studentId]);

  // Keep stream attached
  useEffect(() => {
    if (videoRef.current && stream && cameraActive) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream, cameraActive]);

  // Autosave draft to IndexedDB
  useEffect(() => {
    if (pages.length > 0 && isOpen) {
      const draft: WaypointScanDraft = {
        id: `draft-${studentId}`,
        studentId,
        studentName,
        docTitle: docTitle || "IEP Document",
        category: selectedCategory,
        pages,
        annotations,
        stage,
        savedAt: Date.now(),
      };
      saveScanDraft(draft);
    }
  }, [pages, annotations, docTitle, selectedCategory, stage, studentId, isOpen]);

  // Resume draft
  const handleResumeDraft = () => {
    if (!existingDraft) return;
    setPages(existingDraft.pages);
    setAnnotations(existingDraft.annotations || {});
    setDocTitle(existingDraft.docTitle);
    setSelectedCategory(existingDraft.category || "ieps-504s");
    setActivePageIndex(0);
    setStage(existingDraft.stage === "finish" ? "review" : existingDraft.stage);
    setExistingDraft(null);
    toast.success(`Resumed scan with ${existingDraft.pages.length} pages.`);
  };

  // Discard draft
  const handleDiscardDraft = () => {
    clearScanDraft(studentId);
    setExistingDraft(null);
    setPages([]);
    setAnnotations({});
    setStage("get");
    startCamera(facingMode);
  };

  // Toggle front/back camera
  const handleToggleFacingMode = () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Helper to rotate data URL asynchronously with 100% reliability
  const rotateDataUrl = (dataUrl: string, degrees: number): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(dataUrl);
        ctx.drawImage(img, 0, 0);
        const rotated = rotateCanvas(canvas, degrees);
        resolve(rotated.toDataURL("image/jpeg", 0.94));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  };

  // Capture frame from video feed
  const handleScanPage = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = video.videoWidth || 1280;
    tempCanvas.height = video.videoHeight || 720;
    const ctx = tempCanvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
    const rawData = tempCanvas.toDataURL("image/jpeg", 0.95);
    setRawCaptureDataUrl(rawData);

    // Sharpness Check
    const score = calculateSharpnessScore(tempCanvas);
    if (score < 30) {
      setBlurWarning("This page looks a bit blurry. For best readability, you can retake or adjust the lighting.");
    } else {
      setBlurWarning(null);
    }

    // Corner Detection & Aspect-Preserving Warp
    const corners = detectDocumentCorners(tempCanvas);
    setDetectedCorners(corners);

    const warpedCanvas = warpAndEnhanceDocument(tempCanvas, corners);
    const cleanedDataUrl = warpedCanvas.toDataURL("image/jpeg", 0.94);

    const newPage: WaypointScanPageDraft = {
      id: `page-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      dataUrl: cleanedDataUrl,
      originalDataUrl: rawData,
      rotation: 0,
      timestamp: Date.now(),
    };

    setPages((prev) => {
      const next = [...prev, newPage];
      setActivePageIndex(next.length - 1);
      return next;
    });

    stopCamera();
    setStage("review");
  };

  // Native phone camera capture
  const handleNativeCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) processImportedImage(dataUrl);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Open existing PDF or image
  const handleFileOpen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        if (file.type === "application/pdf") {
          processImportedPdf(file.name);
        } else {
          processImportedImage(dataUrl, true /* isFileImport */);
        }
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const processImportedImage = (dataUrl: string, isFileImport = false) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || 1200;
      canvas.height = img.naturalHeight || 1600;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0);

        // Retain raw upload for Adjust Edges and Original/Enhanced toggle
        setRawCaptureDataUrl(dataUrl);

        // For files opened from PC/device: use clean full bounds so the document is 100% intact & sharp.
        // For camera captures: run paper corner detection against background desk.
        const corners = isFileImport
          ? getNativeFallbackCorners(canvas.width, canvas.height, 0)
          : detectDocumentCorners(canvas);

        setDetectedCorners(corners);

        const warpedCanvas = warpAndEnhanceDocument(
          canvas,
          corners,
          undefined,
          undefined,
          !isFileImport /* only enhance contrast on camera captures, preserve digital doc colors */
        );
        const cleaned = warpedCanvas.toDataURL("image/jpeg", 0.94);

        // Calculate sharpness score
        const score = calculateSharpnessScore(canvas);
        if (score < 30) {
          setBlurWarning("This uploaded image looks slightly blurry. You can review or adjust edges if needed.");
        } else {
          setBlurWarning(null);
        }

        const newPage: WaypointScanPageDraft = {
          id: `page-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          dataUrl: cleaned,
          originalDataUrl: dataUrl,
          rotation: 0,
          timestamp: Date.now(),
        };

        setPages((prev) => {
          const next = [...prev, newPage];
          setActivePageIndex(next.length - 1);
          return next;
        });

        stopCamera();
        setStage("review");
      }
    };
    img.src = dataUrl;
  };

  const processImportedPdf = (fileName: string) => {
    const cleanName = fileName.replace(/\.pdf$/i, "");
    setDocTitle(cleanName);

    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 1600;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#06172F";
      ctx.font = "bold 38px serif";
      ctx.fillText(fileName, 100, 160);
      ctx.fillStyle = "#475569";
      ctx.font = "22px sans-serif";
      ctx.fillText("PDF Document loaded into Waypoint Scan", 100, 210);
      ctx.fillText("You can place text, checkmarks, dates, and signatures anywhere on this page.", 100, 250);
      ctx.strokeStyle = "#CBD5E1";
      ctx.lineWidth = 3;
      ctx.strokeRect(50, 50, canvas.width - 100, canvas.height - 100);

      const pageImg = canvas.toDataURL("image/jpeg", 0.94);
      const newPage: WaypointScanPageDraft = {
        id: `page-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        dataUrl: pageImg,
        originalDataUrl: pageImg,
        rotation: 0,
        timestamp: Date.now(),
      };

      setPages([newPage]);
      setActivePageIndex(0);
      stopCamera();
      setStage("review");
    }
  };

  const handleApplyAdjustedCorners = (corners: CornerQuad) => {
    if (!rawCaptureDataUrl) return;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);

      const warped = warpAndEnhanceDocument(canvas, corners);
      const cleaned = warped.toDataURL("image/jpeg", 0.94);

      setPages((prev) => {
        const next = [...prev];
        if (next[activePageIndex]) {
          next[activePageIndex] = {
            ...next[activePageIndex],
            dataUrl: cleaned,
          };
        }
        return next;
      });
      toast.success("Page edges updated!");
    };
    img.src = rawCaptureDataUrl;
  };

  const handleRotatePage = async (direction: "cw" | "ccw" = "cw") => {
    const page = pages[activePageIndex];
    if (!page) return;
    const degrees = direction === "cw" ? 90 : -90;

    const newActiveUrl = await rotateDataUrl(page.dataUrl, degrees);
    const newOriginalUrl = page.originalDataUrl
      ? await rotateDataUrl(page.originalDataUrl, degrees)
      : undefined;

    setPages((prev) => {
      const next = [...prev];
      if (next[activePageIndex]) {
        next[activePageIndex] = {
          ...next[activePageIndex],
          dataUrl: newActiveUrl,
          originalDataUrl: newOriginalUrl,
          rotation: (next[activePageIndex].rotation + degrees + 360) % 360,
        };
      }
      return next;
    });
    toast.success(`Rotated ${direction === "cw" ? "90° Right" : "90° Left"}`);
  };

  const handleAutoOrient = async () => {
    const page = pages[activePageIndex];
    if (!page) return;

    const img = new Image();
    img.onload = async () => {
      if (img.naturalWidth > img.naturalHeight) {
        const newActiveUrl = await rotateDataUrl(page.dataUrl, 90);
        const newOriginalUrl = page.originalDataUrl
          ? await rotateDataUrl(page.originalDataUrl, 90)
          : undefined;

        setPages((prev) => {
          const next = [...prev];
          if (next[activePageIndex]) {
            next[activePageIndex] = {
              ...next[activePageIndex],
              dataUrl: newActiveUrl,
              originalDataUrl: newOriginalUrl,
              rotation: (next[activePageIndex].rotation + 90) % 360,
            };
          }
          return next;
        });
        toast.success("Oriented upright!");
      } else {
        toast.info("Document is already upright portrait.");
      }
    };
    img.src = page.dataUrl;
  };

  const handleToggleOriginal = () => {
    setIsShowingOriginal((prev) => !prev);
    toast.info(!isShowingOriginal ? "Showing Original Photo" : "Showing Cleaned Scan");
  };

  const handleRetakeCurrentPage = () => {
    if (pages.length > 0) {
      setPages((prev) => prev.filter((_, i) => i !== activePageIndex));
    }
    setStage("get");
    setRawCaptureDataUrl(null);
    setBlurWarning(null);
    startCamera(facingMode);
  };

  const handleScanAnotherPage = () => {
    setStage("get");
    setRawCaptureDataUrl(null);
    setBlurWarning(null);
    startCamera(facingMode);
  };

  // Document Click in Fill & Sign
  const handleDocumentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool === "none") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;

    const currentPage = pages[activePageIndex];
    if (!currentPage) return;

    if (activeTool === "check") {
      const newAnnot: DocumentAnnotation = {
        id: `check-${Date.now()}`,
        type: "check",
        x: Math.max(2, Math.min(95, clickX)),
        y: Math.max(2, Math.min(95, clickY)),
        fontSize: 20,
      };
      setAnnotations((prev) => ({
        ...prev,
        [currentPage.id]: [...(prev[currentPage.id] || []), newAnnot],
      }));
      toast.success("Checkmark placed!");
    } else if (activeTool === "date") {
      const today = new Date().toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
      });
      const newAnnot: DocumentAnnotation = {
        id: `date-${Date.now()}`,
        type: "date",
        x: Math.max(2, Math.min(90, clickX)),
        y: Math.max(2, Math.min(95, clickY)),
        content: today,
        fontSize: 12,
      };
      setAnnotations((prev) => ({
        ...prev,
        [currentPage.id]: [...(prev[currentPage.id] || []), newAnnot],
      }));
      toast.success("Date placed!");
    } else if (activeTool === "text") {
      setPendingTextPos({ x: clickX, y: clickY });
      setTextInputValue("");
      setTextPromptOpen(true);
    } else if (activeTool === "initials") {
      if (!parentInitials) {
        setPendingTextPos({ x: clickX, y: clickY });
        setInitialsInputValue("");
        setInitialsPromptOpen(true);
      } else {
        const newAnnot: DocumentAnnotation = {
          id: `initials-${Date.now()}`,
          type: "initials",
          x: Math.max(2, Math.min(92, clickX)),
          y: Math.max(2, Math.min(95, clickY)),
          content: parentInitials,
          fontSize: 13,
        };
        setAnnotations((prev) => ({
          ...prev,
          [currentPage.id]: [...(prev[currentPage.id] || []), newAnnot],
        }));
        toast.success("Initials placed!");
      }
    } else if (activeTool === "signature") {
      if (!parentSignatureUrl) {
        setPendingTextPos({ x: clickX, y: clickY });
        setShowSignaturePad(true);
      } else {
        const newAnnot: DocumentAnnotation = {
          id: `sig-${Date.now()}`,
          type: "signature",
          x: Math.max(2, Math.min(80, clickX)),
          y: Math.max(2, Math.min(90, clickY)),
          content: parentSignatureUrl,
          width: 25,
        };
        setAnnotations((prev) => ({
          ...prev,
          [currentPage.id]: [...(prev[currentPage.id] || []), newAnnot],
        }));
        toast.success("Signature placed!");
      }
    }
  };

  const handleSaveTextAnnotation = () => {
    if (!textInputValue.trim() || !pendingTextPos) {
      setTextPromptOpen(false);
      return;
    }
    const currentPage = pages[activePageIndex];
    if (!currentPage) return;

    const newAnnot: DocumentAnnotation = {
      id: `text-${Date.now()}`,
      type: "text",
      x: Math.max(2, Math.min(90, pendingTextPos.x)),
      y: Math.max(2, Math.min(95, pendingTextPos.y)),
      content: textInputValue.trim(),
      fontSize: 13,
    };
    setAnnotations((prev) => ({
      ...prev,
      [currentPage.id]: [...(prev[currentPage.id] || []), newAnnot],
    }));
    setTextPromptOpen(false);
    setPendingTextPos(null);
  };

  const handleSaveInitials = () => {
    const inits = initialsInputValue.trim().toUpperCase();
    if (!inits || !pendingTextPos) {
      setInitialsPromptOpen(false);
      return;
    }
    setParentInitials(inits);
    const currentPage = pages[activePageIndex];
    if (!currentPage) return;

    const newAnnot: DocumentAnnotation = {
      id: `initials-${Date.now()}`,
      type: "initials",
      x: Math.max(2, Math.min(92, pendingTextPos.x)),
      y: Math.max(2, Math.min(95, pendingTextPos.y)),
      content: inits,
      fontSize: 14,
    };
    setAnnotations((prev) => ({
      ...prev,
      [currentPage.id]: [...(prev[currentPage.id] || []), newAnnot],
    }));
    setInitialsPromptOpen(false);
    setPendingTextPos(null);
  };

  const handleSaveSignature = (sigDataUrl: string) => {
    setParentSignatureUrl(sigDataUrl);
    const currentPage = pages[activePageIndex];
    if (!currentPage) return;

    const pos = pendingTextPos || { x: 50, y: 75 };
    const newAnnot: DocumentAnnotation = {
      id: `sig-${Date.now()}`,
      type: "signature",
      x: Math.max(2, Math.min(75, pos.x)),
      y: Math.max(2, Math.min(85, pos.y)),
      content: sigDataUrl,
      width: 25,
    };
    setAnnotations((prev) => ({
      ...prev,
      [currentPage.id]: [...(prev[currentPage.id] || []), newAnnot],
    }));
    setPendingTextPos(null);
    toast.success("Signature placed!");
  };

  // Compile PDF & Vault Auto-Save
  const handleFinishDocument = async () => {
    if (pages.length === 0) return;
    setIsProcessingPdf(true);

    try {
      const result = await compileWaypointPdfs(pages, annotations, docTitle);
      setPdfResult(result);

      // Save to Vault & local storage
      const workspaceName = CATEGORY_MAP[selectedCategory] || "IEPs & 504s";
      const storageKeyDocs = `waypoint_vault_documents_${studentId}`;
      const newVaultDoc = {
        id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: result.completedFileName,
        workspaceId: selectedCategory,
        workspaceName,
        fileType: "pdf" as const,
        fileSize: `${Math.round(result.completedBytes.byteLength / 1024)} KB`,
        pageCount: pages.length,
        updatedAt: "Just now",
        uploadedBy: "Client (Waypoint Scan)",
        uploadedAt: new Date().toISOString(),
        isPinned: false,
        summary: `Scanned & signed via Waypoint Scan (${pages.length} pages)`,
        sourceType: "camera",
        originalFileName: result.originalFileName,
        studentId,
      };

      try {
        const existingDocsStr = localStorage.getItem(storageKeyDocs);
        const existingDocs = existingDocsStr ? JSON.parse(existingDocsStr) : [];
        localStorage.setItem(storageKeyDocs, JSON.stringify([newVaultDoc, ...existingDocs]));
      } catch {}

      await clearScanDraft(studentId);
      setStage("finish");
      onSuccess?.(result.completedFileName, workspaceName);
    } catch (err: any) {
      console.error("Finish error:", err);
      toast.error("Could not compile PDF. Work is safely retained locally.");
    } finally {
      setIsProcessingPdf(false);
    }
  };

  const currentPage = pages[activePageIndex];
  const currentAnnots = currentPage ? annotations[currentPage.id] || [] : [];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl w-[96vw] max-h-[96vh] p-0 bg-transparent border-none text-white shadow-2xl z-[1050] overflow-hidden">
        
        {/* Full Blue Wavy Maritime Theme Backdrop */}
        <WaypointWavyBackdrop className="rounded-3xl border border-blue-900/50 px-4 sm:px-6 pt-3 sm:pt-4 pb-4 sm:pb-6 shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">
          
          {/* Header */}
          <WaypointScanHeader stage={stage} onClose={onClose} />

          {/* Draft Recovery Alert */}
          {existingDraft && (
            <div className="my-auto p-6 rounded-2xl bg-[#081B36]/90 border border-amber-400/40 text-center space-y-4 shadow-xl backdrop-blur-md">
              <div className="w-12 h-12 rounded-2xl bg-amber-400/15 border border-amber-400/40 text-amber-400 flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">
                Resume Unfinished Document?
              </h3>
              <p className="text-xs text-blue-200/70 max-w-md mx-auto">
                We safely saved your previous scan session ({existingDraft.pages.length} pages, "{existingDraft.docTitle}").
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={handleDiscardDraft}
                  className="border-blue-900/40 text-blue-200 hover:bg-white/10 text-xs rounded-xl"
                >
                  Start Fresh
                </Button>
                <Button
                  onClick={handleResumeDraft}
                  className="bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-bold rounded-xl gap-1.5"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  Resume Previous Scan
                </Button>
              </div>
            </div>
          )}

          <div className="flex-1 flex flex-col overflow-y-auto min-h-0 py-1">
            {/* Stage 1: Get Document */}
            {!existingDraft && stage === "get" && (
              <WaypointScanStage1Get
                videoRef={videoRef}
                cameraActive={cameraActive}
                cameraError={cameraError}
                onScanPage={handleScanPage}
                onToggleFacingMode={handleToggleFacingMode}
                onNativeCapture={handleNativeCapture}
                onFileOpen={handleFileOpen}
                onStartCamera={() => startCamera(facingMode)}
                hasExistingPages={pages.length > 0}
                onBackToReview={() => setStage("review")}
              />
            )}

            {/* Stage 2: Review */}
            {!existingDraft && stage === "review" && (
              <WaypointScanStage2Review
                pages={pages}
                activePageIndex={activePageIndex}
                onSelectPageIndex={setActivePageIndex}
                onRetake={handleRetakeCurrentPage}
                onUsePage={() => setStage("fill-sign")}
                onRotate={handleRotatePage}
                onAutoOrient={handleAutoOrient}
                onToggleOriginal={handleToggleOriginal}
                isShowingOriginal={isShowingOriginal}
                onAdjustEdges={rawCaptureDataUrl ? () => setShowAdjustEdgesModal(true) : undefined}
                onScanAnotherPage={handleScanAnotherPage}
                onDeletePage={(idx) => {
                  if (pages.length <= 1) return;
                  setPages((p) => p.filter((_, i) => i !== idx));
                  setActivePageIndex((i) => Math.max(0, i - 1));
                }}
                onMovePageLeft={(idx) => {
                  if (idx === 0) return;
                  setPages((p) => {
                    const c = [...p];
                    const t = c[idx - 1];
                    c[idx - 1] = c[idx];
                    c[idx] = t;
                    return c;
                  });
                  setActivePageIndex(idx - 1);
                }}
                onMovePageRight={(idx) => {
                  if (idx === pages.length - 1) return;
                  setPages((p) => {
                    const c = [...p];
                    const t = c[idx + 1];
                    c[idx + 1] = c[idx];
                    c[idx] = t;
                    return c;
                  });
                  setActivePageIndex(idx + 1);
                }}
                blurWarning={blurWarning}
              />
            )}

            {/* Stage 3: Fill and Sign */}
            {!existingDraft && stage === "fill-sign" && currentPage && (
              <WaypointScanStage3FillSign
                currentPage={currentPage}
                annotations={currentAnnots}
                activeTool={activeTool}
                onSelectTool={setActiveTool}
                onDocumentClick={handleDocumentClick}
                selectedAnnotationId={selectedAnnotationId}
                onSelectAnnotation={setSelectedAnnotationId}
                onRemoveAnnotation={(id) => {
                  setAnnotations((p) => ({
                    ...p,
                    [currentPage.id]: (p[currentPage.id] || []).filter((a) => a.id !== id),
                  }));
                  setSelectedAnnotationId(null);
                }}
                onBackToReview={() => setStage("review")}
                onFinishDocument={handleFinishDocument}
                onRotate={() => handleRotatePage("cw")}
                isProcessingPdf={isProcessingPdf}
                pageNumber={activePageIndex + 1}
                totalPages={pages.length}
              />
            )}

            {/* Stage 4: Finish PDF */}
            {!existingDraft && stage === "finish" && pdfResult && (
              <WaypointScanStage4Finish
                firstPage={pages[0]}
                pdfResult={pdfResult}
                onSaveToDevice={() => savePdfToDevice(pdfResult.completedBytes, pdfResult.completedFileName)}
                onShareOrEmail={async () => {
                  const res = await sharePdfFile(pdfResult.completedBytes, pdfResult.completedFileName, docTitle);
                  if (res.fallbackNeeded) {
                    savePdfToDevice(pdfResult.completedBytes, pdfResult.completedFileName);
                    window.location.href = `mailto:?subject=${encodeURIComponent(`Completed Document: ${docTitle}`)}`;
                  }
                }}
                onClose={onClose}
              />
            )}
          </div>

        </WaypointWavyBackdrop>

        {/* Adjust Edges Sub-Modal */}
        {rawCaptureDataUrl && detectedCorners && (
          <WaypointAdjustEdgesModal
            isOpen={showAdjustEdgesModal}
            onClose={() => setShowAdjustEdgesModal(false)}
            imageSrc={rawCaptureDataUrl}
            initialCorners={detectedCorners}
            onApplyCorners={handleApplyAdjustedCorners}
          />
        )}

        {/* Signature Pad Sub-Modal */}
        <WaypointSignaturePad
          isOpen={showSignaturePad}
          onClose={() => setShowSignaturePad(false)}
          onSave={handleSaveSignature}
        />

        {/* Text Input Dialog */}
        <Dialog open={textPromptOpen} onOpenChange={setTextPromptOpen}>
          <DialogContent className="max-w-xs overflow-hidden bg-[#061325] border-blue-900/60 text-white rounded-3xl p-0 shadow-2xl z-[1150]">
            <WaypointWavyBackdrop className="p-4 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold flex items-center gap-1.5 text-amber-400">
                  <Type className="w-4 h-4" /> Enter Text
                </p>
                <WaypointWaveIcon className="w-5 h-3 text-amber-400/80" />
              </div>
              <input
                value={textInputValue}
                onChange={(e) => setTextInputValue(e.target.value)}
                placeholder="Type notes or values..."
                className="w-full bg-[#091C36]/80 border border-blue-800/50 text-white text-xs h-9 px-3 rounded-xl mb-3 outline-none focus:border-amber-400 transition-colors"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleSaveTextAnnotation()}
              />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => setTextPromptOpen(false)} className="text-xs h-8 text-blue-200 hover:bg-white/10 rounded-lg">
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveTextAnnotation} className="bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs h-8 px-4 rounded-lg shadow-md cursor-pointer">
                  Place
                </Button>
              </div>
            </WaypointWavyBackdrop>
          </DialogContent>
        </Dialog>

        {/* Initials Input Dialog */}
        <Dialog open={initialsPromptOpen} onOpenChange={setInitialsPromptOpen}>
          <DialogContent className="max-w-xs overflow-hidden bg-[#061325] border-blue-900/60 text-white rounded-3xl p-0 shadow-2xl z-[1150]">
            <WaypointWavyBackdrop className="p-4 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-amber-400">
                  Enter Your Initials
                </p>
                <WaypointWaveIcon className="w-5 h-3 text-amber-400/80" />
              </div>
              <input
                value={initialsInputValue}
                onChange={(e) => setInitialsInputValue(e.target.value.toUpperCase())}
                maxLength={4}
                placeholder="BH"
                className="w-full bg-[#091C36]/80 border border-blue-800/50 text-white text-center font-black text-sm tracking-widest h-9 px-3 rounded-xl mb-3 uppercase outline-none focus:border-amber-400 transition-colors"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleSaveInitials()}
              />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => setInitialsPromptOpen(false)} className="text-xs h-8 text-blue-200 hover:bg-white/10 rounded-lg">
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveInitials} className="bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs h-8 px-4 rounded-lg shadow-md cursor-pointer">
                  Set
                </Button>
              </div>
            </WaypointWavyBackdrop>
          </DialogContent>
        </Dialog>

      </DialogContent>
    </Dialog>
  );
}

export default WaypointScanModal;
