import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Upload,
  Play,
  Square,
  RefreshCw,
  Trash2,
  Repeat,
  Volume2,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Waves,
  Check,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  WAYPOINT_AMBIENT_CATEGORIES,
  WAYPOINT_AMBIENT_PRESETS,
  DEFAULT_WAYPOINT_RADIO_SETTINGS,
  type AmbientCategoryId,
  type WaypointRadioSettings,
  type WaypointRadioTrack,
} from "@shared/waypointRadio";
import {
  uploadWaypointRadioAudio,
  formatAudioDuration,
  formatAudioFileSize,
} from "@/lib/radioAudioUpload";
import {
  makeSeamlessLoopBuffer,
  createBuiltInAmbientSpec,
  connectAmbientSpecChain,
} from "@/lib/observatoryAudioEngine";

interface AmbienceTabProps {
  tracks: WaypointRadioTrack[];
  settings: WaypointRadioSettings;
  onLibraryChanged: () => void;
}

export function RadioAmbienceTab({ tracks, settings, onLibraryChanged }: AmbienceTabProps) {
  const [selectedCategory, setSelectedCategory] = useState<AmbientCategoryId>("coffee-shop");
  const [volumes, setVolumes] = useState<Record<AmbientCategoryId, number>>(
    settings.ambientDefaultVolumes
  );
  const [selectedPresets, setSelectedPresets] = useState<Record<AmbientCategoryId, string>>(
    settings.ambientPresetByCategory || DEFAULT_WAYPOINT_RADIO_SETTINGS.ambientPresetByCategory
  );
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Seamless Web Audio loop preview state (works for both uploaded custom files AND the 5 built-in presets!)
  const [loopPreviewTrackId, setLoopPreviewTrackId] = useState<number | null>(null);
  const [previewPresetKey, setPreviewPresetKey] = useState<string | null>(null);
  const [isDecodingLoop, setIsDecodingLoop] = useState(false);
  const loopCtxRef = useRef<AudioContext | null>(null);
  const loopSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const loopGainRef = useRef<GainNode | null>(null);
  const loopScaleRef = useRef<number>(0.85);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);
  const [replacingId, setReplacingId] = useState<number | null>(null);

  const registerMutation = trpc.waypointRadio.registerTrack.useMutation();
  const updateTrackMutation = trpc.waypointRadio.updateTrack.useMutation();
  const deleteMutation = trpc.waypointRadio.deleteTrack.useMutation();
  const updateSettingsMutation = trpc.waypointRadio.updateSettings.useMutation();

  useEffect(() => {
    setVolumes(settings.ambientDefaultVolumes);
    setSelectedPresets(
      settings.ambientPresetByCategory || DEFAULT_WAYPOINT_RADIO_SETTINGS.ambientPresetByCategory
    );
  }, [settings]);

  const stopSeamlessPreview = () => {
    try {
      loopSourceRef.current?.stop();
    } catch {
      // ignore
    }
    loopSourceRef.current = null;
    if (loopCtxRef.current) {
      void loopCtxRef.current.close();
      loopCtxRef.current = null;
      loopGainRef.current = null;
    }
    setLoopPreviewTrackId(null);
    setPreviewPresetKey(null);
    setIsDecodingLoop(false);
  };

  useEffect(() => {
    return () => stopSeamlessPreview();
  }, []);

  // Live-adjust loop preview volume as the default volume slider moves
  useEffect(() => {
    if (loopGainRef.current && loopCtxRef.current) {
      const vol = volumes[selectedCategory] ?? 0.55;
      loopGainRef.current.gain.setTargetAtTime(
        vol * loopScaleRef.current,
        loopCtxRef.current.currentTime,
        0.08
      );
    }
  }, [volumes, selectedCategory]);

  const toggleBuiltInPresetPreview = (category: AmbientCategoryId, presetId: string) => {
    const key = `${category}:${presetId}`;
    if (previewPresetKey === key) {
      stopSeamlessPreview();
      return;
    }
    stopSeamlessPreview();
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      loopCtxRef.current = ctx;
      const spec = createBuiltInAmbientSpec(ctx, category, presetId);
      loopScaleRef.current = spec.scale * 1.15;
      const vol = Math.max(0.25, volumes[category] ?? 0.55);
      const { source, gain } = connectAmbientSpecChain(ctx, spec, ctx.destination, vol * loopScaleRef.current);
      loopSourceRef.current = source;
      loopGainRef.current = gain;
      setPreviewPresetKey(key);
    } catch {
      stopSeamlessPreview();
      toast.error("Could not start built-in sound preview.");
    }
  };

  const handleSelectBuiltInPreset = async (category: AmbientCategoryId, presetId: string) => {
    const nextPresets = { ...selectedPresets, [category]: presetId };
    setSelectedPresets(nextPresets);
    try {
      await updateSettingsMutation.mutateAsync({
        ambientPresetByCategory: nextPresets,
      });
      onLibraryChanged();
      const preset = WAYPOINT_AMBIENT_PRESETS[category].find((p) => p.id === presetId);
      toast.success(`Set ${categoryDef.name} sound to "${preset?.name ?? presetId}".`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save ambient sound choice.");
    }
  };

  const categoryDef = useMemo(
    () => WAYPOINT_AMBIENT_CATEGORIES.find((c) => c.id === selectedCategory) || WAYPOINT_AMBIENT_CATEGORIES[0],
    [selectedCategory]
  );

  const categoryTracks = useMemo(
    () =>
      tracks
        .filter((t) => t.kind === "ambience" && t.ambientCategory === selectedCategory)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id),
    [tracks, selectedCategory]
  );

  const toggleSeamlessPreview = async (track: WaypointRadioTrack) => {
    if (loopPreviewTrackId === track.id) {
      stopSeamlessPreview();
      return;
    }
    stopSeamlessPreview();
    setIsDecodingLoop(true);
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      loopCtxRef.current = ctx;
      const res = await fetch(track.fileUrl);
      const arr = await res.arrayBuffer();
      const decoded = await ctx.decodeAudioData(arr);
      const seamlessBuf = makeSeamlessLoopBuffer(ctx, decoded, 2.0);
      if (loopCtxRef.current !== ctx) return;

      const src = ctx.createBufferSource();
      src.buffer = seamlessBuf;
      src.loop = true;

      loopScaleRef.current = 0.85;
      const gain = ctx.createGain();
      gain.gain.value = (volumes[selectedCategory] ?? 0.55) * 0.85;
      src.connect(gain);
      gain.connect(ctx.destination);
      src.start();

      loopSourceRef.current = src;
      loopGainRef.current = gain;
      setLoopPreviewTrackId(track.id);
    } catch {
      stopSeamlessPreview();
      toast.error("Could not decode ambient audio for seamless loop preview.");
    } finally {
      setIsDecodingLoop(false);
    }
  };

  const handleUploadAmbient = async (file: File, replaceTrackId?: number) => {
    setBanner(null);
    setUploadPct(4);
    try {
      const uploaded = await uploadWaypointRadioAudio(file, categoryDef.folder, (pct) => setUploadPct(pct));
      if (replaceTrackId) {
        await updateTrackMutation.mutateAsync({
          id: replaceTrackId,
          title: uploaded.suggestedTitle,
          fileName: uploaded.fileName,
          fileKey: uploaded.fileKey,
          fileUrl: uploaded.fileUrl,
          mimeType: uploaded.mimeType,
          fileSize: uploaded.fileSize,
          durationSec: uploaded.durationSec,
        });
        setBanner({ type: "success", text: `Replaced ambient audio for ${categoryDef.name}.` });
        toast.success(`Replaced ${categoryDef.name} ambient audio.`);
      } else {
        await registerMutation.mutateAsync({
          kind: "ambience",
          ambientCategory: categoryDef.id,
          title: uploaded.suggestedTitle,
          fileName: uploaded.fileName,
          fileKey: uploaded.fileKey,
          fileUrl: uploaded.fileUrl,
          mimeType: uploaded.mimeType,
          fileSize: uploaded.fileSize,
          durationSec: uploaded.durationSec,
        });
        setBanner({ type: "success", text: `Uploaded "${uploaded.suggestedTitle}" to ${categoryDef.name}.` });
        toast.success(`Uploaded ambient sound to ${categoryDef.name}.`);
      }
      onLibraryChanged();
    } catch (err: any) {
      const msg = err?.message || "Ambient upload failed.";
      setBanner({ type: "error", text: msg });
      toast.error(msg);
    } finally {
      setUploadPct(null);
      setReplacingId(null);
    }
  };

  const handleSaveAmbientSettings = async () => {
    try {
      await updateSettingsMutation.mutateAsync({
        ambientDefaultVolumes: volumes,
      });
      onLibraryChanged();
      toast.success("Ambient default volume saved.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save ambient settings.");
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Ambient Sound Category Selector (6 Dedicated Radio Sliders) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {WAYPOINT_AMBIENT_CATEGORIES.map((cat) => {
          const active = cat.id === selectedCategory;
          const count = tracks.filter((t) => t.kind === "ambience" && t.ambientCategory === cat.id).length;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                stopSeamlessPreview();
                setSelectedCategory(cat.id);
                setBanner(null);
              }}
              className={`px-3 py-2.5 rounded-lg border text-left transition-all cursor-pointer ${active
                ? "bg-[#0D1E42] border-[#C5A059] text-[#FFF4D4]"
                : "bg-[#040E2A] border-[#C5A059]/20 text-[#B9C5DC] hover:border-[#C5A059]/50"
                }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="font-serif text-xs font-semibold truncate">{cat.name}</span>
                <span className="text-[11px] font-mono text-[#DFBE77]">{count}</span>
              </div>
              <div className="text-[10px] text-[#8B9BB8] mt-1">
                {count > 0 ? "Custom audio" : "Built-in loop"}
              </div>
            </button>
          );
        })}
      </div>

      {/* 2. Built-In Sound Variations (5 Curated Presets to Audition & Pick Per Channel) */}
      <div className="rounded-lg bg-[#05102E] border border-[#C5A059]/30 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#DFBE77]" />
              <h3 className="font-serif text-base font-semibold text-[#FFF4D4]">
                {categoryDef.name} — 5 Built-In Sounds to Test
              </h3>
            </div>
            <p className="text-[11px] text-[#9AA9C5] mt-0.5">
              Click <span className="text-[#DFBE77]">Test</span> to preview any variation in seamless stereo, then click <span className="text-[#DFBE77]">Use Sound</span> to assign it to the radio slider.
              {categoryTracks.length > 0 && " (Your uploaded custom audio below overrides built-in presets while enabled.)"}
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          {WAYPOINT_AMBIENT_PRESETS[selectedCategory].map((preset, idx) => {
            const activePreset =
              selectedPresets[selectedCategory] ||
              DEFAULT_WAYPOINT_RADIO_SETTINGS.ambientPresetByCategory[selectedCategory];
            const isSelected = activePreset === preset.id;
            const isTesting = previewPresetKey === `${selectedCategory}:${preset.id}`;

            return (
              <div
                key={preset.id}
                className={`flex flex-wrap items-center justify-between gap-2.5 px-3 py-2.5 rounded-lg border transition-colors ${
                  isSelected
                    ? "bg-[#0D1E42] border-[#C5A059] text-[#FFF4D4]"
                    : "bg-[#030B24] border-[#C5A059]/20 text-[#D8E2F4] hover:border-[#C5A059]/45"
                }`}
              >
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <span className="font-mono text-xs font-bold text-[#C5A059] mt-0.5 shrink-0">
                    0{idx + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-[#FFF4D4]">{preset.name}</div>
                    <div className="text-[11px] text-[#9AA9C5]">{preset.description}</div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleBuiltInPresetPreview(selectedCategory, preset.id)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold border transition-colors cursor-pointer ${
                      isTesting
                        ? "bg-[#C5A059] border-[#FFE394] text-[#050D24]"
                        : "bg-[#000820] border-[#C5A059]/40 text-[#DFBE77] hover:border-[#DFBE77]"
                    }`}
                  >
                    {isTesting ? (
                      <>
                        <Square className="w-3 h-3 fill-current" />
                        Stop
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3 fill-current" />
                        Test
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={isSelected || updateSettingsMutation.isPending}
                    onClick={() => void handleSelectBuiltInPreset(selectedCategory, preset.id)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
                      isSelected
                        ? "bg-emerald-950/60 border-emerald-500/50 text-emerald-300 cursor-default"
                        : "bg-[#0A1A3D] border-[#C5A059]/35 text-[#F4EBD6] hover:border-[#DFBE77] cursor-pointer"
                    }`}
                  >
                    {isSelected ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Active
                      </>
                    ) : (
                      "Use Sound"
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Selected Category Custom Upload & Default Volume */}
      <div className="rounded-lg bg-[#05102E] border border-[#C5A059]/25 p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-serif text-sm font-semibold text-[#FFF4D4]">
              Custom {categoryDef.name} Audio Override (Optional)
            </h3>
            <p className="text-xs font-mono text-[#8B9BB8]">Folder: {categoryDef.folder}/</p>
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp3,.wav,audio/mpeg,audio/wav"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void handleUploadAmbient(file);
              }}
            />
            <input
              ref={replaceInputRef}
              type="file"
              accept=".mp3,.wav,audio/mpeg,audio/wav"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                const id = replacingId;
                e.target.value = "";
                if (file && id) void handleUploadAmbient(file, id);
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#A6833E] text-[#050D24] hover:brightness-110 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              {categoryTracks.length > 0 ? "Upload New Audio" : "Upload Audio File"}
            </button>
          </div>
        </div>

        {/* Drag-and-Drop Box */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) void handleUploadAmbient(file);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`rounded-lg border border-dashed px-4 py-3 text-center cursor-pointer transition-colors ${isDragOver ? "border-[#DFBE77] bg-[#0F234F]/80" : "border-[#C5A059]/30 bg-[#030C26]/70"
            }`}
        >
          <p className="text-xs text-[#E8D8B2]">
            Drop an MP3 or WAV recording here for <span className="text-[#DFBE77]">{categoryDef.name}</span>
          </p>
          <p className="text-[11px] text-[#8B9BB8] mt-0.5">
            Automatically crossfaded at the loop boundary for hours of seamless, gap-free playback.
          </p>
        </div>

        {uploadPct !== null && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-[#DFBE77]">
              <span>Uploading ambient audio...</span>
              <span className="font-mono">{uploadPct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-[#0A183B] overflow-hidden">
              <div className="h-full bg-[#C5A059] transition-all" style={{ width: `${uploadPct}%` }} />
            </div>
          </div>
        )}

        {banner && (
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${banner.type === "success"
              ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-200"
              : "bg-rose-950/40 border-rose-500/40 text-rose-200"
              }`}
          >
            {banner.type === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
            <span>{banner.text}</span>
          </div>
        )}

        {/* Default Volume Slider */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-[#C5A059]/18">
          <div className="flex-1 min-w-[220px] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#E8D8B2] font-medium">
                {categoryDef.name} Default Volume
              </span>
              <span className="font-mono text-[#DFBE77]">
                {Math.round((volumes[selectedCategory] ?? 0.5) * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round((volumes[selectedCategory] ?? 0.5) * 100)}
              onChange={(e) =>
                setVolumes((prev) => ({ ...prev, [selectedCategory]: Number(e.target.value) / 100 }))
              }
              className="w-full accent-[#C5A059] cursor-pointer"
            />
          </div>

          <button
            type="button"
            disabled={updateSettingsMutation.isPending}
            onClick={() => void handleSaveAmbientSettings()}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#C5A059] text-[#040B20] hover:bg-[#DFBE77] cursor-pointer"
          >
            Save Default Volume
          </button>
        </div>
      </div>

      {/* 3. Uploaded Ambient Files + Seamless Loop Preview */}
      {categoryTracks.length === 0 ? (
        <div className="rounded-lg bg-[#040E2A] border border-[#C5A059]/20 py-7 px-4 text-center">
          <Waves className="w-6 h-6 mx-auto text-[#C5A059]/50 mb-1.5" />
          <p className="text-sm text-[#E9DEC3]">No custom file uploaded for {categoryDef.name}</p>
          <p className="text-xs text-[#8B9BB8] mt-0.5">
            Upload your own MP3 or WAV recording above to replace the built-in ambient loop.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {categoryTracks.map((tr) => {
            const looping = loopPreviewTrackId === tr.id;
            return (
              <div
                key={tr.id}
                className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-lg bg-[#05102E] border border-[#C5A059]/25"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-[#FFF4D4] truncate">{tr.title}</div>
                  <div className="text-[11px] text-[#8B9BB8]">
                    {formatAudioDuration(tr.durationSec)} · {formatAudioFileSize(tr.fileSize)} · {tr.fileName}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={isDecodingLoop}
                    onClick={() => void toggleSeamlessPreview(tr)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border cursor-pointer ${looping
                      ? "bg-[#C5A059] border-[#FFE394] text-[#050D24]"
                      : "bg-[#000820] border-[#C5A059]/40 text-[#DFBE77] hover:border-[#DFBE77]"
                      }`}
                  >
                    {looping ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                    {isDecodingLoop ? "Preparing..." : looping ? "Stop Loop" : "Preview Seamless Loop"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReplacingId(tr.id);
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
                      if (looping) stopSeamlessPreview();
                      await deleteMutation.mutateAsync({ id: tr.id });
                      onLibraryChanged();
                      toast.success("Ambient audio removed.");
                    }}
                    className="p-1.5 rounded text-[#9AA9C5] hover:text-rose-400 cursor-pointer"
                    title="Delete audio file"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface PlaybackTabProps {
  settings: WaypointRadioSettings;
  onLibraryChanged: () => void;
}

export function RadioPlaybackTab({ settings, onLibraryChanged }: PlaybackTabProps) {
  const [draft, setDraft] = useState<WaypointRadioSettings>(settings);
  const [savedNotice, setSavedNotice] = useState(false);

  const updateSettingsMutation = trpc.waypointRadio.updateSettings.useMutation();

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  const handleSave = async () => {
    setSavedNotice(false);
    try {
      await updateSettingsMutation.mutateAsync({
        fadeInSec: draft.fadeInSec,
        fadeOutSec: draft.fadeOutSec,
        crossfadeSec: draft.crossfadeSec,
        musicVolume: draft.musicVolume,
        announcementVolume: draft.announcementVolume,
        defaultRepeat: draft.defaultRepeat,
        announcementEveryNSongs: draft.announcementEveryNSongs,
        commercialEveryNSongs: draft.commercialEveryNSongs,
      });
      onLibraryChanged();
      setSavedNotice(true);
      toast.success("Waypoint Radio playback settings saved.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save playback settings.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Fade & Crossfade Durations */}
        <div className="rounded-lg bg-[#05102E] border border-[#C5A059]/25 p-4 space-y-4">
          <div className="flex items-center gap-2 text-[#FFF4D4] font-serif text-sm font-semibold">
            <Sliders className="w-4 h-4 text-[#C5A059]" />
            Fade &amp; Crossfade Transitions
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-[#C9BA9B]">Music Fade-In Duration</span>
              <span className="font-mono text-[#DFBE77]">{draft.fadeInSec.toFixed(1)}s</span>
            </div>
            <input
              type="range"
              min={0}
              max={10}
              step={0.5}
              value={draft.fadeInSec}
              onChange={(e) => setDraft((d) => ({ ...d, fadeInSec: Number(e.target.value) }))}
              className="w-full accent-[#C5A059] cursor-pointer"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-[#C9BA9B]">Music Fade-Out Duration</span>
              <span className="font-mono text-[#DFBE77]">{draft.fadeOutSec.toFixed(1)}s</span>
            </div>
            <input
              type="range"
              min={0}
              max={10}
              step={0.5}
              value={draft.fadeOutSec}
              onChange={(e) => setDraft((d) => ({ ...d, fadeOutSec: Number(e.target.value) }))}
              className="w-full accent-[#C5A059] cursor-pointer"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-[#C9BA9B]">Song-to-Song Crossfade</span>
              <span className="font-mono text-[#DFBE77]">{draft.crossfadeSec.toFixed(1)}s</span>
            </div>
            <input
              type="range"
              min={0}
              max={12}
              step={0.5}
              value={draft.crossfadeSec}
              onChange={(e) => setDraft((d) => ({ ...d, crossfadeSec: Number(e.target.value) }))}
              className="w-full accent-[#C5A059] cursor-pointer"
            />
          </div>
        </div>

        {/* Card 2: Independent Volume Controls */}
        <div className="rounded-lg bg-[#05102E] border border-[#C5A059]/25 p-4 space-y-4">
          <div className="flex items-center gap-2 text-[#FFF4D4] font-serif text-sm font-semibold">
            <Volume2 className="w-4 h-4 text-[#C5A059]" />
            Independent Volume Levels
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-[#C9BA9B]">Music Volume</span>
              <span className="font-mono text-[#DFBE77]">{Math.round(draft.musicVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(draft.musicVolume * 100)}
              onChange={(e) => setDraft((d) => ({ ...d, musicVolume: Number(e.target.value) / 100 }))}
              className="w-full accent-[#C5A059] cursor-pointer"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-[#C9BA9B]">Announcements &amp; Voiceovers Volume</span>
              <span className="font-mono text-[#DFBE77]">{Math.round(draft.announcementVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(draft.announcementVolume * 100)}
              onChange={(e) =>
                setDraft((d) => ({ ...d, announcementVolume: Number(e.target.value) / 100 }))
              }
              className="w-full accent-[#C5A059] cursor-pointer"
            />
          </div>

          <p className="text-[11px] text-[#8B9BB8] pt-1">
            Built-in loudness leveling keeps perceived volume steady. Fades and crossfades apply to music only — spoken announcements and commercials never fade.
          </p>
        </div>
      </div>

      {/* Card 3: Sequential Repeat & Commercial / Announcement Scheduling */}
      <div className="rounded-lg bg-[#05102E] border border-[#C5A059]/25 p-4 space-y-4">
        <div className="flex items-center gap-2 text-[#FFF4D4] font-serif text-sm font-semibold">
          <Repeat className="w-4 h-4 text-[#C5A059]" />
          Sequential Repeat &amp; Break Frequency
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg bg-[#030A22] border border-[#C5A059]/20">
            <div>
              <div className="text-xs font-semibold text-[#FFF4D4]">Playlist Repeat Default</div>
              <div className="text-[11px] text-[#8B9BB8]">Loop back to song #1 after last song</div>
            </div>
            <button
              type="button"
              onClick={() => setDraft((d) => ({ ...d, defaultRepeat: !d.defaultRepeat }))}
              className={`px-3 py-1 rounded-full text-xs font-bold border cursor-pointer transition-colors ${draft.defaultRepeat
                ? "bg-[#C5A059] border-[#FFE394] text-[#050D24]"
                : "bg-[#000820] border-[#C5A059]/30 text-[#9AA9C5]"
                }`}
            >
              {draft.defaultRepeat ? "ON" : "OFF"}
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-lg bg-[#030A22] border border-[#C5A059]/20">
            <div>
              <div className="text-xs font-semibold text-[#FFF4D4]">Commercial Frequency</div>
              <div className="text-[11px] text-[#8B9BB8]">Every N songs (0 = Off)</div>
            </div>
            <input
              type="number"
              min={0}
              max={50}
              value={draft.commercialEveryNSongs}
              onChange={(e) =>
                setDraft((d) => ({ ...d, commercialEveryNSongs: Math.max(0, Number(e.target.value) || 0) }))
              }
              className="w-16 px-2 py-1 rounded bg-[#000820] border border-[#C5A059]/40 text-xs text-center font-mono text-[#FFF4D4]"
            />
          </div>

          <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-lg bg-[#030A22] border border-[#C5A059]/20">
            <div>
              <div className="text-xs font-semibold text-[#FFF4D4]">Announcement Frequency</div>
              <div className="text-[11px] text-[#8B9BB8]">Every N songs (0 = Off)</div>
            </div>
            <input
              type="number"
              min={0}
              max={50}
              value={draft.announcementEveryNSongs}
              onChange={(e) =>
                setDraft((d) => ({ ...d, announcementEveryNSongs: Math.max(0, Number(e.target.value) || 0) }))
              }
              className="w-16 px-2 py-1 rounded bg-[#000820] border border-[#C5A059]/40 text-xs text-center font-mono text-[#FFF4D4]"
            />
          </div>
        </div>
      </div>

      {/* Footer Save Bar */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div>
          {savedNotice && (
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Settings saved and applied live without interrupting playback.
            </span>
          )}
        </div>
        <button
          type="button"
          disabled={updateSettingsMutation.isPending}
          onClick={() => void handleSave()}
          className="px-5 py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#A6833E] text-[#050D24] hover:brightness-110 transition-all cursor-pointer shadow-sm"
        >
          {updateSettingsMutation.isPending ? "Saving..." : "Save Playback Settings"}
        </button>
      </div>
    </div>
  );
}
