"""
Gen_PhotoNVideo 数据模型定义

该模块定义了所有 API 请求和响应的数据结构
使用 Pydantic 进行数据验证
"""

from typing import Optional, List, Literal
from pydantic import BaseModel, Field
from datetime import datetime


# ==================== 图像相关模型 ====================

class ImageGenerateRequest(BaseModel):
    """
    图像生成请求模型

    Attributes:
        prompt: 生成图像的文本描述
        aspect_ratio: 图像宽高比，如 "16:9", "1:1" 等
        resolution: 图像分辨率，必须大写: "1K", "2K", "4K"
        count: 生成图像数量，1-10 张
        use_google_search: 是否使用 Google 搜索增强生成
        reference_image: 参考图像的 base64 编码 (可选)
    """
    prompt: str = Field(..., min_length=1, max_length=2000, description="图像描述")
    aspect_ratio: str = Field(
        default="3:2",
        pattern=r"^\d+:\d+$",
        description="宽高比"
    )
    resolution: Literal["1K", "2K", "4K"] = Field(
        default="2K",
        description="分辨率 (必须大写)"
    )
    count: int = Field(default=1, ge=1, le=10, description="生成数量")
    use_google_search: bool = Field(default=False, description="使用 Google 搜索")
    reference_image: Optional[str] = Field(default=None, description="参考图 base64")


class ImageEditRequest(BaseModel):
    """
    图像编辑请求模型 (多轮对话)

    Attributes:
        session_id: 会话 ID，用于多轮对话
        prompt: 编辑指令
        aspect_ratio: 图像宽高比
        resolution: 图像分辨率
    """
    session_id: str = Field(..., description="会话 ID")
    prompt: str = Field(..., min_length=1, max_length=2000, description="编辑指令")
    aspect_ratio: str = Field(default="3:2", description="宽高比")
    resolution: Literal["1K", "2K", "4K"] = Field(default="2K", description="分辨率")


class EnhancePromptRequest(BaseModel):
    """
    提示词优化请求模型

    Attributes:
        prompt: 原始提示词
        target_type: 目标类型 (image 或 video)
    """
    prompt: str = Field(..., min_length=1, max_length=500, description="原始提示词")
    target_type: Literal["image", "video"] = Field(
        default="image",
        description="目标类型"
    )


class ImageResponse(BaseModel):
    """
    图像生成响应模型

    Attributes:
        success: 是否成功
        job_id: 任务ID (异步模式)
        images: 生成的图像文件名列表 (同步模式,保留兼容性)
        session_id: 会话 ID (用于多轮对话)
        message: 附加消息
    """
    success: bool
    job_id: Optional[str] = None
    images: List[str] = Field(default_factory=list)
    session_id: Optional[str] = None
    message: Optional[str] = None


class ImageStatusResponse(BaseModel):
    """
    图像生成状态响应模型

    Attributes:
        job_id: 任务ID
        status: 任务状态 (pending/processing/completed/failed)
        progress: 进度百分比 (0-100)
        images: 生成的图像文件名列表
        session_id: 会话ID
        message: 消息 (错误消息或其他信息)
        prompt: 生成图像使用的提示词
        aspect_ratio: 生成图像使用的宽高比
    """
    job_id: str
    status: str
    progress: int
    images: List[str] = Field(default_factory=list)
    session_id: Optional[str] = None
    message: Optional[str] = None
    prompt: str = ""
    aspect_ratio: str = "3:2"


# ==================== 视频相关模型 ====================

class VideoGenerateRequest(BaseModel):
    """
    视频生成请求模型

    Attributes:
        prompt: 视频描述
        mode: 生成模式 (text2vid/img2vid/first_last)
        aspect_ratio: 视频宽高比 (16:9 或 9:16)
        resolution: 视频分辨率 (720p/1080p/4k)
        duration_seconds: 视频秒数 (4/6/8)，1080p 和 4k 仅支持 8 秒
        first_frame: 首帧图像 base64 (可选)
        last_frame: 尾帧图像 base64 (可选)
    """
    prompt: str = Field(..., min_length=1, max_length=2000, description="视频描述")
    mode: Literal["text2vid", "img2vid", "first_last"] = Field(
        default="text2vid",
        description="生成模式"
    )
    aspect_ratio: Literal["16:9", "9:16"] = Field(
        default="16:9",
        description="宽高比"
    )
    resolution: Literal["720p", "1080p", "4k"] = Field(
        default="720p",
        description="分辨率"
    )
    duration_seconds: Literal["4", "6", "8"] = Field(
        default="8",
        description="视频秒数，1080p 和 4k 仅支持 8 秒"
    )
    first_frame: Optional[str] = Field(default=None, description="首帧图像 base64")
    last_frame: Optional[str] = Field(default=None, description="尾帧图像 base64")


class VideoExtendRequest(BaseModel):
    """
    视频延长请求模型

    Attributes:
        video_id: 要延长的视频 ID
        prompt: 延长部分的描述
        aspect_ratio: 视频宽高比 (16:9 或 9:16)
    """
    video_id: str = Field(..., description="视频 ID")
    prompt: str = Field(..., min_length=1, max_length=2000, description="延长描述")
    aspect_ratio: Literal["16:9", "9:16"] = Field(default="16:9", description="视频宽高比")


class VideoStatusResponse(BaseModel):
    """
    视频生成状态响应模型

    Attributes:
        job_id: 任务 ID
        status: 任务状态
        progress: 进度百分比 (0-100)
        video_url: 视频 URL (完成后)
        message: 状态消息
    """
    job_id: str
    status: Literal["pending", "processing", "completed", "failed"]
    progress: int = Field(default=0, ge=0, le=100)
    video_url: Optional[str] = None
    message: Optional[str] = None


class VideoResponse(BaseModel):
    """
    视频生成响应模型

    Attributes:
        success: 是否成功
        job_id: 任务 ID
        message: 消息
    """
    success: bool
    job_id: str
    message: Optional[str] = None


# ==================== 历史记录模型 ====================

class HistoryItem(BaseModel):
    """
    历史记录项模型

    Attributes:
        id: 记录 ID
        type: 类型 (image 或 video)
        prompt: 使用的提示词
        filename: 生成的文件名
        created_at: 创建时间
        params: 生成参数
    """
    id: str
    type: Literal["image", "video"]
    prompt: str
    filename: str
    created_at: datetime
    params: dict = Field(default_factory=dict)


class HistoryResponse(BaseModel):
    """
    历史记录响应模型

    Attributes:
        items: 历史记录列表
        total: 总数
    """
    items: List[HistoryItem]
    total: int


# ==================== 通用响应模型 ====================

class ErrorResponse(BaseModel):
    """
    错误响应模型

    Attributes:
        success: 始终为 False
        error: 错误消息
        detail: 详细信息 (可选)
    """
    success: bool = False
    error: str
    detail: Optional[str] = None


class PromptResponse(BaseModel):
    """
    提示词优化响应模型

    Attributes:
        success: 是否成功
        enhanced_prompt: 优化后的提示词
    """
    success: bool
    enhanced_prompt: str
