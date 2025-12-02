import React, { useRef } from 'react';
import { Clip as ClipType, MediaType } from '../../types';
import { useEditor } from '../../context/EditorContext';
import { GripVertical } from 'lucide-react';

interface ClipProps {
    clip: ClipType;
    otherClips: ClipType[];
    isSnapping: boolean;
}

// 检测是否与其他片段重叠
const checkOverlap = (
  startTime: number, 
  duration: number, 
  otherClips: ClipType[], 
  excludeId?: string
): { overlaps: boolean; nearestValidStart: number } => {
  const endTime = startTime + duration;
  
  for (const other of otherClips) {
    if (excludeId && other.id === excludeId) continue;
    
    const otherEnd = other.startTime + other.duration;
    
    // 检查是否有重叠
    if (startTime < otherEnd && endTime > other.startTime) {
      // 有重叠，找到最近的有效位置
      // 尝试放在该片段之前或之后
      const beforePos = other.startTime - duration;
      const afterPos = otherEnd;
      
      // 选择离原位置最近的有效位置
      const distBefore = Math.abs(startTime - beforePos);
      const distAfter = Math.abs(startTime - afterPos);
      
      return {
        overlaps: true,
        nearestValidStart: distBefore <= distAfter ? Math.max(0, beforePos) : afterPos
      };
    }
  }
  
  return { overlaps: false, nearestValidStart: startTime };
};

