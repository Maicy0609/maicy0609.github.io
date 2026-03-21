/**
 * MIDI Parser - 完全等价移植自 Python 版本
 * 解析 MIDI 文件，提取音符事件和时间信息
 */

import { Melody } from "./types";

// MIDI 常量
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

// 音调频率 (Hz) - C0 到 B0
const TONE_HZ = [
  32.7032, 34.6478, 36.7081, 38.8909, 41.2304, 43.6535,
  46.2493, 48.9994, 51.913, 55.0, 58.2705, 61.7354,
];

interface MidiEvent {
  absTick: number;
  trackIdx: number;
  msg: MidiMessage;
}

interface MidiMessage {
  type: string;
  note?: number;
  velocity?: number;
  tempo?: number;
  time: number;
}

interface MidiTrack {
  events: MidiMessage[];
}

interface MidiFileData {
  tracks: MidiTrack[];
  ticksPerBeat: number;
}

/**
 * 解析 MIDI 文件二进制数据
 * 完全等价于 Python mido.MidiFile
 */
export class MidiParser {
  private toneDelay: Map<number, number> = new Map();
  private nextKeyTime: Map<number, number> = new Map();
  private toneMaxOctave = 10;
  private toneMinOctave = -10;

  constructor() {
    this.initToneDelay();
  }

  /**
   * 初始化音调延迟表
   * 完全等价移植自 Python 版本
   */
  private initToneDelay(): void {
    // 基础八度 (C0-B0)
    for (let i = 0; i < TONE_HZ.length; i++) {
      this.toneDelay.set(i, 1000000 / TONE_HZ[i]);
    }

    // 向上扩展八度
    for (let i = 1; i < this.toneMaxOctave; i++) {
      const offset = i * TONE_HZ.length;
      for (let j = 0; j < TONE_HZ.length; j++) {
        this.toneDelay.set(
          offset + j,
          this.toneDelay.get(offset + j - TONE_HZ.length)! / 2
        );
      }
    }

    // 向下扩展八度
    for (let i = -1; i > this.toneMinOctave; i--) {
      const offset = i * TONE_HZ.length;
      for (let j = 0; j < TONE_HZ.length; j++) {
        this.toneDelay.set(
          offset + j,
          this.toneDelay.get(offset + j + TONE_HZ.length)! * 2
        );
      }
    }
  }

  /**
   * 解析 MIDI 文件
   * @param arrayBuffer - MIDI 文件的 ArrayBuffer
   * @returns 解析后的 MIDI 数据
   */
  parse(arrayBuffer: ArrayBuffer): MidiFileData {
    const view = new DataView(arrayBuffer);
    let offset = 0;

    // 读取 MThd 头
    const mthd = this.readString(view, offset, 4);
    offset += 4;
    if (mthd !== "MThd") {
      throw new Error("Invalid MIDI file: MThd header not found");
    }

    // 读取头长度
    const headerLength = view.getUint32(offset, false);
    offset += 4;

    // 读取格式类型
    const formatType = view.getUint16(offset, false);
    offset += 2;

    // 读取轨道数
    const trackCount = view.getUint16(offset, false);
    offset += 2;

    // 读取 ticks per beat
    const ticksPerBeat = view.getUint16(offset, false);
    offset += 2;

    // 跳过额外的头信息
    offset += headerLength - 6;

    // 解析轨道
    const tracks: MidiTrack[] = [];
    for (let i = 0; i < trackCount; i++) {
      const { track, newOffset } = this.parseTrack(view, offset);
      tracks.push(track);
      offset = newOffset;
    }

    return { tracks, ticksPerBeat };
  }

