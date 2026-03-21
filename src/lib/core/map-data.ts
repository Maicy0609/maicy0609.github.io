/**
 * Map Data Generator - 完全等价移植自 Python 版本
 * 生成 ADOFAI 谱面数据
 */

import { EventType, MapSetting, TileData, Action, SetSpeedAction, TwirlAction, PauseAction } from "./types";
import { median } from "./beat-detector";

/**
 * 创建默认地图设置
 */
export function createDefaultMapSetting(): MapSetting {
  return {
    version: 2,
    artist: "Artist",
    specialArtistType: "None",
    artistPermission: "",
    song: "Song",
    author: "Author",
    separateCountdownTime: "Enabled",
    previewImage: "",
    previewIcon: "",
    previewIconColor: "003f52",
    previewSongStart: 0,
    previewSongDuration: 10,
    seizureWarning: "Disabled",
    levelDesc: "Describe your level!",
    levelTags: "",
    artistLinks: "",
    difficulty: 1,
    songFilename: "",
    bpm: 100.0,
    volume: 100,
    offset: 0,
    pitch: 100,
    hitsound: "Kick",
    hitsoundVolume: 100,
    countdownTicks: 4,
    trackColorType: "Single",
    trackColor: "debb7b",
    secondaryTrackColor: "ffffff",
    trackColorAnimDuration: 2.0,
    trackColorPulse: "None",
    trackPulseLength: 10,
    trackStyle: "Standard",
    trackAnimation: "None",
    beatsAhead: 3.0,
    trackDisappearAnimation: "None",
    beatsBehind: 4.0,
    backgroundColor: "000000",
    bgImage: "",
    bgImageColor: "ffffff",
    parallax: [100, 100],
    bgDisplayMode: "FitToScreen",
    lockRot: "Disabled",
    loopBG: "Disabled",
    unscaledSize: 100,
    relativeTo: "Player",
    position: [0, 0],
    rotation: 0.0,
    zoom: 100,
    bgVideo: "",
    loopVideo: "Disabled",
    vidOffset: 0,
    floorIconOutlines: "Disabled",
    stickToFloors: "Disabled",
    planetEase: "Linear",
    planetEaseParts: 1,
  };
}

/**
 * 创建瓷砖数据
 */
export function createTileData(floor: number, angle: number | null = null): TileData {
  return {
    floor,
    tileAngle: null,
    angle,
    actionListMap: new Map<EventType, Action[]>(),
  };
}

/**
 * 获取或创建动作列表
 */
export function getActionList(tileData: TileData, eventType: EventType): Action[] {
  let actionList = tileData.actionListMap.get(eventType);
  if (!actionList) {
    actionList = [];
    tileData.actionListMap.set(eventType, actionList);
  }
  return actionList;
}

/**
 * 格式化浮点数
 */
function formatDouble(value: number): string {
  const longValue = Math.floor(value);
  if (value === longValue) {
    return longValue.toString();
  }
  return value.toFixed(6);
}

/**
 * 保存 SetSpeed 动作
 */
function saveSetSpeed(sb: string[], floor: number, action: SetSpeedAction): void {
  sb.push(`\t\t{ "floor": ${floor}, "eventType": "${action.eventType}"`);
  if (action.speedType !== null) {
    sb.push(`, "speedType": "${action.speedType}"`);
  }
  if (action.beatsPerMinute !== null) {
    sb.push(`, "beatsPerMinute": ${formatDouble(action.beatsPerMinute)}`);
  }
  if (action.bpmMultiplier !== null) {
    sb.push(`, "bpmMultiplier": ${formatDouble(action.bpmMultiplier)}`);
  }
  sb.push(" },\n");
}

/**
 * 保存 Twirl 动作
 */
function saveTwirl(sb: string[], floor: number): void {
  sb.push(`\t\t{ "floor": ${floor}, "eventType": "${EventType.TWIRL}" },\n`);
}

/**
 * 保存 Pause 动作
 */
function savePause(sb: string[], floor: number, action: PauseAction): void {
  sb.push(`\t\t{ "floor": ${floor}, "eventType": "${EventType.PAUSE}"`);
  if (action.duration !== null) {
    sb.push(`, "duration": ${formatDouble(action.duration)}`);
  }
  sb.push(" },\n");
}

