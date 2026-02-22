"""
图像生成 API 路由模块

提供图像生成、编辑和提示词优化的 API 端点
"""

from datetime import date
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse

from ..config import Config, logger
from ..models import (
    ImageGenerateRequest,
    ImageEditRequest,
    EnhancePromptRequest,
    ImageResponse,
    ImageStatusResponse,
    ImageLibraryResponse,
    PromptResponse,
    ErrorResponse,
)
from ..services import image_service, prompt_service, history_service
from ..utils import safe_resolve_path, raise_internal_error

# 创建路由器
router = APIRouter(prefix="/api/image", tags=["图像"])


@router.post(
    "/generate",
    response_model=ImageResponse,
    responses={500: {"model": ErrorResponse}},
    summary="生成图像",
    description="根据文本描述生成图像(异步),立即返回job_id"
)
async def generate_image(request: ImageGenerateRequest) -> ImageResponse:
    """
    生成图像 API (异步)

    立即返回job_id,客户端通过/status/{job_id}查询进度

    Args:
        request: 图像生成请求,包含:
            - prompt: 图像描述
            - aspect_ratio: 宽高比
            - resolution: 分辨率 (1K/2K/4K)
            - count: 生成数量 (1-10)
            - use_google_search: 是否使用 Google 搜索
            - reference_images: 多张参考图 base64 (可选, 最多 14 张)
            - reference_image: 参考图 base64 (可选)

    Returns:
        ImageResponse: 包含job_id
    """
    try:
        logger.info(f"收到图像生成请求: prompt={request.prompt[:50]}...")

        # 调用图像服务启动后台任务
        job_id = await image_service.generate_images(
            prompt=request.prompt,
            aspect_ratio=request.aspect_ratio,
            resolution=request.resolution,
            count=request.count,
            use_google_search=request.use_google_search,
            reference_images=request.reference_images,
            reference_image=request.reference_image,
        )

        return ImageResponse(
            success=True,
            job_id=job_id,
            message="图像生成任务已启动"
        )

    except ValueError as e:
        logger.warning(f"图像生成请求无效: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # 统一错误处理，避免泄露内部异常信息
        raise_internal_error("启动图像生成任务失败", e)


@router.get(
    "/status/{job_id}",
    response_model=ImageStatusResponse,
    responses={404: {"model": ErrorResponse}},
    summary="查询图像生成状态",
    description="查询图像生成任务的状态和进度"
)
async def get_image_status(job_id: str) -> ImageStatusResponse:
    """
    查询图像生成任务状态 API

    Args:
        job_id: 任务ID

    Returns:
        ImageStatusResponse: 任务状态信息
    """
    job = image_service.get_job_status(job_id)

    if not job:
        raise HTTPException(status_code=404, detail="任务不存在")

    return ImageStatusResponse(
        job_id=job.job_id,
        status=job.status.value,
        progress=job.progress,
        images=job.images,
        session_id=job.session_id,
        message=job.error_message if job.status.value == "failed" else None,
        prompt=job.prompt,
        aspect_ratio=job.aspect_ratio
    )


@router.post(
    "/edit",
    response_model=ImageResponse,
    responses={500: {"model": ErrorResponse}},
    summary="编辑图像",
    description="在多轮对话中编辑图像"
)
async def edit_image(request: ImageEditRequest) -> ImageResponse:
    """
    编辑图像 API (多轮对话)

    Args:
        request: 图像编辑请求，包含:
            - session_id: 会话 ID
            - prompt: 编辑指令
            - aspect_ratio: 宽高比
            - resolution: 分辨率

    Returns:
        ImageResponse: 包含编辑后的图像文件名列表
    """
    try:
        logger.info(f"收到图像编辑请求: session_id={request.session_id}")

        # 调用图像服务编辑图像
        images = await image_service.edit_image(
            session_id=request.session_id,
            prompt=request.prompt,
            aspect_ratio=request.aspect_ratio,
            resolution=request.resolution
        )

        # 保存历史记录
        for filename in images:
            await history_service.add_record(
                record_type="image",
                prompt=request.prompt,
                filename=filename,
                params={
                    "aspect_ratio": request.aspect_ratio,
                    "resolution": request.resolution,
                    "is_edit": True,
                    "session_id": request.session_id
                }
            )

        return ImageResponse(
            success=True,
            images=images,
            session_id=request.session_id,
            message=f"成功编辑生成 {len(images)} 张图像"
        )

    except ValueError as e:
        logger.warning(f"图像编辑请求无效: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise_internal_error("图像编辑失败", e)


@router.post(
    "/enhance-prompt",
    response_model=PromptResponse,
    responses={500: {"model": ErrorResponse}},
    summary="优化提示词",
    description="使用 AI 优化图像生成提示词"
)
async def enhance_prompt(request: EnhancePromptRequest) -> PromptResponse:
    """
    优化提示词 API

    Args:
        request: 提示词优化请求，包含:
            - prompt: 原始提示词
            - target_type: 目标类型 (image/video)

    Returns:
        PromptResponse: 包含优化后的提示词
    """
    try:
        logger.info(f"收到提示词优化请求: {request.prompt[:50]}...")

        # 调用提示词服务
        enhanced = await prompt_service.enhance_prompt(
            prompt=request.prompt,
            target_type=request.target_type
        )

        return PromptResponse(
            success=True,
            enhanced_prompt=enhanced
        )

    except Exception as e:
        raise_internal_error("提示词优化失败", e)


@router.get(
    "/library",
    response_model=ImageLibraryResponse,
    summary="获取图片图库",
    description="自动扫描 output/images，按天返回图片并补全历史提示词"
)
async def get_image_library(
    days: int = Query(7, ge=1, le=30, description="首次加载最近天数"),
    before: Optional[str] = Query(None, description="分页锚点（YYYY-MM-DD）"),
    limit_days: int = Query(7, ge=1, le=30, description="分页每次返回天数")
) -> ImageLibraryResponse:
    """
    获取按天分组的图片图库 API

    Args:
        days: 首次加载最近多少天
        before: 分页锚点，只返回该日期之前（更早）的数据
        limit_days: 分页每次最多返回多少天

    Returns:
        ImageLibraryResponse: 图库分组数据
    """
    try:
        before_date: Optional[date] = None
        if before:
            try:
                before_date = date.fromisoformat(before)
            except ValueError:
                raise HTTPException(status_code=400, detail="before 参数格式错误，应为 YYYY-MM-DD")

        library_data = await history_service.get_image_library(
            days=days,
            before=before_date,
            limit_days=limit_days
        )

        return ImageLibraryResponse(**library_data)

    except HTTPException:
        raise
    except Exception as e:
        raise_internal_error("获取图片图库失败", e)


@router.get(
    "/{filename}",
    summary="获取图像",
    description="获取生成的图像文件"
)
async def get_image(filename: str) -> FileResponse:
    """
    获取图像文件 API

    Args:
        filename: 图像文件名

    Returns:
        FileResponse: 图像文件
    """
    try:
        # 使用安全路径解析，防止路径穿越
        file_path = safe_resolve_path(
            base_dir=Config.IMAGES_DIR,
            filename=filename,
            allowed_extensions={".png"}
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="图像不存在")

    return FileResponse(
        path=file_path,
        media_type="image/png",
        filename=filename
    )


@router.delete(
    "/session/{session_id}",
    summary="关闭会话",
    description="关闭多轮对话会话"
)
async def close_session(session_id: str) -> dict:
    """
    关闭会话 API

    Args:
        session_id: 会话 ID

    Returns:
        dict: 操作结果
    """
    success = image_service.close_session(session_id)

    if success:
        return {"success": True, "message": "会话已关闭"}
    else:
        raise HTTPException(status_code=404, detail="会话不存在")
