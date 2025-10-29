# 数字人实时对话系统

基于 Live2D 和火山引擎 Doubao-Realtime 端到端实时语音大模型的 Web 数字人应用，复刻火山引擎控制台体验页面功能。

## ✨ 功能特性

### 核心功能

- 🎭 **双形象模式**
  - Live2D 虚拟形象：支持说话时的嘴型和动作同步
  - 静态图片形象：带呼吸和说话动画效果

- 🗣️ **端到端实时语音对话**
  - 集成火山引擎 Doubao-Realtime API
  - 支持 O 版本（内置联网、RAG）和 SC 版本（声音克隆）
  - 无需分离 ASR/TTS，延迟更低（比传统方案快 50%+）
  - 流式输入输出架构

- ⚙️ **灵活配置系统**
  - 模型版本切换（O / SC）
  - 多种音色选择（11+ 克隆音色）
  - System Prompt 配置（O 版本）
  - Character Manifest 配置（SC 版本）
  - 自定义开场白及自动播放

- 💬 **多种交互方式**
  - 语音输入：实时录音并发送
  - 文本输入：直接输入文本对话
  - 开场白播放：手动或自动触发

- 🚀 **低延迟架构**
  - 边录音边发送
  - 边接收边播放
  - 音频队列流式管理

## 📸 功能预览

### 主要界面

- **静态形象模式**：圆形头像 + 说话动画 + 音波指示器
- **Live2D 模式**：实时渲染的 2D 虚拟形象
- **配置面板**：折叠式设计，包含所有参数配置
- **对话显示**：实时显示 ASR 识别和 AI 回复文本

## 🛠️ 技术栈

### 前端
- **React 18** - UI 框架
- **TypeScript** - 类型安全
- **Vite** - 现代构建工具
- **Pixi.js** - WebGL 渲染引擎
- **pixi-live2d-display** - Live2D 集成
- **Web Audio API** - 音频处理

### 后端
- **Node.js + Express** - HTTP 服务器
- **WebSocket (ws)** - 实时通信
- **火山引擎 Doubao-Realtime** - 端到端实时语音大模型

## 📦 项目结构

```
DignalPeople/
├── src/
│   ├── components/
│   │   ├── Live2DAvatar.tsx          # Live2D 虚拟形象组件
│   │   ├── StaticAvatar.tsx          # 静态图片形象组件
│   │   ├── StaticAvatar.css
│   │   ├── ConfigPanel.tsx           # 配置面板组件
│   │   └── ConfigPanel.css
│   ├── services/
│   │   └── RealtimeClient.ts         # WebSocket 客户端
│   ├── utils/
│   │   ├── AudioRecorder.ts          # 音频录制器（PCM 16kHz）
│   │   └── AudioPlayer.ts            # 音频播放器（PCM 24kHz）
│   ├── App.tsx                       # 主应用组件
│   ├── App.css                       # 主样式
│   └── main.tsx                      # 入口文件
├── server/
│   ├── index.js                      # 服务器入口
│   └── volcano-realtime.js           # 火山引擎服务封装
├── public/
│   └── avatar-default.png.txt        # 默认头像说明
├── deploy.sh                         # 自动部署脚本
├── nginx.conf.example                # Nginx 配置示例
├── DEPLOY.md                         # 部署文档
├── package.json
├── vite.config.ts
├── tsconfig.json
└── .env                              # 环境变量（包含 API 密钥）
```

## 🚀 快速开始

### 环境要求

- Node.js 16.x 或更高版本
- npm 或 yarn
- 火山引擎账号和 API 密钥

### 1. 克隆项目

```bash
git clone <repository-url>
cd DignalPeople
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

环境变量已预配置在 `.env` 文件中：

```env
VOLCANO_APP_ID=6114666617
VOLCANO_ACCESS_TOKEN=fkeEVXGjHapUzfHWuiFm8WjNHR7c9CoQ
VOLCANO_SECRET_KEY=ouElsPqdOshjVKeMYiz-o91P6cvKzoMW
PORT=3000
WS_PORT=8080
```

**注意**: 生产环境请使用你自己的 API 密钥。

### 4. 启动开发环境

需要同时启动前端和后端服务：

**终端 1 - 启动后端服务器：**
```bash
npm run serve
```

**终端 2 - 启动前端开发服务器：**
```bash
npm run dev
```

### 5. 访问应用

打开浏览器访问：`http://localhost:5173`

