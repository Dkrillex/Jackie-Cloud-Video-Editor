import React from 'react';
import { Track as TrackType, Clip as ClipType, Asset } from '../../types';
import Clip from './Clip';
import { useEditor } from '../../context/EditorContext';
import { Video, Mic, Type, Eye, Volume2, Lock } from 'lucide-react';
import { TRACK_HEADER_WIDTH } from '../../constants';

interface TrackProps {
  track: TrackType;
  clips: ClipType[];
  isSnapping: boolean;
}

const Track: React.FC<TrackProps> = ({ track, clips, isSnapping }) => {
  const { addClip, zoom, duration } = useEditor();

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('application/json');
    if (!data) return;

    try {
        const asset: Asset = JSON.parse(data);
        
        // Calculate drop time relative to track content start
        // e.nativeEvent.offsetX gives coordinate within the event target.
        // We must be careful if the drop target is the Track background or a Clip.
        // Best to use clientX and calculate based on container.
        
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

        const newClip: ClipType = {
            id: `clip-${Date.now()}`,
            assetId: asset.id,
            trackId: track.id,
            startTime: Math.max(0, startTime),
            duration: asset.duration || 5,
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
    e.dataTransfer.dropEffect = 'copy';
  };

  const getIcon = () => {
    switch(track.type) {
        case 'VIDEO': return <Video className="w-3.5 h-3.5 text-blue-400" />;
        case 'AUDIO': return <Mic className="w-3.5 h-3.5 text-emerald-400" />;
        case 'TEXT': return <Type className="w-3.5 h-3.5 text-amber-400" />;
        default: return <Video className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="flex h-24 mb-1 group">
        {/* Track Header - Sticky Left */}
        <div 
            className="flex-shrink-0 bg-slate-800 border-r border-slate-700 flex flex-col justify-between py-2 px-3 sticky left-0 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.3)]"
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
            className="relative bg-slate-800/40 border-t border-b border-slate-700/50 flex-grow overflow-hidden"
            style={{ width: duration * zoom }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
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