  /**
   * 解析单个轨道
   */
  private parseTrack(view: DataView, startOffset: number): { track: MidiTrack; newOffset: number } {
    let offset = startOffset;

    // 读取 MTrk 头
    const mtrk = this.readString(view, offset, 4);
    offset += 4;
    if (mtrk !== "MTrk") {
      throw new Error(`Invalid MIDI file: MTrk header not found at offset ${startOffset}`);
    }

    // 读取轨道长度
    const trackLength = view.getUint32(offset, false);
    offset += 4;

    const endOffset = offset + trackLength;
    const events: MidiMessage[] = [];
    let runningStatus = 0;

    while (offset < endOffset) {
      // 读取 delta time (变长整数)
      const { value: deltaTime, newOffset: deltaOffset } = this.readVariableLengthInt(view, offset);
      offset = deltaOffset;

      // 读取事件
      let status = view.getUint8(offset);

      if (status < 0x80) {
        // 使用运行状态
        status = runningStatus;
      } else {
        runningStatus = status;
        offset++;
      }

      const eventType = status & 0xf0;
      const channel = status & 0x0f;

      let msg: MidiMessage = { type: "", time: deltaTime };

      switch (eventType) {
        case 0x80: // Note Off
          msg.type = "note_off";
          msg.note = view.getUint8(offset);
          msg.velocity = view.getUint8(offset + 1);
          offset += 2;
          break;

        case 0x90: // Note On
          msg.type = "note_on";
          msg.note = view.getUint8(offset);
          msg.velocity = view.getUint8(offset + 1);
          // velocity = 0 等同于 note_off
          if (msg.velocity === 0) {
            msg.type = "note_off";
          }
          offset += 2;
          break;

        case 0xa0: // Aftertouch
          offset += 2;
          msg.type = "aftertouch";
          break;

        case 0xb0: // Control Change
          offset += 2;
          msg.type = "control_change";
          break;

        case 0xc0: // Program Change
          offset += 1;
          msg.type = "program_change";
          break;

        case 0xd0: // Channel Pressure
          offset += 1;
          msg.type = "channel_pressure";
          break;

        case 0xe0: // Pitch Bend
          offset += 2;
          msg.type = "pitch_bend";
          break;

        case 0xf0: // Meta / SysEx
          if (status === 0xff) {
            // Meta 事件
            const metaType = view.getUint8(offset);
            offset++;
            const { value: length, newOffset: lenOffset } = this.readVariableLengthInt(view, offset);
            offset = lenOffset;

            switch (metaType) {
              case 0x51: // Set Tempo
                const tempo = (view.getUint8(offset) << 16) |
                  (view.getUint8(offset + 1) << 8) |
                  view.getUint8(offset + 2);
                msg.type = "set_tempo";
                msg.tempo = tempo;
                break;

              case 0x2f: // End of Track
                msg.type = "end_of_track";
                break;

              default:
                msg.type = "meta";
            }
            offset += length;
          } else if (status === 0xf0 || status === 0xf7) {
            // SysEx
            const { value: length, newOffset: lenOffset } = this.readVariableLengthInt(view, offset);
            offset = lenOffset;
            offset += length;
            msg.type = "sysex";
          } else {
            msg.type = "unknown";
          }
          break;

        default:
          msg.type = "unknown";
      }

      events.push(msg);
    }

    return { track: { events }, newOffset: endOffset };
  }

  /**
   * 读取变长整数 (MIDI 格式)
   */
  private readVariableLengthInt(view: DataView, offset: number): { value: number; newOffset: number } {
    let value = 0;
    let byte: number;

    do {
      byte = view.getUint8(offset);
      value = (value << 7) | (byte & 0x7f);
      offset++;
    } while (byte & 0x80);

    return { value, newOffset: offset };
  }

  /**
   * 读取字符串
   */
  private readString(view: DataView, offset: number, length: number): string {
    let str = "";
    for (let i = 0; i < length; i++) {
      str += String.fromCharCode(view.getUint8(offset + i));
    }
    return str;
  }