## 📖 使用说明

### 配置会话

1. 点击「⚙️ 配置设置」展开配置面板
2. 选择模型版本：
   - **Doubao-Realtime-O**：支持内置联网和外部 RAG
   - **Doubao-Realtime-SC**：支持声音克隆
3. 选择音色（根据模型版本不同有不同选项）
4. 填写角色名称
5. 配置人设：
   - O 版本：填写 System Prompt
   - SC 版本：填写 Character Manifest
6. 填写开场白内容

### 开始对话

1. 点击「🚀 开始会话」按钮
2. 系统自动播放开场白（如果已配置）
3. 选择形象模式：
   - 📷 静态形象
   - 🎭 Live2D

### 交互方式

**语音对话**：
1. 点击「🎤 按住说话」
2. 对着麦克风说话
3. 点击「⏹ 停止说话」
4. 数字人会语音回复

**文本对话**：
1. 在输入框输入文本
2. 按回车或点击「发送」
3. 数字人会语音回复

**播放开场白**：
- 在配置面板点击「🔊 播放开场白」

## 🎯 支持的功能

### 模型版本

| 版本 | 特性 | 适用场景 |
|------|------|----------|
| Doubao-Realtime-O | 支持内置联网和外部 RAG | 需要实时信息查询 |
| Doubao-Realtime-SC | 支持声音克隆 | 需要特定音色 |

### 音色选择

**O 版本音色**：
- VV - 活泼灵动女声
- 小禾 - 甜美活泼女声（台湾口音）
- 云舟 - 清爽沉稳男声
- 小天 - 清爽磁性男声

**SC 版本音色（克隆音色）**：
- 温柔文雅女声
- 傲娇女友
- 病娇姐姐
- 成熟姐姐
- 可爱女声
- 暖心学姐
- 贴心女友
- 成熟总裁
- 等 21+ 种音色

### 配置项说明

| 配置项 | 说明 | 示例 |
|--------|------|------|
| 模型版本 | O 或 SC | SC |
| 音色 | 从下拉列表选择 | 温柔文雅女声 |
| 角色名称 | 数字人的名字 | 小助手 |
| System Prompt | O 版本人设描述 | 你是一个友好的 AI 助手 |
| Character Manifest | SC 版本角色描述 | 温柔体贴，说话亲切友好 |
| 开场白 | 首次连接自动播放 | 你好，有什么可以帮你？ |

## 🚢 生产环境部署

### 快速部署

```bash
chmod +x deploy.sh
./deploy.sh
```

部署脚本会自动：
- ✅ 检查 Node.js 环境
- ✅ 安装依赖
- ✅ 构建前端
- ✅ 创建 PM2 配置
- ✅ 启动服务

### 详细部署步骤

请参阅 [DEPLOY.md](./DEPLOY.md) 获取详细的部署文档，包括：
- PM2 进程管理
- Systemd 服务配置
- Docker 容器化部署
- Nginx 反向代理配置
- HTTPS/SSL 证书配置
- 防火墙设置
- 性能优化建议
- 监控和日志管理

### Nginx 配置示例

```bash
# 复制配置文件
sudo cp nginx.conf.example /etc/nginx/sites-available/digital-people

# 修改配置
sudo nano /etc/nginx/sites-available/digital-people

# 启用配置
sudo ln -s /etc/nginx/sites-available/digital-people /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 🔧 开发说明

### 目录说明

- `src/components/` - React 组件
- `src/services/` - 服务层（WebSocket 客户端）
- `src/utils/` - 工具类（音频处理）
- `server/` - Node.js 后端服务
- `public/` - 静态资源

### 核心实现

#### 1. 火山引擎端到端语音大模型集成

使用火山引擎的 RealtimeAPI，通过 WebSocket 协议连接：

- **URL**: `wss://openspeech.bytedance.com/api/v3/realtime/dialogue`
- **协议**: 自定义二进制协议
- **音频格式**:
  - 上传：PCM, 16kHz, 单声道, int16
  - 下载：PCM, 24kHz, 单声道

