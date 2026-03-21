/**
 * Audio Processor - 完全等价移植自 Python 版本
 * 处理 WAV 音频文件，提取能量信号
 */

export interface AudioData {
  sampleRate: number;
  samples: Float64Array;
  duration: number;
  fileName: string;
}

/**
 * 音频处理器
 * 使用 Web Audio API 解码 WAV 文件
 */
export class AudioProcessor {
  private sampleRate: number = 0;
  private samples: Float64Array | null = null;
  private duration: number = 0;
  private fileName: string = "";

  /**
   * 加载音频文件
   * @param file - 音频文件
   * @returns 是否加载成功
   */
  async load(file: File): Promise<boolean> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // 获取声道数据
      let channelData = audioBuffer.getChannelData(0);
      
      // 如果是多声道，混合为单声道
      if (audioBuffer.numberOfChannels > 1) {
        const leftChannel = audioBuffer.getChannelData(0);
        const rightChannel = audioBuffer.getChannelData(1);
        channelData = new Float32Array(leftChannel.length);
        for (let i = 0; i < leftChannel.length; i++) {
          channelData[i] = (leftChannel[i] + rightChannel[i]) / 2;
        }
      }

      // 转换为 Float64Array
      this.samples = new Float64Array(channelData);
      this.sampleRate = audioBuffer.sampleRate;
      this.duration = audioBuffer.duration;
      this.fileName = file.name;

      audioContext.close();

      return true;
    } catch (error) {
      console.error("Failed to load audio:", error);
      return false;
    }
  }

  /**
   * 获取能量信号
   * 完全等价移植自 Python 版本的 get_energy_signal
   * @returns 归一化的能量信号 (int16 范围)
   */
  getEnergySignal(): Int16Array {
    if (!this.samples) {
      throw new Error("No audio loaded");
    }

    const y0 = this.samples;
    const y1 = new Float64Array(y0.length);

    // 计算平方能量
    for (let i = 0; i < y0.length; i++) {
      y1[i] = y0[i] * y0[i];
    }

    // 找最大值
    let y1Max = 0;
    for (let i = 0; i < y1.length; i++) {
      if (y1[i] > y1Max) {
        y1Max = y1[i];
      }
    }

    // 归一化到 int16 范围
    const result = new Int16Array(y1.length);
    if (y1Max === 0) {
      return result;
    }

    for (let i = 0; i < y1.length; i++) {
      result[i] = Math.floor((y1[i] / y1Max) * 32767);
    }

    return result;
  }

  /**
   * 获取采样率
   */
  getSampleRate(): number {
    return this.sampleRate;
  }

  /**
   * 获取总采样数
   */
  getTotalSamples(): number {
    return this.samples ? this.samples.length : 0;
  }

  /**
   * 获取时长
   */
  getDuration(): number {
    return this.duration;
  }

  /**
   * 获取文件名
   */
  getFileName(): string {
    return this.fileName;
  }

  /**
   * 获取时间轴
   */
  getTimeAxis(): Float64Array {
    if (!this.samples) {
      throw new Error("No audio loaded");
    }
    const timeAxis = new Float64Array(this.samples.length);
    for (let i = 0; i < this.samples.length; i++) {
      timeAxis[i] = i / this.sampleRate;
    }
    return timeAxis;
  }
}
