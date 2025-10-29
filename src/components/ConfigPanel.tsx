import { useState } from 'react';
import './ConfigPanel.css';

interface ConfigPanelProps {
  onConfigChange: (config: SessionConfig) => void;
  onGreeting: (greeting: string) => void;
  disabled?: boolean;
}

export interface SessionConfig {
  model: 'O' | 'SC';
  speaker: string;
  botName: string;
  systemPrompt: string;
  characterManifest: string;
  greeting: string;
}

const DEFAULT_CONFIG: SessionConfig = {
  model: 'SC',
  speaker: 'ICL_zh_female_wenrouwenya_tob',
  botName: '数字人助手',
  systemPrompt: '',
  characterManifest: '你是一个温柔体贴的AI助手，说话语气亲切友好。',
  greeting: '你好，我是你的数字人助手，有什么可以帮助你的吗？'
};

export const ConfigPanel: React.FC<ConfigPanelProps> = ({
  onConfigChange,
  onGreeting,
  disabled = false
}) => {
  const [config, setConfig] = useState<SessionConfig>(DEFAULT_CONFIG);
  const [isExpanded, setIsExpanded] = useState(false);

  // O版本音色
  const oVoices = [
    { value: 'zh_female_vv_jupiter_bigtts', label: 'VV - 活泼灵动女声' },
    { value: 'zh_female_xiaohe_jupiter_bigtts', label: '小禾 - 甜美活泼女声' },
    { value: 'zh_male_yunzhou_jupiter_bigtts', label: '云舟 - 清爽沉稳男声' },
    { value: 'zh_male_xiaotian_jupiter_bigtts', label: '小天 - 清爽磁性男声' }
  ];

  // SC版本音色（克隆音色）
  const scVoices = [
    { value: 'ICL_zh_female_wenrouwenya_tob', label: '温柔文雅女声' },
    { value: 'ICL_zh_female_aojiaonvyou_tob', label: '傲娇女友' },
    { value: 'ICL_zh_female_bingjiaojiejie_tob', label: '病娇姐姐' },
    { value: 'ICL_zh_female_chengshujiejie_tob', label: '成熟姐姐' },
    { value: 'ICL_zh_female_keainvsheng_tob', label: '可爱女声' },
    { value: 'ICL_zh_female_nuanxinxuejie_tob', label: '暖心学姐' },
    { value: 'ICL_zh_female_tiexinnvyou_tob', label: '贴心女友' },
    { value: 'ICL_zh_male_aiqilingren_tob', label: '爱妻凌人' },
    { value: 'ICL_zh_male_aojiaogongzi_tob', label: '傲娇公子' },
    { value: 'ICL_zh_male_chengshuzongcai_tob', label: '成熟总裁' },
    { value: 'ICL_zh_male_cixingnansang_tob', label: '慈性男桑' }
  ];

  const currentVoices = config.model === 'O' ? oVoices : scVoices;

  const handleConfigChange = (key: keyof SessionConfig, value: string) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    onConfigChange(newConfig);
  };

  const handleModelChange = (model: 'O' | 'SC') => {
    const newSpeaker = model === 'O'
      ? 'zh_female_vv_jupiter_bigtts'
      : 'ICL_zh_female_wenrouwenya_tob';

    const newConfig = { ...config, model, speaker: newSpeaker };
    setConfig(newConfig);
    onConfigChange(newConfig);
  };

  const handlePlayGreeting = () => {
    if (config.greeting.trim()) {
      onGreeting(config.greeting);
    }
  };

  return (
    <div className="config-panel">
      <div className="config-header" onClick={() => setIsExpanded(!isExpanded)}>
        <h3>⚙️ 配置设置</h3>
        <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>▼</span>
      </div>

      {isExpanded && (
        <div className="config-content">
          {/* 模型选择 */}
          <div className="config-group">
            <label>模型版本</label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="model"
                  value="O"
                  checked={config.model === 'O'}
                  onChange={() => handleModelChange('O')}
                  disabled={disabled}
                />
                <span>Doubao-Realtime-O</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="model"
                  value="SC"
                  checked={config.model === 'SC'}
                  onChange={() => handleModelChange('SC')}
                  disabled={disabled}
                />
                <span>Doubao-Realtime-SC</span>
              </label>
            </div>
            <div className="hint-text">
              {config.model === 'O' ? '支持内置联网和外部RAG' : '支持声音克隆'}
            </div>
          </div>

          {/* 音色选择 */}
          <div className="config-group">
            <label>音色选择</label>
            <select
              value={config.speaker}
              onChange={(e) => handleConfigChange('speaker', e.target.value)}
              disabled={disabled}
            >
              {currentVoices.map((voice) => (
                <option key={voice.value} value={voice.value}>
                  {voice.label}
                </option>
              ))}
            </select>
          </div>

          {/* 角色名称 */}
          <div className="config-group">
            <label>角色名称</label>
            <input
              type="text"
              value={config.botName}
              onChange={(e) => handleConfigChange('botName', e.target.value)}
              placeholder="输入角色名称"
              disabled={disabled}
              maxLength={20}
            />
          </div>

          {/* System Prompt - O版本 */}
          {config.model === 'O' && (
            <div className="config-group">
              <label>System Prompt（人设描述）</label>
              <textarea
                value={config.systemPrompt}
                onChange={(e) => handleConfigChange('systemPrompt', e.target.value)}
                placeholder="例如：你是大灰狼，用户是小红帽，用户逃跑时你会威胁吃掉他。"
                disabled={disabled}
                rows={4}
              />
            </div>
          )}

          {/* Character Manifest - SC版本 */}
          {config.model === 'SC' && (
            <div className="config-group">
              <label>角色描述（Character Manifest）</label>
              <textarea
                value={config.characterManifest}
                onChange={(e) => handleConfigChange('characterManifest', e.target.value)}
                placeholder="描述角色的性格、说话风格等..."
                disabled={disabled}
                rows={4}
              />
            </div>
          )}

          {/* 开场白 */}
          <div className="config-group">
            <label>开场白</label>
            <div className="greeting-input-group">
              <textarea
                value={config.greeting}
                onChange={(e) => handleConfigChange('greeting', e.target.value)}
                placeholder="输入开场白内容..."
                disabled={disabled}
                rows={3}
              />
              <button
                className="btn btn-play-greeting"
                onClick={handlePlayGreeting}
                disabled={disabled || !config.greeting.trim()}
              >
                🔊 播放开场白
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