/**
 * 保存瓷砖事件
 */
function saveTileEvents(sb: string[], tileData: TileData): void {
  const eventOrder: EventType[] = [
    EventType.SET_SPEED,
    EventType.TWIRL,
    EventType.PAUSE,
    EventType.CHECKPOINT,
    EventType.CUSTOM_BACKGROUND,
    EventType.COLOR_TRACK,
    EventType.ANIMATE_TRACK,
    EventType.ADD_DECORATION,
    EventType.FLASH,
    EventType.MOVE_CAMERA,
    EventType.SET_HITSOUND,
    EventType.RECOLOR_TRACK,
    EventType.MOVE_TRACK,
    EventType.SET_FILTER,
    EventType.HALL_OF_MIRRORS,
    EventType.SHAKE_SCREEN,
    EventType.SET_PLANET_ROTATION,
    EventType.MOVE_DECORATIONS,
    EventType.POSITION_TRACK,
    EventType.REPEAT_EVENTS,
    EventType.BLOOM,
    EventType.SET_CONDITIONAL_EVENTS,
  ];

  for (const eventType of eventOrder) {
    const actionList = tileData.actionListMap.get(eventType);
    if (!actionList) continue;

    for (const action of actionList) {
      if (eventType === EventType.SET_SPEED) {
        saveSetSpeed(sb, tileData.floor, action as SetSpeedAction);
      } else if (eventType === EventType.TWIRL) {
        saveTwirl(sb, tileData.floor);
      } else if (eventType === EventType.PAUSE) {
        savePause(sb, tileData.floor, action as PauseAction);
      }
    }
  }
}

/**
 * 保存地图设置
 */
function saveMapSetting(sb: string[], setting: MapSetting): void {
  const variables: [string, string | number | number[]][] = [
    ["version", setting.version],
    ["artist", setting.artist],
    ["specialArtistType", setting.specialArtistType],
    ["artistPermission", setting.artistPermission],
    ["song", setting.song],
    ["author", setting.author],
    ["separateCountdownTime", setting.separateCountdownTime],
    ["previewImage", setting.previewImage],
    ["previewIcon", setting.previewIcon],
    ["previewIconColor", setting.previewIconColor],
    ["previewSongStart", setting.previewSongStart],
    ["previewSongDuration", setting.previewSongDuration],
    ["seizureWarning", setting.seizureWarning],
    ["levelDesc", setting.levelDesc],
    ["levelTags", setting.levelTags],
    ["artistLinks", setting.artistLinks],
    ["difficulty", setting.difficulty],
    ["songFilename", setting.songFilename],
    ["bpm", setting.bpm],
    ["volume", setting.volume],
    ["offset", setting.offset],
    ["pitch", setting.pitch],
    ["hitsound", setting.hitsound],
    ["hitsoundVolume", setting.hitsoundVolume],
    ["countdownTicks", setting.countdownTicks],
    ["trackColorType", setting.trackColorType],
    ["trackColor", setting.trackColor],
    ["secondaryTrackColor", setting.secondaryTrackColor],
    ["trackColorAnimDuration", setting.trackColorAnimDuration],
    ["trackColorPulse", setting.trackColorPulse],
    ["trackPulseLength", setting.trackPulseLength],
    ["trackStyle", setting.trackStyle],
    ["trackAnimation", setting.trackAnimation],
    ["beatsAhead", setting.beatsAhead],
    ["trackDisappearAnimation", setting.trackDisappearAnimation],
    ["beatsBehind", setting.beatsBehind],
    ["backgroundColor", setting.backgroundColor],
    ["bgImage", setting.bgImage],
    ["bgImageColor", setting.bgImageColor],
    ["parallax", setting.parallax],
    ["bgDisplayMode", setting.bgDisplayMode],
    ["lockRot", setting.lockRot],
    ["loopBG", setting.loopBG],
    ["unscaledSize", setting.unscaledSize],
    ["relativeTo", setting.relativeTo],
    ["position", setting.position],
    ["rotation", setting.rotation],
    ["zoom", setting.zoom],
    ["bgVideo", setting.bgVideo],
    ["loopVideo", setting.loopVideo],
    ["vidOffset", setting.vidOffset],
    ["floorIconOutlines", setting.floorIconOutlines],
    ["stickToFloors", setting.stickToFloors],
    ["planetEase", setting.planetEase],
    ["planetEaseParts", setting.planetEaseParts],
  ];

  for (const [name, value] of variables) {
    if (typeof value === "string") {
      sb.push(`\t\t"${name}": "${value}", \n`);
    } else if (typeof value === "number") {
      if (Number.isInteger(value)) {
        sb.push(`\t\t"${name}": ${value}, \n`);
      } else {
        sb.push(`\t\t"${name}": ${formatDouble(value)}, \n`);
      }
    } else if (Array.isArray(value)) {
      sb.push(`\t\t"${name}": [${value.join(", ")}], \n`);
    }
  }
}

