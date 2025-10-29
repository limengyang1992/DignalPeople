import { useState, useEffect, useRef } from 'react';
import { Live2DAvatar } from './components/Live2DAvatar';
import { StaticAvatar } from './components/StaticAvatar';
import { ConfigPanel, SessionConfig } from './components/ConfigPanel';
import { RealtimeClient } from './services/RealtimeClient';
import { AudioRecorder } from './utils/AudioRecorder';
import { AudioPlayer } from './utils/AudioPlayer';
import './App.css';

type AvatarMode = 'live2d' | 'static';

function App() {
  const [avatarMode, setAvatarMode] = useState<AvatarMode>('static');
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [asrText, setAsrText] = useState('');
  const [chatText, setChatText] = useState('');
  const [status, setStatus] = useState('未连接');
  const [inputText, setInputText] = useState('');
  const [sessionConfig, setSessionConfig] = useState<SessionConfig | null>(null);
  const [hasPlayedGreeting, setHasPlayedGreeting] = useState(false);

  const clientRef = useRef<RealtimeClient | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);

  useEffect(() => {
    // 初始化客户端 - 根据环境自动选择 WebSocket 地址
    const wsUrl = process.env.NODE_ENV === 'production'
      ? `ws://${window.location.hostname}/ws`
      : 'ws://localhost:8080';

    clientRef.current = new RealtimeClient(wsUrl);

    // 初始化音频播放器
    playerRef.current = new AudioPlayer();
    playerRef.current.init(
      () => {
        setIsPlaying(true);
        console.log('Audio playback started');
      },
      () => {
        setIsPlaying(false);
        console.log('Audio playback ended');
      }
    );

    // 初始化音频录制器
    recorderRef.current = new AudioRecorder();

    return () => {
      if (clientRef.current) {
        clientRef.current.disconnect();
      }
      if (recorderRef.current) {
        recorderRef.current.destroy();
      }
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, []);

  /**
   * 处理配置变化
   */
  const handleConfigChange = (config: SessionConfig) => {
    setSessionConfig(config);
    console.log('Config updated:', config);
  };

  /**
   * 播放开场白
   */
  const handleGreeting = (greeting: string) => {
    if (!clientRef.current || !isConnected || !greeting.trim()) return;

    // 停止当前播放
    if (playerRef.current) {
      playerRef.current.stop();
    }

    // 清空文本
    setAsrText('');
    setChatText('开场白: ' + greeting);

    // 发送开场白文本进行TTS
    clientRef.current.sendText(greeting);
  };

  /**
   * 连接到服务器
   */
  const handleConnect = async () => {
    if (!clientRef.current || !sessionConfig) {
      alert('请先配置参数');
      return;
    }

    try {
      setStatus('正在连接...');

      // 连接到服务器
      await clientRef.current.connect();

      // 设置事件监听
      clientRef.current.on('ready', () => {
        setIsConnected(true);
        setStatus('已连接');
        console.log('Session is ready');

        // 自动播放开场白（仅首次连接）
        if (!hasPlayedGreeting && sessionConfig.greeting.trim()) {
          setTimeout(() => {
            handleGreeting(sessionConfig.greeting);
            setHasPlayedGreeting(true);
          }, 500);
        }
      });

      clientRef.current.on('audio', (audioData: ArrayBuffer) => {
        // 播放接收到的音频
        if (playerRef.current) {
          playerRef.current.addAudioData(audioData, 24000);
        }
      });

      clientRef.current.on('asr', (text: string) => {
        setAsrText(text);
        console.log('ASR:', text);
      });

      clientRef.current.on('chat', (text: string) => {
        setChatText((prev) => prev + text);
        console.log('Chat:', text);
      });

      clientRef.current.on('error', (error: string) => {
        console.error('Error:', error);
        setStatus(`错误: ${error}`);
      });

      // 构建会话配置
      const startConfig: any = {
        botName: sessionConfig.botName,
        model: sessionConfig.model,
        speaker: sessionConfig.speaker,
      };

      // O版本使用 systemPrompt
      if (sessionConfig.model === 'O' && sessionConfig.systemPrompt) {
        startConfig.systemRole = sessionConfig.systemPrompt;
      }

      // SC版本使用 characterManifest
      if (sessionConfig.model === 'SC' && sessionConfig.characterManifest) {
        startConfig.characterManifest = sessionConfig.characterManifest;
      }

      // 启动会话
      clientRef.current.startSession(startConfig);

    } catch (error) {
      console.error('Failed to connect:', error);
      setStatus('连接失败');
    }
  };

  /**
   * 开始录音
   */
  const handleStartRecording = async () => {
    if (!recorderRef.current || !clientRef.current || !isConnected) return;

    try {
      // 停止当前播放
      if (playerRef.current) {
        playerRef.current.stop();
      }

      // 清空之前的文本
      setAsrText('');
      setChatText('');

      // 初始化录音器
      if (!recorderRef.current.getIsRecording()) {
        await recorderRef.current.init((audioData) => {
          // 实时发送音频到服务器
          if (clientRef.current) {
            clientRef.current.sendAudio(audioData);
          }
        });
      }

      recorderRef.current.start();
      setIsRecording(true);
      setStatus('正在录音...');

    } catch (error) {
      console.error('Failed to start recording:', error);
      setStatus('录音失败');
    }
  };

  /**
   * 停止录音
   */
  const handleStopRecording = () => {
    if (!recorderRef.current) return;

    recorderRef.current.stop();
    setIsRecording(false);
    setStatus('已连接');
  };

  /**
   * 发送文本消息
   */
  const handleSendText = () => {
    if (!clientRef.current || !inputText.trim()) return;

    // 停止当前播放
    if (playerRef.current) {
      playerRef.current.stop();
    }

    // 清空之前的文本
    setAsrText(inputText);
    setChatText('');

    clientRef.current.sendText(inputText);
    setInputText('');
  };

  /**
   * 断开连接
   */
  const handleDisconnect = () => {
    if (!clientRef.current) return;

    if (isRecording) {
      handleStopRecording();
    }

    clientRef.current.disconnect();
    setIsConnected(false);
    setStatus('未连接');
    setAsrText('');
    setChatText('');
    setHasPlayedGreeting(false);
  };

  /**
   * 切换形象模式
   */
  const handleSwitchAvatar = (mode: AvatarMode) => {
    setAvatarMode(mode);
  };

  return (
    <div className="app">
      <div className="header">
        <h1>数字人实时对话系统</h1>
        <div className="header-info">
          <div className="status-badge">
            <span className={`status-dot ${isConnected ? 'connected' : ''}`}></span>
            状态: {status}
          </div>
          <div className="model-badge">
            模型: {sessionConfig?.model || 'SC'}
          </div>
        </div>
      </div>

      <div className="main-content">
        {/* 左侧：虚拟形象 */}
        <div className="avatar-section">
          <div className="avatar-mode-switch">
            <button
              className={`mode-btn ${avatarMode === 'static' ? 'active' : ''}`}
              onClick={() => handleSwitchAvatar('static')}
            >
              📷 静态形象
            </button>
            <button
              className={`mode-btn ${avatarMode === 'live2d' ? 'active' : ''}`}
              onClick={() => handleSwitchAvatar('live2d')}
            >
              🎭 Live2D
            </button>
          </div>

          <div className="avatar-display">
            {avatarMode === 'static' ? (
              <StaticAvatar
                isPlaying={isPlaying}
                isSpeaking={isRecording}
              />
            ) : (
              <Live2DAvatar
                width={800}
                height={600}
                isPlaying={isPlaying}
              />
            )}
          </div>
        </div>

        {/* 右侧：控制面板 */}
        <div className="control-section">
          {/* 配置面板 */}
          <ConfigPanel
            onConfigChange={handleConfigChange}
            onGreeting={handleGreeting}
            disabled={isConnected}
          />

          {/* 连接控制 */}
          <div className="connection-panel">
            {!isConnected ? (
              <button
                className="btn btn-primary btn-large"
                onClick={handleConnect}
                disabled={!sessionConfig}
              >
                🚀 开始会话
              </button>
            ) : (
              <button className="btn btn-danger btn-large" onClick={handleDisconnect}>
                🔌 断开连接
              </button>
            )}
          </div>

          {/* 录音控制 */}
          <div className="recording-panel">
            {!isRecording ? (
              <button
                className="btn btn-record btn-large"
                onClick={handleStartRecording}
                disabled={!isConnected}
              >
                🎤 按住说话
              </button>
            ) : (
              <button className="btn btn-stop btn-large" onClick={handleStopRecording}>
                ⏹ 停止说话
              </button>
            )}
          </div>

          {/* 文本输入 */}
          <div className="text-input-panel">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSendText();
                }
              }}
              placeholder="或者输入文本消息..."
              disabled={!isConnected}
            />
            <button
              className="btn btn-send"
              onClick={handleSendText}
              disabled={!isConnected || !inputText.trim()}
            >
              发送
            </button>
          </div>

          {/* 对话显示 */}
          <div className="conversation-panel">
            <div className="conversation-item">
              <div className="conversation-label">👤 你说:</div>
              <div className="conversation-text user-text">{asrText || '等待输入...'}</div>
            </div>

            <div className="conversation-item">
              <div className="conversation-label">🤖 数字人回复:</div>
              <div className="conversation-text assistant-text">
                {chatText || '等待回复...'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="footer">
        <p>基于 Live2D 和火山引擎 Doubao-Realtime 端到端实时语音大模型</p>
        <p className="footer-tech">React + TypeScript + WebSocket + Pixi.js</p>
      </div>
    </div>
  );
}

export default App;
