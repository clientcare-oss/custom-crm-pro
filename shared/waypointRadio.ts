/**
 * Waypoint Radio — Official Station Definitions, Frequencies, Folder Hierarchy, and Shared Types
 * Preserves the exact 5 official stations in order, 6 ambient soundscapes
 * (Fan, Rain Shower, Ocean, Train on Tracks [No Horn], Crickets, Thunder),
 * and sequential playback rules (zero shuffle, 3s fade-in, 5s fade-out, unfaded announcements).
 */

export type RadioStationId =
  | "the-lobby"
  | "smooth-92"
  | "flow-fm"
  | "midnight-lounge"
  | "easy-street";

export type RadioTrackKind =
  | "music"
  | "announcement"
  | "commercial"
  | "general_announcement"
  | "ambience";

export type AnnouncementScopeId =
  | RadioStationId
  | "commercials"
  | "general-announcements";

export type AmbientCategoryId =
  | "fan"
  | "rain-shower"
  | "ocean"
  | "train"
  | "coffee-shop"
  | "thunder";

export interface RadioStationDefinition {
  id: RadioStationId;
  order: number;
  name: string;
  frequency: string;
  shortFrequency: string;
  dialLabel: string;
  crtTitle: string;
  crtSub: string;
  dialPercent: number;
  knobDeg: number;
  folderName: string;
  musicFolder: string;
  announcementsFolder: string;
}

export const WAYPOINT_RADIO_STATIONS: RadioStationDefinition[] = [
  {
    id: "the-lobby",
    order: 1,
    name: "The Lobby",
    frequency: "88.1 FM",
    shortFrequency: "88.1",
    dialLabel: "The Lobby",
    crtTitle: "The Lobby",
    crtSub: "88.1 FM",
    dialPercent: 10,
    knobDeg: -52,
    folderName: "01 - The Lobby",
    musicFolder: "Waypoint Radio/01 - The Lobby/Music",
    announcementsFolder: "Waypoint Radio/01 - The Lobby/Announcements",
  },
  {
    id: "smooth-92",
    order: 2,
    name: "Smooth 92",
    frequency: "92.5 FM",
    shortFrequency: "92.5",
    dialLabel: "Smooth 92",
    crtTitle: "Smooth 92",
    crtSub: "92.5 FM",
    dialPercent: 30,
    knobDeg: -26,
    folderName: "02 - Smooth 92",
    musicFolder: "Waypoint Radio/02 - Smooth 92/Music",
    announcementsFolder: "Waypoint Radio/02 - Smooth 92/Announcements",
  },
  {
    id: "flow-fm",
    order: 3,
    name: "Flow FM",
    frequency: "96.3 FM",
    shortFrequency: "96.3",
    dialLabel: "Flow FM",
    crtTitle: "Flow FM",
    crtSub: "96.3 FM",
    dialPercent: 50,
    knobDeg: 0,
    folderName: "03 - Flow FM",
    musicFolder: "Waypoint Radio/03 - Flow FM/Music",
    announcementsFolder: "Waypoint Radio/03 - Flow FM/Announcements",
  },
  {
    id: "midnight-lounge",
    order: 4,
    name: "Midnight Lounge",
    frequency: "101.7 FM",
    shortFrequency: "101.7",
    dialLabel: "Midnight Lounge",
    crtTitle: "Midnight Lounge",
    crtSub: "101.7 FM",
    dialPercent: 70,
    knobDeg: 26,
    folderName: "04 - Midnight Lounge",
    musicFolder: "Waypoint Radio/04 - Midnight Lounge/Music",
    announcementsFolder: "Waypoint Radio/04 - Midnight Lounge/Announcements",
  },
  {
    id: "easy-street",
    order: 5,
    name: "Easy Street",
    frequency: "106.5 FM",
    shortFrequency: "106.5",
    dialLabel: "Easy Street",
    crtTitle: "Easy Street",
    crtSub: "106.5 FM",
    dialPercent: 90,
    knobDeg: 52,
    folderName: "05 - Easy Street",
    musicFolder: "Waypoint Radio/05 - Easy Street/Music",
    announcementsFolder: "Waypoint Radio/05 - Easy Street/Announcements",
  },
];

export const OFFICIAL_RADIO_STATION_IDS: RadioStationId[] = WAYPOINT_RADIO_STATIONS.map((s) => s.id);

export function isOfficialRadioStationId(id: string | null | undefined): id is RadioStationId {
  return Boolean(id && OFFICIAL_RADIO_STATION_IDS.includes(id as RadioStationId));
}

