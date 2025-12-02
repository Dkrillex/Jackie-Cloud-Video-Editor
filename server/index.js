/**
 * FFCreator 视频渲染服务
 * 基于 https://github.com/tnfe/FFCreator
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { renderVideo } from './renderVideo.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// 静态文件服务 - 用于下载渲染完成的视频
const outputDir = path.join(__dirname, 'output');
const cacheDir = path.join(__dirname, 'cache');

// 确保目录存在
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}
if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true });
}

app.use('/output', express.static(outputDir));

// 存储渲染任务状态
const renderTasks = new Map();

// 渲染超时时间（5分钟）
const RENDER_TIMEOUT = 5 * 60 * 1000;

// 检查任务超时
const checkTaskTimeout = (taskId) => {
  const task = renderTasks.get(taskId);
  if (task && task.status === 'processing') {
    const now = Date.now();
    const lastUpdate = task.lastUpdate || task.startTime;
    
    // 如果超过 60 秒没有进度更新，标记为可能卡住
    if (now - lastUpdate > 60000) {
      task.message = `渲染中... (上次更新: ${Math.round((now - lastUpdate) / 1000)}秒前)`;
    }
    
    // 如果超过超时时间，标记为超时
    if (now - task.startTime > RENDER_TIMEOUT) {
      task.status = 'error';
      task.error = '渲染超时，请检查素材文件是否有效';
      task.message = '渲染超时';
      console.error(`[${taskId}] 渲染超时`);
    }
  }
};

/**
 * 开始渲染视频
 * POST /api/render
 */
app.post('/api/render', async (req, res) => {
  try {
    const { settings, timeline } = req.body;
    
    if (!timeline) {
      return res.status(400).json({ error: '缺少 timeline 数据' });
    }

    // 生成任务 ID
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`[${taskId}] 🎬 开始新的渲染任务`);
    console.log(`[${taskId}] 设置: ${JSON.stringify(settings)}`);
    console.log(`[${taskId}] 时间线时长: ${timeline.duration}秒`);
    
    // 打印所有 clip 的时间信息
    if (timeline.tracks) {
      console.log(`[${taskId}] 📋 Clip 时间列表:`);
      timeline.tracks.forEach(track => {
        if (track.clips && track.clips.length > 0) {
          console.log(`   [${track.type}] ${track.id}:`);
          track.clips.forEach(clip => {
            console.log(`      - ${clip.name}: 开始=${clip.start_time}秒, 持续=${clip.duration}秒, 类型=${clip.type || track.type}`);
          });
        }
      });
    }
    console.log(`${'='.repeat(60)}\n`);
    
    // 初始化任务状态
    renderTasks.set(taskId, {
      status: 'processing',
      progress: 0,
      message: '正在初始化渲染...',
      outputFile: null,
      error: null,
      startTime,
      lastUpdate: startTime,
      logs: []
    });

    // 设置超时检查定时器
    const timeoutChecker = setInterval(() => {
      checkTaskTimeout(taskId);
      const task = renderTasks.get(taskId);
      if (task && (task.status === 'completed' || task.status === 'error')) {
        clearInterval(timeoutChecker);
      }
    }, 10000); // 每 10 秒检查一次

    // 异步开始渲染
    renderVideo({
      taskId,
      settings,
      timeline,
      outputDir,
      cacheDir,
      onProgress: (progress, message) => {
        const task = renderTasks.get(taskId);
        if (task) {
          task.progress = progress;
          task.message = message;
          task.lastUpdate = Date.now();
          task.logs.push({ time: new Date().toISOString(), progress, message });
          console.log(`[${taskId}] 📊 进度: ${progress}% - ${message}`);
        }
      },
      onComplete: (outputFile) => {
        const task = renderTasks.get(taskId);
        if (task) {
          task.status = 'completed';
          task.progress = 100;
          task.message = '渲染完成';
          task.outputFile = outputFile;
          task.lastUpdate = Date.now();
          const duration = ((Date.now() - startTime) / 1000).toFixed(1);
          console.log(`[${taskId}] ✅ 渲染完成! 耗时: ${duration}秒`);
          console.log(`[${taskId}] 📁 输出文件: ${outputFile}`);
        }
        clearInterval(timeoutChecker);
      },
      onError: (error) => {
        const task = renderTasks.get(taskId);
        if (task) {
          task.status = 'error';
          task.error = error.message || '渲染失败';
          task.message = error.message || '渲染失败';
          task.lastUpdate = Date.now();
          console.error(`[${taskId}] ❌ 渲染错误: ${error.message}`);
          console.error(`[${taskId}] 错误堆栈:`, error.stack);
        }
        clearInterval(timeoutChecker);
      }
    });

    res.json({ 
      success: true, 
      taskId,
      message: '渲染任务已创建'
    });

  } catch (error) {
    console.error('创建渲染任务失败:', error);
    res.status(500).json({ error: error.message || '创建渲染任务失败' });
  }
});

/**
 * 查询渲染进度
 * GET /api/render/:taskId/status
 */
app.get('/api/render/:taskId/status', (req, res) => {
  const { taskId } = req.params;
  const task = renderTasks.get(taskId);

  if (!task) {
    return res.status(404).json({ error: '任务不存在或服务器已重启' });
  }

  // 计算耗时
  const elapsed = task.startTime ? Math.round((Date.now() - task.startTime) / 1000) : 0;
  const lastUpdateAgo = task.lastUpdate ? Math.round((Date.now() - task.lastUpdate) / 1000) : 0;

  res.json({
    taskId,
    status: task.status,
    progress: task.progress,
    message: task.message,
    error: task.error,
    elapsed: `${elapsed}秒`,
    lastUpdateAgo: `${lastUpdateAgo}秒前`,
    downloadUrl: task.outputFile ? `/output/${path.basename(task.outputFile)}` : null,
    // 只返回最近 10 条日志
    recentLogs: (task.logs || []).slice(-10)
  });
});

/**
 * 下载渲染完成的视频
 * GET /api/render/:taskId/download
 */
app.get('/api/render/:taskId/download', (req, res) => {
  const { taskId } = req.params;
  const task = renderTasks.get(taskId);

  if (!task) {
    return res.status(404).json({ error: '任务不存在' });
  }

  if (task.status !== 'completed' || !task.outputFile) {
    return res.status(400).json({ error: '视频尚未渲染完成' });
  }

  res.download(task.outputFile);
});

/**
 * 清理过期任务（可选）
 */
app.delete('/api/render/:taskId', (req, res) => {
  const { taskId } = req.params;
  const task = renderTasks.get(taskId);

  if (task) {
    // 删除输出文件
    if (task.outputFile && fs.existsSync(task.outputFile)) {
      fs.unlinkSync(task.outputFile);
    }
    renderTasks.delete(taskId);
  }

  res.json({ success: true });
});

/**
 * 健康检查
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🎬 FFCreator 渲染服务运行在 http://localhost:${PORT}`);
  console.log(`📁 输出目录: ${outputDir}`);
  console.log(`📁 缓存目录: ${cacheDir}`);
});

