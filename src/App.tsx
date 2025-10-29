import { useState, useEffect, useRef } from 'react';
import { Live2DAvatar } from './components/Live2DAvatar';
import { RealtimeClient } from './services/RealtimeClient';
import { AudioRecorder } from './utils/AudioRecorder';
import { AudioPlayer } from './utils/AudioPlayer';
import './App.css';

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [asrText, setAsrText] = useState('');
  const [chatText, setChatText] = useState('');
  const [status, setStatus] = useState('未连接');
  const [inputText, setInputText] = useState('');

  const clientRef = useRef<RealtimeClient | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);

  useEffect(() => {
    // 初始化客户端
    clientRef.current = new RealtimeClient('ws://localhost:8080');

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
   * 连接到服务器
   */
  const handleConnect = async () => {
    if (!clientRef.current) return;

    try {
      setStatus('正在连接...');

      // 连接到服务器
      await clientRef.current.connect();

      // 设置事件监听
      clientRef.current.on('ready', () => {
        setIsConnected(true);
        setStatus('已连接');
        console.log('Session is ready');
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

      // 启动会话
      clientRef.current.startSession({
        botName: '数字人',
        model: 'O',
        speaker: 'zh_female_vv_jupiter_bigtts',
      });

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
  };

  return (
    <div className="app">
      <div className="header">
        <h1>数字人对话系统</h1>
        <div className="status">状态: {status}</div>
      </div>

      <div className="main-content">
        <div className="avatar-container">
          <Live2DAvatar
            width={800}
            height={600}
            isPlaying={isPlaying}
          />
        </div>

        <div className="control-panel">
          <div className="connection-controls">
            {!isConnected ? (
              <button className="btn btn-primary" onClick={handleConnect}>
                连接
              </button>
            ) : (
              <button className="btn btn-danger" onClick={handleDisconnect}>
                断开连接
              </button>
            )}
          </div>

          <div className="recording-controls">
            {!isRecording ? (
              <button
                className="btn btn-record"
                onClick={handleStartRecording}
                disabled={!isConnected}
              >
                🎤 开始说话
              </button>
            ) : (
              <button className="btn btn-stop" onClick={handleStopRecording}>
                ⏹ 停止说话
              </button>
            )}
          </div>

          <div className="text-input-controls">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSendText();
                }
              }}
              placeholder="输入文本消息..."
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

          <div className="conversation-display">
            <div className="text-section">
              <h3>你说:</h3>
              <div className="text-content asr-text">{asrText || '...'}</div>
            </div>

            <div className="text-section">
              <h3>数字人回复:</h3>
              <div className="text-content chat-text">{chatText || '...'}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="footer">
        <p>基于 Live2D 和火山引擎端到端实时语音大模型</p>
      </div>
    </div>
  );
}

export default App;
