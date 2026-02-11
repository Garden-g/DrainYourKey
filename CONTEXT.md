# Gen_PhotoNVideo CONTEXT

## 这个项目是干嘛的？核心目标是什么？

这是一个「图像 + 视频生成」Web 应用：
- 前端提供创作面板（文生图、图生图、文生视频、图生视频、首尾帧、视频延长、提示词优化）。
- 后端调用 Google Gemini / Veo 模型执行生成任务。
- 通过轮询任务状态实时展示进度与结果。

核心目标：
- 让用户在同一页面完成图片和视频创作。
- 支持多任务并发提交，不阻塞界面。
- 保留历史记录，便于复用和追溯。

## 入口在哪里？请求/任务从哪里进，从哪里出？

后端入口：
- `backend/app/main.py`
- FastAPI 挂载三个路由：`/api/image`、`/api/video`、`/api/history`

前端入口：
- `frontend/src/main.jsx`
- 主页面组件：`frontend/src/App.jsx`

请求流：
1. 用户在前端面板触发生成。
2. 前端调用 `frontend/src/services/api.js`。
3. 后端路由接收请求并创建后台任务（`image_service` / `video_service`）。
4. 前端轮询 `/status/{job_id}`。
5. 完成后通过 `/api/image/{filename}` 或 `/api/video/{filename}` 拉取静态文件。

任务输出位置：
- 图片：`output/images/`
- 视频：`output/videos/`
- 历史记录：`data/history.json`
- 日志：`logs/app.log`

## 关键模块分别负责什么？

后端：
- `backend/app/config.py`：环境变量、目录、模型名、超时、日志初始化
- `backend/app/models/schemas.py`：请求/响应 Pydantic 模型
- `backend/app/routers/image.py`：图像相关 API（生成、状态、编辑、提示词优化）
- `backend/app/routers/video.py`：视频相关 API（生成、延长、状态）
- `backend/app/routers/history.py`：历史记录 API
- `backend/app/services/image_service.py`：图像任务管理、Gemini 图像生成、多轮会话
- `backend/app/services/video_service.py`：视频任务管理、Veo 生成与延长
- `backend/app/services/prompt_service.py`：提示词优化
- `backend/app/services/history_service.py`：历史记录读写（JSON + 异步锁）
- `backend/app/utils/file_utils.py`：文件名生成、base64 编解码、JSON 原子写、路径安全解析

前端：
- `frontend/src/App.jsx`：全局状态、任务轮询、图片/视频主流程编排
- `frontend/src/services/api.js`：API 请求封装
- `frontend/src/components/image/*`：图像面板、画廊、任务卡片、预览、`ReferenceImagesUpload`（多图拖拽上传）
- `frontend/src/components/video/*`：视频面板、画廊、任务卡片、播放弹窗
- `frontend/src/components/common/*`：按钮、选择器、上传等基础组件
- `frontend/src/components/modal/PromptAssistModal.jsx`：提示词优化弹窗

## 状态/数据结构/事件名是什么？在哪里定义？

后端核心数据结构：
- 图像任务：`ImageJob`，`backend/app/services/image_service.py`
- 视频任务：`VideoJob`，`backend/app/services/video_service.py`
- 任务状态枚举：`JobStatus`（图片与视频服务内各自定义）
- API Schema：`backend/app/models/schemas.py`（图像生成支持 `reference_images` + 兼容 `reference_image`）
- 历史记录结构：`HistoryItem`，`backend/app/models/schemas.py`

前端核心状态（`frontend/src/App.jsx`）：
- 图像：`imageJobs`、`generatedImages`、`imgSessionId`、`imgReferences`（多参考图）
- 视频：`videoJobs`、`generatedVideos`、`playingVideo`
- 轮询管理：`imagePollTimeouts`、`videoPollTimeouts`（`useRef(Map)`）

关键前端动作（函数）：
- 图像生成：`handleGenerateImage`
- 图像轮询：`pollImageStatus`
- 视频生成：`handleGenerateVideo`
- 视频轮询：`pollVideoStatus`
- 视频延长：`handleExtendVideo`
- 图片转视频：`transferToVideo`

## 新需求通常改哪里？哪些地方别碰？

常见改动入口：
- 改 API 行为：优先改 `backend/app/routers/*.py` + `backend/app/models/schemas.py`
- 改生成逻辑：`backend/app/services/image_service.py` / `video_service.py`
- 改 UI 交互：`frontend/src/App.jsx` + 对应 `components/*`
- 改请求参数：前后端一起改（`schemas.py` + `services/api.js` + 调用处）

谨慎改动（容易引发回归）：
- `App.jsx` 里的轮询与 timeout 清理逻辑（容易造成内存泄漏或重复轮询）
- `file_utils.py` 的 `safe_resolve_path`、`write_json_file`（安全和数据一致性关键）
- `config.py` 的超时配置与日志初始化（影响所有服务行为）

## 如何本地跑通、如何验证？

后端启动（PowerShell）：
```powershell
cd backend
uv sync
uv run uvicorn app.main:app --reload --port 8080
```

前端启动（另一个终端）：
```powershell
cd frontend
npm install
npm run dev
```

访问：
- 前端：`http://localhost:3000`
- 后端文档：`http://localhost:8080/docs`

最小验证清单：
1. 图像生成：拖拽/点击上传多张参考图（支持追加），确认可移除单张并可正常发起生成。
2. 视频生成：提交 text2vid，确认轮询至 completed，可播放可下载。
3. 图生视频：上传图片后生成，确认后端未报 base64/mime 错误。
4. 历史记录：生成后查看 `data/history.json` 是否新增记录。
5. 日志：检查 `logs/app.log` 是否记录关键开始/结束/异常信息。
