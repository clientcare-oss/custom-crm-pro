import React, { useState, useEffect } from "react";
import { X, Music2, Mic, Waves, Sliders, FolderTree, ChevronDown, ChevronUp } from "lucide-react";
import { ALL_WAYPOINT_RADIO_FOLDERS, type RadioStationId } from "@shared/waypointRadio";
import { useObservatoryRadio } from "@/contexts/ObservatoryRadioContext";
import { RadioMusicTab } from "./RadioMusicTab";
import { RadioAnnouncementsTab } from "./RadioAnnouncementsTab";
import { RadioAmbienceTab, RadioPlaybackTab } from "./RadioAmbienceAndPlaybackTabs";

type SettingsTabId = "music" | "announcements" | "ambience" | "playback";

interface WaypointRadioSettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const TABS: { id: SettingsTabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "music", label: "Music", icon: Music2 },
  { id: "announcements", label: "Announcements", icon: Mic },
  { id: "ambience", label: "Ambience", icon: Waves },
  { id: "playback", label: "Playback", icon: Sliders },
];

export function WaypointRadioSettingsModal({ open, onClose }: WaypointRadioSettingsModalProps) {
  const { stationId, tracks, settings, refetchLibrary, isRadioAdmin } = useObservatoryRadio();
  const [activeTab, setActiveTab] = useState<SettingsTabId>("music");
  const [showFolders, setShowFolders] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || !isRadioAdmin) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-[#000412]/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Waypoint Radio Settings"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-[940px] max-h-[88vh] flex flex-col rounded-xl bg-[#000820] border border-[#C5A059]/35 shadow-[0_24px_70px_rgba(0,0,0,0.92)] overflow-hidden text-[#F4EBD6]">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[#C5A059]/25 bg-[#020B26]">
          <div>
            <h2 className="font-serif text-lg font-semibold text-[#FFF4D4] tracking-wide">
              Waypoint Radio Settings
            </h2>
            <p className="text-xs text-[#9AA9C5] mt-0.5">
              Manage playlists, voiceovers, ambient loops, and playback transitions without interrupting live audio.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFolders((v) => !v)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-[#061233] border border-[#C5A059]/25 text-[#DFBE77] hover:border-[#C5A059]/55 cursor-pointer"
              title="View organized audio folder hierarchy"
            >
              <FolderTree className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Folders ({ALL_WAYPOINT_RADIO_FOLDERS.length})</span>
              {showFolders ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-[#A8B7D4] hover:text-[#FFF4D4] hover:bg-white/5 transition-colors cursor-pointer"
              aria-label="Close Waypoint Radio Settings"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Collapsible Audio Folder Structure Reference */}
        {showFolders && (
          <div className="px-5 py-3 bg-[#030C28] border-b border-[#C5A059]/20 max-h-40 overflow-y-auto">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-[#C5A059] mb-1.5">
              Configured Waypoint Radio Folder Structure
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1 font-mono text-[11px] text-[#B9C5DC]">
              {ALL_WAYPOINT_RADIO_FOLDERS.map((folder) => (
                <div key={folder} className="truncate">
                  {folder}/
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4 Clean Tabs */}
        <div className="flex items-center gap-1.5 px-5 pt-3 pb-0 border-b border-[#C5A059]/22 bg-[#010A22]">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                  active
                    ? "border-[#DFBE77] text-[#FFF4D4]"
                    : "border-transparent text-[#95A6C6] hover:text-[#E8D8B2]"
                }`}
              >
                <Icon className="w-3.5 h-3.5 text-[#C5A059]" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Scrollable Tab Body */}
        <div className="flex-1 overflow-y-auto p-5 bg-[#000820]">
          {activeTab === "music" && (
            <RadioMusicTab
              tracks={tracks}
              initialStationId={stationId as RadioStationId}
              onLibraryChanged={refetchLibrary}
            />
          )}
          {activeTab === "announcements" && (
            <RadioAnnouncementsTab
              tracks={tracks}
              settings={settings}
              onLibraryChanged={refetchLibrary}
            />
          )}
          {activeTab === "ambience" && (
            <RadioAmbienceTab
              tracks={tracks}
              settings={settings}
              onLibraryChanged={refetchLibrary}
            />
          )}
          {activeTab === "playback" && (
            <RadioPlaybackTab settings={settings} onLibraryChanged={refetchLibrary} />
          )}
        </div>
      </div>
    </div>
  );
}
