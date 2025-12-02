import React from 'react';
import { useEditor } from '../../context/EditorContext';
import { MediaType } from '../../types';
import { Trash2, Volume2, Type, Layers, Scissors } from 'lucide-react';

const PropertiesPanel: React.FC = () => {
  const { selectedClipId, clips, updateClip, removeClip } = useEditor();
  
  const clip = clips.find(c => c.id === selectedClipId);

  if (!clip) {
    return (
      <div className="w-72 bg-slate-900 border-l border-slate-700 flex flex-col items-center justify-center text-slate-500 p-8 text-center">
        <Layers className="w-12 h-12 mb-4 opacity-20" />
        <p>Select a clip on the timeline to edit properties</p>
      </div>
    );
  }

  return (
    <div className="w-72 bg-slate-800 border-l border-slate-700 flex flex-col h-full overflow-y-auto">
      <div className="p-4 border-b border-slate-700 flex justify-between items-center">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">Properties</h2>
        <button 
            onClick={() => removeClip(clip.id)}
            className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-400/10 transition-colors"
        >
            <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-6">
        {/* Common Properties */}
        <div className="space-y-3">
            <label className="text-xs text-slate-500 uppercase font-semibold">Label</label>
            <input 
                type="text" 
                value={clip.name}
                onChange={(e) => updateClip(clip.id, { name: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
            />
        </div>

        <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1">
                <label className="text-xs text-slate-500">Start Time</label>
                <div className="text-sm text-slate-300 bg-slate-900 px-2 py-1 rounded border border-slate-700">
                    {clip.startTime.toFixed(2)}s
                </div>
             </div>
             <div className="space-y-1">
                <label className="text-xs text-slate-500">Duration</label>
                <div className="text-sm text-slate-300 bg-slate-900 px-2 py-1 rounded border border-slate-700">
                    {clip.duration.toFixed(2)}s
                </div>
             </div>
        </div>

        <hr className="border-slate-700" />

        {/* Text Specific */}
        {clip.type === MediaType.TEXT && (
             <div className="space-y-4">
                <div className="flex items-center space-x-2 text-indigo-400">
                    <Type className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase">Text Settings</span>
                </div>
                
                <div className="space-y-2">
                    <label className="text-xs text-slate-500">Scale ({clip.scale || 1}x)</label>
                    <input 
                        type="range" 
                        min="0.5" 
                        max="3" 
                        step="0.1"
                        value={clip.scale || 1}
                        onChange={(e) => updateClip(clip.id, { scale: parseFloat(e.target.value) })}
                        className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                    />
                </div>
                 <div className="space-y-2">
                    <label className="text-xs text-slate-500">X Position ({Math.round(clip.x || 50)}%)</label>
                    <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={clip.x || 50}
                        onChange={(e) => updateClip(clip.id, { x: parseFloat(e.target.value) })}
                        className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                    />
                </div>
                 <div className="space-y-2">
                    <label className="text-xs text-slate-500">Y Position ({Math.round(clip.y || 50)}%)</label>
                    <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={clip.y || 50}
                        onChange={(e) => updateClip(clip.id, { y: parseFloat(e.target.value) })}
                        className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                    />
                </div>
             </div>
        )}

        {/* Video/Image/Audio Specific: Opacity/Volume */}
        {(clip.type === MediaType.VIDEO || clip.type === MediaType.IMAGE) && (
             <div className="space-y-4">
                 <div className="flex items-center space-x-2 text-indigo-400">
                    <Layers className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase">Visual</span>
                </div>
                <div className="space-y-2">
                    <label className="text-xs text-slate-500">Opacity ({Math.round((clip.opacity ?? 1) * 100)}%)</label>
                    <input 
                        type="range" 
                        min="0" 
                        max="1" 
                        step="0.01"
                        value={clip.opacity ?? 1}
                        onChange={(e) => updateClip(clip.id, { opacity: parseFloat(e.target.value) })}
                        className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                    />
                </div>
             </div>
        )}

        {(clip.type === MediaType.VIDEO || clip.type === MediaType.AUDIO) && (
            <div className="space-y-4">
                 <div className="flex items-center space-x-2 text-indigo-400">
                    <Volume2 className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase">Audio</span>
                </div>
                <div className="space-y-2">
                    <label className="text-xs text-slate-500">Volume ({Math.round((clip.volume ?? 1) * 100)}%)</label>
                    <input 
                        type="range" 
                        min="0" 
                        max="1" 
                        step="0.01"
                        value={clip.volume ?? 1}
                        onChange={(e) => updateClip(clip.id, { volume: parseFloat(e.target.value) })}
                        className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                    />
                </div>
             </div>
        )}

        <hr className="border-slate-700" />

        {/* Transitions */}
        <div className="space-y-4">
             <div className="flex items-center space-x-2 text-indigo-400">
                    <Scissors className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase">Transitions</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
                <div>
                     <label className="text-xs text-slate-500 block mb-1">In</label>
                     <select 
                        value={clip.transitionIn || 'none'}
                        onChange={(e) => updateClip(clip.id, { transitionIn: e.target.value as any })}
                        className="w-full bg-slate-900 border border-slate-700 rounded text-xs py-1 px-2 text-slate-300"
                    >
                        <option value="none">None</option>
                        <option value="fade">Fade</option>
                        <option value="dissolve">Dissolve</option>
                     </select>
                </div>
                <div>
                     <label className="text-xs text-slate-500 block mb-1">Out</label>
                     <select 
                        value={clip.transitionOut || 'none'}
                        onChange={(e) => updateClip(clip.id, { transitionOut: e.target.value as any })}
                        className="w-full bg-slate-900 border border-slate-700 rounded text-xs py-1 px-2 text-slate-300"
                    >
                        <option value="none">None</option>
                        <option value="fade">Fade</option>
                        <option value="dissolve">Dissolve</option>
                     </select>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default PropertiesPanel;