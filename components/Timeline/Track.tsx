import React, { useState } from 'react';
import { Track as TrackType, Clip as ClipType, Asset, MediaType } from '../../types';
import Clip from './Clip';
import { useEditor } from '../../context/EditorContext';
import { Video, Mic, Type, Eye, Volume2, Lock, Image as ImageIcon } from 'lucide-react';
import { TRACK_HEADER_WIDTH } from '../../constants';

interface TrackProps {
  track: TrackType;
  clips: ClipType[];
  isSnapping: boolean;
}

// 检查素材类型是否与轨道类型匹配
const isTypeCompatible = (assetType: MediaType, trackType: MediaType): boolean => {
  // 完全匹配
  if (assetType === trackType) return true;
  
  // IMAGE 可以放到 VIDEO 轨道（如果没有专门的 IMAGE 轨道）
  // 但我们现在有 IMAGE 轨道，所以严格匹配
  return false;
};

// 根据素材类型获取对应的轨道类型
const getTargetTrackType = (assetType: MediaType): MediaType => {
  return assetType;
};

// 检测新片段是否与现有片段重叠，并找到最近的有效位置
const findValidPosition = (
  startTime: number, 
  duration: number, 
  existingClips: ClipType[]
): number => {
  const endTime = startTime + duration;
  
  // 按开始时间排序
  const sortedClips = [...existingClips].sort((a, b) => a.startTime - b.startTime);
  
  for (const clip of sortedClips) {
    const clipEnd = clip.startTime + clip.duration;
    
    // 检查是否有重叠
    if (startTime < clipEnd && endTime > clip.startTime) {
      // 有重叠，放到这个片段之后
      const newStart = clipEnd;
      // 递归检查新位置是否也有重叠
      return findValidPosition(newStart, duration, existingClips);
    }
  }
  
  return Math.max(0, startTime);
};