/**
 * 生成 ADOFAI 谱面 JSON 字符串
 * @param tileDataList - 瓷砖数据列表
 * @param mapSetting - 地图设置
 * @param useAngleData - 是否使用 angleData 模式
 * @returns JSON 字符串
 */
export function generateMapJson(
  tileDataList: TileData[],
  mapSetting: MapSetting,
  useAngleData: boolean
): string {
  const sb: string[] = [];

  sb.push("{\n");

  // angleData 或 pathData
  if (useAngleData) {
    sb.push('\t"angleData": [');
    for (let i = 0; i < tileDataList.length; i++) {
      if (i > 0) {
        sb.push(", ");
      }
      const angle = tileDataList[i].angle!;
      sb.push(formatDouble(angle));
    }
    sb.push("], \n");
  } else {
    sb.push('\t"pathData": "');
    for (let i = 1; i < tileDataList.length; i++) {
      // 简化版本，主要使用 angleData
      sb.push("R");
    }
    sb.push('", \n');
  }

  // settings
  sb.push('\t"settings":\n\t{\n');
  saveMapSetting(sb, mapSetting);
  sb.push('\t},\n\t"actions":\n\t[\n');

  // actions
  for (const tileData of tileDataList) {
    saveTileEvents(sb, tileData);
  }

  sb.push("\t]\n}\n");

  return sb.join("");
}

/**
 * AngleData 模式转换器
 * 完全等价移植自 Python 版本的 AngleDataConverter
 */
export function convertAngleData(
  usDelayList: number[],
  baseBpm: number | null = null
): { tileDataList: TileData[]; mapSetting: MapSetting } {
  if (usDelayList.length === 0) {
    return {
      tileDataList: [],
      mapSetting: createDefaultMapSetting(),
    };
  }

  // 计算 RW 模式的 SetSpeed BPM 列表 (实际BPM / 12)
  const rwBpmList = usDelayList.map((us) => (60.0 * 1000 * 1000) / us / 12.0);

  // 确定基准 BPM
  const bpm = baseBpm !== null ? baseBpm : median(rwBpmList);

  const mapSetting = createDefaultMapSetting();
  mapSetting.bpm = bpm;

  const tileDataList: TileData[] = [];

  // 添加起始瓷砖 (floor 0, 角度 = 0)
  tileDataList.push(createTileData(0, 0));

  // 当前绝对角度
  let currentAngle = 0.0;

  for (let i = 0; i < usDelayList.length; i++) {
    const usDelay = usDelayList[i];

    // 计算总旋转角度
    const totalRotateAngle = (usDelay * bpm * 180.0) / 60.0 / 1000000.0;

    // 计算需要的 Pause duration 和基础旋转角度
    let pauseBeats = 0;
    let baseRotateAngle = totalRotateAngle;

    // 基础旋转角度必须在 (0, 360] 范围内
    if (totalRotateAngle > 360) {
      baseRotateAngle = totalRotateAngle % 360;
      if (baseRotateAngle < 0.001) {
        baseRotateAngle = 360;
      }
      pauseBeats = (totalRotateAngle - baseRotateAngle) / 180.0;
    }

    // 计算下一个瓷砖的绝对角度
    let nextAngle = currentAngle + 180.0 - baseRotateAngle;

    // 规范化到 (0, 360] 范围
    while (nextAngle <= 0) {
      nextAngle += 360;
    }
    while (nextAngle > 360) {
      nextAngle -= 360;
    }

    const tileData = createTileData(i + 1, nextAngle);

    // 如果需要 Pause 事件
    if (pauseBeats > 0) {
      const actionList = getActionList(tileData, EventType.PAUSE);
      actionList.push({
        eventType: EventType.PAUSE,
        duration: pauseBeats,
      } as PauseAction);
    }

    tileDataList.push(tileData);
    currentAngle = nextAngle;
  }

  return { tileDataList, mapSetting };
}

