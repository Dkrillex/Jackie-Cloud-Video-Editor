
export enum MediaType {
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
  TEXT = 'TEXT',
  IMAGE = 'IMAGE'
}

export interface Asset {
  id: string;
  type: MediaType;
  src: string;
  name: string;
  thumbnail?: string;
  duration?: number; // in seconds
}

export interface Clip {
  id: string;
  assetId: string;
  trackId: string;
  startTime: number; // Start time on the timeline (seconds)
  duration: number; // Duration of the clip (seconds)
  offset: number; // Start time within the source asset (trimming)
  type: MediaType;
  name: string;
  src: string;
  
  // Visual properties
  x?: number; // for text/video position (0-100%)
  y?: number; // for text/video position (0-100%)
  scale?: number;
  opacity?: number;
  volume?: number; // 0-1

  // Transition
  transitionIn?: 'none' | 'fade' | 'dissolve';
  transitionOut?: 'none' | 'fade' | 'dissolve';
  transitionDuration?: number;
}

export interface Track {
  id: string;
  type: MediaType;
  name: string;
  isMuted?: boolean;
  isLocked?: boolean;
}

export interface EditorState {
  tracks: Track[];
  clips: Clip[];
  currentTime: number; // Playhead position in seconds
  isPlaying: boolean;
  duration: number; // Total timeline duration
  zoom: number; // Pixels per second
  selectedClipId: string | null;
}

export interface ExportSettings {
  resolution: '1080p' | '720p' | '4k';
  format: 'mp4' | 'webm';
  fps: 30 | 60;
  quality: 'high' | 'medium' | 'low';
}
