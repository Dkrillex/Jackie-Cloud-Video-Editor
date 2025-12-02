# FFCreatorLite 视频渲染服务

基于 [FFCreatorLite](https://github.com/tnfe/FFCreatorLite) 的视频渲染后端服务。

> **为什么使用 FFCreatorLite？**  
> FFCreatorLite 是 FFCreator 的轻量版，**不需要 WebGL/OpenGL 依赖**，安装更简单，适合在 macOS/Windows 开发环境使用。

## 系统要求

### 安装 FFmpeg（必需）

FFCreatorLite 依赖 FFmpeg，请确保系统已安装：

**macOS:**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt-get install ffmpeg
```

**CentOS/RHEL:**
```bash
sudo yum install ffmpeg
```

## 安装

```bash
# 在项目根目录运行
npm run server:install

# 或者进入 server 目录手动安装
cd server
npm install
```

## 启动服务

### 开发模式（带自动重启）
```bash
npm run server:dev
```

### 生产模式
```bash
npm run server
```

## API 接口

### 创建渲染任务

```
POST /api/render
Content-Type: application/json

{
  "settings": {
    "resolution": "1080p",
    "format": "mp4",
    "fps": 30,
    "quality": "high"
  },
  "timeline": {
    "duration": 60,
    "tracks": [...]
  }
}

Response:
{
  "success": true,
  "taskId": "task_xxx",
  "message": "渲染任务已创建"
}
```

### 查询渲染进度

```
GET /api/render/:taskId/status

Response:
{
  "taskId": "task_xxx",
  "status": "processing" | "completed" | "error",
  "progress": 50,
  "message": "正在渲染...",
  "downloadUrl": "/output/video_xxx.mp4" // 完成后可用
}
```

### 下载渲染结果

```
GET /api/render/:taskId/download
```

### 健康检查

```
GET /api/health

Response:
{
  "status": "ok",
  "timestamp": "2025-12-02T..."
}
```

## 配置

默认端口: `3001`

可通过环境变量修改:
```bash
PORT=8080 npm run server
```

## 目录结构

```
server/
├── index.js         # Express 服务入口
├── renderVideo.js   # FFCreator 渲染逻辑
├── package.json     # 依赖配置
├── output/          # 渲染输出目录（自动创建）
└── cache/           # 渲染缓存目录（自动创建）
```

## 注意事项

1. **资源文件路径**: 确保 timeline 中的 `asset_src` 是服务器可访问的绝对路径或 URL
2. **内存使用**: 渲染大视频时会占用较多内存，建议服务器至少 4GB RAM
3. **并发渲染**: 默认支持多任务并行，但需要注意 CPU 和内存限制

