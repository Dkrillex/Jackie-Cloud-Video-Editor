import React, { useRef, useState } from 'react';
import { useEditor } from '../../context/EditorContext';
import Track from './Track';
import { TRACK_HEADER_WIDTH } from '../../constants';
import { Magnet, ZoomIn, ZoomOut } from 'lucide-react';

const Timeline: React.FC = () => {
  const { 
    tracks, 
    clips, 
    zoom, 
    setZoom, 
    currentTime, 
    seek, 
    duration
  } = useEditor();

  const containerRef = useRef<HTMLDivElement>(null);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const [isSnapping, setIsSnapping] = useState(true);

  const handleTimelineMouseDown = (e: React.MouseEvent) => {
    // Only seek if clicking the ruler or empty space in the ruler track
    setIsDraggingPlayhead(true);
    updatePlayhead(e);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDraggingPlayhead) {
        updatePlayhead(e);
    }
  };

  const handleMouseUp = () => {
    setIsDraggingPlayhead(false);
  };

  const updatePlayhead = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const scrollLeft = containerRef.current.scrollLeft;
    
    // Calculate x relative to the start of the content (excluding header)
    // The visual content starts at TRACK_HEADER_WIDTH inside the scrolling container
    // But since the header is sticky, it's always at the left of the viewport.
    // However, we are clicking on the RULER area which is to the right of the header.
    
    // Simplification: We need the offset from the container's left edge + scrollLeft - header width.
    // Actually, let's use the mouse position relative to the ruler element if possible, 
    // but here we are using the container.
    
    // Easiest way: The "Ruler Area" starts at TRACK_HEADER_WIDTH from the start of the scrollable content.
    // The container scrolls.
    // Mouse clientX - rect.left is position within viewport of container.
    // Add scrollLeft to get position within total scrollable width.
    // Subtract TRACK_HEADER_WIDTH to get position relative to 0s.
    
    const x = e.clientX - rect.left + scrollLeft - TRACK_HEADER_WIDTH;
    const time = Math.max(0, x / zoom);
    seek(time);
  };

  // Adaptive ruler ticks
  const renderRuler = () => {
    const ticks = [];
    const totalSeconds = duration;
    // Determine step based on zoom to avoid clutter
    let step = 1;
    if (zoom < 10) step = 10;
    else if (zoom < 30) step = 5;
    else step = 1;

    for (let i = 0; i <= totalSeconds; i += step) {
        ticks.push(
            <div 
                key={i} 
                className="absolute bottom-0 select-none group pointer-events-none" 
                style={{ left: i * zoom }}
            >
                {/* Major Tick */}
                <div className="h-3 border-l border-slate-500/50"></div>
                {/* Label */}
                <div className="absolute top-0 text-[10px] text-slate-500 font-medium -translate-x-1/2 -mt-1">
                    {i}s
                </div>
            </div>
        );
        
        // Minor ticks
        if (zoom > 20) {
             const subStep = step / 5;
             for (let j = 1; j < 5; j++) {
                 if (i + j * subStep > totalSeconds) break;
                 ticks.push(
                     <div 
                        key={`${i}-${j}`} 
                        className="absolute bottom-0 h-1.5 border-l border-slate-700" 
                        style={{ left: (i + j * subStep) * zoom }} 
                     />
                 );
             }
        }
    }
    return ticks;
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 select-none border-t border-slate-800">
      {/* Timeline Toolbar */}
      <div className="h-9 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-3">
        <div className="flex items-center space-x-4">
            <span className="text-xs text-slate-400 font-bold tracking-wider">TIMELINE</span>
            <div className="h-4 w-px bg-slate-700"></div>
            <button 
                onClick={() => setIsSnapping(!isSnapping)}
                className={`flex items-center space-x-1 px-2 py-0.5 rounded text-xs transition-colors ${isSnapping ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-500 hover:text-slate-300'}`}
                title="Toggle Snap (Magnet)"
            >
                <Magnet className="w-3.5 h-3.5" />
                <span>Snap</span>
            </button>
        </div>
        
        <div className="flex items-center space-x-2">
            <button 
                onClick={() => setZoom(Math.max(5, zoom - 5))} 
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded"
            >
                <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <input 
                type="range" 
                min="5" 
                max="100" 
                value={zoom} 
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-24 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
            />
            <button 
                onClick={() => setZoom(Math.min(100, zoom + 5))} 
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded"
            >
                <ZoomIn className="w-3.5 h-3.5" />
            </button>
        </div>
      </div>

      {/* Main Scroll Area */}
      <div 
        className="flex-1 overflow-auto relative custom-scrollbar bg-slate-900/50" 
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
         {/* Container Content - Min width ensures we can scroll far enough */}
         <div 
            style={{ 
                width: Math.max(containerRef.current?.clientWidth || 0, (duration * zoom) + TRACK_HEADER_WIDTH + 200), 
                minHeight: '100%' 
            }} 
            className="relative flex flex-col"
         >
            {/* Playhead Overlay - Absolutely positioned relative to content */}
            <div 
                className="absolute top-0 bottom-0 z-50 pointer-events-none flex flex-col items-center"
                style={{ left: (currentTime * zoom) + TRACK_HEADER_WIDTH }}
            >
                {/* Playhead Handle (in ruler area) */}
                <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-red-500 transform translate-y-[22px]" />
                {/* Playhead Line */}
                <div className="w-px bg-red-500 h-full shadow-[0_0_4px_rgba(239,68,68,0.4)] mt-[22px]"></div>
            </div>

            {/* Sticky Ruler Header Row */}
            <div className="h-8 sticky top-0 z-30 flex bg-slate-900 border-b border-slate-700 shadow-sm">
                {/* Fixed Track Header Placeholder */}
                <div 
                    className="flex-shrink-0 bg-slate-900 border-r border-slate-700 sticky left-0 z-40"
                    style={{ width: TRACK_HEADER_WIDTH }}
                ></div>
                
                {/* Scrollable Ruler Ticks */}
                <div 
                    className="flex-1 relative cursor-pointer hover:bg-white/5 transition-colors"
                    onMouseDown={handleTimelineMouseDown}
                >
                    {renderRuler()}
                </div>
            </div>

            {/* Tracks */}
            <div className="relative py-2">
                {tracks.map(track => (
                    <Track 
                        key={track.id} 
                        track={track} 
                        clips={clips.filter(c => c.trackId === track.id)} 
                        isSnapping={isSnapping}
                    />
                ))}
            </div>
         </div>
      </div>
    </div>
  );
};

export default Timeline;