import React, { useEffect, useMemo, useState } from "react";
import { useRoute } from "wouter";
import { Maximize2, Minimize2, Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { ScopedErrorBoundary } from "@/components/ScopedErrorBoundary";
import { StudioCanvas } from "@/components/studio/StudioCanvas";
import type {
  StudioPage,
  StudioTaskRecord,
} from "@/components/studio/studioTypes";

/**
 * PG-049-AUD — The Studio Synchronized Audience Window
 * Clean presentation view suitable for screen sharing in Zoom / Google Meet / Teams.
 * - Zero presenter controls
 * - Zero private task metadata (assignees, due dates, checklists, descriptions)
 * - Synchronized in real time with the presenter's active page, annotations, and temporary pointer
 */
export default function StudioAudienceView() {
  const [, params] = useRoute("/studio/audience/:boardId");
  const boardId = params?.boardId || "brd-default-studio";

  const [liveSync, setLiveSync] = useState<{
    activePageId?: string;
    surface?: "neon" | "whiteboard";
    pages?: StudioPage[];
    pointerPos?: { x: number; y: number } | null;
  } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const audienceQuery = trpc.studio.getAudienceBoard.useQuery(
    { id: boardId },
    {
      refetchInterval: 2500,
    }
  );

  // Listen to same-origin BroadcastChannel + localStorage for instant sub-frame sync
  useEffect(() => {
    const handlePayload = (data: any) => {
      if (!data || data.boardId !== boardId) return;
      setLiveSync({
        activePageId: data.activePageId,
        surface: data.surface,
        pages: data.pages,
        pointerPos: data.pointerPos ?? null,
      });
    };

    let ch: BroadcastChannel | null = null;
    try {
      ch = new BroadcastChannel("waypoint_studio_sync");
      ch.onmessage = (ev) => handlePayload(ev.data);
    } catch {
      // Ignore if BroadcastChannel is unavailable
    }

    const onStorage = (ev: StorageEvent) => {
      if (ev.key === `waypoint_studio_sync_${boardId}` && ev.newValue) {
        try {
          handlePayload(JSON.parse(ev.newValue));
        } catch {
          // Ignore malformed JSON
        }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      if (ch) ch.close();
      window.removeEventListener("storage", onStorage);
    };
  }, [boardId]);

  useEffect(() => {
    const onFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Ignore
    }
  };

  const board = audienceQuery.data;
  const pages: StudioPage[] = useMemo(() => {
    if (liveSync?.pages && liveSync.pages.length > 0) {
      // Strip private task metadata on live sync as well
      return liveSync.pages
        .filter((p) => p.audienceVisible !== false)
        .map((p) => ({
          ...p,
          objects: p.objects
            .filter((o) => o.audienceVisible !== false)
            .map((o) => ({
              ...o,
              linkedTaskId: null,
              isMyFocus: undefined,
              priority: undefined,
            })),
        }));
    }
    return (board?.pages as StudioPage[]) || [];
  }, [liveSync, board]);

  const activePage = useMemo(() => {
    const targetId = liveSync?.activePageId || board?.activePageId;
    return pages.find((p) => p.id === targetId) || pages[0];
  }, [pages, liveSync, board]);

  const surface: "neon" | "whiteboard" =
    liveSync?.surface ||
    (board?.defaultSurface === "whiteboard" ? "whiteboard" : "neon");

  const emptyTaskMap = useMemo(() => new Map<number, StudioTaskRecord>(), []);

  return (
    <ScopedErrorBoundary moduleName="The Studio Audience View">
      <div
        data-testid="studio-audience-window"
        className="fixed inset-0 bg-[#000820] text-white flex flex-col overflow-hidden select-none"
      >
        {/* Minimal Audience Header with Go Full Screen button */}
        <header className="h-10 px-4 bg-[#02081F]/90 border-b border-[#1E2B58] flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-bold tracking-wider uppercase text-slate-300">
              WAYPOINT / STUDIO
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-white font-medium truncate">
              {board?.title || "Live Teaching Session"}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {activePage && (
              <span className="text-[11px] font-mono text-cyan-300">
                {activePage.title}
              </span>
            )}
            <button
              type="button"
              data-testid="audience-go-fullscreen-btn"
              onClick={toggleFullscreen}
              className="h-7 px-2.5 rounded-lg bg-[#081236] hover:bg-[#11225A] border border-[#3E478A] text-[11px] font-medium text-slate-100 inline-flex items-center gap-1.5 cursor-pointer"
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-3 h-3 text-cyan-300" />
                  <span>Exit Full Screen</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3 h-3 text-cyan-300" />
                  <span>Go Full Screen</span>
                </>
              )}
            </button>
          </div>
        </header>

        <div className="relative flex-1 flex min-h-0">
          {activePage ? (
            <StudioCanvas
              surface={surface}
              activeTool="select"
              activeColor="cyan"
              strokeThickness={4}
              strokes={activePage.strokes}
              objects={activePage.objects}
              tasksById={emptyTaskMap}
              teamRoster={[]}
              selectedObjectId={null}
              canEdit={false}
              isPresentationMode={true}
              hidePrivateTaskMeta={true}
              remotePointerPos={liveSync?.pointerPos ?? null}
              onSelectObject={() => {}}
              onToolChange={() => {}}
              onCommitStrokes={() => {}}
              onCommitObjects={() => {}}
              onConvertNoteToTask={() => {}}
              onOpenTaskDrawer={() => {}}
              onAssignTaskOrNote={() => {}}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
              Waiting for presenter’s active teaching page…
            </div>
          )}
        </div>
      </div>
    </ScopedErrorBoundary>
  );
}
