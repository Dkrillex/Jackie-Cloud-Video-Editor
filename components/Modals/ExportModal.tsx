
import React, { useState, useEffect } from 'react';
import { useEditor } from '../../context/EditorContext';
import { ExportSettings } from '../../types';
import { X, Film, CheckCircle, Loader2, FileJson, Video, AlertCircle } from 'lucide-react';

type ExportType = 'json' | 'ffmpeg';
type ExportStatus = 'idle' | 'rendering' | 'completed' | 'error';

const ExportModal: React.FC = () => {
  const { isExportModalOpen, setIsExportModalOpen, generateExportPayload, clips, tracks } = useEditor();
  
  const [settings, setSettings] = useState<ExportSettings>({
    resolution: '1080p',
    format: 'mp4',
    fps: 30,
    quality: 'high'
  });

  const [status, setStatus] = useState<ExportStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [exportType, setExportType] = useState<ExportType | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [renderMessage, setRenderMessage] = useState<string>(''); // 服务器返回的实时消息
  const [renderElapsed, setRenderElapsed] = useState<string>(''); // 已用时间

  useEffect(() => {
    if (isExportModalOpen) {
        setStatus('idle');
        setProgress(0);
        setExportType(null);
        setErrorMessage('');
        setRenderMessage('');
        setRenderElapsed('');
    }
  }, [isExportModalOpen]);

  if (!isExportModalOpen) return null;

  // 导出 JSON 文件
  const handleExportJSON = () => {
    setExportType('json');
    setStatus('rendering');
    setProgress(0);
    
    // 快速导出 JSON，模拟短暂处理时间
    const duration = 500;
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

  // 渲染服务地址
  const RENDER_SERVER_URL = 'http://localhost:3001';
  
  // 调用 FFCreator 渲染视频
  const handleExportFFmpeg = async () => {
    setExportType('ffmpeg');
    setStatus('rendering');
    setProgress(0);
    setErrorMessage('');
    
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    
    try {
      // 生成导出数据
      const exportData = generateExportData(settings);
      
      // 1. 创建渲染任务
      setProgress(5);
      const createResponse = await fetch(`${RENDER_SERVER_URL}/api/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings,
          timeline: exportData.timeline
        })
      });
      
      if (!createResponse.ok) {
        const errorData = await createResponse.json().catch(() => ({}));
        throw new Error(errorData.error || '创建渲染任务失败');
      }
      
      const { taskId } = await createResponse.json();
      
      // 2. 轮询渲染进度
      pollInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch(`${RENDER_SERVER_URL}/api/render/${taskId}/status`);
          
          if (!statusResponse.ok) {
            const errorText = await statusResponse.text().catch(() => '');
            console.error('渲染状态请求失败:', statusResponse.status, errorText);
            throw new Error(`获取渲染状态失败 (${statusResponse.status}): ${errorText || '服务器可能已重启，请重新导出'}`);
          }
          
          const taskStatus = await statusResponse.json();
          
          setProgress(taskStatus.progress || 0);
          setRenderMessage(taskStatus.message || '');
          setRenderElapsed(taskStatus.elapsed || '');
          
          // 在控制台输出详细状态（方便调试）
          console.log(`[渲染状态] ${taskStatus.progress}% - ${taskStatus.message} (${taskStatus.elapsed}, 上次更新: ${taskStatus.lastUpdateAgo})`);
          
          if (taskStatus.status === 'completed') {
            // 渲染完成，下载视频
            if (pollInterval) clearInterval(pollInterval);
            
            // 触发下载
            if (taskStatus.downloadUrl) {
              const downloadLink = document.createElement('a');
              downloadLink.href = `${RENDER_SERVER_URL}${taskStatus.downloadUrl}`;
              downloadLink.download = `video_${Date.now()}.${settings.format}`;
              document.body.appendChild(downloadLink);
              downloadLink.click();
              downloadLink.remove();
            }
            
            setStatus('completed');
          } else if (taskStatus.status === 'error') {
            // 渲染失败
            if (pollInterval) clearInterval(pollInterval);
            throw new Error(taskStatus.error || '渲染失败');
          }
        } catch (pollError) {
          if (pollInterval) clearInterval(pollInterval);
          // 检查是否是网络错误
          if (pollError instanceof TypeError && pollError.message.includes('fetch')) {
            throw new Error('无法连接到渲染服务器，请确保服务已启动');
          }
          throw pollError;
        }
      }, 5000); // 每 5 秒轮询一次
      
    } catch (error) {
      if (pollInterval) clearInterval(pollInterval);
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : '渲染过程中发生错误');
    }
  };
  
  // 生成导出数据（不触发下载）
  const generateExportData = (exportSettings: ExportSettings) => {
    const clipsData = clips || [];
    const tracksData = tracks || [];
    
    return {
      project: "LuminaCut Project",
      version: "1.0.0",
      settings: exportSettings,
      timeline: {
        duration: clipsData.length > 0 
          ? Math.max(...clipsData.map(c => c.startTime + c.duration)) 
          : 0,
        tracks: tracksData.map(track => {
          const trackClips = clipsData
            .filter(c => c.trackId === track.id)
            .sort((a, b) => a.startTime - b.startTime)
            .map(clip => ({
              id: clip.id,
              type: clip.type, // 添加 clip 自身的类型
              asset_src: clip.src,
              name: clip.name,
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
              }
            }));
          
          return {
            id: track.id,
            type: track.type,
            clips: trackClips
          };
        })
      }
    };
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
                        <h4 className="text-white font-medium mb-1">
                            {exportType === 'json' ? '正在导出 JSON...' : '正在渲染视频...'}
                        </h4>
                        <p className="text-slate-400 text-sm">
                            {exportType === 'json' 
                                ? '正在生成项目配置文件' 
                                : renderMessage || '正在使用 FFmpeg 处理时间线和应用效果'
                            }
                        </p>
                        {/* 显示已用时间 */}
                        {exportType === 'ffmpeg' && renderElapsed && (
                            <p className="text-slate-500 text-xs mt-1">
                                已用时间: {renderElapsed}
                            </p>
                        )}
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 mt-4 overflow-hidden">
                        <div 
                            className={`h-full transition-all duration-100 ease-out ${
                                renderMessage?.includes('上次更新') ? 'bg-amber-500' : 'bg-indigo-500'
                            }`}
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <span className="text-xs font-mono text-slate-500">{Math.round(progress)}%</span>
                    
                    {/* 警告提示 - 当进度长时间未更新时 */}
                    {renderMessage?.includes('上次更新') && (
                        <div className="flex items-center space-x-2 text-amber-400 text-xs bg-amber-500/10 px-3 py-2 rounded-lg">
                            <AlertCircle className="w-4 h-4" />
                            <span>渲染可能卡住了，请检查服务器日志</span>
                        </div>
                    )}
                 </div>
            ) : status === 'error' ? (
                <div className="py-8 flex flex-col items-center justify-center space-y-4">
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-2">
                        <AlertCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <div className="text-center">
                        <h4 className="text-white font-medium mb-1">导出失败</h4>
                        <p className="text-slate-400 text-sm">{errorMessage || '请稍后重试'}</p>
                    </div>
                    <button 
                        onClick={() => setStatus('idle')}
                        className="mt-4 px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm transition-colors"
                    >
                        返回
                    </button>
                </div>
            ) : status === 'completed' ? (
                <div className="py-8 flex flex-col items-center justify-center space-y-4">
                    <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-2">
                        <CheckCircle className="w-8 h-8 text-emerald-500" />
                    </div>
                    <div className="text-center">
                        <h4 className="text-white font-medium mb-1">导出完成！</h4>
                        <p className="text-slate-400 text-sm">
                            {exportType === 'json' 
                                ? '项目 JSON 配置文件已下载' 
                                : '视频渲染完成并已下载'
                            }
                        </p>
                    </div>
                    <button 
                        onClick={() => setIsExportModalOpen(false)}
                        className="mt-4 px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm transition-colors"
                    >
                        关闭
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

                    <div className="pt-4 border-t border-slate-800">
                        <div className="flex flex-col gap-3">
                            <p className="text-xs text-slate-500 text-center">选择导出方式</p>
                            <div className="flex gap-3">
                                {/* 导出 JSON 按钮 */}
                                <button
                                    onClick={handleExportJSON}
                                    className="flex-1 flex items-center justify-center space-x-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-all border border-slate-600 hover:border-slate-500 active:scale-95"
                                >
                                    <FileJson className="w-4 h-4 text-amber-400" />
                                    <span>导出 JSON</span>
                                </button>
                                
                                {/* FFmpeg 渲染按钮 */}
                                <button
                                    onClick={handleExportFFmpeg}
                                    className="flex-1 flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
                                >
                                    <Video className="w-4 h-4" />
                                    <span>FFmpeg 渲染</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

        </div>
      </div>
    </div>
  );
};

export default ExportModal;
