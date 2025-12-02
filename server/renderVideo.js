/**
 * FFCreatorLite 视频渲染模块
 * 基于 https://github.com/tnfe/FFCreatorLite
 * 
 * FFCreatorLite 是 FFCreator 的轻量版，不需要 WebGL 依赖
 * 适合在 macOS/Windows 开发环境使用
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import pkg from 'ffcreatorlite';
const { FFCreator, FFScene, FFImage, FFVideo, FFText, FFAudio } = pkg;

// 获取项目根目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

/**
 * 将 web 路径转换为文件系统绝对路径
 * /assets/video.mp4 -> /full/path/to/public/assets/video.mp4
 */
function resolveAssetPath(src) {
  if (!src) return null;
  
  // 如果已经是绝对路径，直接返回
  if (path.isAbsolute(src) && !src.startsWith('/assets')) {
    return src;
  }
  
  // 如果是网络 URL，直接返回
  if (src.startsWith('http://') || src.startsWith('https://')) {
    return src;
  }
  
  // 将 /assets/xxx 转换为 public/assets/xxx 的绝对路径
  if (src.startsWith('/assets/') || src.startsWith('/')) {
    const relativePath = src.startsWith('/') ? src.slice(1) : src;
    const absolutePath = path.join(PROJECT_ROOT, 'public', relativePath);
    
    // 检查文件是否存在
    if (fs.existsSync(absolutePath)) {
      console.log(`[路径转换] ${src} -> ${absolutePath}`);
      return absolutePath;
    } else {
      console.warn(`[警告] 文件不存在: ${absolutePath}`);
      return absolutePath; // 仍然返回，让 FFmpeg 报错
    }
  }
  
  return src;
}

/**
 * 获取分辨率配置
 */
function getResolution(resolution) {
  switch (resolution) {
    case '4k':
      return { width: 3840, height: 2160 };
    case '1080p':
      return { width: 1920, height: 1080 };
    case '720p':
    default:
      return { width: 1280, height: 720 };
  }
}

/**
 * 获取质量配置
 */
function getQualityConfig(quality) {
  switch (quality) {
    case 'high':
      return { crf: 18, preset: 'slow' };
    case 'medium':
      return { crf: 23, preset: 'medium' };
    case 'low':
    default:
      return { crf: 28, preset: 'fast' };
  }
}

/**
 * 将动画效果映射到 FFCreator 动画
 */
function mapTransition(transition) {
  const transitionMap = {
    'fade': 'fadeIn',
    'dissolve': 'fadeIn',
    'none': null
  };
  return transitionMap[transition] || null;
}

/**
 * 渲染视频主函数
 */