/**
 * 拉链夹角模式转换器
 * 完全等价移植自 Python 版本的 AngleCustomConverter
 */
export function convertZipperAngle(
  usDelayList: number[],
  baseAngle: number = 15.0,
  estimatedBpm: number = 120.0
): { tileDataList: TileData[]; mapSetting: MapSetting } {
  if (usDelayList.length === 0) {
    return {
      tileDataList: [],
      mapSetting: createDefaultMapSetting(),
    };
  }

  // 验证角度
  if (baseAngle <= 0 || baseAngle > 180) {
    throw new Error(`Invalid angle: ${baseAngle}°`);
  }

  const mapSetting = createDefaultMapSetting();
  mapSetting.bpm = estimatedBpm;

  const tileDataList: TileData[] = [];

  // 特殊情况：180° 夹角
  if (baseAngle === 180.0) {
    tileDataList.push(createTileData(0, 0));
    for (let i = 0; i < usDelayList.length; i++) {
      tileDataList.push(createTileData(i + 1, 0));
    }
    return { tileDataList, mapSetting };
  }

  // 计算交替角度
  // 拉链序列：[0, 180-angle, 0, 180-angle, ...]
  const alternateAngle = 180.0 - baseAngle;

  // 添加起始瓷砖 (floor 0, 角度 = 0)
  tileDataList.push(createTileData(0, 0));

  for (let i = 0; i < usDelayList.length; i++) {
    const usDelay = usDelayList[i];

    // 计算时间 (秒)
    const timeSeconds = usDelay / 1000000.0;

    // 计算显示 BPM
    // 时间 = angle/180 × 60/BPM
    // BPM = angle/180 × 60/时间
    const displayBpm = (baseAngle / 180.0) * 60.0 / timeSeconds;

    // 拉链模式：角度在 0 和 (180-angle) 之间交替
    const nextAngle = (i + 1) % 2 === 1 ? alternateAngle : 0.0;

    const tileData = createTileData(i + 1, nextAngle);

    // 添加 SetSpeed 事件
    const speedActionList = getActionList(tileData, EventType.SET_SPEED);
    speedActionList.push({
      eventType: EventType.SET_SPEED,
      speedType: "Bpm",
      beatsPerMinute: displayBpm,
      bpmMultiplier: 1.0,
    } as SetSpeedAction);

    // 添加 Twirl 事件 (从 floor 2 开始)
    if (i + 1 >= 2) {
      const twirlActionList = getActionList(tileData, EventType.TWIRL);
      twirlActionList.push({
        eventType: EventType.TWIRL,
      } as TwirlAction);
    }

    tileDataList.push(tileData);
  }

  return { tileDataList, mapSetting };
}

/**
 * 音频 AngleData 模式转换器
 * 完全等价移植自 Python 版本的 AudioAngleConverter
 */
