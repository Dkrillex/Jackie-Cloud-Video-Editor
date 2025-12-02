import React, { useEffect, useRef, useState } from 'react';
import { useEditor } from '../../context/EditorContext';
import { MediaType, Clip } from '../../types';
import { Play, Pause, SkipBack, SkipForward, Move, Maximize2 } from 'lucide-react';

const Player: React.FC = () => {
  const { 
    currentTime, 
    clips, 
    tracks, 
    isPlaying, 
    play, 
    pause, 
    seek, 
    duration,
    updateClip,
    selectClip,
    selectedClipId
  } = useEditor();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [activeVideoClip, setActiveVideoClip] = useState<Clip | null>(null);
  const [activeAudioClip, setActiveAudioClip] = useState<Clip | null>(null);
  const [activeImageClips, setActiveImageClips] = useState<Clip[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  // Identify active clips based on currentTime
  useEffect(() => {
    // Find active video clips (base layer)
    const videoClips = clips.filter(c => 
      c.type === MediaType.VIDEO &&
      currentTime >= c.startTime && 
      currentTime < c.startTime + c.duration
    );
    
    // Find active image clips (overlay layer)
    const imageClips = clips.filter(c => 
      c.type === MediaType.IMAGE &&
      currentTime >= c.startTime && 
      currentTime < c.startTime + c.duration
    );

    // Sort by track index
    const sortedVideos = videoClips.sort((a, b) => a.trackId.localeCompare(b.trackId));
    const topVideo = sortedVideos.length > 0 ? sortedVideos[sortedVideos.length - 1] : null;

    setActiveVideoClip(topVideo || null);
    setActiveImageClips(imageClips);

    // Find active audio
    const audios = clips.filter(c => 
      c.type === MediaType.AUDIO && 
      currentTime >= c.startTime && 
      currentTime < c.startTime + c.duration
    );
    setActiveAudioClip(audios[0] || null);

  }, [currentTime, clips]);

  // Sync Video Element
  useEffect(() => {
    if (videoRef.current && activeVideoClip && activeVideoClip.type === MediaType.VIDEO) {
      const offset = currentTime - activeVideoClip.startTime + activeVideoClip.offset;
      if (Math.abs(videoRef.current.currentTime - offset) > 0.3) {
        videoRef.current.currentTime = offset;
      }
      if (isPlaying && videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
      } else if (!isPlaying && !videoRef.current.paused) {
        videoRef.current.pause();
      }
      videoRef.current.volume = activeVideoClip.volume ?? 1;
    } else if (videoRef.current) {
        videoRef.current.pause();
    }
  }, [currentTime, isPlaying, activeVideoClip]);

   // Sync Audio Element
   useEffect(() => {
    if (audioRef.current && activeAudioClip) {
      const offset = currentTime - activeAudioClip.startTime + activeAudioClip.offset;
       if (Math.abs(audioRef.current.currentTime - offset) > 0.3) {
        audioRef.current.currentTime = offset;
      }
      if (isPlaying && audioRef.current.paused) {
        audioRef.current.play().catch(() => {});
      } else if (!isPlaying && !audioRef.current.paused) {
        audioRef.current.pause();
      }
      audioRef.current.volume = activeAudioClip.volume ?? 0.5;
    } else if (audioRef.current) {
        audioRef.current.pause();
    }
  }, [currentTime, isPlaying, activeAudioClip]);

  // 通用拖拽逻辑
  const handleDragStart = (e: React.MouseEvent, clipId: string) => {
    e.preventDefault();
    e.stopPropagation();
    selectClip(clipId);
    setIsDragging(true);
    
    const startX = e.clientX;
    const startY = e.clientY;
    const clip = clips.find(c => c.id === clipId);
    if (!clip) return;

    const initialX = clip.x ?? 50;
    const initialY = clip.y ?? 50;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const container = document.getElementById('preview-container');
      if(!container) return;
      
      const rect = container.getBoundingClientRect();
      const deltaXPct = ((moveEvent.clientX - startX) / rect.width) * 100;
      const deltaYPct = ((moveEvent.clientY - startY) / rect.height) * 100;

      updateClip(clipId, {
        x: Math.min(100, Math.max(0, initialX + deltaXPct)),
        y: Math.min(100, Math.max(0, initialY + deltaYPct))
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // 缩放拖拽逻辑
  const handleResizeStart = (e: React.MouseEvent, clipId: string, corner: string) => {
    e.preventDefault();
    e.stopPropagation();
    selectClip(clipId);
    setIsResizing(true);
    
    const startX = e.clientX;
    const startY = e.clientY;
    const clip = clips.find(c => c.id === clipId);
    if (!clip) return;

    const initialScale = clip.scale ?? 1;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const container = document.getElementById('preview-container');
      if(!container) return;
      
      const rect = container.getBoundingClientRect();
      
      // 根据角落位置计算缩放
      let deltaX = moveEvent.clientX - startX;
      let deltaY = moveEvent.clientY - startY;
      
      // 右下角：正向缩放
      // 左上角：反向缩放
      if (corner === 'top-left') {
        deltaX = -deltaX;
        deltaY = -deltaY;
      } else if (corner === 'top-right') {
        deltaY = -deltaY;
      } else if (corner === 'bottom-left') {
        deltaX = -deltaX;
      }
      
      // 使用对角线距离计算缩放比例
      const delta = (deltaX + deltaY) / 2;
      const scaleFactor = delta / (rect.width / 4);
      const newScale = Math.min(3, Math.max(0.1, initialScale + scaleFactor));

      updateClip(clipId, { scale: newScale });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const formatTime = (t: number) => {
    const m = Math.floor(t / 60).toString().padStart(2, '0');
    const s = Math.floor(t % 60).toString().padStart(2, '0');
    const ms = Math.floor((t % 1) * 10).toString();
    return `${m}:${s}.${ms}`;
  };

  // 渲染可交互的图片/视频层
  const renderInteractiveLayer = (clip: Clip, isImage: boolean = false) => {
    const isSelected = selectedClipId === clip.id;
    const scale = clip.scale ?? 1;
    const x = clip.x ?? 50;
    const y = clip.y ?? 50;
    
    return (
      <div
        key={clip.id}
        className={`absolute transform -translate-x-1/2 -translate-y-1/2 
          ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-black' : ''}
          ${!isDragging && !isResizing ? 'hover:ring-2 hover:ring-white/50' : ''}
        `}
        style={{
          left: `${x}%`,
          top: `${y}%`,
          width: isImage ? `${scale * 40}%` : '100%',
          height: isImage ? 'auto' : '100%',
          cursor: 'move',
          zIndex: isSelected ? 20 : 10,
        }}
        onMouseDown={(e) => handleDragStart(e, clip.id)}
        onClick={(e) => {
          e.stopPropagation();
          selectClip(clip.id);
        }}
      >
        {isImage ? (
          <img 
            src={clip.src} 
            alt={clip.name}
            className="w-full h-auto pointer-events-none select-none"
            style={{ 
              opacity: clip.opacity ?? 1,
              transition: 'opacity 0.2s'
            }}
            draggable={false}
          />
        ) : (
          <video
            ref={videoRef}
            src={clip.src}
            className="w-full h-full object-contain pointer-events-none"
            muted
            style={{ 
              opacity: clip.opacity ?? 1,
              transition: 'opacity 0.2s',
              transform: `scale(${scale})`,
            }}
          />
        )}
        
        {/* 选中时显示控制手柄 */}
        {isSelected && (
          <>
            {/* 移动指示器 */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-indigo-600 rounded-full p-2 opacity-80 pointer-events-none">
              <Move className="w-4 h-4 text-white" />
            </div>
            
            {/* 四角缩放手柄 */}
            {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((corner) => (
              <div
                key={corner}
                className={`absolute w-4 h-4 bg-indigo-500 border-2 border-white rounded-sm cursor-${
                  corner === 'top-left' || corner === 'bottom-right' ? 'nwse' : 'nesw'
                }-resize hover:bg-indigo-400 transition-colors`}
                style={{
                  top: corner.includes('top') ? '-8px' : 'auto',
                  bottom: corner.includes('bottom') ? '-8px' : 'auto',
                  left: corner.includes('left') ? '-8px' : 'auto',
                  right: corner.includes('right') ? '-8px' : 'auto',
                }}
                onMouseDown={(e) => handleResizeStart(e, clip.id, corner)}
              >
                <Maximize2 className="w-2 h-2 text-white m-0.5" style={{
                  transform: corner === 'top-left' ? 'rotate(180deg)' :
                             corner === 'top-right' ? 'rotate(-90deg)' :
                             corner === 'bottom-left' ? 'rotate(90deg)' : 'rotate(0deg)'
                }} />
              </div>
            ))}
            
            {/* 尺寸信息 */}
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
              {Math.round(scale * 100)}% | ({Math.round(x)}, {Math.round(y)})
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-950">
      {/* Viewport */}
      <div className="flex-1 flex items-center justify-center p-8 relative overflow-hidden">
        <div 
          id="preview-container"
          className="relative bg-black shadow-2xl overflow-hidden"
          style={{ aspectRatio: '16/9', height: '100%', maxHeight: '600px' }}
          onClick={() => selectClip(null)}
        >
          {/* Base Video Layer - 不可交互的底层视频 */}
          {activeVideoClip && activeVideoClip.type === MediaType.VIDEO && !activeImageClips.find(c => c.id === activeVideoClip.id) ? (
            <video
              ref={activeImageClips.length > 0 ? undefined : videoRef}
              src={activeVideoClip.src}
              className="w-full h-full object-contain"
              muted
              style={{ 
                opacity: activeVideoClip.opacity ?? 1,
                transition: 'opacity 0.2s'
              }}
            />
          ) : !activeImageClips.length ? (
            <div className="w-full h-full flex items-center justify-center text-slate-700">
                <span className="text-xl font-mono">NO SIGNAL</span>
            </div>
          ) : null}

          {/* Image Overlay Layers - 可交互的图片层 */}
          {activeImageClips.map(clip => renderInteractiveLayer(clip, true))}

          {/* Hidden Audio Player */}
          {activeAudioClip && (
              <audio ref={audioRef} src={activeAudioClip.src} />
          )}

          {/* Text Overlays */}
          {clips
            .filter(c => c.type === MediaType.TEXT && currentTime >= c.startTime && currentTime < c.startTime + c.duration)
            .map(textClip => (
              <div
                key={textClip.id}
                onMouseDown={(e) => handleDragStart(e, textClip.id)}
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-move select-none whitespace-nowrap
                    ${selectedClipId === textClip.id ? 'ring-2 ring-indigo-500 bg-indigo-500/10' : 'hover:ring-1 hover:ring-white/50'}
                `}
                style={{
                  left: `${textClip.x}%`,
                  top: `${textClip.y}%`,
                  fontSize: `${(textClip.scale || 1) * 2}rem`,
                  color: 'white',
                  textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  zIndex: 30,
                }}
              >
                {textClip.name}
                
                {/* 文字选中时的缩放手柄 */}
                {selectedClipId === textClip.id && (
                  <div
                    className="absolute -bottom-2 -right-2 w-4 h-4 bg-indigo-500 border-2 border-white rounded-sm cursor-se-resize hover:bg-indigo-400"
                    onMouseDown={(e) => handleResizeStart(e, textClip.id, 'bottom-right')}
                  >
                    <Maximize2 className="w-2 h-2 text-white m-0.5" />
                  </div>
                )}
              </div>
            ))
          }
        </div>
      </div>

      {/* Controls */}
      <div className="h-16 bg-slate-900 border-t border-slate-800 flex items-center justify-center px-4 space-x-6">
          <div className="text-slate-400 font-mono text-sm w-20 text-right">{formatTime(currentTime)}</div>
          
          <div className="flex items-center space-x-4">
            <button onClick={() => seek(0)} className="p-2 text-slate-400 hover:text-white transition-colors">
                <SkipBack className="w-5 h-5" />
            </button>
            <button 
                onClick={isPlaying ? pause : play}
                className="w-12 h-12 rounded-full bg-indigo-600 hover:bg-indigo-500 flex items-center justify-center text-white transition-all shadow-lg shadow-indigo-500/20"
            >
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
            </button>
            <button onClick={() => seek(duration)} className="p-2 text-slate-400 hover:text-white transition-colors">
                <SkipForward className="w-5 h-5" />
            </button>
          </div>

          <div className="text-slate-500 font-mono text-sm w-20 text-left">
              {formatTime(duration)}
          </div>
      </div>
    </div>
  );
};

export default Player;
