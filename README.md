# Gen_PhotoNVideo

基于 `FastAPI + React + Google Gemini/Veo` 的图像与视频生成工具。

## 功能概览

- 图像生成：文生图、参考图生成、Google 搜索增强、模型切换（Nano Banana Pro / Nano Banana 2）
- 专业生图：独立专业页面（位于“视频生成”下方），支持高级采样参数与安全过滤
- 多参考图上传：图像板块支持拖拽上传、追加上传、单张移除、最多 14 张参考图
- 图像编辑：基于会话的多轮编辑
- 视频生成：文生视频、图生视频、首尾帧插值
- 视频延长：对已生成视频继续延长
- 提示词优化：AI 自动扩写 prompt
- 历史记录：JSON 持久化

## 技术栈

- 前端：React 18、Vite 6、Tailwind CSS
- 后端：Python 3.11+、FastAPI、google-genai SDK
- 包管理：`npm`（前端）、`uv`（后端）

## 项目结构

```text
.
├─ backend/                 # FastAPI 后端
│  ├─ app/
│  │  ├─ main.py            # 后端入口
│  │  ├─ config.py          # 配置与日志
│  │  ├─ routers/           # image/video/history API
│  │  ├─ services/          # 生成与业务逻辑
│  │  ├─ models/            # Pydantic 数据模型
│  │  └─ utils/             # 文件与重试等工具
│  └─ pyproject.toml
├─ frontend/                # React 前端
│  ├─ src/
│  │  ├─ App.jsx            # 主页面与状态编排
│  │  ├─ services/api.js    # API 调用封装
│  │  └─ components/        # UI 组件
│  └─ package.json
├─ data/history.json        # 历史记录
├─ output/images            # 生成图片
├─ output/videos            # 生成视频
├─ logs/app.log             # 运行日志
└─ CONTEXT.md               # 项目上下文说明
```

## 环境变量

在项目根目录或 `backend/` 下准备 `.env`（至少包含）：

```env
GOOGLE_CLOUD_API_KEY=your_api_key
```

可选：

```env
CORS_ALLOW_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
JOB_TTL_HOURS=24
SESSION_TTL_HOURS=24
PROCESSING_JOB_MAX_SECONDS=1800
GENAI_IMAGE_TIMEOUT_SECONDS=300
GENAI_PROMPT_TIMEOUT_SECONDS=60
GENAI_VIDEO_API_TIMEOUT_SECONDS=120
GENAI_VIDEO_POLL_TIMEOUT_SECONDS=1800
```

## 本地启动

### 1) 启动后端

```powershell
cd backend
uv sync
uv run uvicorn app.main:app --reload --port 8080
```

### 2) 启动前端

```powershell
cd frontend
npm install
npm run dev
```

### 3) 访问地址

- 前端：`http://localhost:3000`
- 后端 OpenAPI：`http://localhost:8080/docs`

## 主要 API（简版）

图像：
- `POST /api/image/generate`
- `GET /api/image/status/{job_id}`
- `POST /api/image/edit`
- `POST /api/image/enhance-prompt`
- `GET /api/image/{filename}`

`POST /api/image/generate` 关键参数：
- `generation_mode`：生成模式（`standard` / `pro`，默认 `standard`）
- `image_model`：图片模型（`nano_banana_pro` / `nano_banana_2`，默认 `nano_banana_pro`）
- `resolution`：分辨率（`0.5K`/`1K`/`2K`/`4K`，其中 `0.5K` 仅 `nano_banana_2` 支持，后端会映射为 `512px`）
- `aspect_ratio`：宽高比；`nano_banana_2` 额外支持 `1:4`、`4:1`、`1:8`、`8:1`
- `temperature` / `top_p` / `top_k` / `presence_penalty` / `frequency_penalty` / `max_output_tokens` / `seed`：专业采样参数（可选）
- `output_mime_type`：输出类型（`image/png` 或 `image/jpeg`）
- `output_compression_quality`：输出压缩质量（0-100，仅 JPEG 生效）
- `safety_filter_level`：安全过滤等级（`block_low_and_above` / `block_medium_and_above` / `block_only_high`）
- 安全过滤实现说明：后端会自动映射到 Gemini `generate_content/chats` 兼容的通用 HarmCategory（避免 `HARM_CATEGORY_IMAGE_*` 触发 400）
- `reference_images`：多张参考图 base64 数组（推荐，最多 14 张）
- `reference_image`：单张参考图 base64（兼容旧调用）

`GET /api/image/library` 补充参数：
- `generation_mode`：图库筛选模式（`standard` 仅普通图；`pro` 仅专业图）

视频：
- `POST /api/video/generate`
- `GET /api/video/status/{job_id}`
- `POST /api/video/extend`
- `GET /api/video/{filename}`

历史：
- `GET /api/history`
- `DELETE /api/history/{record_id}`
- `DELETE /api/history`

## 排障建议

- 生成失败先看 `logs/app.log`
- 任务一直 pending/processing 时，优先检查 API Key、网络、模型可用性、超时配置
- 图片/视频访问失败时，检查 `output/images` 与 `output/videos` 是否已落盘
- 若专业生图选择 JPEG，请确认文件后缀为 `.jpg/.jpeg` 且接口可正常访问

## 说明

- 当前任务状态和会话在内存中管理，服务重启后会丢失未完成任务。
- 历史记录默认写入 `data/history.json`。
