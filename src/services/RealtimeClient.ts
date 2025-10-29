/**
 * 实时对话 WebSocket 客户端
 */
export class RealtimeClient {
  private ws: WebSocket | null = null;
  private serverUrl: string;
  private onReady: (() => void) | null = null;
  private onAudio: ((audioData: ArrayBuffer) => void) | null = null;
  private onAsrText: ((text: string) => void) | null = null;
  private onChatText: ((text: string) => void) | null = null;
  private onError: ((error: string) => void) | null = null;

  constructor(serverUrl = 'ws://localhost:8080') {
    this.serverUrl = serverUrl;
  }

  /**
   * 连接到服务器
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.serverUrl);

      this.ws.onopen = () => {
        console.log('Connected to server');
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      };

      this.ws.onclose = () => {
        console.log('Disconnected from server');
      };
    });
  }

  /**
   * 处理服务器消息
   */
  private handleMessage(message: any): void {
    switch (message.type) {
      case 'ready':
        console.log('Session ready');
        if (this.onReady) {
          this.onReady();
        }
        break;

      case 'audio':
        // 接收到音频数据
        const audioData = this.base64ToArrayBuffer(message.data);
        if (this.onAudio) {
          this.onAudio(audioData);
        }
        break;

      case 'asr':
        // 接收到 ASR 文本
        if (this.onAsrText) {
          this.onAsrText(message.text);
        }
        break;

      case 'chat':
        // 接收到对话文本
        if (this.onChatText) {
          this.onChatText(message.text);
        }
        break;

      case 'error':
        console.error('Server error:', message.error);
        if (this.onError) {
          this.onError(message.error);
        }
        break;

      default:
        console.log('Unknown message type:', message.type);
    }
  }

  /**
   * 启动会话
   */
  startSession(config?: any): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }

    this.send({
      type: 'start',
      config: config || {}
    });
  }

  /**
   * 发送音频数据
   */
  sendAudio(audioData: ArrayBuffer): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }

    this.send({
      type: 'audio',
      data: this.arrayBufferToBase64(audioData)
    });
  }

  /**
   * 发送文本查询
   */
  sendText(text: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }

    this.send({
      type: 'text',
      text: text
    });
  }

  /**
   * 停止会话
   */
  stopSession(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    this.send({
      type: 'stop'
    });
  }

  /**
   * 关闭连接
   */
  disconnect(): void {
    if (!this.ws) {
      return;
    }

    this.send({
      type: 'close'
    });

    this.ws.close();
    this.ws = null;
  }

  /**
   * 发送消息
   */
  private send(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  /**
   * ArrayBuffer 转 Base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Base64 转 ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * 设置事件监听器
   */
  on(event: string, callback: any): void {
    switch (event) {
      case 'ready':
        this.onReady = callback;
        break;
      case 'audio':
        this.onAudio = callback;
        break;
      case 'asr':
        this.onAsrText = callback;
        break;
      case 'chat':
        this.onChatText = callback;
        break;
      case 'error':
        this.onError = callback;
        break;
    }
  }
}