export const SHARED_ANNOUNCEMENT_FOLDERS = {
  commercials: {
    id: "commercials" as const,
    name: "Commercials",
    folder: "Waypoint Radio/Commercials",
    kind: "commercial" as const,
  },
  "general-announcements": {
    id: "general-announcements" as const,
    name: "General Announcements",
    folder: "Waypoint Radio/General Announcements",
    kind: "general_announcement" as const,
  },
};

export interface AmbientCategoryDefinition {
  id: AmbientCategoryId;
  name: string;
  folder: string;
}

export const WAYPOINT_AMBIENT_CATEGORIES: AmbientCategoryDefinition[] = [
  { id: "fan", name: "Fan", folder: "Waypoint Radio/Ambient Sounds/Fan" },
  { id: "rain-shower", name: "Rain", folder: "Waypoint Radio/Ambient Sounds/Rain Shower" },
  { id: "ocean", name: "Ocean", folder: "Waypoint Radio/Ambient Sounds/Ocean" },
  { id: "train", name: "Train (No Horn)", folder: "Waypoint Radio/Ambient Sounds/Train" },
  { id: "coffee-shop", name: "Coffee Shop", folder: "Waypoint Radio/Ambient Sounds/Coffee Shop" },
  { id: "thunder", name: "Thunder", folder: "Waypoint Radio/Ambient Sounds/Thunder" },
];

export const ALL_WAYPOINT_RADIO_FOLDERS: string[] = [
  ...WAYPOINT_RADIO_STATIONS.flatMap((s) => [s.musicFolder, s.announcementsFolder]),
  SHARED_ANNOUNCEMENT_FOLDERS.commercials.folder,
  SHARED_ANNOUNCEMENT_FOLDERS["general-announcements"].folder,
  ...WAYPOINT_AMBIENT_CATEGORIES.map((a) => a.folder),
];

export interface WaypointRadioTrack {
  id: number;
  kind: RadioTrackKind;
  /** Official station ID, or preserved legacy station string until admin reassigns */
  stationId: string | null;
  ambientCategory: AmbientCategoryId | null;
  folderPath: string;
  title: string;
  fileName: string;
  fileKey: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  durationSec: number | null;
  sortOrder: number;
  enabled: boolean;
  albumDescription: string;
  sunoPrompt: string;
  createdAt: string;
  updatedAt: string;
}

export interface WaypointRadioSettings {
  fadeInSec: number;
  fadeOutSec: number;
  crossfadeSec: number;
  musicVolume: number;        // 0..1
  announcementVolume: number; // 0..1
  defaultRepeat: boolean;
  announcementEveryNSongs: number; // 0 = disabled
  commercialEveryNSongs: number;   // 0 = disabled
  ambientDefaultVolumes: Record<AmbientCategoryId, number>;
}

export const DEFAULT_WAYPOINT_RADIO_SETTINGS: WaypointRadioSettings = {
  fadeInSec: 3.0,
  fadeOutSec: 5.0,
  crossfadeSec: 3.0,
  musicVolume: 0.85,
  announcementVolume: 0.9,
  defaultRepeat: true,
  announcementEveryNSongs: 3,
  commercialEveryNSongs: 5,
  ambientDefaultVolumes: {
    fan: 0.5,
    "rain-shower": 0.55,
    ocean: 0.55,
    train: 0.5,
    "coffee-shop": 0.5,
    thunder: 0.55,
  },
};

export function isValidRadioFolder(folderPath: string): boolean {
  return ALL_WAYPOINT_RADIO_FOLDERS.includes(folderPath);
}

export function resolveFolderForTrack(params: {
  kind: RadioTrackKind;
  stationId?: string | null;
  ambientCategory?: AmbientCategoryId | null;
}): string | null {
  if (params.kind === "music") {
    const st = WAYPOINT_RADIO_STATIONS.find((s) => s.id === params.stationId);
    return st ? st.musicFolder : null;
  }
  if (params.kind === "announcement") {
    const st = WAYPOINT_RADIO_STATIONS.find((s) => s.id === params.stationId);
    return st ? st.announcementsFolder : null;
  }
  if (params.kind === "commercial") {
    return SHARED_ANNOUNCEMENT_FOLDERS.commercials.folder;
  }
  if (params.kind === "general_announcement") {
    return SHARED_ANNOUNCEMENT_FOLDERS["general-announcements"].folder;
  }
  if (params.kind === "ambience") {
    const amb = WAYPOINT_AMBIENT_CATEGORIES.find((a) => a.id === params.ambientCategory);
    return amb ? amb.folder : null;
  }
  return null;
}

export function getStationById(id: string | null | undefined): RadioStationDefinition {
  return WAYPOINT_RADIO_STATIONS.find((s) => s.id === id) || WAYPOINT_RADIO_STATIONS[0];
}
