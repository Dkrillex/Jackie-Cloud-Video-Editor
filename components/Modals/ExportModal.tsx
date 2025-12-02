
import React, { useState, useEffect } from 'react';
import { useEditor } from '../../context/EditorContext';
import { ExportSettings } from '../../types';
import { X, Film, CheckCircle, Loader2, Download } from 'lucide-react';

const ExportModal: React.FC = () => {
  const { isExportModalOpen, setIsExportModalOpen, generateExportPayload } = useEditor();
  
  const [settings, setSettings] = useState<ExportSettings>({
    resolution: '1080p',
    format: 'mp4',
    fps: 30,
    quality: 'high'
  });

  const [status, setStatus] = useState<'idle' | 'rendering' | 'completed'>('idle');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isExportModalOpen) {
        setStatus('idle');
        setProgress(0);
    }
  }, [isExportModalOpen]);

  if (!isExportModalOpen) return null;

  const handleExport = () => {
    setStatus('rendering');
    setProgress(0);
    
    // Simulate rendering process
    const duration = 2000; // 2 seconds simulation
    const intervalTime = 50;
    const step = 100 / (duration / intervalTime);

    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          setStatus('completed');
          generateExportPayload(settings);
          return 100;
        }
        return prev + step;
      });
    }, intervalTime);
  };

  const getResolutionText = (res: string) => {
    switch(res) {
        case '1080p': return 'FHD 1920x1080';
        case '720p': return 'HD 1280x720';
        case '4k': return 'UHD 3840x2160';
        default: return res;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900">
          <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
            <Film className="w-5 h-5 text-indigo-500" />
            <span>Export Video</span>
          </h3>
          <button 
            onClick={() => setIsExportModalOpen(false)}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
            
            {status === 'rendering' ? (
                 <div className="py-8 flex flex-col items-center justify-center space-y-4">
                    <div className="relative w-16 h-16 flex items-center justify-center">
                        <Loader2 className="w-16 h-16 text-indigo-500 animate-spin" />
                    </div>
                    <div className="text-center">
                        <h4 className="text-white font-medium mb-1">Rendering Video...</h4>
                        <p className="text-slate-400 text-sm">Processing timeline and applying effects</p>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 mt-4 overflow-hidden">
                        <div 
                            className="bg-indigo-500 h-full transition-all duration-100 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <span className="text-xs font-mono text-slate-500">{Math.round(progress)}%</span>
                 </div>
            ) : status === 'completed' ? (
                <div className="py-8 flex flex-col items-center justify-center space-y-4">
                    <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-2">
                        <CheckCircle className="w-8 h-8 text-emerald-500" />
                    </div>
                    <div className="text-center">
                        <h4 className="text-white font-medium mb-1">Export Completed!</h4>
                        <p className="text-slate-400 text-sm">Your project file (EDL) has been downloaded.</p>
                    </div>
                    <button 
                        onClick={() => setIsExportModalOpen(false)}
                        className="mt-4 px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm transition-colors"
                    >
                        Close
                    </button>
                </div>
            ) : (
                <>
                    {/* Settings Form */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Resolution</label>
                            <div className="grid grid-cols-3 gap-2">
                                {['720p', '1080p', '4k'].map((res) => (
                                    <button
                                        key={res}
                                        onClick={() => setSettings({ ...settings, resolution: res as any })}
                                        className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all
                                            ${settings.resolution === res 
                                                ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                                            }
                                        `}
                                    >
                                        {getResolutionText(res)}
                                    </button>
                                ))}
                            </div>
                        </div>

                         <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Format</label>
                                <select 
                                    value={settings.format}
                                    onChange={(e) => setSettings({...settings, format: e.target.value as any})}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                                >
                                    <option value="mp4">MP4 (H.264)</option>
                                    <option value="webm">WebM (VP9)</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Frame Rate</label>
                                <select 
                                    value={settings.fps}
                                    onChange={(e) => setSettings({...settings, fps: Number(e.target.value) as any})}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                                >
                                    <option value={30}>30 FPS</option>
                                    <option value={60}>60 FPS</option>
                                </select>
                            </div>
                         </div>

                         <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Quality</label>
                            <div className="flex items-center space-x-2 bg-slate-800 p-1 rounded-lg border border-slate-700">
                                {['low', 'medium', 'high'].map((q) => (
                                    <button
                                        key={q}
                                        onClick={() => setSettings({ ...settings, quality: q as any })}
                                        className={`flex-1 py-1.5 rounded-md text-xs font-medium capitalize transition-all
                                            ${settings.quality === q 
                                                ? 'bg-slate-600 text-white shadow' 
                                                : 'text-slate-400 hover:text-slate-200'
                                            }
                                        `}
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>
                         </div>
                    </div>

                    <div className="pt-4 border-t border-slate-800 flex justify-end">
                        <button
                            onClick={handleExport}
                            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
                        >
                            <Download className="w-4 h-4" />
                            <span>Export Video</span>
                        </button>
                    </div>
                </>
            )}

        </div>
      </div>
    </div>
  );
};

export default ExportModal;
