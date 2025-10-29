import { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
// @ts-ignore - pixi-live2d-display 类型定义不完整
import { Live2DModel } from 'pixi-live2d-display';

// 注册 Live2D
// @ts-ignore
window.PIXI = PIXI;

interface Live2DAvatarProps {
  modelUrl?: string;
  width?: number;
  height?: number;
  isPlaying?: boolean;
}

export const Live2DAvatar: React.FC<Live2DAvatarProps> = ({
  modelUrl = 'https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/shizuku/shizuku.model.json',
  width = 800,
  height = 600,
  isPlaying = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const modelRef = useRef<any>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // 创建 PIXI 应用
    const app = new PIXI.Application({
      view: canvasRef.current,
      width: width,
      height: height,
      backgroundColor: 0x1a1a1a,
      backgroundAlpha: 0,
      antialias: true,
    });

    appRef.current = app;

    // 加载 Live2D 模型
    loadModel(app, modelUrl);

    return () => {
      if (modelRef.current) {
        modelRef.current.destroy();
      }
      app.destroy(true, { children: true });
    };
  }, [modelUrl, width, height]);

  // 根据播放状态更新动画
  useEffect(() => {
    if (!modelRef.current) return;

    if (isPlaying) {
      // 播放说话动画
      startTalkingAnimation();
    } else {
      // 恢复待机动画
      stopTalkingAnimation();
    }
  }, [isPlaying]);

  /**
   * 加载 Live2D 模型
   */
  const loadModel = async (app: PIXI.Application, url: string) => {
    try {
      const model = await Live2DModel.from(url);

      modelRef.current = model;

      // 设置模型大小和位置
      const scale = Math.min(
        app.screen.width / model.width,
        app.screen.height / model.height
      ) * 0.8;

      model.scale.set(scale);
      model.x = app.screen.width / 2;
      model.y = app.screen.height / 2;
      model.anchor.set(0.5, 0.5);

      // 添加到舞台
      app.stage.addChild(model as any);

      // 启用鼠标跟踪
      model.on('hit', (hitAreas: string[]) => {
        if (hitAreas.includes('body')) {
          model.motion('tap_body');
        }
      });

      console.log('Live2D model loaded successfully');
    } catch (error) {
      console.error('Failed to load Live2D model:', error);
    }
  };

  /**
   * 开始说话动画
   */
  const startTalkingAnimation = () => {
    if (!modelRef.current) return;

    const model = modelRef.current;

    // 播放说话动作
    if (model.internalModel?.motionManager) {
      // @ts-ignore
      model.motion('talk', 0, PIXI.Live2DModel?.PRIORITY_FORCE || 3);
    }

    // 控制嘴巴动画
    if (model.internalModel?.coreModel) {
      const mouthParams = [
        'ParamMouthOpenY',
        'PARAM_MOUTH_OPEN_Y',
        'Mouth_Open_Y'
      ];

      // 随机嘴型动画
      const interval = setInterval(() => {
        if (!modelRef.current) {
          clearInterval(interval);
          return;
        }

        const value = Math.random() * 0.8 + 0.2; // 0.2 - 1.0

        mouthParams.forEach(param => {
          try {
            // @ts-ignore
            model.internalModel.coreModel.setParameterValueById(param, value);
          } catch (e) {
            // 参数不存在
          }
        });
      }, 100);

      (model as any)._talkInterval = interval;
    }
  };

  /**
   * 停止说话动画
   */
  const stopTalkingAnimation = () => {
    if (!modelRef.current) return;

    const model = modelRef.current;

    // 清除嘴型动画
    if ((model as any)._talkInterval) {
      clearInterval((model as any)._talkInterval);
      (model as any)._talkInterval = null;
    }

    // 重置嘴巴参数
    if (model.internalModel?.coreModel) {
      const mouthParams = [
        'ParamMouthOpenY',
        'PARAM_MOUTH_OPEN_Y',
        'Mouth_Open_Y'
      ];

      mouthParams.forEach(param => {
        try {
          // @ts-ignore
          model.internalModel.coreModel.setParameterValueById(param, 0);
        } catch (e) {
          // 参数不存在
        }
      });
    }

    // 播放待机动画
    if (model.internalModel?.motionManager) {
      // @ts-ignore
      model.motion('idle', 0, PIXI.Live2DModel?.PRIORITY_IDLE || 1);
    }
  };

  return (
    <div className="live2d-container">
      <canvas ref={canvasRef} />
    </div>
  );
};
