import React, { useState } from "react";
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

/** Compact inline control to reassign any song or announcement to one of the 5 official stations */
export function MoveToStationButton({ track, onMoved }: MoveToStationButtonProps) {
  const [open, setOpen] = useState(false);
  const moveMutation = trpc.waypointRadio.moveTrack.useMutation();

  const handleMoveTo = async (targetStationId: RadioStationId) => {
    setOpen(false);
    if (track.stationId === targetStationId) return;
    const dest = WAYPOINT_RADIO_STATIONS.find((s) => s.id === targetStationId);
    try {
      await moveMutation.mutateAsync({
        id: track.id,
        targetStationId,
      });
      onMoved();
      toast.success(
        `Moved "${track.title}" to ${dest?.name ?? targetStationId} (${dest?.frequency ?? ""}).`
      );
    } catch (err: any) {
      toast.error(err?.message || "Failed to move audio to station.");
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        disabled={moveMutation.isPending}
        onClick={() => setOpen((v) => !v)}
        className="p-1.5 rounded text-[#9AA9C5] hover:text-[#DFBE77] hover:bg-white/5 cursor-pointer"
        title="Move audio to another official station"
      >
        <ArrowRightLeft className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-30 w-52 rounded-lg bg-[#040E2A] border border-[#C5A059]/45 shadow-[0_12px_32px_rgba(0,0,0,0.9)] py-1"
          onMouseLeave={() => setOpen(false)}
        >
          <div className="px-2.5 py-1 text-[10px] uppercase tracking-wider font-semibold text-[#C5A059] border-b border-[#C5A059]/20">
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
                className={`w-full px-2.5 py-1.5 text-left text-xs flex items-center justify-between transition-colors ${
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
        </div>
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
