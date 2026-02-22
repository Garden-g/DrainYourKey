"""
视频生成 API 路由模块

提供视频生成、状态查询和视频延长的 API 端点
"""

from datetime import date
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse

from ..config import Config, logger
from ..models import (
    VideoGenerateRequest,
    VideoExtendRequest,
    VideoStatusResponse,
    VideoResponse,
    VideoLibraryResponse,
    ErrorResponse,
)
from ..services import video_service, JobStatus, history_service
from ..utils import safe_resolve_path, raise_internal_error

# 创建路由器
router = APIRouter(prefix="/api/video", tags=["视频"])


@router.post(
    "/generate",
    response_model=VideoResponse,
    responses={500: {"model": ErrorResponse}},
    summary="生成视频",
    description="根据文本描述生成视频，支持多种模式"
)
async def generate_video(request: VideoGenerateRequest) -> VideoResponse:
    """
    生成视频 API

    Args:
        request: 视频生成请求，包含:
            - prompt: 视频描述
            - mode: 生成模式 (text2vid/img2vid/first_last)
            - aspect_ratio: 宽高比 (16:9/9:16)
            - resolution: 分辨率 (720p/1080p/4k)
            - first_frame: 首帧图像 base64 (可选)
            - last_frame: 尾帧图像 base64 (可选)

    Returns:
        VideoResponse: 包含任务 ID

    Note:
        视频生成是异步操作，需要通过 /status/{job_id} 查询进度
    """
    try:
        logger.info(f"收到视频生成请求: mode={request.mode}")

        # 验证请求参数
        if request.mode == "img2vid" and not request.first_frame:
            raise HTTPException(
                status_code=400,
                detail="图生视频模式需要提供首帧图像"
            )

        if request.mode == "first_last" and not request.first_frame:
            raise HTTPException(
                status_code=400,
                detail="首尾帧模式需要提供首帧图像"
            )
        if request.mode == "first_last" and not request.last_frame:
            raise HTTPException(
                status_code=400,
                detail="首尾帧模式需要提供尾帧图像"
            )

        # 1080p 和 4k 仅支持 8 秒
        if request.resolution in ["1080p", "4k"]:
            logger.info(f"使用 {request.resolution} 分辨率，视频长度限制为 8 秒")

        # 启动视频生成任务
        job_id = await video_service.generate_video(
            prompt=request.prompt,
            mode=request.mode,
            aspect_ratio=request.aspect_ratio,
            resolution=request.resolution,
            duration_seconds=request.duration_seconds,
            first_frame=request.first_frame,
            last_frame=request.last_frame
        )

        return VideoResponse(
            success=True,
            job_id=job_id,
            message="视频生成任务已创建，请通过 /status/{job_id} 查询进度"
        )

    except HTTPException:
        raise
    except Exception as e:
        raise_internal_error("视频生成请求失败", e)


@router.post(
    "/extend",
    response_model=VideoResponse,
    responses={500: {"model": ErrorResponse}},
    summary="延长视频",
    description="延长已生成的视频"
)
async def extend_video(request: VideoExtendRequest) -> VideoResponse:
    """
    延长视频 API

    Args:
        request: 视频延长请求，包含:
            - video_id: 原视频的任务 ID
            - prompt: 延长部分的描述
            - aspect_ratio: 视频宽高比 (16:9 或 9:16)

    Returns:
        VideoResponse: 包含新任务 ID

    Note:
        - 仅支持 720p 分辨率的视频延长
        - 视频最长可延长至 148 秒
    """
    try:
        logger.info(f"收到视频延长请求: video_id={request.video_id}")

        job_id = await video_service.extend_video(
            video_id=request.video_id,
            prompt=request.prompt,
            aspect_ratio=request.aspect_ratio
        )

        return VideoResponse(
            success=True,
            job_id=job_id,
            message="视频延长任务已创建"
        )

    except ValueError as e:
        logger.warning(f"视频延长请求无效: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise_internal_error("视频延长请求失败", e)


@router.get(
    "/status/{job_id}",
    response_model=VideoStatusResponse,
    summary="查询视频生成状态",
    description="查询视频生成任务的进度和状态"
)
async def get_video_status(job_id: str) -> VideoStatusResponse:
    """
    查询视频生成状态 API

    Args:
        job_id: 任务 ID

    Returns:
        VideoStatusResponse: 包含任务状态、进度和视频 URL
    """
    job = video_service.get_job_status(job_id)

    if job is None:
        raise HTTPException(status_code=404, detail="任务不存在")

    # 构建响应
    response = VideoStatusResponse(
        job_id=job.job_id,
        status=job.status.value,
        progress=job.progress
    )

    # 如果完成，添加视频 URL
    if job.status == JobStatus.COMPLETED and job.video_filename:
        response.video_url = f"/api/video/{job.video_filename}"
        response.message = "视频生成完成"

    elif job.status == JobStatus.FAILED:
        response.message = job.error_message or "视频生成失败"

    elif job.status == JobStatus.PROCESSING:
        response.message = f"正在生成中... {job.progress}%"

    else:
        response.message = "等待处理"

    return response


@router.get(
    "/library",
    response_model=VideoLibraryResponse,
    summary="获取视频图库",
    description="自动扫描 output/videos，按天返回视频并补全历史提示词与参数"
)
async def get_video_library(
    days: int = Query(7, ge=1, le=30, description="首次加载最近天数"),
    before: Optional[str] = Query(None, description="分页锚点（YYYY-MM-DD）"),
    limit_days: int = Query(7, ge=1, le=30, description="分页每次返回天数")
) -> VideoLibraryResponse:
    """
    获取按天分组的视频图库 API

    Args:
        days: 首次加载最近多少天
        before: 分页锚点，只返回该日期之前（更早）的数据
        limit_days: 分页每次最多返回多少天

    Returns:
        VideoLibraryResponse: 图库分组数据
    """
    try:
        before_date: Optional[date] = None
        if before:
            try:
                before_date = date.fromisoformat(before)
            except ValueError:
                raise HTTPException(status_code=400, detail="before 参数格式错误，应为 YYYY-MM-DD")

        library_data = await history_service.get_video_library(
            days=days,
            before=before_date,
            limit_days=limit_days
        )

        return VideoLibraryResponse(**library_data)

    except HTTPException:
        raise
    except Exception as e:
        raise_internal_error("获取视频图库失败", e)


@router.get(
    "/{filename}",
    summary="获取视频",
    description="获取生成的视频文件"
)
async def get_video(filename: str) -> FileResponse:
    """
    获取视频文件 API

    Args:
        filename: 视频文件名

    Returns:
        FileResponse: 视频文件
    """
    try:
        # 使用安全路径解析，防止路径穿越
        file_path = safe_resolve_path(
            base_dir=Config.VIDEOS_DIR,
            filename=filename,
            allowed_extensions={".mp4"}
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="视频不存在")

    return FileResponse(
        path=file_path,
        media_type="video/mp4",
        filename=filename
    )
