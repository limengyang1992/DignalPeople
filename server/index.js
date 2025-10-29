import express from 'express';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';
import { VolcanoRealtimeService } from './volcano-realtime.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const WS_PORT = process.env.WS_PORT || 8080;

app.use(express.json());
app.use(express.static('dist'));

// 启动 HTTP 服务器
app.listen(PORT, () => {
  console.log(`HTTP Server running on port ${PORT}`);
});

// 启动 WebSocket 服务器
const wss = new WebSocketServer({ port: WS_PORT });

wss.on('connection', (ws) => {
  console.log('Client connected');

  const volcanoService = new VolcanoRealtimeService({
    appId: process.env.VOLCANO_APP_ID,
    accessToken: process.env.VOLCANO_ACCESS_TOKEN,
    secretKey: process.env.VOLCANO_SECRET_KEY,
  });

  // 客户端消息处理
  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data);

      switch (message.type) {
        case 'start':
          // 启动会话
          await volcanoService.connect();
          await volcanoService.startSession(message.config || {});

          // 监听火山引擎返回的事件
          volcanoService.on('tts_audio', (audioData) => {
            ws.send(JSON.stringify({
              type: 'audio',
              data: audioData.toString('base64')
            }));
          });

          volcanoService.on('asr_text', (text) => {
            ws.send(JSON.stringify({
              type: 'asr',
              text: text
            }));
          });

          volcanoService.on('chat_text', (text) => {
            ws.send(JSON.stringify({
              type: 'chat',
              text: text
            }));
          });

          volcanoService.on('error', (error) => {
            ws.send(JSON.stringify({
              type: 'error',
              error: error.message
            }));
          });

          ws.send(JSON.stringify({ type: 'ready' }));
          break;

        case 'audio':
          // 发送音频数据到火山引擎
          const audioBuffer = Buffer.from(message.data, 'base64');
          await volcanoService.sendAudio(audioBuffer);
          break;

        case 'text':
          // 发送文本查询
          await volcanoService.sendTextQuery(message.text);
          break;

        case 'stop':
          // 停止会话
          await volcanoService.finishSession();
          break;

        case 'close':
          // 关闭连接
          await volcanoService.disconnect();
          break;
      }
    } catch (error) {
      console.error('Error handling message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        error: error.message
      }));
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    volcanoService.disconnect().catch(console.error);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

console.log(`WebSocket Server running on port ${WS_PORT}`);
