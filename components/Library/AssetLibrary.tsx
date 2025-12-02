import React from 'react';
import { useEditor } from '../../context/EditorContext';
import { MOCK_ASSETS } from '../../constants';
import { Asset, MediaType } from '../../types';
import { Music, Video, Image as ImageIcon, Type, Plus } from 'lucide-react';

const AssetLibrary: React.FC = () => {
  const { addClip, tracks, seek } = useEditor();

  const handleDragStart = (e: React.DragEvent, asset: Asset) => {
    e.dataTransfer.setData('application/json', JSON.stringify(asset));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const addTextAsset = () => {
    const textClip = {
      id: `clip-${Date.now()}`,
      assetId: 'text-gen',
      trackId: tracks.find(t => t.type === MediaType.TEXT)?.id || 't-overlay',
      startTime: 0,
      duration: 5,
      offset: 0,
      type: MediaType.TEXT,
      name: 'New Subtitle',
      src: '',
      x: 50,
      y: 80,
      scale: 1,
      opacity: 1,
    };
    addClip(textClip);
    seek(0);
  };

  return (
    <div className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col h-full">
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Assets</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Quick Add Actions */}
        <div className="grid grid-cols-2 gap-2 mb-6">
          <button 
            onClick={addTextAsset}
            className="flex flex-col items-center justify-center p-3 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors group"
          >
            <Type className="w-6 h-6 mb-1 text-indigo-400 group-hover:text-indigo-300" />
            <span className="text-xs text-slate-300">Add Text</span>
          </button>
           <div className="flex flex-col items-center justify-center p-3 bg-slate-700/50 rounded-lg border border-dashed border-slate-600">
             <Plus className="w-6 h-6 mb-1 text-slate-500" />
             <span className="text-xs text-slate-500">Import</span>
           </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold text-slate-500 mb-2 uppercase">Videos</h3>
          <div className="grid grid-cols-2 gap-2">
            {MOCK_ASSETS.filter(a => a.type === MediaType.VIDEO).map(asset => (
              <div 
                key={asset.id}
                draggable
                onDragStart={(e) => handleDragStart(e, asset)}
                className="relative group cursor-grab active:cursor-grabbing"
              >
                <img src={asset.thumbnail} alt={asset.name} className="w-full h-20 object-cover rounded bg-slate-900" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded">
                  <Video className="w-5 h-5 text-white" />
                </div>
                <div className="mt-1 text-xs truncate text-slate-300">{asset.name}</div>
                <div className="text-[10px] text-slate-500">{asset.duration}s</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold text-slate-500 mb-2 mt-4 uppercase">Audio</h3>
          <div className="space-y-2">
            {MOCK_ASSETS.filter(a => a.type === MediaType.AUDIO).map(asset => (
              <div 
                key={asset.id}
                draggable
                onDragStart={(e) => handleDragStart(e, asset)}
                className="flex items-center p-2 bg-slate-700/50 rounded hover:bg-slate-700 cursor-grab active:cursor-grabbing border border-transparent hover:border-slate-500 transition-all"
              >
                <div className="w-8 h-8 bg-indigo-900/50 rounded flex items-center justify-center mr-3">
                  <Music className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate text-slate-200">{asset.name}</div>
                  <div className="text-[10px] text-slate-500">{asset.duration}s</div>
                </div>
              </div>
            ))}
          </div>
        </div>

         <div>
          <h3 className="text-xs font-semibold text-slate-500 mb-2 mt-4 uppercase">Images</h3>
          <div className="grid grid-cols-2 gap-2">
            {MOCK_ASSETS.filter(a => a.type === MediaType.IMAGE).map(asset => (
              <div 
                key={asset.id}
                draggable
                onDragStart={(e) => handleDragStart(e, asset)}
                className="relative group cursor-grab active:cursor-grabbing"
              >
                <img src={asset.thumbnail} alt={asset.name} className="w-full h-20 object-cover rounded bg-slate-900" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded">
                  <ImageIcon className="w-5 h-5 text-white" />
                </div>
                <div className="mt-1 text-xs truncate text-slate-300">{asset.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssetLibrary;