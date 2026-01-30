# Gen_PhotoNVideo 项目规范

## 开发日志

开发日志存放在 `devlogs/` 目录下，按日期命名 (如 `2026-01-30.md`)。

每次开发完成后，请更新或创建当天的开发日志，记录：
- 完成的功能
- 文件变更
- 待办事项
- 遇到的问题和解决方案

## 必须遵守的文档

开发本项目时，必须严格遵守以下文档：

### UI 设计
- **UI.html** - 前端界面设计规范，包含所有组件和交互逻辑

### API 文档
- **BananaPro_docs.md** - Gemini 3 Pro Image 图像生成 API 使用规范
- **Veo_docs.md** - Veo 3.1 视频生成 API 使用规范
- **Batch_docs.md** - 批量图像生成 API 使用规范

## 技术栈

- **前端**: React + Vite + Tailwind CSS
- **后端**: Python + FastAPI
- **API**: Google Gemini API (google-genai SDK)

## 环境变量

```env
GOOGLE_CLOUD_API_KEY=your_api_key_here
```

## 注意事项

1. 分辨率参数必须大写：`1K`, `2K`, `4K`
2. 视频生成是异步操作，需要轮询状态
3. 1080p 和 4k 视频仅支持 8 秒
4. 所有代码必须有详细注释
5. 必须配置日志记录