export async function renderVideo({
  taskId,
  settings,
  timeline,
  outputDir,
  cacheDir,
  onProgress,
  onComplete,
  onError
}) {
  try {
    const { resolution, format, fps, quality } = settings;
    const { width, height } = getResolution(resolution);
    const qualityConfig = getQualityConfig(quality);
    
    const outputFileName = `video_${taskId}.${format}`;
    const outputPath = path.join(outputDir, outputFileName);

    onProgress(5, '正在创建 FFCreator 实例...');

    // 创建 FFCreatorLite 实例
    console.log(`[${taskId}] 创建 FFCreator 实例...`);
    console.log(`[${taskId}] 输出路径: ${outputPath}`);
    console.log(`[${taskId}] 分辨率: ${width}x${height}, FPS: ${fps}`);
    
    const creator = new FFCreator({
      cacheDir,
      outputDir,
      output: outputPath,
      width,
      height,
      fps,
      debug: true, // 开启调试模式
      defaultOutputOptions: null,
    });

    onProgress(10, '正在解析时间线...');

    // 收集所有片段
    const allClips = [];
    const audioClips = [];

    if (timeline.tracks && Array.isArray(timeline.tracks)) {
      for (const track of timeline.tracks) {
        if (!track.clips || !Array.isArray(track.clips)) continue;

        for (const clip of track.clips) {
          const clipType = clip.type || track.type;
          const startTime = clip.start_time || 0;
          const duration = clip.duration || 5;
          const endTime = startTime + duration;

          if (clipType === 'AUDIO') {
            audioClips.push(clip);
          } else {
            allClips.push({
              ...clip,
              clipType,
              startTime,
              duration,
              endTime,
            });
          }
        }
      }
    }

    // 计算所有时间点并去重排序
    const timePoints = new Set([0]);
    allClips.forEach(clip => {
      timePoints.add(clip.startTime);
      timePoints.add(clip.endTime);
    });
    const sortedTimePoints = [...timePoints].sort((a, b) => a - b);

    console.log(`[${taskId}] 时间点: ${sortedTimePoints.join(', ')}`);
    console.log(`[${taskId}] 片段数量: 视频/图片/文字 ${allClips.length} 个, 音频 ${audioClips.length} 个`);

    onProgress(15, '正在创建场景...');

    // 为每个时间段创建场景
    for (let i = 0; i < sortedTimePoints.length - 1; i++) {
      const segmentStart = sortedTimePoints[i];
      const segmentEnd = sortedTimePoints[i + 1];
      const segmentDuration = segmentEnd - segmentStart;

      if (segmentDuration <= 0) continue;

      console.log(`\n[场景 ${i + 1}] ${segmentStart}s - ${segmentEnd}s (${segmentDuration}s)`);

      const scene = new FFScene();
      scene.setBgColor('#000000');
      scene.setDuration(segmentDuration);

      // 找出在这个时间段内应该显示的所有片段
      const activeClips = allClips.filter(clip => 
        clip.startTime < segmentEnd && clip.endTime > segmentStart
      );

      // 按类型分组并按层级排序：VIDEO -> IMAGE -> TEXT
      const videos = activeClips.filter(c => c.clipType === 'VIDEO');
      const images = activeClips.filter(c => c.clipType === 'IMAGE');
      const texts = activeClips.filter(c => c.clipType === 'TEXT');

      // 添加视频
      for (const clip of videos) {
        const absolutePath = resolveAssetPath(clip.asset_src);
        if (!absolutePath) continue;

        // 计算视频在素材中的偏移位置
        const assetOffset = (clip.asset_offset || 0) + (segmentStart - clip.startTime);
        
        console.log(`   [VIDEO] ${clip.name}: ss=${assetOffset.toFixed(2)}s`);

        const video = new FFVideo({
          path: absolutePath,
          x: width / 2,
          y: height / 2,
          width: width,
          height: height,
          ss: assetOffset, // 从素材的这个时间点开始
        });
        video.setDuration(segmentDuration);
        scene.addChild(video);
      }

      // 添加图片
      for (const clip of images) {
        const absolutePath = resolveAssetPath(clip.asset_src);
        if (!absolutePath) continue;

        const scale = clip.filters?.transform?.scale || 1;
        const transformX = clip.filters?.transform?.x ?? 50;
        const transformY = clip.filters?.transform?.y ?? 50;
        const x = Math.round((transformX / 100) * width);
        const y = Math.round((transformY / 100) * height);

        console.log(`   [IMAGE] ${clip.name}: pos(${x}, ${y})`);

        const image = new FFImage({
          path: absolutePath,
          x,
          y,
          scale,
        });
        if (scale === 1) {
          image.setWH(width, height);
          image.setXY(0, 0);
        }
        image.setDuration(segmentDuration);
        scene.addChild(image);
      }

      // 添加字幕
      for (const clip of texts) {
        const textContent = clip.name || clip.asset_src || 'Text';
        const transformX = clip.filters?.transform?.x ?? 50;
        const transformY = clip.filters?.transform?.y ?? 80;
        const x = Math.round((transformX / 100) * width);
        const y = Math.round((transformY / 100) * height);
        
        // 获取字幕样式
        const subtitleStyle = clip.subtitle_style || {};
        const fontColor = subtitleStyle.fontColor || '#ffffff';
        const strokeColor = subtitleStyle.strokeColor || '#000000';
        const strokeWidth = subtitleStyle.strokeWidth || 3;
        const fontSize = subtitleStyle.fontSize || 48;
        const fontWeight = subtitleStyle.fontWeight || 'normal';

        console.log(`   [SUBTITLE] "${textContent}": pos(${x}, ${y}), color=${fontColor}, size=${fontSize}`);

        const text = new FFText({
          text: textContent,
          x,
          y,
          fontSize,
          color: fontColor,
        });

        try {
          text.setStyle({
            fill: fontColor,
            fontSize,
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontWeight: fontWeight === 'bold' ? 'bold' : 'normal',
            stroke: strokeColor,
            strokeThickness: strokeWidth,
          });
        } catch (e) {}

        scene.addChild(text);
      }

      creator.addChild(scene);
    }

    onProgress(25, '正在添加背景音乐...');

    // 添加背景音乐
    for (const audioClip of audioClips) {
      if (audioClip.asset_src) {
        const absolutePath = resolveAssetPath(audioClip.asset_src);
        const isNetworkUrl = absolutePath?.startsWith('http://') || absolutePath?.startsWith('https://');
        
        if (absolutePath && !isNetworkUrl) {
          console.log(`[BGM] ${audioClip.name}: ${absolutePath}`);
          try {
            creator.addAudio(absolutePath);
          } catch (e) {
            console.warn('添加背景音乐失败:', e.message);
          }
        }
      }
    }

    // 检查是否有网络素材警告
    const networkWarning = getNetworkWarnings();
    if (networkWarning) {
      console.warn(`\n${'!'.repeat(50)}`);
      console.warn(`[${taskId}] ⚠️ ${networkWarning}`);
      console.warn(`[${taskId}] 网络素材列表:`);
      networkUrlWarnings.forEach((w, i) => console.warn(`   ${i + 1}. ${w}`));
      console.warn(`${'!'.repeat(50)}\n`);
      onProgress(30, `警告: ${networkWarning}`);
    } else {
      onProgress(30, '正在启动渲染引擎...');
    }

    // 清空警告列表
    networkUrlWarnings.length = 0;

    // 渲染开始时间
    const renderStartTime = Date.now();
    let lastProgressTime = renderStartTime;
    let lastPercent = 0;

    // 监听事件
    creator.on('start', () => {
      console.log(`[${taskId}] FFCreator 开始渲染`);
      onProgress(35, '渲染引擎已启动，正在处理视频帧...');
    });

    creator.on('progress', (e) => {
      const now = Date.now();
      const elapsed = ((now - renderStartTime) / 1000).toFixed(1);
      const percent = Math.floor(e.percent * 100);
      
      // 计算渲染速度
      const percentDiff = percent - lastPercent;
      const timeDiff = (now - lastProgressTime) / 1000;
      const speed = timeDiff > 0 ? (percentDiff / timeDiff).toFixed(1) : 0;
      
      lastPercent = percent;
      lastProgressTime = now;
      
      // 进度从 35% 到 95%
      const renderProgress = 35 + Math.floor(e.percent * 60);
      const message = `正在渲染: ${percent}% (已用 ${elapsed}秒, 速度 ${speed}%/s)`;
      
      onProgress(renderProgress, message);
      
      // 每 10% 输出一次日志
      if (percent % 10 === 0) {
        console.log(`[${taskId}] 渲染进度: ${percent}% (${elapsed}秒)`);
      }
    });

    creator.on('complete', (e) => {
      const totalTime = ((Date.now() - renderStartTime) / 1000).toFixed(1);
      console.log(`[${taskId}] FFCreator 渲染完成! 总耗时: ${totalTime}秒`);
      console.log(`[${taskId}] 输出文件:`, e.output);
      onProgress(100, `渲染完成! 耗时 ${totalTime}秒`);
      onComplete(e.output);
    });

    creator.on('error', (e) => {
      const errorMsg = e.error || e.message || JSON.stringify(e) || '未知渲染错误';
      console.error(`[${taskId}] FFCreator 渲染错误:`, errorMsg);
      console.error(`[${taskId}] 错误详情:`, e);
      onError(new Error(`渲染失败: ${errorMsg}`));
    });

    // 开始渲染
    console.log(`[${taskId}] 调用 creator.start()...`);
    creator.start();
    console.log(`[${taskId}] creator.start() 已调用，等待渲染完成...`);

  } catch (error) {
    console.error(`[${taskId}] 渲染失败:`, error);
    onError(error);
  }
}

