
import React from 'react';
import AssetLibrary from './Library/AssetLibrary';
import Timeline from './Timeline/Timeline';
import Player from './Preview/Player';
import PropertiesPanel from './Properties/PropertiesPanel';
import ExportModal from './Modals/ExportModal';
import { useEditor } from '../context/EditorContext';
import { Download } from 'lucide-react';

const EditorLayout: React.FC = () => {
  const { setIsExportModalOpen } = useEditor();

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-200">
      {/* Header */}
      <header className="h-12 bg-slate-900 border-b border-slate-700 flex items-center justify-between px-4">
        <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-white">L</div>
            <span className="font-semibold text-lg tracking-tight">LuminaCut</span>
        </div>
        <button 
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
        >
            <Download className="w-4 h-4" />
            <span>Export Video</span>
        </button>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        <AssetLibrary />
        
        <div className="flex-1 flex flex-col min-w-0">
            {/* Upper Section: Preview */}
            <div className="flex-1 flex min-h-0 bg-black">
                <Player />
                <PropertiesPanel />
            </div>
            
            {/* Lower Section: Timeline */}
            <div className="h-[300px] border-t border-slate-700 flex flex-col">
                <Timeline />
            </div>
        </div>
      </div>
      
      {/* Modals */}
      <ExportModal />
    </div>
  );
};

export default EditorLayout;