const Track: React.FC<TrackProps> = ({ track, clips, isSnapping }) => {
  const { addClip, zoom, duration, tracks, clips: allClips } = useEditor();
  const [isDragOver, setIsDragOver] = useState(false);
  const [isInvalidDrop, setIsInvalidDrop] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    setIsInvalidDrop(false);
    
    const data = e.dataTransfer.getData('application/json');
    if (!data) return;

    try {
        const asset: Asset = JSON.parse(data);
        
        // 检查类型是否匹配
        if (!isTypeCompatible(asset.type, track.type)) {
            // 类型不匹配，找到正确的轨道
            const targetTrack = tracks.find(t => t.type === getTargetTrackType(asset.type));
            if (targetTrack) {
                // 获取目标轨道的 clips
                const targetTrackClips = allClips.filter(c => c.trackId === targetTrack.id);
                const assetDuration = asset.duration || 5;
                // 找到有效位置（不重叠）
                const validStartTime = findValidPosition(0, assetDuration, targetTrackClips);
                
                // 在正确的轨道上添加 clip
                const newClip: ClipType = {
                    id: `clip-${Date.now()}`,
                    assetId: asset.id,
                    trackId: targetTrack.id, // 使用正确的轨道
                    startTime: validStartTime, // 使用有效位置
                    duration: assetDuration,
                    offset: 0,
                    type: asset.type,
                    name: asset.name,
                    src: asset.src,
                    opacity: 1,
                    volume: 1,
                    scale: 1,
                    x: 50,
                    y: 50,
                };
                addClip(newClip);
                console.log(`素材类型 ${asset.type} 自动放置到 ${targetTrack.name} 轨道，开始时间: ${validStartTime}秒`);
            }
            return;
        }
        
        // Calculate drop time relative to track content start
        const trackContentRect = e.currentTarget.getBoundingClientRect();
        const dropX = e.clientX - trackContentRect.left;
        let startTime = Math.max(0, dropX / zoom);

        // Magnetic Snapping Logic
        if (isSnapping) {
            const SNAP_THRESHOLD = 15 / zoom; // 15 pixels threshold
            
            // Check snapping to existing clip ENDS
            let closestDiff = Infinity;
            let snapTime = startTime;

            clips.forEach(clip => {
                const clipEnd = clip.startTime + clip.duration;
                const diffToEnd = Math.abs(clipEnd - startTime);
                const diffToStart = Math.abs(clip.startTime - startTime);

                // Snap to end of a clip
                if (diffToEnd < SNAP_THRESHOLD && diffToEnd < closestDiff) {
                    closestDiff = diffToEnd;
                    snapTime = clipEnd;
                }
                
                // Snap to start of a clip (placing before)
                if (diffToStart < SNAP_THRESHOLD && diffToStart < closestDiff) {
                    closestDiff = diffToStart;
                    snapTime = clip.startTime - asset.duration;
                }
            });

            // Also snap to 0
            if (Math.abs(startTime - 0) < SNAP_THRESHOLD) {
                snapTime = 0;
            }

            if (closestDiff < Infinity || Math.abs(startTime - 0) < SNAP_THRESHOLD) {
                startTime = snapTime;
            }
        }

        // 检测是否与现有片段重叠，找到有效位置
        const assetDuration = asset.duration || 5;
        const validStartTime = findValidPosition(startTime, assetDuration, clips);

        const newClip: ClipType = {
            id: `clip-${Date.now()}`,
            assetId: asset.id,
            trackId: track.id,
            startTime: validStartTime,
            duration: assetDuration,
            offset: 0,
            type: asset.type,
            name: asset.name,
            src: asset.src,
            opacity: 1,
            volume: 1,
            scale: 1,
            x: 50,
            y: 50,
        };

        addClip(newClip);

    } catch (err) {
        console.error("Drop error", err);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    
    // 尝试获取拖拽的素材数据来检查类型
    const data = e.dataTransfer.getData('application/json');
    if (data) {
      try {
        const asset: Asset = JSON.parse(data);
        const compatible = isTypeCompatible(asset.type, track.type);
        setIsInvalidDrop(!compatible);
        e.dataTransfer.dropEffect = compatible ? 'copy' : 'move';
      } catch {
        e.dataTransfer.dropEffect = 'copy';
      }
    } else {
      e.dataTransfer.dropEffect = 'copy';
    }
    
    setIsDragOver(true);
  };
  
  const handleDragLeave = () => {
    setIsDragOver(false);
    setIsInvalidDrop(false);
  };

  const getIcon = () => {
    switch(track.type) {
        case 'VIDEO': return <Video className="w-3.5 h-3.5 text-blue-400" />;
        case 'IMAGE': return <ImageIcon className="w-3.5 h-3.5 text-purple-400" />;
        case 'AUDIO': return <Mic className="w-3.5 h-3.5 text-emerald-400" />;
        case 'TEXT': return <Type className="w-3.5 h-3.5 text-amber-400" />;
        default: return <Video className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="flex h-14 mb-1 group">
        {/* Track Header - Sticky Left */}
        <div 
            className={`flex-shrink-0 bg-slate-800 border-r border-slate-700 flex flex-col justify-between py-2 px-3 sticky left-0 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.3)] transition-colors
              ${isDragOver && !isInvalidDrop ? 'bg-indigo-900/30' : ''}
              ${isDragOver && isInvalidDrop ? 'bg-red-900/20' : ''}
            `}
            style={{ width: TRACK_HEADER_WIDTH }}
        >
            <div className="flex items-center space-x-2 text-slate-300">
                {getIcon()}
                <span className="text-xs font-semibold truncate select-none" title={track.name}>{track.name}</span>
            </div>
            <div className="flex items-center space-x-3 text-slate-500">
                <button className="hover:text-slate-300 transition-colors" title="Toggle Visibility">
                    <Eye className="w-3.5 h-3.5" />
                </button>
                <button className="hover:text-slate-300 transition-colors" title="Mute">
                    <Volume2 className="w-3.5 h-3.5" />
                </button>
                <button className="hover:text-slate-300 transition-colors" title="Lock Track">
                    <Lock className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>

        {/* Track Content - Scrollable area */}
        <div 
            className={`relative bg-slate-800/40 border-t border-b border-slate-700/50 flex-grow overflow-hidden transition-colors
              ${isDragOver && !isInvalidDrop ? 'bg-indigo-500/10 border-indigo-500/50' : ''}
              ${isDragOver && isInvalidDrop ? 'bg-red-500/10 border-red-500/30' : ''}
            `}
            style={{ width: duration * zoom }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
        >
            {/* Background Grid Pattern */}
            <div className="absolute inset-0 w-full h-full pointer-events-none opacity-5" 
                style={{ 
                    backgroundImage: 'linear-gradient(90deg, #ffffff 1px, transparent 1px)', 
                    backgroundSize: `${zoom}px 100%` 
                }} 
            />
            {/* Major Seconds Grid */}
             <div className="absolute inset-0 w-full h-full pointer-events-none opacity-5" 
                style={{ 
                    backgroundImage: 'linear-gradient(90deg, #ffffff 1px, transparent 1px)', 
                    backgroundSize: `${zoom * 5}px 100%` 
                }} 
            />

            {clips.map(clip => (
                <Clip 
                    key={clip.id} 
                    clip={clip} 
                    otherClips={clips.filter(c => c.id !== clip.id)}
                    isSnapping={isSnapping}
                />
            ))}
        </div>
    </div>
  );
};

export default Track;