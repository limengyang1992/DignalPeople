import WebSocket from 'ws';
import { EventEmitter } from 'events';
import crypto from 'crypto';

/**
 * 火山引擎端到端实时语音服务
 */
export class VolcanoRealtimeService extends EventEmitter {
  constructor(config) {
    super();
    this.appId = config.appId;
    this.accessToken = config.accessToken;
    this.secretKey = config.secretKey;
    this.ws = null;
    this.sessionId = null;
    this.connectId = null;
  }

  /**
   * 建立 WebSocket 连接
   */
  async connect() {
    return new Promise((resolve, reject) => {
      const url = 'wss://openspeech.bytedance.com/api/v3/realtime/dialogue';

      this.connectId = this.generateUUID();

      this.ws = new WebSocket(url, {
        headers: {
          'X-Api-App-ID': this.appId,
          'X-Api-Access-Key': this.accessToken,
          'X-Api-Resource-Id': 'volc.speech.dialog',
          'X-Api-App-Key': 'PlgvMymc7f3tQnJ6',
          'X-Api-Connect-Id': this.connectId,
        }
      });

      this.ws.on('open', async () => {
        console.log('Connected to Volcano Engine');

        // 发送 StartConnection 事件
        await this.sendEvent(1, {});
        resolve();
      });

      this.ws.on('message', (data) => {
        this.handleMessage(data);
      });

      this.ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.emit('error', error);
        reject(error);
      });

      this.ws.on('close', () => {
        console.log('Disconnected from Volcano Engine');
        this.emit('close');
      });
    });
  }

  /**
   * 启动会话
   */
  async startSession(config = {}) {
    this.sessionId = this.generateUUID();

    const sessionConfig = {
      asr: {
        extra: {
          end_smooth_window_ms: config.endSmoothWindowMs || 1500,
          enable_custom_vad: config.enableCustomVad || false,
          enable_asr_twopass: config.enableAsrTwopass || false,
        }
      },
      dialog: {
        bot_name: config.botName || '豆包',
        dialog_id: config.dialogId || '',
        extra: {
          strict_audit: config.strictAudit !== false,
          model: config.model || 'O',
        }
      },
      tts: {
        audio_config: {
          channel: 1,
          format: 'pcm',
          sample_rate: 24000
        },
        speaker: config.speaker || 'zh_female_vv_jupiter_bigtts'
      }
    };

    await this.sendEvent(100, sessionConfig);
  }

  /**
   * 发送音频数据
   */
  async sendAudio(audioBuffer) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }

    // 构建音频数据包
    const packet = this.buildBinaryPacket({
      messageType: 0b0010, // Audio-only request
      eventId: 200, // TaskRequest
      sessionId: this.sessionId,
      payload: audioBuffer
    });

    this.ws.send(packet);
  }

  /**
   * 发送文本查询
   */
  async sendTextQuery(text) {
    const payload = { content: text };
    await this.sendEvent(501, payload);
  }

  /**
   * 结束会话
   */
  async finishSession() {
    await this.sendEvent(102, {});
  }

  /**
   * 断开连接
   */
  async disconnect() {
    if (this.ws) {
      await this.sendEvent(2, {});
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * 发送事件
   */
  async sendEvent(eventId, payload) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }

    const jsonPayload = JSON.stringify(payload);
    const packet = this.buildBinaryPacket({
      messageType: 0b0001, // Full-client request
      eventId: eventId,
      sessionId: this.sessionId,
      connectId: this.connectId,
      payload: Buffer.from(jsonPayload, 'utf-8')
    });

    this.ws.send(packet);
  }

  /**
   * 构建二进制数据包
   */
  buildBinaryPacket(options) {
    const { messageType, eventId, sessionId, connectId, payload } = options;

    const buffers = [];

    // Header (4 bytes)
    const header = Buffer.alloc(4);
    header[0] = (0b0001 << 4) | 0b0001; // Protocol version v1, Header size 4
    header[1] = (messageType << 4) | 0b0100; // Message type + event flag
    header[2] = (0b0001 << 4) | 0b0000; // JSON serialization, no compression
    header[3] = 0x00;
    buffers.push(header);

    // Event ID (4 bytes)
    const eventIdBuffer = Buffer.alloc(4);
    eventIdBuffer.writeUInt32BE(eventId, 0);
    buffers.push(eventIdBuffer);

    // Session ID (如果有)
    if (sessionId) {
      const sessionIdStr = sessionId;
      const sessionIdSizeBuffer = Buffer.alloc(4);
      sessionIdSizeBuffer.writeUInt32BE(sessionIdStr.length, 0);
      buffers.push(sessionIdSizeBuffer);
      buffers.push(Buffer.from(sessionIdStr, 'utf-8'));
    }

    // Connect ID (如果有且是 Connect 类事件)
    if (connectId && (eventId === 1 || eventId === 2)) {
      const connectIdStr = connectId;
      const connectIdSizeBuffer = Buffer.alloc(4);
      connectIdSizeBuffer.writeUInt32BE(connectIdStr.length, 0);
      buffers.push(connectIdSizeBuffer);
      buffers.push(Buffer.from(connectIdStr, 'utf-8'));
    }

    // Payload size and payload
    const payloadBuffer = payload || Buffer.alloc(0);
    const payloadSizeBuffer = Buffer.alloc(4);
    payloadSizeBuffer.writeUInt32BE(payloadBuffer.length, 0);
    buffers.push(payloadSizeBuffer);
    buffers.push(payloadBuffer);

    return Buffer.concat(buffers);
  }

  /**
   * 处理接收到的消息
   */
  handleMessage(data) {
    try {
      const parsed = this.parseBinaryPacket(data);

      switch (parsed.eventId) {
        case 50: // ConnectionStarted
          console.log('Connection started');
          break;

        case 150: // SessionStarted
          console.log('Session started:', parsed.payload);
          this.emit('session_started', parsed.payload);
          break;

        case 350: // TTSSentenceStart
          console.log('TTS sentence start:', parsed.payload);
          this.emit('tts_sentence_start', parsed.payload);
          break;

        case 352: // TTSResponse (音频数据)
          this.emit('tts_audio', parsed.payload);
          break;

        case 351: // TTSSentenceEnd
          console.log('TTS sentence end');
          this.emit('tts_sentence_end');
          break;

        case 359: // TTSEnded
          console.log('TTS ended');
          this.emit('tts_ended');
          break;

        case 450: // ASRInfo
          console.log('ASR first word detected');
          this.emit('asr_first_word');
          break;

        case 451: // ASRResponse
          if (parsed.payload && parsed.payload.results) {
            const text = parsed.payload.results[0]?.text;
            if (text) {
              console.log('ASR text:', text);
              this.emit('asr_text', text);
            }
          }
          break;

        case 459: // ASREnded
          console.log('ASR ended');
          this.emit('asr_ended');
          break;

        case 550: // ChatResponse
          if (parsed.payload && parsed.payload.content) {
            console.log('Chat response:', parsed.payload.content);
            this.emit('chat_text', parsed.payload.content);
          }
          break;

        case 559: // ChatEnded
          console.log('Chat ended');
          this.emit('chat_ended');
          break;

        case 152: // SessionFinished
          console.log('Session finished');
          this.emit('session_finished');
          break;

        case 52: // ConnectionFinished
          console.log('Connection finished');
          break;

        default:
          console.log('Unknown event:', parsed.eventId);
      }
    } catch (error) {
      console.error('Error handling message:', error);
      this.emit('error', error);
    }
  }

  /**
   * 解析二进制数据包
   */
  parseBinaryPacket(data) {
    let offset = 0;

    // 读取 header (4 bytes)
    const header = data.slice(offset, offset + 4);
    offset += 4;

    const messageType = (header[1] >> 4) & 0x0F;
    const flags = header[1] & 0x0F;
    const serialization = (header[2] >> 4) & 0x0F;

    // 读取 event ID (4 bytes)
    const eventId = data.readUInt32BE(offset);
    offset += 4;

    // 读取 session ID (如果有)
    let sessionId = null;
    if (offset < data.length - 4) {
      const sessionIdSize = data.readUInt32BE(offset);
      offset += 4;

      if (sessionIdSize > 0 && sessionIdSize < 1000) {
        sessionId = data.slice(offset, offset + sessionIdSize).toString('utf-8');
        offset += sessionIdSize;
      }
    }

    // 读取 payload size 和 payload
    let payload = null;
    if (offset < data.length) {
      const payloadSize = data.readUInt32BE(offset);
      offset += 4;

      if (payloadSize > 0 && offset + payloadSize <= data.length) {
        const payloadBuffer = data.slice(offset, offset + payloadSize);

        // 如果是 JSON 序列化
        if (serialization === 0b0001 && messageType !== 0b1011) {
          try {
            payload = JSON.parse(payloadBuffer.toString('utf-8'));
          } catch (e) {
            payload = payloadBuffer;
          }
        } else {
          // 二进制数据（音频）
          payload = payloadBuffer;
        }
      }
    }

    return {
      messageType,
      eventId,
      sessionId,
      payload
    };
  }

  /**
   * 生成 UUID
   */
  generateUUID() {
    return crypto.randomUUID();
  }
}