const Clip: React.FC<ClipProps> = ({ clip, otherClips, isSnapping }) => {
  const { zoom, updateClip, selectClip, selectedClipId } = useEditor();
  const isSelected = selectedClipId === clip.id;
  const startDragX = useRef<number>(0);
  const initialStartTime = useRef<number>(0);
  const initialDuration = useRef<number>(0);

  // Dragging Logic
  const handleDragStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectClip(clip.id);
    startDragX.current = e.clientX;
    initialStartTime.current = clip.startTime;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaPixels = moveEvent.clientX - startDragX.current;
      const deltaTime = deltaPixels / zoom;
      let newStartTime = Math.max(0, initialStartTime.current + deltaTime);

      // Snap Logic during Drag
      if (isSnapping) {
          const SNAP_THRESHOLD = 15 / zoom;
          let closestDiff = Infinity;
          let snapTarget = newStartTime;

          // Snap to other clips
          otherClips.forEach(other => {
              const otherEnd = other.startTime + other.duration;
              const diffToEnd = Math.abs(otherEnd - newStartTime);
              const diffToStart = Math.abs(other.startTime - (newStartTime + clip.duration));

              // Snap start to other end
              if (diffToEnd < SNAP_THRESHOLD && diffToEnd < closestDiff) {
                  closestDiff = diffToEnd;
                  snapTarget = otherEnd;
              }

               // Snap end to other start
               if (diffToStart < SNAP_THRESHOLD && diffToStart < closestDiff) {
                  closestDiff = diffToStart;
                  snapTarget = other.startTime - clip.duration;
               }
          });

          // Snap to 0
          if (Math.abs(newStartTime) < SNAP_THRESHOLD) {
              snapTarget = 0;
              closestDiff = Math.abs(newStartTime);
          }

          if (closestDiff < Infinity) {
              newStartTime = snapTarget;
          }
      }

      // 检测是否与其他片段重叠
      const { overlaps, nearestValidStart } = checkOverlap(newStartTime, clip.duration, otherClips, clip.id);
      if (overlaps) {
        newStartTime = nearestValidStart;
      }

      updateClip(clip.id, { startTime: newStartTime });
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Resizing Logic
  const handleResizeStart = (e: React.MouseEvent, direction: 'left' | 'right') => {
    e.stopPropagation();
    startDragX.current = e.clientX;
    initialStartTime.current = clip.startTime;
    initialDuration.current = clip.duration;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaPixels = moveEvent.clientX - startDragX.current;
      const deltaTime = deltaPixels / zoom;

      if (direction === 'right') {
          let newDuration = Math.max(0.1, initialDuration.current + deltaTime);
          
          // 检测向右扩展时是否会与后面的片段重叠
          const endTime = clip.startTime + newDuration;
          for (const other of otherClips) {
            if (other.startTime > clip.startTime && endTime > other.startTime) {
              // 限制在后面片段的起始位置
              newDuration = other.startTime - clip.startTime;
              break;
            }
          }
          
          updateClip(clip.id, { duration: Math.max(0.1, newDuration) });
      } else {
          // Resizing from left affects start time and duration
          let newStartTime = Math.max(0, initialStartTime.current + deltaTime);
          let durationChange = initialStartTime.current - newStartTime;
          let newDuration = Math.max(0.1, initialDuration.current + durationChange);
          
          // 检测向左扩展时是否会与前面的片段重叠
          for (const other of otherClips) {
            const otherEnd = other.startTime + other.duration;
            if (otherEnd <= initialStartTime.current && newStartTime < otherEnd) {
              // 限制在前面片段的结束位置
              newStartTime = otherEnd;
              durationChange = initialStartTime.current - newStartTime;
              newDuration = Math.max(0.1, initialDuration.current + durationChange);
              break;
            }
          }
          
          if (newDuration > 0.1) {
             updateClip(clip.id, { startTime: newStartTime, duration: newDuration, offset: Math.max(0, clip.offset - (initialStartTime.current - newStartTime)) });
          }
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const getBackgroundColor = () => {
    switch(clip.type) {
        case MediaType.VIDEO: return 'bg-indigo-600 border-indigo-500';
        case MediaType.AUDIO: return 'bg-emerald-600 border-emerald-500';
        case MediaType.TEXT: return 'bg-amber-600 border-amber-500';
        case MediaType.IMAGE: return 'bg-purple-600 border-purple-500';
        default: return 'bg-slate-600 border-slate-500';
    }
  };

  return (
    <div
      className={`absolute top-1 bottom-1 rounded-md overflow-hidden shadow-sm cursor-move group select-none flex flex-col justify-center border
        ${getBackgroundColor()} 
        ${isSelected ? 'ring-2 ring-white z-10 brightness-110' : 'opacity-90 hover:opacity-100 hover:brightness-105'}
        transition-colors
      `}
      style={{
        left: clip.startTime * zoom,
        width: clip.duration * zoom,
        // Disable transition for drag performance
        transitionProperty: 'background-color, border-color, color, fill, stroke, opacity, box-shadow, transform',
        transitionDuration: '150ms'
      }}
      onMouseDown={handleDragStart}
    >
      {/* Clip Content */}
      <div className="px-2 flex items-center justify-between pointer-events-none h-full">
         <span className="text-[10px] font-medium text-white truncate drop-shadow-md">
            {clip.name}
         </span>
         {isSelected && <GripVertical className="w-3 h-3 text-white/50" />}
      </div>
      
      {/* Waveform/Thumbnail Simulation */}
      <div className="absolute bottom-1 left-2 right-2 opacity-30 h-1/2 overflow-hidden flex items-center pointer-events-none">
         {clip.type === MediaType.AUDIO && (
             <div className="w-full h-2 bg-black/20 rounded-full" />
         )}
         {clip.type === MediaType.VIDEO && (
             <div className="flex space-x-0.5 w-full">
                 {[...Array(10)].map((_, i) => <div key={i} className="flex-1 h-3 bg-black/20 rounded-[1px]" />)}
             </div>
         )}
      </div>

      {/* Resize Handles */}
      {isSelected && (
          <>
            <div 
                className="absolute left-0 top-0 bottom-0 w-3 cursor-w-resize bg-white/10 hover:bg-white/40 z-20 flex items-center justify-center transition-colors"
                onMouseDown={(e) => handleResizeStart(e, 'left')}
            >
                <div className="w-0.5 h-4 bg-white/50 rounded-full" />
            </div>
            <div 
                className="absolute right-0 top-0 bottom-0 w-3 cursor-e-resize bg-white/10 hover:bg-white/40 z-20 flex items-center justify-center transition-colors"
                onMouseDown={(e) => handleResizeStart(e, 'right')}
            >
                <div className="w-0.5 h-4 bg-white/50 rounded-full" />
            </div>
          </>
      )}

      {/* Transition Indicators */}
      {clip.transitionIn && clip.transitionIn !== 'none' && (
          <div className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-white/30 to-transparent pointer-events-none" style={{ width: 15 }} title={`In: ${clip.transitionIn}`} />
      )}
      {clip.transitionOut && clip.transitionOut !== 'none' && (
          <div className="absolute top-0 bottom-0 right-0 bg-gradient-to-l from-white/30 to-transparent pointer-events-none" style={{ width: 15 }} title={`Out: ${clip.transitionOut}`} />
      )}
    </div>
  );
};

export default Clip;