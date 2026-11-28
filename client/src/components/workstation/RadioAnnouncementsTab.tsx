import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Upload,
  Play,
  Square,
  ArrowUp,
  ArrowDown,
  Pencil,
  Check,
  X,
  RefreshCw,
  Trash2,
  Mic,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  WAYPOINT_RADIO_STATIONS,
  SHARED_ANNOUNCEMENT_FOLDERS,
  type AnnouncementScopeId,
  type RadioStationId,
  type RadioTrackKind,
  type WaypointRadioSettings,
  type WaypointRadioTrack,
} from "@shared/waypointRadio";
import {
  uploadWaypointRadioAudio,
  formatAudioDuration,
  formatAudioFileSize,
} from "@/lib/radioAudioUpload";
import { MoveToStationButton } from "./RadioStationHelpers";

interface UploadItemState {
  id: string;
  fileName: string;
  progress: number;
  status: "uploading" | "done" | "error";
  error?: string;
}

interface RadioAnnouncementsTabProps {
  tracks: WaypointRadioTrack[];
  settings: WaypointRadioSettings;
  onLibraryChanged: () => void;
}

export function RadioAnnouncementsTab({
  tracks,
  settings,
  onLibraryChanged,
}: RadioAnnouncementsTabProps) {
  const [scope, setScope] = useState<AnnouncementScopeId>("the-lobby");
  const [annEveryN, setAnnEveryN] = useState<number>(settings.announcementEveryNSongs);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploads, setUploads] = useState<UploadItemState[]>([]);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [replacingId, setReplacingId] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);

  const registerMutation = trpc.waypointRadio.registerTrack.useMutation();
  const updateTrackMutation = trpc.waypointRadio.updateTrack.useMutation();
  const reorderMutation = trpc.waypointRadio.reorderTracks.useMutation();
  const deleteMutation = trpc.waypointRadio.deleteTrack.useMutation();
  const updateSettingsMutation = trpc.waypointRadio.updateSettings.useMutation();

  useEffect(() => {
    setAnnEveryN(settings.announcementEveryNSongs);
  }, [settings.announcementEveryNSongs]);

  useEffect(() => {
    return () => {
      previewAudioRef.current?.pause();
      previewAudioRef.current = null;
    };
  }, []);

  const scopeMeta = useMemo(() => {
    if (scope === "commercials") {
      return {
        label: "Commercials",
        folderPath: SHARED_ANNOUNCEMENT_FOLDERS.commercials.folder,
        kind: "commercial" as RadioTrackKind,
        stationId: null as RadioStationId | null,
      };
    }
    if (scope === "general-announcements") {
      return {
        label: "General Announcements",
        folderPath: SHARED_ANNOUNCEMENT_FOLDERS["general-announcements"].folder,
        kind: "general_announcement" as RadioTrackKind,
        stationId: null as RadioStationId | null,
      };
    }
    const st = WAYPOINT_RADIO_STATIONS.find((s) => s.id === scope) || WAYPOINT_RADIO_STATIONS[0];
    return {
      label: `${st.name} — Announcements`,
      folderPath: st.announcementsFolder,
      kind: "announcement" as RadioTrackKind,
      stationId: st.id as RadioStationId,
    };
  }, [scope]);

  const recordings = useMemo(() => {
    return tracks
      .filter((t) => {
        if (scope === "commercials") return t.kind === "commercial";
        if (scope === "general-announcements") return t.kind === "general_announcement";
        return t.kind === "announcement" && t.stationId === scope;
      })
      .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
  }, [tracks, scope]);

  const countForScope = (id: AnnouncementScopeId): number => {
    if (id === "commercials") return tracks.filter((t) => t.kind === "commercial").length;
    if (id === "general-announcements") return tracks.filter((t) => t.kind === "general_announcement").length;
    return tracks.filter((t) => t.kind === "announcement" && t.stationId === id).length;
  };

  const stopPreview = () => {
    previewAudioRef.current?.pause();
    setPreviewId(null);
  };

  const togglePreview = (track: WaypointRadioTrack) => {
    if (previewId === track.id) {
      stopPreview();
      return;
    }
    if (!previewAudioRef.current) {
      previewAudioRef.current = new Audio();
      previewAudioRef.current.onended = () => setPreviewId(null);
      previewAudioRef.current.onerror = () => {
        setPreviewId(null);
        toast.error("Could not preview this recording.");
      };
    }
    previewAudioRef.current.src = track.fileUrl;
    previewAudioRef.current.currentTime = 0;
    setPreviewId(track.id);
    void previewAudioRef.current.play().catch(() => {
      setPreviewId(null);
      toast.error("Preview could not start.");
    });
  };

  const handleUploadFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;
    setBanner(null);

    let ok = 0;
    let fail = 0;

    for (const file of files) {
      const uid = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      setUploads((prev) => [...prev, { id: uid, fileName: file.name, progress: 2, status: "uploading" }]);
      try {
        const uploaded = await uploadWaypointRadioAudio(file, scopeMeta.folderPath, (pct) => {
          setUploads((prev) => prev.map((u) => (u.id === uid ? { ...u, progress: pct } : u)));
        });
        await registerMutation.mutateAsync({
          kind: scopeMeta.kind,
          stationId: scopeMeta.stationId,
          title: uploaded.suggestedTitle,
          fileName: uploaded.fileName,
          fileKey: uploaded.fileKey,
          fileUrl: uploaded.fileUrl,
          mimeType: uploaded.mimeType,
          fileSize: uploaded.fileSize,
          durationSec: uploaded.durationSec,
        });
        setUploads((prev) => prev.map((u) => (u.id === uid ? { ...u, progress: 100, status: "done" } : u)));
        ok += 1;
      } catch (err: any) {
        fail += 1;
        setUploads((prev) =>
          prev.map((u) => (u.id === uid ? { ...u, status: "error", error: err?.message || "Upload failed" } : u))
        );
      }
    }

    onLibraryChanged();
    if (ok > 0 && fail === 0) {
      const msg = `Uploaded ${ok} ${ok === 1 ? "recording" : "recordings"} to ${scopeMeta.label}.`;
      setBanner({ type: "success", text: msg });
      toast.success(msg);
    } else {
      const msg = `Uploaded ${ok}; ${fail} failed. Only MP3/WAV files under 120MB are accepted.`;
      setBanner({ type: "error", text: msg });
      toast.error(msg);
    }
    window.setTimeout(() => {
      setUploads((prev) => prev.filter((u) => u.status === "uploading"));
    }, 5000);
  };

  const handleSaveFrequency = async () => {
    try {
      await updateSettingsMutation.mutateAsync({
        announcementEveryNSongs: Math.max(0, Math.min(50, Number(annEveryN) || 0)),
      });
      onLibraryChanged();
      toast.success("Announcement frequency saved.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save announcement frequency.");
    }
  };

  const handleMove = async (idx: number, delta: -1 | 1) => {
    const target = idx + delta;
    if (target < 0 || target >= recordings.length) return;
    const copy = [...recordings];
    const [moved] = copy.splice(idx, 1);
    copy.splice(target, 0, moved);
    try {
      await reorderMutation.mutateAsync({ orderedIds: copy.map((r) => r.id) });
      onLibraryChanged();
    } catch (err: any) {
      toast.error(err?.message || "Failed to reorder recordings.");
    }
  };

  const handleSaveRename = async (id: number) => {
    const clean = editingTitle.trim();
    if (!clean) return;
    try {
      await updateTrackMutation.mutateAsync({ id, title: clean });
      setEditingId(null);
      onLibraryChanged();
      toast.success("Recording renamed.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to rename recording.");
    }
  };

  const handleReplaceFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const targetId = replacingId;
    e.target.value = "";
    if (!file || !targetId) return;
    try {
      const uploaded = await uploadWaypointRadioAudio(file, scopeMeta.folderPath);
      await updateTrackMutation.mutateAsync({
        id: targetId,
        fileName: uploaded.fileName,
        fileKey: uploaded.fileKey,
        fileUrl: uploaded.fileUrl,
        mimeType: uploaded.mimeType,
        fileSize: uploaded.fileSize,
        durationSec: uploaded.durationSec,
      });
      onLibraryChanged();
      toast.success("Recording audio replaced.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to replace recording.");
    } finally {
      setReplacingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Station & Shared Category Selector */}
      <div className="space-y-2.5">
        <div>
          <div className="text-[11px] uppercase tracking-wider font-semibold text-[#C5A059] mb-1.5">
            Station Voiceovers &amp; Station IDs
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {WAYPOINT_RADIO_STATIONS.map((st) => {
              const active = scope === st.id;
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => {
                    stopPreview();
                    setScope(st.id);
                    setBanner(null);
                  }}
                  className={`px-3 py-2 rounded-lg border text-left transition-all cursor-pointer ${
                    active
                      ? "bg-[#0D1E42] border-[#C5A059] text-[#FFF4D4]"
                      : "bg-[#040E2A] border-[#C5A059]/20 text-[#B9C5DC] hover:border-[#C5A059]/45"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-serif text-xs font-semibold truncate">{st.name}</span>
                    <span className="text-[11px] font-mono text-[#DFBE77]">{countForScope(st.id)}</span>
                  </div>
                  <div className="text-[10px] font-mono text-[#8B9BB8] mt-0.5">{st.frequency}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="text-[11px] uppercase tracking-wider font-semibold text-[#C5A059] mb-1.5">
            Shared Categories
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(["commercials", "general-announcements"] as const).map((sharedId) => {
              const meta = SHARED_ANNOUNCEMENT_FOLDERS[sharedId];
              const active = scope === sharedId;
              return (
                <button
                  key={sharedId}
                  type="button"
                  onClick={() => {
                    stopPreview();
                    setScope(sharedId);
                    setBanner(null);
                  }}
                  className={`px-3.5 py-2.5 rounded-lg border flex items-center justify-between transition-all cursor-pointer ${
                    active
                      ? "bg-[#0D1E42] border-[#C5A059] text-[#FFF4D4]"
                      : "bg-[#040E2A] border-[#C5A059]/20 text-[#B9C5DC] hover:border-[#C5A059]/45"
                  }`}
                >
                  <div>
                    <div className="font-serif text-sm font-semibold">{meta.name}</div>
                    <div className="text-[11px] font-mono text-[#8B9BB8]">{meta.folder}/</div>
                  </div>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#000820] text-[#DFBE77] border border-[#C5A059]/25">
                    {countForScope(sharedId)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Announcement Frequency Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-lg bg-[#05102E] border border-[#C5A059]/25">
        <div>
          <div className="text-xs font-semibold text-[#FFF4D4]">Announcement Frequency</div>
          <div className="text-[11px] text-[#9AA9C5]">
            Play spoken announcements sequentially between songs with zero fade-in or fade-out (set 0 to pause).
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#C9BA9B]">Every</span>
          <input
            type="number"
            min={0}
            max={50}
            value={annEveryN}
            onChange={(e) => setAnnEveryN(Number(e.target.value))}
            className="w-16 px-2.5 py-1.5 rounded bg-[#000820] border border-[#C5A059]/40 text-xs text-[#FFF4D4] text-center font-mono focus:outline-none focus:border-[#DFBE77]"
          />
          <span className="text-xs text-[#C9BA9B]">songs</span>
          <button
            type="button"
            disabled={updateSettingsMutation.isPending}
            onClick={() => void handleSaveFrequency()}
            className="px-3 py-1.5 rounded text-xs font-semibold bg-[#C5A059] text-[#040B20] hover:bg-[#DFBE77] cursor-pointer"
          >
            Save
          </button>
        </div>
      </div>

      {/* 3. Active Category Header & Upload Dropzone */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div>
          <h3 className="font-serif text-sm font-semibold text-[#FFF4D4]">{scopeMeta.label}</h3>
          <p className="text-[11px] font-mono text-[#8B9BB8]">Folder: {scopeMeta.folderPath}/</p>
        </div>
        <div>
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
            onChange={handleReplaceFile}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#A6833E] text-[#050D24] hover:brightness-110 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload Voiceover / ID
          </button>
        </div>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          if (e.dataTransfer.files?.length) void handleUploadFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`rounded-lg border border-dashed px-4 py-3.5 text-center transition-colors cursor-pointer ${
          isDragOver
            ? "border-[#DFBE77] bg-[#0F234F]/80"
            : "border-[#C5A059]/30 bg-[#030C26]/70 hover:border-[#C5A059]/60"
        }`}
      >
        <p className="text-xs text-[#E8D8B2]">
          Drop ElevenLabs voiceovers, station IDs, or commercials here (MP3 / WAV)
        </p>
      </div>

      {uploads.length > 0 && (
        <div className="space-y-1.5 rounded-lg bg-[#040E2A] border border-[#C5A059]/25 p-3">
          {uploads.map((u) => (
            <div key={u.id} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#E9DEC3] truncate max-w-[70%]">{u.fileName}</span>
                <span className={u.status === "error" ? "text-rose-400" : "text-[#DFBE77] font-mono"}>
                  {u.status === "error" ? u.error : u.status === "done" ? "Uploaded" : `${u.progress}%`}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-[#0A183B] overflow-hidden">
                <div
                  className={`h-full ${u.status === "error" ? "bg-rose-500" : u.status === "done" ? "bg-emerald-400" : "bg-[#C5A059]"}`}
                  style={{ width: `${u.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {banner && (
        <div
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border text-xs ${
            banner.type === "success"
              ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-200"
              : "bg-rose-950/40 border-rose-500/40 text-rose-200"
          }`}
        >
          {banner.type === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
          <span>{banner.text}</span>
        </div>
      )}

      {/* 4. Recordings List */}
      {recordings.length === 0 ? (
        <div className="rounded-lg bg-[#040E2A] border border-[#C5A059]/20 py-8 px-4 text-center">
          <Mic className="w-6 h-6 mx-auto text-[#C5A059]/50 mb-2" />
          <p className="text-sm text-[#E9DEC3]">No recordings uploaded to {scopeMeta.label} yet</p>
          <p className="text-xs text-[#8B9BB8] mt-0.5">
            Upload your own ElevenLabs recordings above to populate this category automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {recordings.map((rec, idx) => {
            const isPreviewing = previewId === rec.id;
            const isEditing = editingId === rec.id;
            return (
              <div
                key={rec.id}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border ${
                  rec.enabled
                    ? "bg-[#05102E] border-[#C5A059]/22"
                    : "bg-[#030A1F]/70 border-[#C5A059]/12 opacity-65"
                }`}
              >
                <span className="w-6 text-center font-mono text-xs font-bold text-[#DFBE77]">
                  {idx + 1}
                </span>

                <button
                  type="button"
                  onClick={() => togglePreview(rec)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border cursor-pointer ${
                    isPreviewing
                      ? "bg-[#C5A059] border-[#FFE394] text-[#050D24]"
                      : "bg-[#000820] border-[#C5A059]/35 text-[#DFBE77] hover:border-[#DFBE77]"
                  }`}
                  title={isPreviewing ? "Stop preview" : "Preview recording"}
                >
                  {isPreviewing ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current ml-0.5" />}
                </button>

                <div className="min-w-0 flex-1">
                  {isEditing ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void handleSaveRename(rec.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        autoFocus
                        className="flex-1 px-2 py-1 text-xs rounded bg-[#000820] border border-[#C5A059]/60 text-[#FFF4D4] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => void handleSaveRename(rec.id)}
                        className="p-1 rounded bg-[#C5A059]/20 text-emerald-300 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="p-1 rounded text-[#9AA9C5] cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="text-sm font-medium text-[#F7EED8] truncate">{rec.title}</div>
                      <div className="text-[11px] text-[#8B9BB8]">
                        {formatAudioDuration(rec.durationSec)} · {formatAudioFileSize(rec.fileSize)}
                      </div>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => void handleMove(idx, -1)}
                    className="p-1.5 rounded text-[#B9C5DC] hover:text-[#FFF4D4] disabled:opacity-30 cursor-pointer"
                    title="Move up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === recordings.length - 1}
                    onClick={() => void handleMove(idx, 1)}
                    className="p-1.5 rounded text-[#B9C5DC] hover:text-[#FFF4D4] disabled:opacity-30 cursor-pointer"
                    title="Move down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  {rec.kind === "announcement" && (
                    <MoveToStationButton track={rec} onMoved={onLibraryChanged} />
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(rec.id);
                      setEditingTitle(rec.title);
                    }}
                    className="p-1.5 rounded text-[#9AA9C5] hover:text-[#FFF4D4] cursor-pointer"
                    title="Rename"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReplacingId(rec.id);
                      replaceInputRef.current?.click();
                    }}
                    className="p-1.5 rounded text-[#9AA9C5] hover:text-[#DFBE77] cursor-pointer"
                    title="Replace audio file"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await updateTrackMutation.mutateAsync({ id: rec.id, enabled: !rec.enabled });
                      onLibraryChanged();
                    }}
                    className={`px-2 py-1 rounded text-[11px] font-semibold border cursor-pointer ${
                      rec.enabled
                        ? "bg-emerald-950/50 border-emerald-500/40 text-emerald-300"
                        : "bg-slate-900 border-slate-600/40 text-slate-400"
                    }`}
                  >
                    {rec.enabled ? "On" : "Off"}
                  </button>
                  {confirmDeleteId === rec.id ? (
                    <div className="flex items-center gap-1 ml-1">
                      <button
                        type="button"
                        onClick={async () => {
                          if (previewId === rec.id) stopPreview();
                          await deleteMutation.mutateAsync({ id: rec.id });
                          setConfirmDeleteId(null);
                          onLibraryChanged();
                          toast.success("Recording deleted.");
                        }}
                        className="px-2 py-1 rounded text-[11px] font-semibold bg-rose-600 text-white cursor-pointer"
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="p-1 text-[#9AA9C5] cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(rec.id)}
                      className="p-1.5 rounded text-[#9AA9C5] hover:text-rose-400 cursor-pointer"
                      title="Delete recording"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