  /**
   * 将 MIDI 文件解析为旋律列表
   * 完全等价移植自 Python 版本的 parse_to_melody_list
   */
  parseToMelodyList(midiFile: MidiFileData, disable: boolean[]): Melody[] {
    const melodyList: Melody[] = [];
    let currMelody: Melody = { us: 0, tick: 0, keys: new Set() };

    const tracks = midiFile.tracks;
    const resolution = midiFile.ticksPerBeat;
    let tempo = 500000.0;
    let tickMultiply = tempo / resolution;
    let currTimeUs = 0;
    let lastTick = 0;

    // 收集所有事件并按时间排序
    const allEvents: MidiEvent[] = [];
    for (let trackIdx = 0; trackIdx < tracks.length; trackIdx++) {
      let absTick = 0;
      for (const msg of tracks[trackIdx].events) {
        absTick += msg.time;
        allEvents.push({ absTick, trackIdx, msg });
      }
    }

    // 按时间排序
    allEvents.sort((a, b) => a.absTick - b.absTick);

    for (const event of allEvents) {
      const { absTick: eventTick, trackIdx, msg } = event;

      if (trackIdx < disable.length && disable[trackIdx]) {
        continue;
      }

      if (msg.type === "note_on" || msg.type === "note_off") {
        const key = msg.note!;
        const velocity = msg.velocity!;

        if (eventTick !== currMelody.tick) {
          melodyList.push(currMelody);
          currTimeUs += (eventTick - lastTick) * tickMultiply;
          lastTick = eventTick;
          // 创建新的 Melody，复制上一组的 keys
          currMelody = {
            us: Math.floor(currTimeUs),
            tick: eventTick,
            keys: new Set(currMelody.keys),
          };
        }

        if (msg.type === "note_on" && velocity > 0) {
          currMelody.keys.add(key);
        } else {
          currMelody.keys.delete(key);
        }
      } else if (msg.type === "set_tempo") {
        currTimeUs += (eventTick - lastTick) * tickMultiply;
        lastTick = eventTick;
        tempo = msg.tempo!;
        tickMultiply = tempo / resolution;
      }
    }

    melodyList.push(currMelody);
    return melodyList;
  }

  /**
   * 将旋律列表转换为微秒延迟列表
   * 完全等价移植自 Python 版本的 melody_to_us_delay_list
   */
  melodyToUsDelayList(melodyList: Melody[], octaveOffset: number): number[] {
    let currTime = 0;
    this.nextKeyTime.clear();
    const usDelayList: number[] = [];

    for (let i = 1; i < melodyList.length; i++) {
      const curr = melodyList[i - 1];
      const nextMelody = melodyList[i];

      if (curr.keys.size === 0) {
        const diffTime = nextMelody.us - currTime;
        if (diffTime === 0) continue;
        usDelayList.push(diffTime);
        currTime = nextMelody.us;
      } else {
        let prevTime = currTime;
        const minTimeKeys: Set<number> = new Set();

        while (true) {
          let minTime = Number.MAX_SAFE_INTEGER;
          minTimeKeys.clear();

          for (const key of curr.keys) {
            const adjustedKey = key + octaveOffset * 12;
            const nextTime = this.getNextTime(currTime, adjustedKey);

            if (nextTime === minTime) {
              minTimeKeys.add(adjustedKey);
            } else if (nextTime < minTime) {
              minTimeKeys.clear();
              minTimeKeys.add(adjustedKey);
              minTime = nextTime;
            }
          }

          if (minTime >= nextMelody.us) {
            break;
          }

          for (const key of minTimeKeys) {
            this.addNextTime(key);
          }

          const diffTime = minTime - prevTime;
          if (diffTime !== 0) {
            usDelayList.push(diffTime);
          }
          prevTime = minTime;
        }

        currTime = prevTime;
      }
    }

    return usDelayList;
  }

  /**
   * 获取下一个音符时间
   */
  private getNextTime(timeFrom: number, key: number): number {
    let nextTime = this.nextKeyTime.get(key) || 0;

    if (nextTime <= timeFrom) {
      let delayTime = this.toneDelay.get(key);
      if (delayTime === undefined) {
        delayTime = 1000000 / 32.7032;
      }

      nextTime = delayTime * Math.floor(timeFrom / delayTime);
      if (nextTime <= timeFrom) {
        nextTime += delayTime;
      }
    }

    this.nextKeyTime.set(key, nextTime);
    return Math.floor(nextTime);
  }

  /**
   * 增加音符时间
   */
  private addNextTime(key: number): void {
    const delay = this.toneDelay.get(key) || 1000000 / 32.7032;
    this.nextKeyTime.set(key, (this.nextKeyTime.get(key) || 0) + delay);
  }
}

/**
 * 获取轨道信息
 */
export function getTrackInfo(midiFile: MidiFileData): { id: number; size: number }[] {
  return midiFile.tracks.map((track, index) => ({
    id: index,
    size: track.events.length,
  }));
}
