import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ArrowRightLeft, AlertTriangle, Play, Square } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  WAYPOINT_RADIO_STATIONS,
  isOfficialRadioStationId,
  type RadioStationId,
  type WaypointRadioTrack,
} from "@shared/waypointRadio";

interface MoveToStationButtonProps {
  track: WaypointRadioTrack;
  onMoved: () => void;
}

/** Compact inline control to reassign any song or announcement to any official station or category (portal-rendered so never clipped) */
export function MoveToStationButton({ track, onMoved }: MoveToStationButtonProps) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top?: number; bottom?: number; right: number }>({
    top: 0,
    right: 0,
  });
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const moveMutation = trpc.waypointRadio.moveTrack.useMutation();

  const updateMenuPosition = () => {
    const rect = btnRef.current?.getBoundingClientRect();
    if (!rect) return;
    const estimatedMenuHeight = 320;
    const spaceBelow = window.innerHeight - rect.bottom;
    const rightOffset = Math.max(12, window.innerWidth - rect.right);
    if (spaceBelow < estimatedMenuHeight && rect.top > spaceBelow) {
      setMenuPos({
        bottom: window.innerHeight - rect.top + 6,
        right: rightOffset,
      });
    } else {
      setMenuPos({
        top: rect.bottom + 6,
        right: rightOffset,
      });
    }
  };

  useEffect(() => {
    if (!open) return;
    updateMenuPosition();
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (btnRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onScrollOrResize = () => updateMenuPosition();

    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [open]);

  const handleMoveTo = async (
    targetStationId: RadioStationId | null,
    targetKind?: "music" | "announcement" | "commercial" | "general_announcement"
  ) => {
    setOpen(false);
    if (track.stationId === targetStationId && (!targetKind || targetKind === track.kind)) return;
    const dest = WAYPOINT_RADIO_STATIONS.find((s) => s.id === targetStationId);
    try {
      await moveMutation.mutateAsync({
        id: track.id,
        targetStationId,
        targetKind,
      });
      onMoved();
      const destLabel =
        targetKind === "commercial"
          ? "Commercials"
          : targetKind === "general_announcement"
            ? "General Announcements"
            : `${dest?.name ?? targetStationId} (${
                (targetKind || track.kind) === "announcement" ? "Announcements" : "Music"
              })`;
      toast.success(`Moved "${track.title}" to ${destLabel}.`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to move audio.");
    }
  };

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        disabled={moveMutation.isPending}
        onClick={() => setOpen((v) => !v)}
        className={`p-1.5 rounded transition-colors cursor-pointer ${
          open
            ? "text-[#FFF4D4] bg-[#C5A059]/25"
            : "text-[#9AA9C5] hover:text-[#DFBE77] hover:bg-white/5"
        }`}
        title="Move audio to another station or category"
      >
        <ArrowRightLeft className="w-3.5 h-3.5" />
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              top: menuPos.top,
              bottom: menuPos.bottom,
              right: menuPos.right,
            }}
            className="z-[160] w-60 max-h-[80vh] overflow-y-auto rounded-lg bg-[#040E2A] border border-[#C5A059]/55 shadow-[0_18px_48px_rgba(0,0,0,0.95)] py-1.5 text-[#F4EBD6]"
          >
            <div className="px-3 py-1 text-[10px] uppercase tracking-wider font-semibold text-[#C5A059] border-b border-[#C5A059]/20">
              Move to Official Station
            </div>
            {WAYPOINT_RADIO_STATIONS.map((st) => {
              const isCurrent = track.stationId === st.id;
              return (
                <button
                  key={st.id}
                  type="button"
                  disabled={isCurrent}
                  onClick={() => void handleMoveTo(st.id)}
                  className={`w-full px-3 py-1.5 text-left text-xs flex items-center justify-between transition-colors ${
                    isCurrent
                      ? "text-[#7A8AA8] bg-white/[0.03] cursor-default"
                      : "text-[#F4EBD6] hover:bg-[#0D1E42] hover:text-[#FFF4D4] cursor-pointer"
                  }`}
                >
                  <span className="truncate font-medium">
                    0{st.order} · {st.name}
                  </span>
                  <span className="text-[10px] font-mono text-[#DFBE77] ml-2 shrink-0">
                    {st.shortFrequency}
                  </span>
                </button>
              );
            })}

            {(track.kind === "music" || track.kind === "announcement") && track.stationId && (
              <>
                <div className="px-3 py-1 mt-1 text-[10px] uppercase tracking-wider font-semibold text-[#C5A059] border-t border-b border-[#C5A059]/20">
                  Switch Category
                </div>
                {track.kind === "music" ? (
                  <button
                    type="button"
                    onClick={() =>
                      void handleMoveTo(track.stationId as RadioStationId, "announcement")
                    }
                    className="w-full px-3 py-1.5 text-left text-xs font-medium text-[#F5D88B] hover:bg-[#0D1E42] cursor-pointer"
                  >
                    Move to Station Announcements
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleMoveTo(track.stationId as RadioStationId, "music")}
                    className="w-full px-3 py-1.5 text-left text-xs font-medium text-[#F5D88B] hover:bg-[#0D1E42] cursor-pointer"
                  >
                    Move to Station Music
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void handleMoveTo(null, "general_announcement")}
                  className="w-full px-3 py-1.5 text-left text-xs text-[#D5E0F5] hover:bg-[#0D1E42] cursor-pointer"
                >
                  Move to General Announcements
                </button>
                <button
                  type="button"
                  onClick={() => void handleMoveTo(null, "commercial")}
                  className="w-full px-3 py-1.5 text-left text-xs text-[#D5E0F5] hover:bg-[#0D1E42] cursor-pointer"
                >
                  Move to Commercials
                </button>
              </>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}

interface UnassignedAudioBannerProps {
  tracks: WaypointRadioTrack[];
  previewTrackId: number | null;
  onTogglePreview: (track: WaypointRadioTrack) => void;
  onMoved: () => void;
}

/**
 * Surfaces any preserved audio files that were previously saved under retired/non-official station IDs
 * so administrators can manually move them to the right official station without losing any files.
 */
export function UnassignedAudioBanner({
  tracks,
  previewTrackId,
  onTogglePreview,
  onMoved,
}: UnassignedAudioBannerProps) {
  const moveMutation = trpc.waypointRadio.moveTrack.useMutation();

  const unassigned = tracks.filter(
    (t) =>
      (t.kind === "music" || t.kind === "announcement") &&
      !isOfficialRadioStationId(t.stationId)
  );

  if (unassigned.length === 0) return null;

  return (
    <div className="rounded-lg bg-amber-950/35 border border-amber-500/45 p-3.5 space-y-2.5">
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <div className="text-xs font-semibold text-amber-200">
            Preserved Unassigned Audio ({unassigned.length}{" "}
            {unassigned.length === 1 ? "file" : "files"})
          </div>
          <p className="text-[11px] text-amber-200/80 mt-0.5">
            These previously uploaded audio files were preserved intact. Select an official station to assign each file.
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        {unassigned.map((tr) => {
          const isPreviewing = previewTrackId === tr.id;
          return (
            <div
              key={tr.id}
              className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded bg-[#000820]/85 border border-amber-500/25"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => onTogglePreview(tr)}
                  className="w-6 h-6 rounded-full flex items-center justify-center bg-[#061233] border border-[#C5A059]/40 text-[#DFBE77] cursor-pointer shrink-0"
                  title={isPreviewing ? "Stop preview" : "Preview audio"}
                >
                  {isPreviewing ? (
                    <Square className="w-2.5 h-2.5 fill-current" />
                  ) : (
                    <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
                  )}
                </button>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-[#FFF4D4] truncate">{tr.title}</div>
                  <div className="text-[10px] text-[#9AA9C5] font-mono truncate">
                    {tr.kind === "announcement" ? "Announcement" : "Music"} · {tr.folderPath}
                  </div>
                </div>
              </div>

              <select
                defaultValue=""
                disabled={moveMutation.isPending}
                onChange={async (e) => {
                  const val = e.target.value as RadioStationId;
                  if (!val) return;
                  try {
                    await moveMutation.mutateAsync({ id: tr.id, targetStationId: val });
                    onMoved();
                    const dest = WAYPOINT_RADIO_STATIONS.find((s) => s.id === val);
                    toast.success(`Assigned "${tr.title}" to ${dest?.name ?? val}.`);
                  } catch (err: any) {
                    toast.error(err?.message || "Failed to assign track.");
                  }
                }}
                className="px-2.5 py-1 rounded bg-[#05102E] border border-[#C5A059]/45 text-xs text-[#FFF4D4] focus:outline-none cursor-pointer"
              >
                <option value="">Assign to official station...</option>
                {WAYPOINT_RADIO_STATIONS.map((st) => (
                  <option key={st.id} value={st.id}>
                    0{st.order} · {st.name} ({st.frequency})
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
    </div>
  );
}
