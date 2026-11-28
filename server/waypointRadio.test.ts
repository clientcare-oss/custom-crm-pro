import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import {
  WAYPOINT_RADIO_STATIONS,
  WAYPOINT_AMBIENT_CATEGORIES,
  ALL_WAYPOINT_RADIO_FOLDERS,
  DEFAULT_WAYPOINT_RADIO_SETTINGS,
  isOfficialRadioStationId,
  isValidRadioFolder,
  resolveFolderForTrack,
} from "../shared/waypointRadio";

describe("Waypoint Radio official station & audio library configuration", () => {
  it("defines the exact five official radio stations and FM frequencies in order", () => {
    expect(WAYPOINT_RADIO_STATIONS).toHaveLength(5);
    expect(WAYPOINT_RADIO_STATIONS.map((s) => `${s.name} — ${s.frequency}`)).toEqual([
      "The Lobby — 88.1 FM",
      "Smooth 92 — 92.5 FM",
      "Flow FM — 96.3 FM",
      "Midnight Lounge — 101.7 FM",
      "Easy Street — 106.5 FM",
    ]);
  });

  it("removes all retired incorrect station labels from active definitions", () => {
    const retired = ["Deep Focus", "Coffeehouse", "Midnight Jazz", "The Observatory", "Momentum"];
    for (const label of retired) {
      expect(WAYPOINT_RADIO_STATIONS.some((s) => s.name === label || s.dialLabel === label)).toBe(false);
      expect(ALL_WAYPOINT_RADIO_FOLDERS.some((f) => f.includes(label))).toBe(false);
    }
    expect(isOfficialRadioStationId("deep-focus")).toBe(false);
    expect(isOfficialRadioStationId("the-observatory")).toBe(false);
    expect(isOfficialRadioStationId("the-lobby")).toBe(true);
    expect(isOfficialRadioStationId("easy-street")).toBe(true);
  });

  it("includes all 18 official organized audio folders and verifies physical directories exist", () => {
    expect(ALL_WAYPOINT_RADIO_FOLDERS).toEqual([
      "Waypoint Radio/01 - The Lobby/Music",
      "Waypoint Radio/01 - The Lobby/Announcements",
      "Waypoint Radio/02 - Smooth 92/Music",
      "Waypoint Radio/02 - Smooth 92/Announcements",
      "Waypoint Radio/03 - Flow FM/Music",
      "Waypoint Radio/03 - Flow FM/Announcements",
      "Waypoint Radio/04 - Midnight Lounge/Music",
      "Waypoint Radio/04 - Midnight Lounge/Announcements",
      "Waypoint Radio/05 - Easy Street/Music",
      "Waypoint Radio/05 - Easy Street/Announcements",
      "Waypoint Radio/Commercials",
      "Waypoint Radio/General Announcements",
      "Waypoint Radio/Ambient Sounds/Fan",
      "Waypoint Radio/Ambient Sounds/Rain Shower",
      "Waypoint Radio/Ambient Sounds/Ocean",
      "Waypoint Radio/Ambient Sounds/Train",
      "Waypoint Radio/Ambient Sounds/Coffee Shop",
      "Waypoint Radio/Ambient Sounds/Thunder",
    ]);

    for (const relFolder of ALL_WAYPOINT_RADIO_FOLDERS) {
      expect(isValidRadioFolder(relFolder)).toBe(true);
      const absPath = path.resolve(process.cwd(), relFolder);
      expect(fs.existsSync(absPath)).toBe(true);
    }
  });

  it("resolves official station music, announcements, shared folders, and all 6 ambient sounds", () => {
    expect(resolveFolderForTrack({ kind: "music", stationId: "the-lobby" })).toBe(
      "Waypoint Radio/01 - The Lobby/Music"
    );
    expect(resolveFolderForTrack({ kind: "announcement", stationId: "midnight-lounge" })).toBe(
      "Waypoint Radio/04 - Midnight Lounge/Announcements"
    );
    expect(resolveFolderForTrack({ kind: "commercial" })).toBe("Waypoint Radio/Commercials");
    expect(resolveFolderForTrack({ kind: "general_announcement" })).toBe(
      "Waypoint Radio/General Announcements"
    );
    expect(resolveFolderForTrack({ kind: "ambience", ambientCategory: "coffee-shop" })).toBe(
      "Waypoint Radio/Ambient Sounds/Coffee Shop"
    );
    expect(resolveFolderForTrack({ kind: "ambience", ambientCategory: "thunder" })).toBe(
      "Waypoint Radio/Ambient Sounds/Thunder"
    );
    expect(resolveFolderForTrack({ kind: "music", stationId: "deep-focus" })).toBeNull();
  });

  it("configures 3s music fade-in, 5s music fade-out, repeat ON by default, and all 6 ambient sounds", () => {
    expect(DEFAULT_WAYPOINT_RADIO_SETTINGS.fadeInSec).toBe(3);
    expect(DEFAULT_WAYPOINT_RADIO_SETTINGS.fadeOutSec).toBe(5);
    expect(DEFAULT_WAYPOINT_RADIO_SETTINGS.defaultRepeat).toBe(true);
    expect(WAYPOINT_AMBIENT_CATEGORIES.map((c) => c.name)).toEqual([
      "Fan",
      "Rain",
      "Ocean",
      "Train (No Horn)",
      "Coffee Shop",
      "Thunder",
    ]);
  });
});