// 记录网络 URL 警告
const networkUrlWarnings = [];

/**
 * 检查素材路径是否有效
 */
function checkAssetPath(src, clipName) {
  if (!src) {
    console.warn(`[警告] ${clipName}: 没有素材路径`);
    return { valid: false, isNetwork: false };
  }
  
  const isNetwork = src.startsWith('http://') || src.startsWith('https://');
  
  if (isNetwork) {
    const warning = `${clipName}: 使用网络 URL - ${src}`;
    networkUrlWarnings.push(warning);
    console.warn(`[⚠️ 网络素材] ${clipName}`);
    console.warn(`   URL: ${src}`);
    console.warn(`   提示: FFCreatorLite 对网络视频支持有限，可能导致渲染卡住或失败`);
    console.warn(`   建议: 使用本地文件或添加"本地测试视频/图片"素材`);
  }
  
  return { valid: true, isNetwork };
}

/**
 * 获取网络 URL 警告摘要
 */
function getNetworkWarnings() {
  if (networkUrlWarnings.length === 0) return null;
  return `发现 ${networkUrlWarnings.length} 个网络素材，可能导致渲染失败`;
}

/**
 * 将片段添加到场景
 */
async function addClipToScene(scene, clip, trackType, canvasSize) {
  const { width: canvasWidth, height: canvasHeight } = canvasSize;
  
  // 获取变换参数
  const transformX = clip.filters?.transform?.x ?? 50; // 百分比，50 = 居中
  const transformY = clip.filters?.transform?.y ?? 50;
  const scale = clip.filters?.transform?.scale || 1;
  const opacity = clip.filters?.opacity || 1;

  switch (trackType) {
    case 'VIDEO': {
      if (clip.asset_src) {
        // 转换路径为绝对路径
        const absolutePath = resolveAssetPath(clip.asset_src);
        
        // 检查素材路径
        const pathCheck = checkAssetPath(absolutePath, clip.name);
        if (!pathCheck.valid) break;
        
        // 视频默认全屏显示，位置在左上角 (0, 0)
        // 如果需要偏移，根据百分比计算
        const videoWidth = canvasWidth * scale;
        const videoHeight = canvasHeight * scale;
        
        // 计算位置：将百分比转换为实际偏移
        // 50% = 居中，0% = 左/上对齐，100% = 右/下对齐
        const x = (transformX / 100) * canvasWidth - videoWidth / 2;
        const y = (transformY / 100) * canvasHeight - videoHeight / 2;
        
        const videoConfig = {
          path: absolutePath, // 使用绝对路径
          x: Math.round(x),
          y: Math.round(y),
          width: Math.round(videoWidth),
          height: Math.round(videoHeight),
        };
        
        // 如果有视频偏移量（裁剪起始点），使用 ss 参数
        if (clip.asset_offset && clip.asset_offset > 0) {
          videoConfig.ss = clip.asset_offset;
        }
        
        console.log(`[VIDEO] ${clip.name}: pos(${videoConfig.x}, ${videoConfig.y}), size(${videoConfig.width}x${videoConfig.height})`);
        
        const video = new FFVideo(videoConfig);
        
        // 设置片段在时间线上的延迟开始时间
        if (clip.start_time > 0) {
          video.setDelay(clip.start_time);
        }
        
        // 设置片段持续时间
        if (clip.duration) {
          video.setDuration(clip.duration);
        }
        
        // 添加转场动画
        const transIn = mapTransition(clip.transitions?.in);
        if (transIn) {
          video.addEffect(transIn, 0.5, 0);
        }
        
        const transOut = mapTransition(clip.transitions?.out);
        if (transOut && clip.duration > 0.5) {
          video.addEffect('fadeOut', 0.5, clip.duration - 0.5);
        }
        
        scene.addChild(video);
      }
      break;
    }

    case 'IMAGE': {
      if (clip.asset_src) {
        // 转换路径为绝对路径
        const absolutePath = resolveAssetPath(clip.asset_src);
        
        // 计算图片位置（居中对齐）
        const x = Math.round((transformX / 100) * canvasWidth);
        const y = Math.round((transformY / 100) * canvasHeight);
        
        const startTime = clip.start_time || 0;
        const duration = clip.duration || 5;
        
        console.log(`[IMAGE] ${clip.name}:`);
        console.log(`   位置: (${x}, ${y}), 缩放: ${scale}`);
        console.log(`   时间: 开始=${startTime}秒, 持续=${duration}秒, 结束=${startTime + duration}秒`);
        console.log(`   路径: ${absolutePath}`);
        
        // 在构造函数中也传入时间参数，双重保障
        const image = new FFImage({
          path: absolutePath,
          x,
          y,
          scale,
          startTime: startTime, // 构造函数中设置
          duration: duration,   // 构造函数中设置
        });
        
        // 设置图片尺寸（可选，让图片适应画布）
        if (scale === 1) {
          image.setWH(canvasWidth, canvasHeight);
          image.setXY(0, 0);
        }
        
        // 明确调用方法设置时间，确保生效
        image.setAppearTime(startTime);
        image.setDuration(duration);
        
        console.log(`   ✓ 设置后: appearTime=${image.appearTime}, duration=${image.duration}`);
        
        // 添加转场动画
        const transIn = mapTransition(clip.transitions?.in);
        if (transIn) {
          try {
            image.addEffect(transIn, 0.5, 0);
          } catch (e) {
            console.warn('添加图片动画失败:', e.message);
          }
        }
        
        const transOut = mapTransition(clip.transitions?.out);
        if (transOut && clip.duration > 0.5) {
          try {
            image.addEffect('fadeOut', 0.5, clip.duration - 0.5);
          } catch (e) {
            console.warn('添加图片淡出动画失败:', e.message);
          }
        }
        
        scene.addChild(image);
      }
      break;
    }

    case 'TEXT': {
      // 对于文字类型，clip.asset_src 可能是文字内容
      const textContent = clip.name || clip.asset_src || 'Text';
      const startTime = clip.start_time || 0;
      const duration = clip.duration || 5;
      const endTime = startTime + duration;
      
      // 文字位置 - 底部居中适合字幕
      const fontSize = Math.round(48 * scale);
      const x = Math.round((transformX / 100) * canvasWidth);
      const y = Math.round((transformY / 100) * canvasHeight);
      
      console.log(`[SUBTITLE] "${textContent}":`);
      console.log(`   位置: (${x}, ${y}), 字号: ${fontSize}`);
      console.log(`   时间: 开始=${startTime}秒, 持续=${duration}秒, 结束=${endTime}秒`);
      
      const text = new FFText({
        text: textContent,
        x,
        y,
        fontSize,
        color: '#ffffff',
      });
      
      // 设置字幕样式
      try {
        text.setStyle({
          fill: '#ffffff',
          fontSize,
          fontFamily: 'Arial, Helvetica, sans-serif',
          stroke: '#000000',
          strokeThickness: 3,
          dropShadow: true,
          dropShadowColor: '#000000',
          dropShadowBlur: 4,
          dropShadowDistance: 2,
        });
      } catch (e) {
        console.warn('设置字幕样式失败:', e.message);
      }
      
      // 设置出现时间和持续时间
      text.setAppearTime(startTime);
      text.setDuration(duration);
      
      // 添加淡入淡出效果
      const fadeTime = 0.3;
      try {
        // fadeIn: 在 startTime 时淡入
        text.addEffect('fadeIn', fadeTime, startTime);
        // fadeOut: 在 endTime 前淡出
        text.addEffect('fadeOut', fadeTime, Math.max(0, endTime - fadeTime));
        console.log(`   ✓ 时间: appearTime=${text.appearTime}, duration=${text.duration}`);
        console.log(`   ✓ 效果: fadeIn@${startTime}s, fadeOut@${(endTime - fadeTime).toFixed(1)}s`);
      } catch (e) {
        console.warn(`   效果设置失败: ${e.message}`);
      }
      
      scene.addChild(text);
      break;
    }

    case 'AUDIO': {
      // 音频已在外部单独处理（添加到 creator 作为背景音乐）
      // FFCreatorLite 的 scene.addAudio() 不接受参数，音频通过 creator.addAudio() 添加
      console.log(`[AUDIO] ${clip.name}: 音频将通过 creator.addAudio() 添加`);
      break;
    }

    default:
      console.warn(`未知的轨道类型: ${trackType}`);
  }
}

