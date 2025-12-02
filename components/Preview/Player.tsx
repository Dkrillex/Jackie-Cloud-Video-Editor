import React, { useEffect, useRef, useState } from 'react';
import { useEditor } from '../../context/EditorContext';
import { MediaType, Clip } from '../../types';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';

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

  // Identify active clips based on currentTime
  useEffect(() => {
    // Priority: Bottom-most video track is usually base, but we'll take the top-most visual layer that isn't TEXT
    // Actually standard NLE behavior: Higher track index = higher Z-index.
    // Let's assume t-video-2 is above t-video-1.
    
    // Find active visual clips (excluding text)
    const visualClips = clips.filter(c => 
      (c.type === MediaType.VIDEO || c.type === MediaType.IMAGE) &&
      currentTime >= c.startTime && 
      currentTime < c.startTime + c.duration
    );

    // Sort by track index (simple hack: string comparison or predefined order)
    // In our context: t-video-2 > t-video-1.
    const sortedVisuals = visualClips.sort((a, b) => a.trackId.localeCompare(b.trackId));
    const topVisual = sortedVisuals.length > 0 ? sortedVisuals[sortedVisuals.length - 1] : null;

    setActiveVideoClip(topVisual || null);

    // Find active audio
    const audios = clips.filter(c => 
      c.type === MediaType.AUDIO && 
      currentTime >= c.startTime && 
      currentTime < c.startTime + c.duration
    );
    // Just grab the first one for the prototype mixer
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
        // No active video
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

  // Text Overlay Dragging Logic
  const handleTextDragStart = (e: React.MouseEvent, clipId: string) => {
    e.preventDefault();
    e.stopPropagation();
    selectClip(clipId);
    
    const startX = e.clientX;
    const startY = e.clientY;
    const clip = clips.find(c => c.id === clipId);
    if (!clip) return;

    const initialX = clip.x || 50;
    const initialY = clip.y || 50;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      // 100% = container width/height
      // Simple sensitivity adjustment
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

  return (
    <div className="flex-1 flex flex-col bg-slate-950">
      {/* Viewport */}
      <div className="flex-1 flex items-center justify-center p-8 relative overflow-hidden">
        <div 
          id="preview-container"
          className="relative bg-black shadow-2xl overflow-hidden"
          style={{ aspectRatio: '16/9', height: '100%', maxHeight: '600px' }}
        >
          {/* Base Video Layer */}
          {activeVideoClip ? (
            activeVideoClip.type === MediaType.VIDEO ? (
              <video
                ref={videoRef}
                src={activeVideoClip.src}
                className="w-full h-full object-contain"
                muted // We assume audio track handles audio, or mix it carefully. Muting to prevent echo if track has audio separate.
                style={{ 
                    opacity: activeVideoClip.opacity ?? 1,
                    transition: 'opacity 0.2s'
                }}
              />
            ) : (
                <img 
                    src={activeVideoClip.src} 
                    alt="Current frame" 
                    className="w-full h-full object-cover"
                    style={{ 
                        opacity: activeVideoClip.opacity ?? 1,
                        transition: 'opacity 0.2s'
                    }}
                />
            )
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-700">
                <span className="text-xl font-mono">NO SIGNAL</span>
            </div>
          )}

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
                onMouseDown={(e) => handleTextDragStart(e, textClip.id)}
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-move select-none whitespace-nowrap
                    ${selectedClipId === textClip.id ? 'border-2 border-indigo-500 bg-indigo-500/10' : 'hover:border hover:border-white/50'}
                `}
                style={{
                  left: `${textClip.x}%`,
                  top: `${textClip.y}%`,
                  fontSize: `${(textClip.scale || 1) * 2}rem`,
                  color: 'white',
                  textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                  padding: '4px 8px',
                  borderRadius: '4px'
                }}
              >
                {textClip.name}
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