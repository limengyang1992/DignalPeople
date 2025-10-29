import { useEffect, useState } from 'react';
import './StaticAvatar.css';

interface StaticAvatarProps {
  imageUrl?: string;
  isPlaying?: boolean;
  isSpeaking?: boolean;
}

export const StaticAvatar: React.FC<StaticAvatarProps> = ({
  imageUrl = 'https://ui-avatars.com/api/?name=AI+Assistant&size=400&background=667eea&color=fff&font-size=0.4',
  isPlaying = false,
  isSpeaking = false
}) => {
  const [currentFrame, setCurrentFrame] = useState(0);

  // 说话时的呼吸动画
  useEffect(() => {
    if (isPlaying || isSpeaking) {
      const interval = setInterval(() => {
        setCurrentFrame((prev) => (prev + 1) % 3);
      }, 300);

      return () => clearInterval(interval);
    } else {
      setCurrentFrame(0);
    }
  }, [isPlaying, isSpeaking]);

  return (
    <div className="static-avatar-container">
      <div className={`avatar-wrapper ${isPlaying || isSpeaking ? 'speaking' : 'idle'}`}>
        <div className="avatar-glow"></div>
        <img
          src={imageUrl}
          alt="Digital Avatar"
          className="avatar-image"
        />
        {(isPlaying || isSpeaking) && (
          <div className="speaking-indicator">
            <div className="wave-bar" style={{ animationDelay: '0ms' }}></div>
            <div className="wave-bar" style={{ animationDelay: '100ms' }}></div>
            <div className="wave-bar" style={{ animationDelay: '200ms' }}></div>
            <div className="wave-bar" style={{ animationDelay: '300ms' }}></div>
            <div className="wave-bar" style={{ animationDelay: '400ms' }}></div>
          </div>
        )}
      </div>
    </div>
  );
};
