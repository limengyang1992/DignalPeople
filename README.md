# 数字人对话系统

基于 Live2D 模型和火山引擎端到端实时语音大模型的 Web 数字人应用。

## 功能特性

- ✅ **Live2D 虚拟形象**：使用 Live2D 官方模型，支持说话时的嘴型和动作同步
- ✅ **端到端语音对话**：集成火山引擎实时语音大模型，无需分离 ASR/TTS
- ✅ **流式实时交互**：支持边说边听，低延迟响应
- ✅ **多种输入方式**：支持语音输入和文本输入
- ✅ **实时 ASR 识别**：显示用户说话的实时文本
- ✅ **流式 TTS 合成**：流式播放数字人回复的语音

## 技术栈

### 前端
- **React 18** - UI 框架
- **TypeScript** - 类型安全
- **Vite** - 构建工具
- **Pixi.js** - WebGL 渲染引擎
- **pixi-live2d-display** - Live2D 集成
- **Web Audio API** - 音频处理

### 后端
- **Node.js + Express** - HTTP 服务器
- **WebSocket (ws)** - 实时通信
- **火山引擎端到端实时语音大模型** - 语音对话 AI

## 项目结构

```
DignalPeople/
├── src/
│   ├── components/
│   │   └── Live2DAvatar.tsx          # Live2D 虚拟形象组件
│   ├── services/
│   │   └── RealtimeClient.ts         # WebSocket 客户端
│   ├── utils/
│   │   ├── AudioRecorder.ts          # 音频录制器
│   │   └── AudioPlayer.ts            # 音频播放器
│   ├── App.tsx                       # 主应用组件
│   ├── App.css                       # 样式
│   └── main.tsx                      # 入口文件
├── server/
│   ├── index.js                      # 服务器入口
│   └── volcano-realtime.js           # 火山引擎服务封装
├── package.json
├── vite.config.ts
├── tsconfig.json
└── .env                              # 环境变量（包含 API 密钥）
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

项目已经预配置了火山引擎的 API 密钥在 `.env` 文件中：

```env
VOLCANO_APP_ID=6114666617
VOLCANO_ACCESS_TOKEN=fkeEVXGjHapUzfHWuiFm8WjNHR7c9CoQ
VOLCANO_SECRET_KEY=ouElsPqdOshjVKeMYiz-o91P6cvKzoMW
PORT=3000
WS_PORT=8080
```

### 3. 启动开发环境

需要同时启动前端和后端服务：

**终端 1 - 启动后端服务器：**
```bash
npm run serve
```

**终端 2 - 启动前端开发服务器：**
```bash
npm run dev
```

### 4. 访问应用

打开浏览器访问：`http://localhost:5173`

## 使用说明

### 语音对话流程

1. 点击「连接」按钮，建立与服务器的连接
2. 连接成功后，点击「🎤 开始说话」按钮开始录音
3. 对着麦克风说话，系统会实时识别并显示你说的话
4. 说完后点击「⏹ 停止说话」，数字人会开始回复
5. 数字人说话时，Live2D 模型会同步嘴型动画

### 文本对话流程

1. 在输入框中输入文本消息
2. 按回车或点击「发送」按钮
3. 数字人会语音回复你的消息

## 核心实现

### 1. 火山引擎端到端语音大模型集成

使用火山引擎的 RealtimeAPI，通过 WebSocket 协议连接：

- **URL**: `wss://openspeech.bytedance.com/api/v3/realtime/dialogue`
- **协议**: 自定义二进制协议
- **音频格式**: PCM, 16kHz, 单声道, int16

### 2. 二进制协议处理

实现了完整的二进制协议编解码：

- Header (4 bytes): 协议版本、消息类型、序列化方式
- Event ID (4 bytes): 事件标识
- Session ID: 会话标识
- Payload: JSON 或二进制音频数据

### 3. 音频处理

**录音器 (AudioRecorder)**
- 使用 Web Audio API 实时采集麦克风音频
- 转换为 PCM int16 格式
- 流式发送到服务器

**播放器 (AudioPlayer)**
- 接收 PCM 音频数据
- 使用音频队列管理流式播放
- 支持低延迟播放

### 4. Live2D 动画同步

- 使用 Pixi.js 渲染 Live2D 模型
- 根据播放状态控制嘴型动画
- 支持待机和说话两种状态

## API 配置

### 会话配置选项

```javascript
{
  botName: '数字人',           // 机器人名称
  model: 'O',                  // 模型版本：O 或 SC
  speaker: 'zh_female_vv_jupiter_bigtts',  // 音色
  endSmoothWindowMs: 1500,     // VAD 停顿检测时间
  strictAudit: true            // 是否启用严格审核
}
```

### 支持的音色（O 版本）

- `zh_female_vv_jupiter_bigtts` - vv 音色（活泼灵动女声）
- `zh_female_xiaohe_jupiter_bigtts` - xiaohe 音色（甜美活泼女声）
- `zh_male_yunzhou_jupiter_bigtts` - yunzhou 音色（清爽沉稳男声）
- `zh_male_xiaotian_jupiter_bigtts` - xiaotian 音色（清爽磁性男声）

## 性能优化

1. **流式处理**：边录音边发送，边接收边播放
2. **音频队列**：使用队列管理音频播放，保证连续性
3. **低延迟**：端到端模型延迟更低，比传统 ASR+TTS 快 50%+
4. **WebSocket 复用**：支持会话结束后复用连接

## 常见问题

### 1. 无法访问麦克风

确保浏览器允许麦克风权限，使用 HTTPS 或 localhost。

### 2. 连接失败

检查：
- 后端服务是否启动（端口 3000 和 8080）
- 防火墙是否允许 WebSocket 连接
- API 密钥是否正确

### 3. Live2D 模型加载失败

默认使用 CDN 上的示例模型，如果加载慢可以：
- 下载模型到本地 `public/models` 目录
- 修改 `Live2DAvatar.tsx` 中的 `modelUrl`

### 4. 音频播放卡顿

可能原因：
- 网络延迟较高
- 音频队列管理可以调整缓冲策略

## 部署建议

### 生产环境部署

1. 构建前端：
```bash
npm run build
```

2. 将 `dist` 目录部署到静态服务器

3. 部署后端服务到云服务器

4. 配置 Nginx 反向代理：
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        root /path/to/dist;
        try_files $uri /index.html;
    }

    location /ws {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## 许可证

MIT

## 联系方式

如有问题，请提交 Issue。
