import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Upload,
  Play,
  Square,
  ArrowUp,
  ArrowDown,
  GripVertical,
  Pencil,
  Check,
  X,
  RefreshCw,
  Trash2,
  FileText,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  Music2,
  Mic,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  WAYPOINT_RADIO_STATIONS,
  type RadioStationId,
  type WaypointRadioTrack,
} from "@shared/waypointRadio";
import {
  uploadWaypointRadioAudio,
  formatAudioDuration,
  formatAudioFileSize,
} from "@/lib/radioAudioUpload";
import { MoveToStationButton, UnassignedAudioBanner } from "./RadioStationHelpers";

interface UploadItemState {
  id: string;
  fileName: string;
  progress: number;
  status: "uploading" | "done" | "error";
  error?: string;
}

interface RadioMusicTabProps {
  tracks: WaypointRadioTrack[];
  initialStationId: RadioStationId;
  onLibraryChanged: () => void;
}

export function RadioMusicTab({
  tracks,
  initialStationId,
  onLibraryChanged,
}: RadioMusicTabProps) {
  const [selectedStationId, setSelectedStationId] = useState<RadioStationId>(initialStationId);
  const [stationSection, setStationSection] = useState<"music" | "announcements">("music");
  const [isDragOverDropzone, setIsDragOverDropzone] = useState(false);
  const [uploads, setUploads] = useState<UploadItemState[]>([]);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const [previewTrackId, setPreviewTrackId] = useState<number | null>(null);

  const [editingTitleId, setEditingTitleId] = useState<number | null>(null);
  const [editingTitleVal, setEditingTitleVal] = useState("");
  const [expandedNotesId, setExpandedNotesId] = useState<number | null>(null);
  const [notesDraft, setNotesDraft] = useState<{ albumDescription: string; sunoPrompt: string }>({
    albumDescription: "",
    sunoPrompt: "",
  });
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [draggedTrackId, setDraggedTrackId] = useState<number | null>(null);
  const [dragOverTrackId, setDragOverTrackId] = useState<number | null>(null);
  const [replacingTrackId, setReplacingTrackId] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);

  const registerMutation = trpc.waypointRadio.registerTrack.useMutation();
  const updateMutation = trpc.waypointRadio.updateTrack.useMutation();
  const reorderMutation = trpc.waypointRadio.reorderTracks.useMutation();
  const deleteMutation = trpc.waypointRadio.deleteTrack.useMutation();

  const selectedStation = useMemo(
    () => WAYPOINT_RADIO_STATIONS.find((s) => s.id === selectedStationId) || WAYPOINT_RADIO_STATIONS[0],
    [selectedStationId]
  );

  const activeKind = stationSection === "music" ? "music" : "announcement";
  const activeFolder =
    stationSection === "music"
      ? selectedStation.musicFolder
      : selectedStation.announcementsFolder;

  // Strictly sequential ordered tracks for the selected official station & section
  const playlist = useMemo(
    () =>
      tracks
        .filter((t) => t.kind === activeKind && t.stationId === selectedStationId)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id),
    [tracks, activeKind, selectedStationId]
  );

  const musicCountForSelected = useMemo(
    () => tracks.filter((t) => t.kind === "music" && t.stationId === selectedStationId).length,
    [tracks, selectedStationId]
  );
  const annCountForSelected = useMemo(
    () => tracks.filter((t) => t.kind === "announcement" && t.stationId === selectedStationId).length,
    [tracks, selectedStationId]
  );

  const countByStation = useMemo(() => {
    const map: Record<string, number> = {};
    WAYPOINT_RADIO_STATIONS.forEach((s) => {
      map[s.id] = tracks.filter((t) => t.kind === "music" && t.stationId === s.id).length;
    });
    return map;
  }, [tracks]);

  useEffect(() => {
    return () => {
      previewAudioRef.current?.pause();
      previewAudioRef.current = null;
    };
  }, []);

  const stopPreview = () => {
    previewAudioRef.current?.pause();
    setPreviewTrackId(null);
  };

  const togglePreview = (track: WaypointRadioTrack) => {
    if (previewTrackId === track.id) {
      stopPreview();
      return;
    }
    if (!previewAudioRef.current) {
      previewAudioRef.current = new Audio();
      previewAudioRef.current.onended = () => setPreviewTrackId(null);
      previewAudioRef.current.onerror = () => {
        setPreviewTrackId(null);
        toast.error("Could not preview this audio file.");
      };
    }
    previewAudioRef.current.src = track.fileUrl;
    previewAudioRef.current.currentTime = 0;
    setPreviewTrackId(track.id);
    void previewAudioRef.current.play().catch(() => {
      setPreviewTrackId(null);
      toast.error("Audio preview could not start.");
    });
  };

  const handleUploadFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;
    setBanner(null);

    let successCount = 0;
    let failCount = 0;

    for (const file of files) {
      const uid = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      setUploads((prev) => [...prev, { id: uid, fileName: file.name, progress: 2, status: "uploading" }]);
      try {
        const uploaded = await uploadWaypointRadioAudio(file, activeFolder, (pct) => {
          setUploads((prev) => prev.map((u) => (u.id === uid ? { ...u, progress: pct } : u)));
        });
        await registerMutation.mutateAsync({
          kind: activeKind,
          stationId: selectedStation.id,
          title: uploaded.suggestedTitle,
          fileName: uploaded.fileName,
          fileKey: uploaded.fileKey,
          fileUrl: uploaded.fileUrl,
          mimeType: uploaded.mimeType,
          fileSize: uploaded.fileSize,
          durationSec: uploaded.durationSec,
          albumDescription: "",
          sunoPrompt: "",
        });
        setUploads((prev) => prev.map((u) => (u.id === uid ? { ...u, progress: 100, status: "done" } : u)));
        successCount += 1;
      } catch (err: any) {
        failCount += 1;
        const msg = err?.message || "Upload failed";
        setUploads((prev) =>
          prev.map((u) => (u.id === uid ? { ...u, status: "error", error: msg } : u))
        );
      }
    }

    onLibraryChanged();

    const itemNoun = stationSection === "music" ? "song" : "announcement";
    if (successCount > 0 && failCount === 0) {
      const msg = `Uploaded ${successCount} ${successCount === 1 ? itemNoun : `${itemNoun}s`} to ${selectedStation.name} (${selectedStation.frequency}).`;
      setBanner({ type: "success", text: msg });
      toast.success(msg);
    } else if (successCount > 0 && failCount > 0) {
      const msg = `Uploaded ${successCount}; ${failCount} failed. Only MP3/WAV files are accepted.`;
      setBanner({ type: "error", text: msg });
      toast.error(msg);
    } else {
      const msg = `Upload failed for ${failCount} file(s). Ensure files are MP3 or WAV under 120MB.`;
      setBanner({ type: "error", text: msg });
      toast.error(msg);
    }

    window.setTimeout(() => {
      setUploads((prev) => prev.filter((u) => u.status === "uploading"));
    }, 5500);
  };

  const persistOrder = async (nextList: WaypointRadioTrack[]) => {
    try {
      await reorderMutation.mutateAsync({ orderedIds: nextList.map((t) => t.id) });
      onLibraryChanged();
      toast.success("Sequential playback order saved.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save playlist order.");
    }
  };

  const handleMove = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= playlist.length) return;
    const copy = [...playlist];
    const [moved] = copy.splice(index, 1);
    copy.splice(target, 0, moved);
    void persistOrder(copy);
  };

  const handleDropReorder = (targetId: number) => {
    if (draggedTrackId === null || draggedTrackId === targetId) {
      setDraggedTrackId(null);
      setDragOverTrackId(null);
      return;
    }
    const fromIdx = playlist.findIndex((t) => t.id === draggedTrackId);
    const toIdx = playlist.findIndex((t) => t.id === targetId);
    setDraggedTrackId(null);
    setDragOverTrackId(null);
    if (fromIdx < 0 || toIdx < 0) return;
    const copy = [...playlist];
    const [moved] = copy.splice(fromIdx, 1);
    copy.splice(toIdx, 0, moved);
    void persistOrder(copy);
  };

  const handleSaveRename = async (trackId: number) => {
    const clean = editingTitleVal.trim();
    if (!clean) return;
    try {
      await updateMutation.mutateAsync({ id: trackId, title: clean });
      setEditingTitleId(null);
      onLibraryChanged();
      toast.success("Track renamed.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to rename track.");
    }
  };

  const handleToggleEnabled = async (track: WaypointRadioTrack) => {
    try {
      await updateMutation.mutateAsync({ id: track.id, enabled: !track.enabled });
      onLibraryChanged();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update track status.");
    }
  };

  const handleOpenNotes = (track: WaypointRadioTrack) => {
    if (expandedNotesId === track.id) {
      setExpandedNotesId(null);
      return;
    }
    setExpandedNotesId(track.id);
    setNotesDraft({
      albumDescription: track.albumDescription || "",
      sunoPrompt: track.sunoPrompt || "",
    });
  };

  const handleSaveNotes = async (trackId: number) => {
    try {
      await updateMutation.mutateAsync({
        id: trackId,
        albumDescription: notesDraft.albumDescription,
        sunoPrompt: notesDraft.sunoPrompt,
      });
      onLibraryChanged();
      toast.success("Album description & Suno generation prompt saved.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save track notes.");
    }
  };

  const handleReplaceFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const targetId = replacingTrackId;
    e.target.value = "";
    if (!file || !targetId) return;

    const uid = `replace_${Date.now()}`;
    setUploads((prev) => [...prev, { id: uid, fileName: `Replacing: ${file.name}`, progress: 5, status: "uploading" }]);
    try {
      const uploaded = await uploadWaypointRadioAudio(file, activeFolder, (pct) => {
        setUploads((prev) => prev.map((u) => (u.id === uid ? { ...u, progress: pct } : u)));
      });
      await updateMutation.mutateAsync({
        id: targetId,
        fileName: uploaded.fileName,
        fileKey: uploaded.fileKey,
        fileUrl: uploaded.fileUrl,
        mimeType: uploaded.mimeType,
        fileSize: uploaded.fileSize,
        durationSec: uploaded.durationSec,
      });
      setUploads((prev) => prev.map((u) => (u.id === uid ? { ...u, progress: 100, status: "done" } : u)));
      onLibraryChanged();
      toast.success("Audio file replaced while preserving playlist order and Suno notes.");
    } catch (err: any) {
      setUploads((prev) =>
        prev.map((u) => (u.id === uid ? { ...u, status: "error", error: err?.message || "Replace failed" } : u))
      );
      toast.error(err?.message || "Failed to replace audio file.");
    } finally {
      setReplacingTrackId(null);
      window.setTimeout(() => {
        setUploads((prev) => prev.filter((u) => u.status === "uploading"));
      }, 4500);
    }
  };

  const handleDelete = async (track: WaypointRadioTrack) => {
    try {
      if (previewTrackId === track.id) stopPreview();
      await deleteMutation.mutateAsync({ id: track.id });
      setConfirmDeleteId(null);
      onLibraryChanged();
      toast.success(`Removed "${track.title}".`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete audio.");
    }
  };

  return (
    <div className="space-y-4">
      {/* Preserved legacy / unassigned files recovery banner (shown ONLY if any exist) */}
      <UnassignedAudioBanner
        tracks={tracks}
        previewTrackId={previewTrackId}
        onTogglePreview={togglePreview}
        onMoved={onLibraryChanged}
      />

      {/* 1. Five Official Radio Stations in Exact Order + FM Frequencies */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {WAYPOINT_RADIO_STATIONS.map((st) => {
          const active = st.id === selectedStationId;
          const count = countByStation[st.id] || 0;
          return (
            <button
              key={st.id}
              type="button"
              onClick={() => {
                stopPreview();
                setSelectedStationId(st.id);
                setBanner(null);
                setExpandedNotesId(null);
              }}
              className={`px-3 py-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                active
                  ? "bg-[#0D1E42] border-[#C5A059] text-[#FFF4D4] shadow-[0_2px_10px_rgba(0,0,0,0.5)]"
                  : "bg-[#040E2A] border-[#C5A059]/20 text-[#B9C5DC] hover:border-[#C5A059]/50 hover:text-[#F5E8C8]"
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-mono font-semibold text-[#C5A059]">
                  {st.frequency}
                </span>
                <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-[#000820]/80 text-[#DFBE77] border border-[#C5A059]/25">
                  {count}
                </span>
              </div>
              <div className="mt-1 font-serif text-sm font-semibold truncate">{st.name}</div>
            </button>
          );
        })}
      </div>

      {/* 2. Selected Station Header, Music / Announcements Sub-Switch & Upload Trigger */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-lg bg-[#05102E] border border-[#C5A059]/25">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-serif text-base font-semibold text-[#FFF4D4]">
              {selectedStation.name}
            </h3>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#000820] text-[#DFBE77] border border-[#C5A059]/30">
              {selectedStation.frequency}
            </span>
          </div>
          <p className="text-xs text-[#9AA9C5] mt-0.5 font-mono">
            Folder: {activeFolder}/
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Station Music vs Station-Specific Announcements Sub-Toggle */}
          <div className="inline-flex rounded-lg bg-[#000820] p-0.5 border border-[#C5A059]/25">
            <button
              type="button"
              onClick={() => {
                stopPreview();
                setStationSection("music");
                setBanner(null);
              }}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                stationSection === "music"
                  ? "bg-[#0E224A] text-[#FFF4D4] border border-[#C5A059]/45"
                  : "text-[#95A6C6] hover:text-[#E8D8B2]"
              }`}
            >
              <Music2 className="w-3 h-3 text-[#C5A059]" />
              Music ({musicCountForSelected})
            </button>
            <button
              type="button"
              onClick={() => {
                stopPreview();
                setStationSection("announcements");
                setBanner(null);
              }}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                stationSection === "announcements"
                  ? "bg-[#0E224A] text-[#FFF4D4] border border-[#C5A059]/45"
                  : "text-[#95A6C6] hover:text-[#E8D8B2]"
              }`}
            >
              <Mic className="w-3 h-3 text-[#C5A059]" />
              Announcements ({annCountForSelected})
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".mp3,.wav,audio/mpeg,audio/wav"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) void handleUploadFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <input
            ref={replaceInputRef}
            type="file"
            accept=".mp3,.wav,audio/mpeg,audio/wav"
            className="hidden"
            onChange={handleReplaceFileSelected}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#A6833E] text-[#050D24] hover:brightness-110 transition-all cursor-pointer shadow-sm"
          >
            <Upload className="w-3.5 h-3.5" />
            {stationSection === "music" ? "Upload Music" : "Upload Announcement"}
          </button>
        </div>
      </div>

      {/* 3. Drag-and-Drop Multi-File Upload Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOverDropzone(true);
        }}
        onDragLeave={() => setIsDragOverDropzone(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOverDropzone(false);
          if (e.dataTransfer.files?.length) {
            void handleUploadFiles(e.dataTransfer.files);
          }
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`rounded-lg border border-dashed px-4 py-4 text-center transition-colors cursor-pointer ${
          isDragOverDropzone
            ? "border-[#DFBE77] bg-[#0F234F]/80 text-[#FFF4D4]"
            : "border-[#C5A059]/30 bg-[#030C26]/70 text-[#A8B7D4] hover:border-[#C5A059]/60"
        }`}
      >
        <p className="text-xs font-medium text-[#E8D8B2]">
          {stationSection === "music"
            ? "Drag and drop MP3 or WAV songs here, or click to select multiple files"
            : `Drag and drop station announcements or IDs for ${selectedStation.name} (${selectedStation.frequency})`}
        </p>
        <p className="text-[11px] text-[#8B9BB8] mt-0.5">
          {stationSection === "music"
            ? `New songs append to the end of ${selectedStation.name} without interrupting active playback.`
            : "Spoken announcements play cleanly between songs with zero fade-in or fade-out."}
        </p>
      </div>

      {/* 4. Upload Progress & Status Alerts */}
      {uploads.length > 0 && (
        <div className="space-y-2 rounded-lg bg-[#040E2A] border border-[#C5A059]/25 p-3">
          {uploads.map((u) => (
            <div key={u.id} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#E9DEC3] truncate max-w-[70%]">{u.fileName}</span>
                <span
                  className={
                    u.status === "error"
                      ? "text-rose-400 font-medium"
                      : u.status === "done"
                        ? "text-emerald-400 font-medium"
                        : "text-[#DFBE77] font-mono"
                  }
                >
                  {u.status === "error" ? u.error || "Failed" : u.status === "done" ? "Uploaded" : `${u.progress}%`}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-[#0A183B] overflow-hidden">
                <div
                  className={`h-full transition-all duration-200 ${
                    u.status === "error"
                      ? "bg-rose-500"
                      : u.status === "done"
                        ? "bg-emerald-400"
                        : "bg-[#C5A059]"
                  }`}
                  style={{ width: `${u.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {banner && (
        <div
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg border text-xs ${
            banner.type === "success"
              ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-200"
              : "bg-rose-950/40 border-rose-500/40 text-rose-200"
          }`}
        >
          {banner.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          )}
          <span>{banner.text}</span>
        </div>
      )}

      {/* 5. Sequential Numbered Playlist / Station Announcements List */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-[#C5A059]">
            {stationSection === "music"
              ? "Sequential Playlist Order (No Shuffle)"
              : `${selectedStation.name} Announcements Order`}
          </span>
          <span className="text-[11px] text-[#8B9BB8]">
            Drag rows, use arrows, or move audio between stations
          </span>
        </div>

        {playlist.length === 0 ? (
          <div className="rounded-lg bg-[#040E2A] border border-[#C5A059]/20 py-10 px-4 text-center">
            {stationSection === "music" ? (
              <Music2 className="w-7 h-7 mx-auto text-[#C5A059]/50 mb-2" />
            ) : (
              <Mic className="w-7 h-7 mx-auto text-[#C5A059]/50 mb-2" />
            )}
            <p className="text-sm font-medium text-[#E9DEC3]">
              No {stationSection === "music" ? "songs" : "announcements"} uploaded to {selectedStation.name} ({selectedStation.frequency}) yet
            </p>
            <p className="text-xs text-[#8B9BB8] mt-1">
              {stationSection === "music"
                ? "Upload your Suno AI MP3 or WAV album tracks above. They will appear here in numbered sequential order."
                : "Upload your ElevenLabs station identifications or voiceovers above."}
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {playlist.map((track, index) => {
              const isPreviewing = previewTrackId === track.id;
              const isEditing = editingTitleId === track.id;
              const isNotesOpen = expandedNotesId === track.id;
              const hasNotes = Boolean(track.albumDescription?.trim() || track.sunoPrompt?.trim());
              const isDragTarget = dragOverTrackId === track.id && draggedTrackId !== track.id;

              return (
                <div
                  key={track.id}
                  draggable={!isEditing && !isNotesOpen}
                  onDragStart={() => setDraggedTrackId(track.id)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverTrackId(track.id);
                  }}
                  onDragLeave={() => {
                    if (dragOverTrackId === track.id) setDragOverTrackId(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleDropReorder(track.id);
                  }}
                  onDragEnd={() => {
                    setDraggedTrackId(null);
                    setDragOverTrackId(null);
                  }}
                  className={`rounded-lg border transition-colors ${
                    isDragTarget
                      ? "border-[#DFBE77] bg-[#0F2452]"
                      : track.enabled
                        ? "border-[#C5A059]/22 bg-[#05102E]"
                        : "border-[#C5A059]/12 bg-[#030A1F]/70 opacity-65"
                  }`}
                >
                  <div className="flex items-center gap-2 px-3 py-2.5">
                    <div className="flex items-center gap-1.5 shrink-0 text-[#8B9BB8]">
                      <GripVertical className="w-4 h-4 cursor-grab text-[#C5A059]/55" />
                      <span className="w-6 text-center font-mono text-xs font-bold text-[#DFBE77]">
                        {index + 1}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => togglePreview(track)}
                      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border transition-colors cursor-pointer ${
                        isPreviewing
                          ? "bg-[#C5A059] border-[#FFE394] text-[#050D24]"
                          : "bg-[#000820] border-[#C5A059]/35 text-[#DFBE77] hover:border-[#DFBE77]"
                      }`}
                      title={isPreviewing ? "Stop preview" : "Preview audio"}
                    >
                      {isPreviewing ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current ml-0.5" />}
                    </button>

                    <div className="min-w-0 flex-1">
                      {isEditing ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={editingTitleVal}
                            onChange={(e) => setEditingTitleVal(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") void handleSaveRename(track.id);
                              if (e.key === "Escape") setEditingTitleId(null);
                            }}
                            autoFocus
                            className="flex-1 px-2 py-1 text-xs rounded bg-[#000820] border border-[#C5A059]/60 text-[#FFF4D4] focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => void handleSaveRename(track.id)}
                            className="p-1 rounded bg-[#C5A059]/20 text-emerald-300 cursor-pointer"
                            title="Save name"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingTitleId(null)}
                            className="p-1 rounded bg-white/5 text-[#9AA9C5] cursor-pointer"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="text-sm font-medium text-[#F7EED8] truncate">
                            {track.title}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-[#8B9BB8]">
                            <span>{formatAudioDuration(track.durationSec)}</span>
                            <span>·</span>
                            <span>{formatAudioFileSize(track.fileSize)}</span>
                            <span className="hidden sm:inline truncate max-w-[160px] opacity-80">
                              · {track.fileName}
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={index === 0 || reorderMutation.isPending}
                        onClick={() => handleMove(index, -1)}
                        className="p-1.5 rounded text-[#B9C5DC] hover:text-[#FFF4D4] hover:bg-white/5 disabled:opacity-30 cursor-pointer"
                        title="Move up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={index === playlist.length - 1 || reorderMutation.isPending}
                        onClick={() => handleMove(index, 1)}
                        className="p-1.5 rounded text-[#B9C5DC] hover:text-[#FFF4D4] hover:bg-white/5 disabled:opacity-30 cursor-pointer"
                        title="Move down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>

                      {/* Move to Another Official Station */}
                      <MoveToStationButton track={track} onMoved={onLibraryChanged} />

                      {/* Album Description & Suno Prompt Drawer Toggle */}
                      {stationSection === "music" && (
                        <button
                          type="button"
                          onClick={() => handleOpenNotes(track)}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] border transition-colors cursor-pointer ${
                            isNotesOpen || hasNotes
                              ? "border-[#C5A059]/60 bg-[#C5A059]/15 text-[#F5D88B]"
                              : "border-white/10 text-[#9AA9C5] hover:text-[#FFF4D4] hover:border-[#C5A059]/40"
                          }`}
                          title="Album Description & Original Suno Prompt"
                        >
                          <FileText className="w-3 h-3" />
                          <span className="hidden md:inline">Suno</span>
                          {isNotesOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setEditingTitleId(track.id);
                          setEditingTitleVal(track.title);
                        }}
                        className="p-1.5 rounded text-[#9AA9C5] hover:text-[#FFF4D4] hover:bg-white/5 cursor-pointer"
                        title="Rename"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setReplacingTrackId(track.id);
                          replaceInputRef.current?.click();
                        }}
                        className="p-1.5 rounded text-[#9AA9C5] hover:text-[#DFBE77] hover:bg-white/5 cursor-pointer"
                        title="Replace audio file (preserves order & notes)"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleToggleEnabled(track)}
                        className={`px-2 py-1 rounded text-[11px] font-semibold border transition-colors cursor-pointer ${
                          track.enabled
                            ? "bg-emerald-950/50 border-emerald-500/40 text-emerald-300"
                            : "bg-slate-900 border-slate-600/40 text-slate-400"
                        }`}
                      >
                        {track.enabled ? "On" : "Off"}
                      </button>

                      {confirmDeleteId === track.id ? (
                        <div className="flex items-center gap-1 ml-1">
                          <button
                            type="button"
                            onClick={() => void handleDelete(track)}
                            className="px-2 py-1 rounded text-[11px] font-semibold bg-rose-600 text-white hover:bg-rose-500 cursor-pointer"
                          >
                            Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="p-1 rounded text-[#9AA9C5] hover:text-white cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(track.id)}
                          className="p-1.5 rounded text-[#9AA9C5] hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {isNotesOpen && (
                    <div className="px-4 pb-3.5 pt-2 border-t border-[#C5A059]/20 bg-[#030A22]/85 space-y-3 rounded-b-lg">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#DFBE77] mb-1">
                            Album Description
                          </label>
                          <textarea
                            rows={3}
                            value={notesDraft.albumDescription}
                            onChange={(e) =>
                              setNotesDraft((d) => ({ ...d, albumDescription: e.target.value }))
                            }
                            placeholder="Album notes, mood, instrumentation, or session context..."
                            className="w-full rounded-md bg-[#000820] border border-[#C5A059]/30 px-2.5 py-2 text-xs text-[#F4EBD6] placeholder:text-[#6B7A99] focus:outline-none focus:border-[#DFBE77]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#DFBE77] mb-1">
                            Original Suno Generation Prompt
                          </label>
                          <textarea
                            rows={3}
                            value={notesDraft.sunoPrompt}
                            onChange={(e) =>
                              setNotesDraft((d) => ({ ...d, sunoPrompt: e.target.value }))
                            }
                            placeholder="Paste the exact Suno AI prompt used to generate this track..."
                            className="w-full rounded-md bg-[#000820] border border-[#C5A059]/30 px-2.5 py-2 text-xs text-[#F4EBD6] placeholder:text-[#6B7A99] focus:outline-none focus:border-[#DFBE77]"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setExpandedNotesId(null)}
                          className="px-3 py-1.5 rounded text-xs text-[#A8B7D4] hover:text-white cursor-pointer"
                        >
                          Close
                        </button>
                        <button
                          type="button"
                          disabled={updateMutation.isPending}
                          onClick={() => void handleSaveNotes(track.id)}
                          className="px-3.5 py-1.5 rounded text-xs font-semibold bg-[#C5A059] text-[#040B20] hover:bg-[#DFBE77] transition-colors cursor-pointer"
                        >
                          Save Notes
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
