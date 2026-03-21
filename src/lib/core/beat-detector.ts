/**
 * Beat Detector - 完全等价移植自 Python 版本
 * 支持两种模式：
 * 1. 峰值采样 - 只采集峰值点，可调阈值
 * 2. 采样点全采样 - 采集每个采样点
 */

/**
 * 节拍检测器
 */
export class BeatDetector {
  private beatTimes: number[] = [];

  /**
   * 峰值采样模式：检测峰值点
   * 完全等价移植自 Python 版本的 detect_peaks
   * @param energySignal - 能量信号 (int16 范围)
   * @param sampleRate - 采样率
   * @param heightMin - 阈值最小值
   * @param heightMax - 阈值最大值
   * @returns 节拍时间点列表 (秒)
   */
  detectPeaks(
    energySignal: Int16Array,
    sampleRate: number,
    heightMin: number = 0,
    heightMax: number = 32767
  ): number[] {
    // 峰值检测 - 完全等价于 scipy.signal.find_peaks
    const peaks: number[] = [];

    for (let i = 1; i < energySignal.length - 1; i++) {
      const current = energySignal[i];
      const prev = energySignal[i - 1];
      const next = energySignal[i + 1];

      // 峰值条件：比左右两边都高，且在阈值范围内
      if (current > prev && current > next && current >= heightMin && current <= heightMax) {
        peaks.push(i);
      }
    }

    // 转换为时间 (秒)
    this.beatTimes = peaks.map((peak) => peak / sampleRate);

    return this.beatTimes;
  }

  /**
   * 采样点全采样模式：采集每个采样点
   * 完全等价移植自 Python 版本的 detect_all_samples
   * @param sampleRate - 采样率
   * @param totalSamples - 总采样点数
   * @returns 节拍时间点列表 (秒)
   */
  detectAllSamples(sampleRate: number, totalSamples: number): number[] {
    this.beatTimes = [];
    for (let i = 0; i < totalSamples; i++) {
      this.beatTimes.push(i / sampleRate);
    }
    return this.beatTimes;
  }

  /**
   * 估计 BPM
   * 完全等价移植自 Python 版本的 estimate_bpm
   * @param beatTimes - 节拍时间点列表
   * @returns 估计的 BPM
   */
  static estimateBpm(beatTimes: number[]): number {
    if (beatTimes.length < 2) {
      return 120.0; // 默认 BPM
    }

    // 计算节拍间隔
    const intervals: number[] = [];
    for (let i = 1; i < beatTimes.length; i++) {
      intervals.push(beatTimes[i] - beatTimes[i - 1]);
    }

    // 使用中位数估计
    const sortedIntervals = [...intervals].sort((a, b) => a - b);
    const medianInterval = sortedIntervals[Math.floor(sortedIntervals.length / 2)];

    // BPM = 60 / 间隔
    return 60.0 / medianInterval;
  }

  /**
   * 获取检测到的节拍时间
   */
  getBeatTimes(): number[] {
    return this.beatTimes;
  }
}

/**
 * 计算中位数
 * 完全等价于 Python statistics.median
 */
export function median(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}