export function convertAudioAngleData(
  beatTimes: number[],
  baseBpm: number | null = null,
  estimatedBpm: number = 120.0,
  audioOffset: number = 0
): { tileDataList: TileData[]; mapSetting: MapSetting } {
  if (beatTimes.length === 0) {
    return {
      tileDataList: [],
      mapSetting: createDefaultMapSetting(),
    };
  }

  // 确定 BPM
  const bpm = baseBpm !== null ? baseBpm : estimatedBpm;

  const mapSetting = createDefaultMapSetting();
  mapSetting.bpm = bpm;
  mapSetting.offset = Math.floor(audioOffset);

  const tileDataList: TileData[] = [];

  // 添加起始瓷砖
  tileDataList.push(createTileData(0, 0));

  // 计算节拍间隔
  const intervals: number[] = [];
  for (let i = 1; i < beatTimes.length; i++) {
    intervals.push(beatTimes[i] - beatTimes[i - 1]);
  }

  // 当前绝对角度
  let currentAngle = 0.0;

  for (let i = 0; i < intervals.length; i++) {
    const interval = intervals[i];

    // 计算总旋转角度
    const totalRotateAngle = interval * bpm * 180.0 / 60.0;

    // 处理大于 360 度的情况
    let pauseBeats = 0;
    let baseRotateAngle = totalRotateAngle;

    if (totalRotateAngle > 360) {
      baseRotateAngle = totalRotateAngle % 360;
      if (baseRotateAngle < 0.001) {
        baseRotateAngle = 360;
      }
      pauseBeats = (totalRotateAngle - baseRotateAngle) / 180.0;
    }

    // 计算下一个角度
    let nextAngle = currentAngle + 180.0 - baseRotateAngle;

    // 规范化到 (0, 360]
    while (nextAngle <= 0) {
      nextAngle += 360;
    }
    while (nextAngle > 360) {
      nextAngle -= 360;
    }

    const tileData = createTileData(i + 1, nextAngle);

    // 添加 Pause 事件
    if (pauseBeats > 0) {
      const actionList = getActionList(tileData, EventType.PAUSE);
      actionList.push({
        eventType: EventType.PAUSE,
        duration: pauseBeats,
      } as PauseAction);
    }

    tileDataList.push(tileData);
    currentAngle = nextAngle;
  }

  return { tileDataList, mapSetting };
}

/**
 * 音频拉链模式转换器
 * 完全等价移植自 Python 版本的 AudioZipperConverter
 */
export function convertAudioZipper(
  beatTimes: number[],
  baseAngle: number = 15.0,
  estimatedBpm: number = 120.0,
  audioOffset: number = 0
): { tileDataList: TileData[]; mapSetting: MapSetting } {
  if (beatTimes.length === 0) {
    return {
      tileDataList: [],
      mapSetting: createDefaultMapSetting(),
    };
  }

  // 验证角度
  if (baseAngle <= 0 || baseAngle > 180) {
    throw new Error(`Invalid angle: ${baseAngle}°`);
  }

  const mapSetting = createDefaultMapSetting();
  mapSetting.bpm = estimatedBpm;
  mapSetting.offset = Math.floor(audioOffset);

  const tileDataList: TileData[] = [];

  // 计算节拍间隔
  const intervals: number[] = [];
  for (let i = 1; i < beatTimes.length; i++) {
    intervals.push(beatTimes[i] - beatTimes[i - 1]);
  }

  // 特殊情况：180° 夹角
  if (baseAngle === 180.0) {
    tileDataList.push(createTileData(0, 0));
    for (let i = 0; i < intervals.length; i++) {
      tileDataList.push(createTileData(i + 1, 0));
    }
    return { tileDataList, mapSetting };
  }

  // 计算交替角度
  const alternateAngle = 180.0 - baseAngle;

  // 添加起始瓷砖
  tileDataList.push(createTileData(0, 0));

  for (let i = 0; i < intervals.length; i++) {
    const interval = intervals[i];

    // 计算显示 BPM
    const displayBpm = (baseAngle / 180.0) * 60.0 / interval;

    // 拉链模式：角度在 0 和 (180-angle) 之间交替
    const nextAngle = (i + 1) % 2 === 1 ? alternateAngle : 0.0;

    const tileData = createTileData(i + 1, nextAngle);

    // 添加 SetSpeed 事件
    const speedActionList = getActionList(tileData, EventType.SET_SPEED);
    speedActionList.push({
      eventType: EventType.SET_SPEED,
      speedType: "Bpm",
      beatsPerMinute: displayBpm,
      bpmMultiplier: 1.0,
    } as SetSpeedAction);

    // 添加 Twirl 事件 (从 floor 2 开始)
    if (i + 1 >= 2) {
      const twirlActionList = getActionList(tileData, EventType.TWIRL);
      twirlActionList.push({
        eventType: EventType.TWIRL,
      } as TwirlAction);
    }

    tileDataList.push(tileData);
  }

  return { tileDataList, mapSetting };
}
