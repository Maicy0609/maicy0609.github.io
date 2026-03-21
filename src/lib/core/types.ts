/**
 * ADOFAI Music Converter - Type Definitions
 * 完全等价移植自 Python 版本
 */

// ============================================================================
// EventType 枚举 - ADOFAI 事件类型
// ============================================================================

export enum EventType {
  SET_SPEED = "SetSpeed",
  TWIRL = "Twirl",
  PAUSE = "Pause",
  CHECKPOINT = "Checkpoint",
  CUSTOM_BACKGROUND = "CustomBackground",
  COLOR_TRACK = "ColorTrack",
  ANIMATE_TRACK = "AnimateTrack",
  ADD_DECORATION = "AddDecoration",
  FLASH = "Flash",
  MOVE_CAMERA = "MoveCamera",
  SET_HITSOUND = "SetHitsound",
  RECOLOR_TRACK = "RecolorTrack",
  MOVE_TRACK = "MoveTrack",
  SET_FILTER = "SetFilter",
  HALL_OF_MIRRORS = "HallOfMirrors",
  SHAKE_SCREEN = "ShakeScreen",
  SET_PLANET_ROTATION = "SetPlanetRotation",
  MOVE_DECORATIONS = "MoveDecorations",
  POSITION_TRACK = "PositionTrack",
  REPEAT_EVENTS = "RepeatEvents",
  BLOOM = "Bloom",
  SET_CONDITIONAL_EVENTS = "SetConditionalEvents",
  CHANGE_TRACK = "ChangeTrack",
}

// ============================================================================
// TileAngle 枚举 - 用于 pathData 模式
// ============================================================================

export interface TileAngleInfo {
  nameChar: string;
  angle: number;
}

export const TILE_ANGLES: Record<string, TileAngleInfo> = {
  _0: { nameChar: "R", angle: 0 },
  _15: { nameChar: "p", angle: 15 },
  _30: { nameChar: "J", angle: 30 },
  _45: { nameChar: "E", angle: 45 },
  _60: { nameChar: "T", angle: 60 },
  _75: { nameChar: "o", angle: 75 },
  _90: { nameChar: "U", angle: 90 },
  _105: { nameChar: "q", angle: 105 },
  _120: { nameChar: "G", angle: 120 },
  _135: { nameChar: "Q", angle: 135 },
  _150: { nameChar: "H", angle: 150 },
  _165: { nameChar: "W", angle: 165 },
  _180: { nameChar: "L", angle: 180 },
  _195: { nameChar: "x", angle: 195 },
  _210: { nameChar: "N", angle: 210 },
  _225: { nameChar: "Z", angle: 225 },
  _240: { nameChar: "F", angle: 240 },
  _255: { nameChar: "V", angle: 255 },
  _270: { nameChar: "D", angle: 270 },
  _285: { nameChar: "Y", angle: 285 },
  _300: { nameChar: "B", angle: 300 },
  _315: { nameChar: "C", angle: 315 },
  _330: { nameChar: "M", angle: 330 },
  _345: { nameChar: "A", angle: 345 },
};

// ============================================================================
// Action 类型 - 事件动作
// ============================================================================

export interface Action {
  eventType: EventType;
  save(sb: string[], floor: number): void;
}

export interface SetSpeedAction {
  eventType: EventType.SET_SPEED;
  speedType: string | null;
  beatsPerMinute: number | null;
  bpmMultiplier: number | null;
}

export interface TwirlAction {
  eventType: EventType.TWIRL;
}

export interface PauseAction {
  eventType: EventType.PAUSE;
  duration: number | null;
}

// ============================================================================
// Melody 类型 - 旋律数据
// ============================================================================

export interface Melody {
  us: number; // 微秒时间戳
  tick: number; // MIDI tick
  keys: Set<number>; // 当前按下的音符键值
}

// ============================================================================
// MapSetting 类型 - 地图设置
// ============================================================================

export interface MapSetting {
  version: number;
  artist: string;
  specialArtistType: string;
  artistPermission: string;
  song: string;
  author: string;
  separateCountdownTime: string;
  previewImage: string;
  previewIcon: string;
  previewIconColor: string;
  previewSongStart: number;
  previewSongDuration: number;
  seizureWarning: string;
  levelDesc: string;
  levelTags: string;
  artistLinks: string;
  difficulty: number;
  songFilename: string;
  bpm: number;
  volume: number;
  offset: number;
  pitch: number;
  hitsound: string;
  hitsoundVolume: number;
  countdownTicks: number;
  trackColorType: string;
  trackColor: string;
  secondaryTrackColor: string;
  trackColorAnimDuration: number;
  trackColorPulse: string;
  trackPulseLength: number;
  trackStyle: string;
  trackAnimation: string;
  beatsAhead: number;
  trackDisappearAnimation: string;
  beatsBehind: number;
  backgroundColor: string;
  bgImage: string;
  bgImageColor: string;
  parallax: number[];
  bgDisplayMode: string;
  lockRot: string;
  loopBG: string;
  unscaledSize: number;
  relativeTo: string;
  position: number[];
  rotation: number;
  zoom: number;
  bgVideo: string;
  loopVideo: string;
  vidOffset: number;
  floorIconOutlines: string;
  stickToFloors: string;
  planetEase: string;
  planetEaseParts: number;
}

// ============================================================================
// TileData 类型 - 瓷砖数据
// ============================================================================

export interface TileData {
  floor: number;
  tileAngle: string | null; // 用于 pathData 模式
  angle: number | null; // 用于 angleData 模式
  actionListMap: Map<EventType, Action[]>;
}

// ============================================================================
// MapData 类型 - 地图数据
// ============================================================================

export interface MapDataResult {
  mapSetting: MapSetting;
  tileDataList: TileData[];
  useAngleData: boolean;
}

// ============================================================================
// 转换参数类型
// ============================================================================

export interface ConvertParams {
  // MIDI 参数
  disabledTracks: boolean[];
  octaveOffset: number;

  // 音频参数
  heightMin: number;
  heightMax: number;

  // 通用参数
  mode: "angle" | "zipper";
  baseBpm: number | null;
  customAngle: number;
}

// ============================================================================
// 输入源类型
// ============================================================================

export type InputSource = "midi" | "audio";

// ============================================================================
// 音频采样模式
// ============================================================================

export type AudioSampleMode = "peak" | "full";

// ============================================================================
// 转换结果类型
// ============================================================================

export interface ConvertResult {
  success: boolean;
  outputPath: string | null;
  error: string | null;
  stats: {
    tileCount: number;
    bpm: number;
    duration: number;
  };
}
