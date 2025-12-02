import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Clip, EditorState, MediaType, Track, ExportSettings } from '../types';

interface EditorContextType extends EditorState {
  addClip: (clip: Clip) => void;
  updateClip: (id: string, updates: Partial<Clip>) => void;
  removeClip: (id: string) => void;
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  setZoom: (zoom: number) => void;
  selectClip: (id: string | null) => void;
  isExportModalOpen: boolean;
  setIsExportModalOpen: (isOpen: boolean) => void;
  generateExportPayload: (settings: ExportSettings) => void;
}

const EditorContext = createContext<EditorContextType | undefined>(undefined);

const INITIAL_TRACKS: Track[] = [
  { id: 't-overlay', type: MediaType.TEXT, name: 'Overlay / Text' },
  { id: 't-image-1', type: MediaType.IMAGE, name: 'Image / Overlay' },
  { id: 't-video-1', type: MediaType.VIDEO, name: 'Video 1' },
  { id: 't-video-2', type: MediaType.VIDEO, name: 'Video 2' },
  { id: 't-audio-1', type: MediaType.AUDIO, name: 'Music' },
];

export const EditorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tracks] = useState<Track[]>(INITIAL_TRACKS);
  const [clips, setClips] = useState<Clip[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [zoom, setZoom] = useState(20);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  
  const requestRef = useRef<number | undefined>(undefined);
  const lastTimeRef = useRef<number | undefined>(undefined);

  const animate = useCallback((time: number) => {
    if (lastTimeRef.current !== undefined) {
      const deltaTime = (time - lastTimeRef.current) / 1000;
      setCurrentTime((prevTime) => prevTime + deltaTime);
    }
    lastTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    if (isPlaying) {
      requestRef.current = requestAnimationFrame(animate);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      lastTimeRef.current = undefined;
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, animate]);

  const play = () => setIsPlaying(true);
  const pause = () => setIsPlaying(false);
  const seek = (time: number) => {
    setCurrentTime(Math.max(0, time));
    if (isPlaying) {
      // Reset the delta timer if we seek while playing
      lastTimeRef.current = undefined; 
    }
  };

  const addClip = (clip: Clip) => {
    setClips((prev) => {
      const newClips = [...prev, clip];
      console.log('[EditorContext] 添加 clip:', clip.id, '当前总数:', newClips.length);
      return newClips;
    });
  };

  const updateClip = (id: string, updates: Partial<Clip>) => {
    setClips((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  const removeClip = (id: string) => {
    setClips((prev) => prev.filter((c) => c.id !== id));
    if (selectedClipId === id) setSelectedClipId(null);
  };

  const selectClip = (id: string | null) => {
    setSelectedClipId(id);
  };

  const generateExportPayload = (settings: ExportSettings) => {
    // Generate the EDL (Edit Decision List) for MoviePy
    const exportData = {
      project: "LuminaCut Project",
      version: "1.0.0",
      settings: settings,
      timeline: {
        duration: Math.max(0, ...clips.map(c => c.startTime + c.duration)),
        tracks: tracks.map(track => {
            const trackClips = clips
                .filter(c => c.trackId === track.id)
                .sort((a, b) => a.startTime - b.startTime)
                .map(clip => ({
                    id: clip.id,
                    type: clip.type,
                    name: clip.name,
                    asset_src: clip.src,
                    start_time: clip.startTime,
                    duration: clip.duration,
                    asset_offset: clip.offset,
                    filters: {
                        opacity: clip.opacity ?? 1,
                        volume: clip.volume ?? 1,
                        transform: {
                            x: clip.x ?? 50,
                            y: clip.y ?? 50,
                            scale: clip.scale ?? 1
                        }
                    },
                    transitions: {
                        in: clip.transitionIn,
                        out: clip.transitionOut
                    },
                    subtitle_style: clip.subtitleStyle
                }));

            return {
                id: track.id,
                type: track.type,
                clips: trackClips
            };
        })
      }
    };

    // Trigger Download
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `project_export_${Date.now()}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  // Calculate total duration based on clips
  const duration = Math.max(60, ...clips.map(c => c.startTime + c.duration)) + 10;

  return (
    <EditorContext.Provider
      value={{
        tracks,
        clips,
        currentTime,
        isPlaying,
        duration,
        zoom,
        selectedClipId,
        isExportModalOpen,
        addClip,
        updateClip,
        removeClip,
        play,
        pause,
        seek,
        setZoom,
        selectClip,
        setIsExportModalOpen,
        generateExportPayload
      }}
    >
      {children}
    </EditorContext.Provider>
  );
};

export const useEditor = () => {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error('useEditor must be used within an EditorProvider');
  }
  return context;
};