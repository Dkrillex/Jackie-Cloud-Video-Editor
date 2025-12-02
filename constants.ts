import { Asset, MediaType } from './types';

export const MOCK_ASSETS: Asset[] = [
  {
    id: 'a1',
    type: MediaType.VIDEO,
    name: 'Nature River',
    src: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    thumbnail: 'https://picsum.photos/id/1018/200/150',
    duration: 60,
  },
  {
    id: 'a2',
    type: MediaType.VIDEO,
    name: 'City Traffic',
    src: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    thumbnail: 'https://picsum.photos/id/1015/200/150',
    duration: 45,
  },
  {
    id: 'a3',
    type: MediaType.IMAGE,
    name: 'Mountain Static',
    src: 'https://picsum.photos/id/1036/800/450',
    thumbnail: 'https://picsum.photos/id/1036/200/150',
    duration: 5,
  },
  {
    id: 'm1',
    type: MediaType.AUDIO,
    name: 'Upbeat Lo-Fi',
    src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', // Public domain mock
    duration: 120,
  },
  {
    id: 'm2',
    type: MediaType.AUDIO,
    name: 'Cinematic Drone',
    src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    duration: 180,
  }
];

export const PIXELS_PER_SECOND_DEFAULT = 20;
export const MIN_ZOOM = 5;
export const MAX_ZOOM = 100;
export const TIMELINE_HEIGHT = 200;
export const TRACK_HEADER_WIDTH = 128; // w-32 in Tailwind