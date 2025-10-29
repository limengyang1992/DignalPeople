/**
 * 音频录制器
 * 支持实时录制并转换为 PCM 格式
 */
export class AudioRecorder {
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private isRecording = false;
  private onAudioData: ((data: ArrayBuffer) => void) | null = null;

  /**
   * 初始化录音器
   */
  async init(onAudioData: (data: ArrayBuffer) => void): Promise<void> {
    this.onAudioData = onAudioData;

    try {
      // 请求麦克风权限
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      // 创建音频上下文
      this.audioContext = new AudioContext({ sampleRate: 16000 });
      this.source = this.audioContext.createMediaStreamSource(this.mediaStream);

      // 创建处理器节点
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.processor.onaudioprocess = (e) => {
        if (!this.isRecording) return;

        const inputData = e.inputBuffer.getChannelData(0);

        // 转换为 PCM int16
        const pcmData = this.floatTo16BitPCM(inputData);

        if (this.onAudioData) {
          this.onAudioData(pcmData.buffer as ArrayBuffer);
        }
      };

      // 连接节点
      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

      console.log('Audio recorder initialized');
    } catch (error) {
      console.error('Failed to initialize audio recorder:', error);
      throw error;
    }
  }

  /**
   * 开始录音
   */
  start(): void {
    if (this.isRecording) {
      console.warn('Already recording');
      return;
    }

    if (!this.audioContext || !this.processor) {
      throw new Error('Audio recorder not initialized');
    }

    this.isRecording = true;
    console.log('Recording started');
  }

  /**
   * 停止录音
   */
  stop(): void {
    if (!this.isRecording) {
      return;
    }

    this.isRecording = false;
    console.log('Recording stopped');
  }

  /**
   * 释放资源
   */
  destroy(): void {
    this.stop();

    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }

    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    console.log('Audio recorder destroyed');
  }

  /**
   * 将 Float32Array 转换为 Int16 PCM
   */
  private floatTo16BitPCM(float32Array: Float32Array): Int16Array {
    const int16Array = new Int16Array(float32Array.length);

    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }

    return int16Array;
  }

  /**
   * 检查是否正在录音
   */
  getIsRecording(): boolean {
    return this.isRecording;
  }
}
