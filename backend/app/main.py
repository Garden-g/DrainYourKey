"""
Gen_PhotoNVideo 后端主入口

FastAPI 应用程序入口点，负责:
- 初始化 FastAPI 应用
- 注册路由
- 配置 CORS
- 启动服务
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import Config, logger
from .routers import image_router, video_router, history_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    应用生命周期管理

    在应用启动时执行初始化操作，
    在应用关闭时执行清理操作
    """
    # 启动时执行
    logger.info("=" * 50)
    logger.info("Gen_PhotoNVideo 后端服务启动")
    logger.info("=" * 50)

    # 确保必要的目录存在
    Config.ensure_directories()

    # 验证配置
    if not Config.validate():
        logger.warning("配置验证失败，部分功能可能不可用")

    logger.info(f"图像输出目录: {Config.IMAGES_DIR}")
    logger.info(f"视频输出目录: {Config.VIDEOS_DIR}")
    logger.info(f"历史记录文件: {Config.HISTORY_FILE}")

    yield

    # 关闭时执行
    logger.info("Gen_PhotoNVideo 后端服务关闭")


# 创建 FastAPI 应用实例
app = FastAPI(
    title="Gen_PhotoNVideo API",
    description="基于 Google Gemini API 的图像和视频生成服务",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# 配置 CORS (允许前端跨域访问)
app.add_middleware(
    CORSMiddleware,
    allow_origins=Config.CORS_ALLOW_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(image_router)
app.include_router(video_router)
app.include_router(history_router)


@app.get("/", tags=["健康检查"])
async def root():
    """
    根路径健康检查

    Returns:
        dict: 服务状态信息
    """
    return {
        "service": "Gen_PhotoNVideo API",
        "status": "running",
        "version": "1.0.0"
    }


@app.get("/health", tags=["健康检查"])
async def health_check():
    """
    健康检查端点

    Returns:
        dict: 详细的健康状态信息
    """
    return {
        "status": "healthy",
        "api_key_configured": bool(Config.GOOGLE_CLOUD_API_KEY),
        "image_model": Config.IMAGE_MODEL,
        "video_model": Config.VIDEO_MODEL
    }


# 用于直接运行的入口
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=Config.HOST,
        port=Config.PORT,
        reload=True
    )