#### 2. 二进制协议处理

实现了完整的二进制协议编解码（`server/volcano-realtime.js`）：

- Header (4 bytes): 协议版本、消息类型、序列化方式
- Event ID (4 bytes): 事件标识
- Session ID: 会话标识
- Payload: JSON 或二进制音频数据

#### 3. 音频处理

**录音器 (AudioRecorder.ts)**
- 使用 Web Audio API 实时采集麦克风音频
- 转换为 PCM int16 格式
- 流式发送到服务器

**播放器 (AudioPlayer.ts)**
- 接收 PCM 音频数据
- 使用音频队列管理流式播放
- 支持低延迟播放

#### 4. Live2D 动画同步

- 使用 Pixi.js 渲染 Live2D 模型
- 根据播放状态控制嘴型动画
- 支持待机和说话两种状态

### 添加新功能

1. **添加新音色**：编辑 `src/components/ConfigPanel.tsx`
2. **自定义 Live2D 模型**：替换 `Live2DAvatar.tsx` 中的 `modelUrl`
3. **修改UI样式**：编辑对应的 CSS 文件

## 📋 API 文档

### WebSocket 消息格式

**客户端 -> 服务器**
```json
{
  "type": "start|audio|text|stop|close",
  "config": {},
  "data": "base64",
  "text": "string"
}
```

**服务器 -> 客户端**
```json
{
  "type": "ready|audio|asr|chat|error",
  "data": "base64",
  "text": "string",
  "error": "string"
}
```

### 会话配置

```javascript
{
  botName: '数字人',           // 角色名称
  model: 'SC',                 // 模型版本：O 或 SC
  speaker: 'ICL_zh_female_wenrouwenya_tob',  // 音色
  systemRole: '',              // System Prompt (O版本)
  characterManifest: '',       // Character Manifest (SC版本)
}
```

## ❓ 常见问题

### 1. 无法访问麦克风

**解决方案**：
- 确保浏览器允许麦克风权限
- 使用 HTTPS 或 localhost
- 检查系统麦克风设置

### 2. WebSocket 连接失败

**检查项**：
- 后端服务是否启动（端口 3000 和 8080）
- 防火墙是否允许 WebSocket 连接
- API 密钥是否正确
- 查看浏览器控制台错误

### 3. Live2D 模型加载失败

**解决方案**：
- 默认使用 CDN 上的示例模型
- 如果加载慢，可下载模型到本地 `public/models` 目录
- 修改 `Live2DAvatar.tsx` 中的 `modelUrl`

### 4. 音频播放卡顿

**可能原因**：
- 网络延迟较高
- 音频队列管理可以调整缓冲策略
- 浏览器性能限制

### 5. 火山引擎 API 错误

**检查项**：
- API 密钥是否正确
- 网络是否能访问火山引擎
- API 配额是否用完
- 查看后端日志

## 🔐 安全建议

1. **不要将 `.env` 文件提交到公共仓库**
2. **使用 HTTPS** 保护通信
3. **定期更新依赖** `npm audit fix`
4. **限制 API 访问** 使用防火墙和速率限制
5. **监控异常访问** 使用日志分析工具
6. **定期备份** 配置和数据

## 🔄 更新日志

### v2.0.0 (2025-01-06)
- ✨ 添加静态图片形象模式
- ✨ 添加形象切换功能
- ✨ 添加配置面板（System Prompt、Character Manifest、开场白）
- ✨ 支持 Doubao-Realtime-SC 模型
- ✨ 支持 11+ 种克隆音色
- ✨ 开场白自动播放功能
- 📝 完善部署文档和脚本
- 🎨 优化 UI 设计和交互

### v1.0.0 (2025-01-05)
- 🎉 初始版本发布
- ✅ Live2D 虚拟形象集成
- ✅ 火山引擎端到端语音大模型集成
- ✅ 实时音频录制和播放
- ✅ 流式对话功能
- ✅ 基础 Web 界面

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📞 联系方式

如有问题，请提交 GitHub Issue。

---

**基于 Live2D 和火山引擎 Doubao-Realtime 端到端实时语音大模型**

Made with ❤️ by Claude Code
