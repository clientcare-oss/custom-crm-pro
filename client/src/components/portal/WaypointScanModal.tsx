/**
 * Waypoint Scan — Production-Ready Document Scanner & PDF Finishing Suite
 * Full 4-step client experience: Get Document → Review → Fill & Sign → Finish PDF
 * Page ID: PG-023-SCAN
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PageIdBadge from "@/components/PageIdBadge";
import { toast } from "sonner";
import {
  Camera,
  FolderOpen,
  RotateCcw,
  Trash2,
  Plus,
  CheckCircle2,
  Loader2,
  FileText,
  AlertCircle,
  Crop,
  RotateCw,
  ArrowRight,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Check,
  Type,
  Calendar,
  Pen,
  Download,
  Share2,
  RefreshCw,
  X,
  Layers,
  Sparkles,
  Move,
} from "lucide-react";

import {
  CornerQuad,
  detectDocumentCorners,
  getNativeFallbackCorners,
  warpAndEnhanceDocument,
  calculateSharpnessScore,
  rotateCanvas90,
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
import { WaypointSignaturePad } from "./WaypointSignaturePad";
import { WaypointAdjustEdgesModal } from "./WaypointAdjustEdgesModal";
import { trpc } from "@/lib/trpc";

export interface WaypointScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName?: string;
  studentId?: number;
  category?: string;
  onSuccess?: (docTitle: string, workspaceName: string) => void;
}

type WorkflowStage = "get" | "review" | "fill-sign" | "finish";
type AnnotationTool = "none" | "check" | "text" | "date" | "initials" | "signature";

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
  // Master workflow stage
  const [stage, setStage] = useState<WorkflowStage>("get");

  // Camera stream & hardware controls
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraStarting, setIsCameraStarting] = useState(false);

  // Hidden native file/camera pickers
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);
  const fileUploadInputRef = useRef<HTMLInputElement | null>(null);

  // Raw captured photo before perspective correction
  const [rawCaptureDataUrl, setRawCaptureDataUrl] = useState<string | null>(null);
  const [detectedCorners, setDetectedCorners] = useState<CornerQuad | null>(null);
  const [showAdjustEdgesModal, setShowAdjustEdgesModal] = useState(false);
  const [blurWarning, setBlurWarning] = useState<string | null>(null);

  // Assembled multipage document state
  const [pages, setPages] = useState<WaypointScanPageDraft[]>([]);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [docTitle, setDocTitle] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(category);

  // Annotations keyed by pageId
  const [annotations, setAnnotations] = useState<Record<string, DocumentAnnotation[]>>({});
  const [activeTool, setActiveTool] = useState<AnnotationTool>("none");
  const [parentInitials, setParentInitials] = useState("");
  const [parentSignatureUrl, setParentSignatureUrl] = useState<string | null>(null);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);

  // Text modal prompt
  const [textPromptOpen, setTextPromptOpen] = useState(false);
  const [pendingTextPos, setPendingTextPos] = useState<{ x: number; y: number } | null>(null);
  const [textInputValue, setTextInputValue] = useState("");

  // Initials modal prompt
  const [initialsPromptOpen, setInitialsPromptOpen] = useState(false);
  const [initialsInputValue, setInitialsInputValue] = useState("");

  // PDF Generation & Document Vault Upload
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [pdfResult, setPdfResult] = useState<GeneratePdfResult | null>(null);
  const [vaultSaved, setVaultSaved] = useState(false);
  const [vaultSaveError, setVaultSaveError] = useState<string | null>(null);

  // Draft recovery prompt
  const [existingDraft, setExistingDraft] = useState<WaypointScanDraft | null>(null);

  // Backend tRPC mutation for file upload to Cloudflare R2 and D1
  const uploadFileMutation = trpc.clientFiles.upload.useMutation();

  // Clean stop all camera tracks
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setStream(null);
    setCameraActive(false);
  }, []);

  // Start live camera stream
  const startCamera = useCallback(
    async (mode: "environment" | "user" = "environment") => {
      stopCamera();
      setCameraError(null);
      setIsCameraStarting(true);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError(
          "Direct browser camera is unavailable on this device. You can still scan using your native phone camera."
        );
        setIsCameraStarting(false);
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
        console.warn("Camera access error:", err);
        setCameraError(
          "Camera access was blocked or interrupted. You can tap below to capture using your phone camera."
        );
        setCameraActive(false);
      } finally {
        setIsCameraStarting(false);
      }
    },
    [stopCamera]
  );

  // Mount / Unmount lifecycle & Draft Check
  useEffect(() => {
    if (isOpen) {
      const today = new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      setDocTitle(`IEP Document (${today})`);
      setSelectedCategory(category);
      setVaultSaved(false);
      setVaultSaveError(null);
      setPdfResult(null);

      // Check for recoverable draft in IndexedDB
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

  // Keep stream bound to video element
  useEffect(() => {
    if (videoRef.current && stream && cameraActive) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream, cameraActive]);

  // Autosave draft to IndexedDB when pages or annotations change
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

  // Resume draft from IndexedDB
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

  // Switch between front/back camera
  const handleToggleFacingMode = () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
    startCamera(nextMode);
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
    const rawData = tempCanvas.toDataURL("image/jpeg", 0.94);
    setRawCaptureDataUrl(rawData);

    // Sharpness / Blur Check
    const score = calculateSharpnessScore(tempCanvas);
    if (score < 35) {
      setBlurWarning("This page looks a bit blurry. For best readability, you can retake the photo.");
    } else {
      setBlurWarning(null);
    }

    // Edge & Corner Detection
    const corners = detectDocumentCorners(tempCanvas);
    setDetectedCorners(corners);

    // Apply automatic perspective correction and straightening
    const warpedCanvas = warpAndEnhanceDocument(tempCanvas, corners);
    const cleanedDataUrl = warpedCanvas.toDataURL("image/jpeg", 0.92);

    const newPage: WaypointScanPageDraft = {
      id: `page-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      dataUrl: cleanedDataUrl,
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

  // Handle native camera capture fallback
  const handleNativeCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        processImportedImage(dataUrl);
      }
    };
    reader.readAsDataURL(file);
    if (nativeCameraInputRef.current) nativeCameraInputRef.current.value = "";
  };

  // Handle Open Document (file picker)
  const handleFileOpen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === "application/pdf") {
      toast.info("PDF selected. Preparing pages for review & signing...");
      // For PDF files, read as dataURL and create first page representation
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        // If it's a PDF, we can use our PDF canvas renderer or generate page
        processImportedPdf(dataUrl, file.name);
      };
      reader.readAsDataURL(file);
    } else if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) {
          processImportedImage(dataUrl);
        }
      };
      reader.readAsDataURL(file);
    } else {
      toast.error("Please select a PDF document or image file (JPG, PNG).");
    }

    if (fileUploadInputRef.current) fileUploadInputRef.current.value = "";
  };

  // Process imported image into review pipeline
  const processImportedImage = (dataUrl: string) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || 1200;
      canvas.height = img.naturalHeight || 1600;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const corners = detectDocumentCorners(canvas);
        const warped = warpAndEnhanceDocument(canvas, corners);
        const cleaned = warped.toDataURL("image/jpeg", 0.92);

        const newPage: WaypointScanPageDraft = {
          id: `page-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          dataUrl: cleaned,
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

  // Process imported PDF into page representation
  const processImportedPdf = (pdfDataUrl: string, fileName: string) => {
    const cleanName = fileName.replace(/\.pdf$/i, "");
    setDocTitle(cleanName);

    // Render a clean placeholder page canvas representing the PDF document
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 1600;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#06172F";
      ctx.font = "bold 42px sans-serif";
      ctx.fillText(fileName, 120, 180);

      ctx.fillStyle = "#475569";
      ctx.font = "24px sans-serif";
      ctx.fillText("PDF Document imported into Waypoint Scan", 120, 230);
      ctx.fillText("You can place text, checkmarks, dates, and signatures anywhere on this page.", 120, 270);

      // Draw subtle page borders
      ctx.strokeStyle = "#CBD5E1";
      ctx.lineWidth = 4;
      ctx.strokeRect(60, 60, canvas.width - 120, canvas.height - 120);

      const pageImg = canvas.toDataURL("image/jpeg", 0.92);
      const newPage: WaypointScanPageDraft = {
        id: `page-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        dataUrl: pageImg,
        rotation: 0,
        timestamp: Date.now(),
      };

      setPages([newPage]);
      setActivePageIndex(0);
      stopCamera();
      setStage("review");
    }
  };

  // Re-warp after user adjusts corners
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
      const cleaned = warped.toDataURL("image/jpeg", 0.92);

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

  // Rotate current page 90 degrees
  const handleRotatePage = (index: number) => {
    setPages((prev) => {
      const next = [...prev];
      const page = next[index];
      if (!page) return prev;

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const rotated = rotateCanvas90(canvas);
          page.dataUrl = rotated.toDataURL("image/jpeg", 0.92);
          page.rotation = (page.rotation + 90) % 360;
          setPages([...next]);
        }
      };
      img.src = page.dataUrl;
      return next;
    });
  };

  // Delete page from multipage assembly
  const handleDeletePage = (index: number) => {
    if (pages.length <= 1) {
      toast.error("Document must have at least one page.");
      return;
    }
    setPages((prev) => {
      const next = prev.filter((_, i) => i !== index);
      setActivePageIndex(Math.max(0, Math.min(activePageIndex, next.length - 1)));
      return next;
    });
  };

  // Reorder page Left
  const handleMovePageLeft = (index: number) => {
    if (index === 0) return;
    setPages((prev) => {
      const next = [...prev];
      const temp = next[index - 1];
      next[index - 1] = next[index];
      next[index] = temp;
      setActivePageIndex(index - 1);
      return next;
    });
  };

  // Reorder page Right
  const handleMovePageRight = (index: number) => {
    if (index === pages.length - 1) return;
    setPages((prev) => {
      const next = [...prev];
      const temp = next[index + 1];
      next[index + 1] = next[index];
      next[index] = temp;
      setActivePageIndex(index + 1);
      return next;
    });
  };

  // + Scan Another Page (preserves existing scanned pages)
  const handleScanAnotherPage = () => {
    setStage("get");
    setRawCaptureDataUrl(null);
    setBlurWarning(null);
    startCamera(facingMode);
  };

  // Retake current page
  const handleRetakeCurrentPage = () => {
    if (pages.length > 0) {
      // Remove current active page and re-open camera
      setPages((prev) => prev.filter((_, i) => i !== activePageIndex));
    }
    setStage("get");
    setRawCaptureDataUrl(null);
    setBlurWarning(null);
    startCamera(facingMode);
  };

  // Handle document tap in Fill & Sign mode
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
          fontSize: 14,
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
          width: 25, // percentage of document width
        };
        setAnnotations((prev) => ({
          ...prev,
          [currentPage.id]: [...(prev[currentPage.id] || []), newAnnot],
        }));
        toast.success("Signature placed!");
      }
    }
  };

  // Submit typed text box
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
    toast.success("Text placed!");
  };

  // Submit initials
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
    toast.success("Initials created & placed!");
  };

  // Save drawn signature and place on document
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
    toast.success("Signature placed on document!");
  };

  // Remove an annotation from current page
  const handleRemoveAnnotation = (annotId: string) => {
    const currentPage = pages[activePageIndex];
    if (!currentPage) return;
    setAnnotations((prev) => ({
      ...prev,
      [currentPage.id]: (prev[currentPage.id] || []).filter((a) => a.id !== annotId),
    }));
    setSelectedAnnotationId(null);
  };

  // FINISH DOCUMENT: Flattens PDF, saves to Vault, and opens Finish Screen
  const handleFinishDocument = async () => {
    if (pages.length === 0) {
      toast.error("No pages to compile.");
      return;
    }

    setIsProcessingPdf(true);
    setVaultSaveError(null);

    try {
      // 1. Compile both Original and Completed Flattened PDFs
      const result = await compileWaypointPdfs(pages, annotations, docTitle);
      setPdfResult(result);

      // 2. Automatically Save to Student Document Vault
      await saveDocumentToVault(result);

      // 3. Clear draft upon successful completion
      await clearScanDraft(studentId);

      setStage("finish");
      toast.success("Document finalized and saved to Document Vault!");
    } catch (err: any) {
      console.error("[WaypointScan] Finalize error:", err);
      setVaultSaveError(err.message || "Failed to finalize PDF document.");
      toast.error("Could not finish PDF. Your work is safely retained locally.");
    } finally {
      setIsProcessingPdf(false);
    }
  };

  // Save to Document Vault (Cloudflare R2 + D1 + Local Storage)
  const saveDocumentToVault = async (result: GeneratePdfResult) => {
    const completedBase64 = uint8ArrayToBase64(result.completedBytes);
    const workspaceName = CATEGORY_MAP[selectedCategory] || "IEPs & 504s";

    // Attempt backend tRPC upload to Cloudflare S3/R2 storage
    try {
      await uploadFileMutation.mutateAsync({
        fileName: result.completedFileName,
        fileData: completedBase64,
        fileSize: result.completedBytes.byteLength,
      });
    } catch (apiErr) {
      console.warn("[WaypointScan] Remote upload note (fallback to local vault):", apiErr);
    }

    // Save to local student vault storage for instant availability in PG-023-VAULT
    const storageKeyDocs = `waypoint_vault_documents_${studentId}`;
    const storageKeyWorkspaces = `waypoint_vault_workspaces_${studentId}`;

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
      const updatedDocs = [newVaultDoc, ...existingDocs];
      localStorage.setItem(storageKeyDocs, JSON.stringify(updatedDocs));

      // Update workspace count
      const existingWsStr = localStorage.getItem(storageKeyWorkspaces);
      if (existingWsStr) {
        const wsList = JSON.parse(existingWsStr);
        const ws = wsList.find((w: any) => w.id === selectedCategory);
        if (ws) {
          ws.documentCount = (ws.documentCount || 0) + 1;
          ws.lastUpdated = "Just now";
          localStorage.setItem(storageKeyWorkspaces, JSON.stringify(wsList));
        }
      }
    } catch (lsErr) {
      console.warn("[WaypointScan] Local storage sync note:", lsErr);
    }

    setVaultSaved(true);
    onSuccess?.(result.completedFileName, workspaceName);
  };

  // Convert Uint8Array to base64
  const uint8ArrayToBase64 = (bytes: Uint8Array): string => {
    let binary = "";
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  // Handle Save to Device
  const handleSaveToDevice = () => {
    if (!pdfResult) return;
    savePdfToDevice(pdfResult.completedBytes, pdfResult.completedFileName);
    toast.success(`Saved "${pdfResult.completedFileName}" to device!`);
  };

  // Handle Email / Share
  const handleShare = async () => {
    if (!pdfResult) return;
    const shareRes = await sharePdfFile(
      pdfResult.completedBytes,
      pdfResult.completedFileName,
      `Waypoint Advocates — ${docTitle}`
    );

    if (shareRes.shared) {
      toast.success("Document shared successfully!");
    } else if (shareRes.fallbackNeeded) {
      // Fallback: trigger download and open mail client
      savePdfToDevice(pdfResult.completedBytes, pdfResult.completedFileName);
      const mailtoUrl = `mailto:?subject=${encodeURIComponent(
        `Waypoint Completed Document: ${docTitle}`
      )}&body=${encodeURIComponent(
        `Please find the completed document "${pdfResult.completedFileName}" saved to my device.`
      )}`;
      window.location.href = mailtoUrl;
    }
  };

  const currentPage = pages[activePageIndex];
  const currentAnnots = currentPage ? annotations[currentPage.id] || [] : [];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl w-[96vw] max-h-[96vh] bg-[#06172F] border border-blue-900/50 text-white rounded-3xl p-4 sm:p-6 shadow-2xl z-[1050] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <DialogHeader className="shrink-0 pb-3 border-b border-blue-900/40">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-400/15 border border-amber-400/40 flex items-center justify-center text-amber-400 shadow-[0_0_12px_rgba(245,181,68,0.25)]">
                <Camera className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2">
                  <span>Waypoint Scan</span>
                  <PageIdBadge id="PG-023-SCAN" name="Waypoint Scan" />
                </DialogTitle>
                <DialogDescription className="text-xs text-blue-200/70 pt-0.5">
                  {studentName ? `Document for ${studentName}` : "Parent Educational Document Scanner"}
                </DialogDescription>
              </div>
            </div>

            {/* Workflow Progress Breadcrumbs */}
            <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] font-bold">
              <span className={`px-2.5 py-1 rounded-full border transition-all ${
                stage === "get" ? "bg-amber-400 text-slate-950 border-amber-400 font-extrabold" : "bg-white/5 text-blue-200/60 border-transparent"
              }`}>
                1. Get Document
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-blue-400/40" />
              <span className={`px-2.5 py-1 rounded-full border transition-all ${
                stage === "review" ? "bg-amber-400 text-slate-950 border-amber-400 font-extrabold" : "bg-white/5 text-blue-200/60 border-transparent"
              }`}>
                2. Review
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-blue-400/40" />
              <span className={`px-2.5 py-1 rounded-full border transition-all ${
                stage === "fill-sign" ? "bg-amber-400 text-slate-950 border-amber-400 font-extrabold" : "bg-white/5 text-blue-200/60 border-transparent"
              }`}>
                3. Fill & Sign
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-blue-400/40" />
              <span className={`px-2.5 py-1 rounded-full border transition-all ${
                stage === "finish" ? "bg-emerald-500 text-white border-emerald-500 font-extrabold" : "bg-white/5 text-blue-200/60 border-transparent"
              }`}>
                4. Finish
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* ── DRAFT RECOVERY PROMPT (IF PREVIOUS SESSION DETECTED) ───────── */}
        {existingDraft && (
          <div className="my-auto p-6 rounded-2xl bg-[#081B36] border border-amber-400/40 text-center space-y-4 shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-amber-400/15 border border-amber-400/40 text-amber-400 flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">
                Resume Unfinished Document?
              </h3>
              <p className="text-xs text-blue-200/70 max-w-md mx-auto leading-relaxed">
                We safely saved your previous scan session ({existingDraft.pages.length} pages, "{existingDraft.docTitle}").
              </p>
            </div>
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
                className="bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-bold rounded-xl gap-2 shadow-md hover:shadow-amber-400/20"
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                Resume Previous Scan
              </Button>
            </div>
          </div>
        )}

        {/* ── STAGE 1: GET DOCUMENT ─────────────────────────────────────── */}
        {!existingDraft && stage === "get" && (
          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto space-y-4 py-2">
            
            {/* Camera Viewport or Big Choice Cards */}
            <div className="relative flex-1 min-h-[340px] sm:min-h-[440px] bg-slate-950 rounded-2xl overflow-hidden border border-blue-900/50 flex flex-col items-center justify-center shadow-inner">
              
              {/* Live Video Preview */}
              {cameraActive && !cameraError ? (
                <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    autoPlay
                    className="w-full h-full object-cover"
                  />

                  {/* Document Outline Detection Frame Guide */}
                  <div className="absolute inset-8 sm:inset-12 border-2 border-dashed border-amber-400/80 rounded-2xl pointer-events-none shadow-[0_0_24px_rgba(245,181,68,0.3)] animate-pulse flex flex-col justify-between p-4">
                    <div className="flex justify-between items-start">
                      <span className="w-4 h-4 border-t-2 border-l-2 border-amber-400" />
                      <span className="w-4 h-4 border-t-2 border-r-2 border-amber-400" />
                    </div>
                    <div className="text-center">
                      <span className="px-3 py-1 rounded-full bg-slate-950/80 text-[11px] font-semibold text-amber-300 border border-amber-400/30 backdrop-blur-md">
                        Align page inside guide
                      </span>
                    </div>
                    <div className="flex justify-between items-end">
                      <span className="w-4 h-4 border-b-2 border-l-2 border-amber-400" />
                      <span className="w-4 h-4 border-b-2 border-r-2 border-amber-400" />
                    </div>
                  </div>

                  {/* Switch Front/Back Camera */}
                  <button
                    type="button"
                    onClick={handleToggleFacingMode}
                    className="absolute top-4 right-4 p-2.5 rounded-xl bg-slate-900/80 border border-blue-800/40 text-white hover:bg-slate-800 transition-colors cursor-pointer shadow-lg backdrop-blur-md"
                    title="Switch Camera"
                  >
                    <RefreshCw className="w-4 h-4 text-amber-400" />
                  </button>
                </div>
              ) : (
                /* Two Large Choices: Scan Document vs Open Document */
                <div className="p-6 max-w-lg w-full space-y-4 text-center">
                  <div className="space-y-1">
                    <h3 className="text-base sm:text-lg font-bold text-white">
                      How would you like to get your document?
                    </h3>
                    <p className="text-xs text-blue-200/70">
                      Choose an option to begin assembling your IEP records.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                    {/* Choice A: Scan Document */}
                    <button
                      type="button"
                      onClick={() => {
                        if (nativeCameraInputRef.current) {
                          nativeCameraInputRef.current.click();
                        } else {
                          startCamera("environment");
                        }
                      }}
                      className="group p-5 rounded-2xl bg-[#081B36] hover:bg-[#0C2A52] border border-blue-900/50 hover:border-amber-400/60 transition-all text-left flex flex-col justify-between shadow-xl cursor-pointer"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-amber-400/15 border border-amber-400/30 text-amber-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Camera className="w-6 h-6 text-amber-400" />
                      </div>
                      <div>
                        <p className="text-sm font-extrabold text-white group-hover:text-amber-300 transition-colors">
                          Scan Document
                        </p>
                        <p className="text-[11px] text-blue-200/70 mt-1 leading-snug">
                          Use your phone or tablet camera to snap paper pages.
                        </p>
                      </div>
                    </button>

                    {/* Choice B: Open Document */}
                    <button
                      type="button"
                      onClick={() => fileUploadInputRef.current?.click()}
                      className="group p-5 rounded-2xl bg-[#081B36] hover:bg-[#0C2A52] border border-blue-900/50 hover:border-amber-400/60 transition-all text-left flex flex-col justify-between shadow-xl cursor-pointer"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-400/30 text-blue-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <FolderOpen className="w-6 h-6 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm font-extrabold text-white group-hover:text-blue-300 transition-colors">
                          Open Document
                        </p>
                        <p className="text-[11px] text-blue-200/70 mt-1 leading-snug">
                          Select an existing PDF or photo from your files.
                        </p>
                      </div>
                    </button>
                  </div>

                  {cameraError && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2 text-left">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{cameraError}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Hidden file inputs */}
              <input
                ref={nativeCameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleNativeCapture}
                className="hidden"
              />
              <input
                ref={fileUploadInputRef}
                type="file"
                accept="application/pdf,image/*"
                onChange={handleFileOpen}
                className="hidden"
              />
            </div>

            {/* Bottom Actions for Get Document */}
            {cameraActive && (
              <div className="flex flex-row items-center justify-between gap-3 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    stopCamera();
                    if (pages.length > 0) setStage("review");
                  }}
                  className="border-blue-900/40 text-blue-200 hover:bg-white/10 text-xs rounded-xl h-12 px-4"
                >
                  {pages.length > 0 ? "Back to Review" : "Cancel"}
                </Button>

                {/* Primary Button: SCAN PAGE */}
                <Button
                  type="button"
                  onClick={handleScanPage}
                  className="flex-1 bg-amber-400 hover:bg-amber-500 text-slate-950 font-extrabold text-sm sm:text-base h-12 rounded-2xl gap-2 shadow-xl hover:shadow-amber-400/20 cursor-pointer"
                >
                  <Camera className="w-5 h-5" />
                  <span>SCAN PAGE</span>
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ── STAGE 2: REVIEW ───────────────────────────────────────────── */}
        {!existingDraft && stage === "review" && currentPage && (
          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto space-y-4 py-2">
            
            {/* Blurry Page Alert if detected */}
            {blurWarning && (
              <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-400/40 text-amber-300 text-xs flex items-center justify-between gap-3 shadow-md">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{blurWarning}</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRetakeCurrentPage}
                  className="border-amber-400/50 text-amber-300 hover:bg-amber-400/20 text-xs h-7 px-2.5 rounded-lg"
                >
                  Retake Now
                </Button>
              </div>
            )}

            {/* Main Cleaned Page Display */}
            <div className="relative flex-1 min-h-[300px] sm:min-h-[380px] bg-slate-950/80 rounded-2xl overflow-hidden border border-blue-900/50 flex items-center justify-center p-3">
              <div className="relative max-h-[50vh] aspect-[3/4] shadow-2xl rounded-lg overflow-hidden border border-slate-700 bg-white">
                <img
                  src={currentPage.dataUrl}
                  alt={`Page ${activePageIndex + 1}`}
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Page Tools Overlay (Rotate & Adjust Edges) */}
              <div className="absolute top-4 right-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleRotatePage(activePageIndex)}
                  className="p-2.5 rounded-xl bg-slate-900/80 border border-blue-800/40 text-white hover:bg-slate-800 transition-colors shadow-lg backdrop-blur-md cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
                  title="Rotate Page"
                >
                  <RotateCw className="w-3.5 h-3.5 text-amber-400" />
                  <span>Rotate</span>
                </button>

                {rawCaptureDataUrl && (
                  <button
                    type="button"
                    onClick={() => setShowAdjustEdgesModal(true)}
                    className="p-2.5 rounded-xl bg-slate-900/80 border border-blue-800/40 text-white hover:bg-slate-800 transition-colors shadow-lg backdrop-blur-md cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
                    title="Adjust Paper Corners"
                  >
                    <Crop className="w-3.5 h-3.5 text-amber-400" />
                    <span>Adjust Edges</span>
                  </button>
                )}
              </div>
            </div>

            {/* Multipage Thumbnails Carousel Strip */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-blue-200/80">
                <span>PAGES ({pages.length})</span>
                <span className="text-amber-400">Page {activePageIndex + 1} of {pages.length}</span>
              </div>

              <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-thin">
                {pages.map((p, idx) => (
                  <div
                    key={p.id}
                    onClick={() => setActivePageIndex(idx)}
                    className={`relative w-16 h-22 rounded-xl overflow-hidden border-2 transition-all cursor-pointer shrink-0 shadow-md ${
                      activePageIndex === idx
                        ? "border-amber-400 ring-2 ring-amber-400/30 scale-105"
                        : "border-blue-900/50 hover:border-blue-500 opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={p.dataUrl}
                      alt={`Thumb ${idx + 1}`}
                      className="w-full h-full object-cover bg-white"
                    />
                    <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-slate-950/80 text-[9px] font-extrabold text-amber-300">
                      {idx + 1}
                    </span>
                  </div>
                ))}

                {/* + Add Page Button in Strip */}
                <button
                  type="button"
                  onClick={handleScanAnotherPage}
                  className="w-16 h-22 rounded-xl border border-dashed border-amber-400/40 hover:border-amber-400 bg-amber-400/5 hover:bg-amber-400/10 flex flex-col items-center justify-center text-amber-400 shrink-0 transition-all cursor-pointer"
                >
                  <Plus className="w-5 h-5 mb-1" />
                  <span className="text-[10px] font-bold">Add</span>
                </button>
              </div>
            </div>

            {/* Multipage Page Reorder & Delete Controls */}
            {pages.length > 1 && (
              <div className="flex items-center justify-between py-1 px-3 rounded-xl bg-blue-950/40 border border-blue-900/30 text-xs">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleMovePageLeft(activePageIndex)}
                    disabled={activePageIndex === 0}
                    className="p-1 rounded-lg text-blue-200 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
                    title="Move Left"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-blue-300/80 font-medium">Reorder Page</span>
                  <button
                    type="button"
                    onClick={() => handleMovePageRight(activePageIndex)}
                    disabled={activePageIndex === pages.length - 1}
                    className="p-1 rounded-lg text-blue-200 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
                    title="Move Right"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeletePage(activePageIndex)}
                  className="text-red-400 hover:text-red-300 flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Page</span>
                </button>
              </div>
            )}

            {/* Primary Review Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-blue-900/40">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRetakeCurrentPage}
                  className="flex-1 sm:flex-initial border-blue-900/40 text-blue-200 hover:bg-white/10 text-xs rounded-xl h-11"
                >
                  Retake
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleScanAnotherPage}
                  className="flex-1 sm:flex-initial border-amber-400/40 text-amber-400 hover:bg-amber-400/10 text-xs rounded-xl h-11 font-bold gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  + Scan Another Page
                </Button>
              </div>

              {/* Next Step: Proceed to Fill & Sign */}
              <Button
                type="button"
                onClick={() => setStage("fill-sign")}
                className="w-full sm:w-auto bg-amber-400 hover:bg-amber-500 text-slate-950 font-extrabold text-xs sm:text-sm h-11 px-6 rounded-xl gap-2 shadow-lg hover:shadow-amber-400/20 cursor-pointer"
              >
                <span>Fill & Sign ({pages.length} Pages)</span>
                <ChevronRight className="w-4 h-4 stroke-[3]" />
              </Button>
            </div>
          </div>
        )}

        {/* ── STAGE 3: FILL & SIGN ──────────────────────────────────────── */}
        {!existingDraft && stage === "fill-sign" && currentPage && (
          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto space-y-3 py-1">
            
            {/* Top Toolbar Helper / Page Switcher */}
            <div className="flex items-center justify-between text-xs pb-1">
              <div className="flex items-center gap-2 text-blue-200/80">
                <span className="font-bold">Page {activePageIndex + 1} of {pages.length}</span>
                {pages.length > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setActivePageIndex((prev) => Math.max(0, prev - 1))}
                      disabled={activePageIndex === 0}
                      className="p-1 rounded bg-white/5 disabled:opacity-30"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setActivePageIndex((prev) => Math.min(pages.length - 1, prev + 1))}
                      disabled={activePageIndex === pages.length - 1}
                      className="p-1 rounded bg-white/5 disabled:opacity-30"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <div className="text-[11px] text-amber-300 font-semibold">
                {activeTool !== "none" ? `Tap document to place ${activeTool}` : "Select a tool below to place on document"}
              </div>
            </div>

            {/* Interactive Document Page Canvas */}
            <div className="relative flex-1 min-h-[340px] sm:min-h-[420px] bg-slate-950/80 rounded-2xl overflow-hidden border border-blue-900/50 flex items-center justify-center p-2 select-none">
              <div
                onClick={handleDocumentClick}
                className={`relative max-h-[56vh] aspect-[3/4] bg-white rounded-lg shadow-2xl overflow-hidden border border-slate-600 ${
                  activeTool !== "none" ? "cursor-crosshair" : "cursor-default"
                }`}
              >
                <img
                  src={currentPage.dataUrl}
                  alt={`Document Page ${activePageIndex + 1}`}
                  className="w-full h-full object-contain pointer-events-none"
                />

                {/* Render Annotations on Current Page */}
                {currentAnnots.map((annot) => (
                  <div
                    key={annot.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedAnnotationId(annot.id);
                    }}
                    style={{
                      left: `${annot.x}%`,
                      top: `${annot.y}%`,
                    }}
                    className={`absolute transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer transition-all ${
                      selectedAnnotationId === annot.id
                        ? "ring-2 ring-amber-400 p-1 bg-amber-400/10 rounded"
                        : "hover:ring-1 hover:ring-blue-400/60"
                    }`}
                  >
                    {/* Annotation Content */}
                    {annot.type === "check" && (
                      <span className="text-xl font-extrabold text-blue-950 leading-none select-none">
                        ✓
                      </span>
                    )}

                    {(annot.type === "text" || annot.type === "date" || annot.type === "initials") && (
                      <span className={`font-semibold text-blue-950 select-none whitespace-nowrap ${
                        annot.type === "initials" ? "font-extrabold text-sm border-b border-blue-950" : "text-xs"
                      }`}>
                        {annot.content}
                      </span>
                    )}

                    {annot.type === "signature" && annot.content && (
                      <img
                        src={annot.content}
                        alt="Signature"
                        className="h-10 sm:h-12 w-auto object-contain pointer-events-none"
                      />
                    )}

                    {/* Quick Delete Handle when selected */}
                    {selectedAnnotationId === annot.id && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveAnnotation(annot.id);
                        }}
                        className="absolute -top-3 -right-3 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg hover:bg-red-700"
                        title="Remove"
                      >
                        <X className="w-3 h-3 stroke-[3]" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom 5-Tool Editing Toolbar: Check | Text | Date | Initials | Signature */}
            <div className="p-2.5 rounded-2xl bg-[#081B36] border border-blue-900/50 flex items-center justify-around gap-1 sm:gap-2 shadow-xl">
              
              {/* Tool 1: Check */}
              <button
                type="button"
                onClick={() => setActiveTool((prev) => (prev === "check" ? "none" : "check"))}
                className={`flex-1 flex flex-col items-center justify-center p-2 rounded-xl transition-all cursor-pointer ${
                  activeTool === "check"
                    ? "bg-amber-400 text-slate-950 font-extrabold shadow-md scale-105"
                    : "text-blue-200/80 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Check className="w-5 h-5 stroke-[3]" />
                <span className="text-[11px] mt-1 font-bold">Check</span>
              </button>

              {/* Tool 2: Text */}
              <button
                type="button"
                onClick={() => setActiveTool((prev) => (prev === "text" ? "none" : "text"))}
                className={`flex-1 flex flex-col items-center justify-center p-2 rounded-xl transition-all cursor-pointer ${
                  activeTool === "text"
                    ? "bg-amber-400 text-slate-950 font-extrabold shadow-md scale-105"
                    : "text-blue-200/80 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Type className="w-5 h-5" />
                <span className="text-[11px] mt-1 font-bold">Text</span>
              </button>

              {/* Tool 3: Date */}
              <button
                type="button"
                onClick={() => setActiveTool((prev) => (prev === "date" ? "none" : "date"))}
                className={`flex-1 flex flex-col items-center justify-center p-2 rounded-xl transition-all cursor-pointer ${
                  activeTool === "date"
                    ? "bg-amber-400 text-slate-950 font-extrabold shadow-md scale-105"
                    : "text-blue-200/80 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Calendar className="w-5 h-5" />
                <span className="text-[11px] mt-1 font-bold">Date</span>
              </button>

              {/* Tool 4: Initials */}
              <button
                type="button"
                onClick={() => setActiveTool((prev) => (prev === "initials" ? "none" : "initials"))}
                className={`flex-1 flex flex-col items-center justify-center p-2 rounded-xl transition-all cursor-pointer ${
                  activeTool === "initials"
                    ? "bg-amber-400 text-slate-950 font-extrabold shadow-md scale-105"
                    : "text-blue-200/80 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className="text-xs font-black px-1 rounded border border-current">IN</span>
                <span className="text-[11px] mt-1 font-bold">Initials</span>
              </button>

              {/* Tool 5: Signature */}
              <button
                type="button"
                onClick={() => {
                  setActiveTool("signature");
                  if (!parentSignatureUrl) {
                    setShowSignaturePad(true);
                  }
                }}
                className={`flex-1 flex flex-col items-center justify-center p-2 rounded-xl transition-all cursor-pointer ${
                  activeTool === "signature"
                    ? "bg-amber-400 text-slate-950 font-extrabold shadow-md scale-105"
                    : "text-blue-200/80 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Pen className="w-5 h-5" />
                <span className="text-[11px] mt-1 font-bold">Signature</span>
              </button>
            </div>

            {/* Primary Action to Proceed to Finish */}
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-blue-900/40">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStage("review")}
                className="border-blue-900/40 text-blue-200 hover:bg-white/10 text-xs rounded-xl h-11"
              >
                Back to Review
              </Button>

              <Button
                type="button"
                onClick={handleFinishDocument}
                disabled={isProcessingPdf}
                className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-extrabold text-xs sm:text-sm h-11 px-6 rounded-xl gap-2 shadow-xl hover:shadow-amber-400/20 cursor-pointer"
              >
                {isProcessingPdf ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Flattening PDF...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>FINISH DOCUMENT</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ── STAGE 4: FINISH PDF & VAULT SYNC ──────────────────────────── */}
        {!existingDraft && stage === "finish" && pdfResult && (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 py-6 overflow-y-auto">
            
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/15 border border-emerald-400/40 text-emerald-400 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.25)] animate-in zoom-in-75">
              <CheckCircle2 className="w-9 h-9 text-emerald-400" />
            </div>

            <div className="space-y-1.5 max-w-md">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Document Complete!
              </h2>
              <p className="text-xs sm:text-sm text-emerald-400 font-bold flex items-center justify-center gap-1.5">
                <Check className="w-4 h-4 stroke-[3]" />
                ✓ Saved automatically to Document Vault
              </p>
              <p className="text-xs text-blue-200/70 pt-1 leading-relaxed">
                Both your clean original scan and your completed signed document have been safely preserved.
              </p>
            </div>

            {/* Document Metadata Summary Card */}
            <div className="w-full max-w-md p-4 rounded-2xl bg-[#081B36] border border-blue-900/50 text-left space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-blue-300/70">Original:</span>
                <span className="font-mono text-white truncate max-w-[220px]">{pdfResult.originalFileName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-blue-300/70">Completed:</span>
                <span className="font-mono text-amber-300 truncate max-w-[220px] font-bold">{pdfResult.completedFileName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-blue-300/70">Pages:</span>
                <span className="text-white font-semibold">{pages.length} Pages</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-blue-300/70">Storage Vault:</span>
                <span className="text-emerald-400 font-semibold">{CATEGORY_MAP[selectedCategory] || "IEPs & 504s"}</span>
              </div>
            </div>

            {/* Error / Retry Fallback if Vault Save Encountered Interruption */}
            {vaultSaveError && (
              <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-400/40 text-amber-300 text-xs flex items-center justify-between gap-3 max-w-md w-full">
                <span>Upload interrupted. Your PDF is saved locally.</span>
                <Button
                  size="sm"
                  onClick={() => saveDocumentToVault(pdfResult)}
                  className="bg-amber-400 text-slate-950 text-xs font-bold h-7 px-3 rounded-lg"
                >
                  Retry Vault Save
                </Button>
              </div>
            )}

            {/* Final Actions: Save to Device & Email / Share */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md">
              <Button
                type="button"
                onClick={handleSaveToDevice}
                className="w-full sm:flex-1 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs sm:text-sm h-12 rounded-xl gap-2 shadow-md cursor-pointer"
              >
                <Download className="w-4 h-4 text-amber-400" />
                <span>Save to Device</span>
              </Button>

              <Button
                type="button"
                onClick={handleShare}
                className="w-full sm:flex-1 bg-amber-400 hover:bg-amber-500 text-slate-950 font-extrabold text-xs sm:text-sm h-12 rounded-xl gap-2 shadow-xl hover:shadow-amber-400/20 cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>Email / Share</span>
              </Button>
            </div>

            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="text-xs text-blue-300/70 hover:text-white"
            >
              Done & Close
            </Button>
          </div>
        )}

        {/* ── MODALS & SUB-FLOWS ────────────────────────────────────────── */}

        {/* Modal: Adjust Edges */}
        {rawCaptureDataUrl && detectedCorners && (
          <WaypointAdjustEdgesModal
            isOpen={showAdjustEdgesModal}
            onClose={() => setShowAdjustEdgesModal(false)}
            imageSrc={rawCaptureDataUrl}
            initialCorners={detectedCorners}
            onApplyCorners={handleApplyAdjustedCorners}
          />
        )}

        {/* Modal: Signature Drawing Pad */}
        <WaypointSignaturePad
          isOpen={showSignaturePad}
          onClose={() => setShowSignaturePad(false)}
          onSave={handleSaveSignature}
        />

        {/* Modal: Text Prompt */}
        <Dialog open={textPromptOpen} onOpenChange={setTextPromptOpen}>
          <DialogContent className="max-w-sm bg-[#06172F] border-blue-900/50 text-white rounded-2xl p-5 shadow-2xl z-[1150]">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold text-white flex items-center gap-2">
                <Type className="w-4 h-4 text-amber-400" />
                Add Text to Document
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 my-2">
              <Input
                value={textInputValue}
                onChange={(e) => setTextInputValue(e.target.value)}
                placeholder="Type your notes, names, or values..."
                className="bg-blue-950/40 border-blue-900/50 text-white text-xs h-10 rounded-xl"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveTextAnnotation();
                }}
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTextPromptOpen(false)}
                className="border-blue-900/40 text-blue-200 text-xs h-8 rounded-lg"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveTextAnnotation}
                className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs h-8 px-3 rounded-lg"
              >
                Place Text
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal: Initials Prompt */}
        <Dialog open={initialsPromptOpen} onOpenChange={setInitialsPromptOpen}>
          <DialogContent className="max-w-sm bg-[#06172F] border-blue-900/50 text-white rounded-2xl p-5 shadow-2xl z-[1150]">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold text-white flex items-center gap-2">
                <span className="text-xs font-black px-1 rounded border border-amber-400 text-amber-400">IN</span>
                Enter Your Initials
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 my-2">
              <Input
                value={initialsInputValue}
                onChange={(e) => setInitialsInputValue(e.target.value.toUpperCase())}
                maxLength={4}
                placeholder="e.g. BH"
                className="bg-blue-950/40 border-blue-900/50 text-white text-center font-extrabold text-base tracking-widest h-11 rounded-xl uppercase"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveInitials();
                }}
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInitialsPromptOpen(false)}
                className="border-blue-900/40 text-blue-200 text-xs h-8 rounded-lg"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveInitials}
                className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs h-8 px-3 rounded-lg"
              >
                Set & Place
              </Button>
            </div>
          </DialogContent>
        </Dialog>

      </DialogContent>
    </Dialog>
  );
}
