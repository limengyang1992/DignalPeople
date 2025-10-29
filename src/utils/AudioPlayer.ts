/**
 * 音频播放器
 * 支持流式播放 PCM 音频
 */
export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private audioQueue: AudioBuffer[] = [];
  private isPlaying = false;
  private nextStartTime = 0;
  private onPlayStart: (() => void) | null = null;
  private onPlayEnd: (() => void) | null = null;

  /**
   * 初始化播放器
   */
  init(onPlayStart?: () => void, onPlayEnd?: () => void): void {
    this.audioContext = new AudioContext({ sampleRate: 24000 });
    this.onPlayStart = onPlayStart || null;
    this.onPlayEnd = onPlayEnd || null;
    console.log('Audio player initialized');
  }

  /**
   * 添加音频数据到播放队列
   * @param pcmData PCM 音频数据 (Int16Array 或 Float32Array)
   * @param sampleRate 采样率，默认 24000
   */
  async addAudioData(pcmData: ArrayBuffer, sampleRate = 24000): Promise<void> {
    if (!this.audioContext) {
      throw new Error('Audio player not initialized');
    }

    try {
      // 将 PCM 数据转换为 AudioBuffer
      const audioBuffer = await this.pcmToAudioBuffer(pcmData, sampleRate);
      this.audioQueue.push(audioBuffer);

      // 如果没在播放，开始播放
      if (!this.isPlaying) {
        this.playNext();
      }
    } catch (error) {
      console.error('Failed to add audio data:', error);
    }
  }

  /**
   * 播放 OGG Opus 音频数据
   */
  async addOggOpusData(oggData: ArrayBuffer): Promise<void> {
    if (!this.audioContext) {
      throw new Error('Audio player not initialized');
    }

    try {
      const audioBuffer = await this.audioContext.decodeAudioData(oggData);
      this.audioQueue.push(audioBuffer);

      if (!this.isPlaying) {
        this.playNext();
      }
    } catch (error) {
      console.error('Failed to decode OGG Opus data:', error);
    }
  }

  /**
   * 播放下一个音频
   */
  private playNext(): void {
    if (this.audioQueue.length === 0) {
      this.isPlaying = false;
      if (this.onPlayEnd) {
        this.onPlayEnd();
      }
      return;
    }

    if (!this.audioContext) {
      return;
    }

    this.isPlaying = true;

    if (this.onPlayStart && this.nextStartTime === 0) {
      this.onPlayStart();
    }

    const audioBuffer = this.audioQueue.shift()!;
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);

    // 计算开始时间
    const currentTime = this.audioContext.currentTime;
    const startTime = Math.max(currentTime, this.nextStartTime);

    source.start(startTime);
    this.nextStartTime = startTime + audioBuffer.duration;

    // 播放结束后播放下一个
    source.onended = () => {
      this.playNext();
    };
  }

  /**
   * 停止播放并清空队列
   */
  stop(): void {
    this.audioQueue = [];
    this.isPlaying = false;
    this.nextStartTime = 0;

    if (this.onPlayEnd) {
      this.onPlayEnd();
    }
  }

  /**
   * 释放资源
   */
  destroy(): void {
    this.stop();

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    console.log('Audio player destroyed');
  }

  /**
   * 将 PCM 数据转换为 AudioBuffer
   */
  private async pcmToAudioBuffer(pcmData: ArrayBuffer, sampleRate: number): Promise<AudioBuffer> {
    if (!this.audioContext) {
      throw new Error('Audio context not initialized');
    }

    // 判断是 Int16 还是 Float32
    let float32Data: Float32Array;

    // 假设是 PCM int16
    if (pcmData.byteLength % 2 === 0) {
      const int16Data = new Int16Array(pcmData);
      float32Data = new Float32Array(int16Data.length);

      for (let i = 0; i < int16Data.length; i++) {
        float32Data[i] = int16Data[i] / (int16Data[i] < 0 ? 0x8000 : 0x7FFF);
      }
    } else {
      // Float32
      float32Data = new Float32Array(pcmData);
    }

    const audioBuffer = this.audioContext.createBuffer(1, float32Data.length, sampleRate);
    audioBuffer.getChannelData(0).set(float32Data);

    return audioBuffer;
  }

  /**
   * 检查是否正在播放
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * 获取队列长度
   */
  getQueueLength(): number {
    return this.audioQueue.length;
  }
}
