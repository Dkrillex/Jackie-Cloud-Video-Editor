import { Asset, MediaType } from './types';

// 注意：FFCreatorLite 渲染需要本地文件路径
// 网络 URL 仅用于预览，导出时需要本地文件
export const MOCK_ASSETS: Asset[] = [
  {
    id: 'a1',
    type: MediaType.VIDEO,
    name: 'Nature River',
    src: '/assets/nature_river.mp4', // 本地文件
    thumbnail: 'https://picsum.photos/id/1018/200/150',
    duration: 10,
  },
  {
    id: 'a2',
    type: MediaType.VIDEO,
    name: 'City Traffic',
    src: '/assets/city_traffic.mp4', // 本地文件
    thumbnail: 'https://picsum.photos/id/1015/200/150',
    duration: 10,
  },
  {
    id: 'a3',
    type: MediaType.IMAGE,
    name: 'Mountain Static',
    src: '/assets/mountain.jpg', // 本地文件
    thumbnail: '/assets/mountain.jpg',
    duration: 5,
  },
  {
    id: 'm1',
    type: MediaType.AUDIO,
    name: 'Upbeat Lo-Fi',
    src: '/assets/upbeat_lofi.mp3', // 本地文件
    duration: 120,
  },
];

export const PIXELS_PER_SECOND_DEFAULT = 20;
export const MIN_ZOOM = 5;
export const MAX_ZOOM = 100;
export const TIMELINE_HEIGHT = 200;
export const TRACK_HEADER_WIDTH = 128; // w-32 in Tailwind