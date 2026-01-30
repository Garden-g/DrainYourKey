"""
视频生成服务模块

该模块负责:
- 调用 Veo API 生成视频
- 管理视频生成任务状态
- 处理视频延长功能
"""

import uuid
import asyncio
import time
from typing import Optional, Dict, Any
from dataclasses import dataclass
from enum import Enum

from google import genai
from google.genai import types

from ..config import Config, logger
from ..utils import (
    generate_filename,
    save_video_from_bytes,
    decode_base64_image,
    retry_async,
)


class JobStatus(Enum):
    """视频生成任务状态枚举"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class VideoJob:
    """
    视频生成任务数据类

    Attributes:
        job_id: 任务 ID
        status: 任务状态
        progress: 进度百分比
        video_filename: 生成的视频文件名
        error_message: 错误消息
        operation: Gemini API 操作对象
        created_at: 创建时间戳
    """
    job_id: str
    status: JobStatus
    progress: int = 0
    video_filename: Optional[str] = None
    error_message: Optional[str] = None
    operation: Any = None
    created_at: float = 0.0


class VideoService:
    """
    视频生成服务类

    提供视频生成、状态查询和视频延长功能
    """

    def __init__(self):
        """
        初始化视频服务

        创建 Gemini API 客户端和任务存储
        """
        # 初始化 Gemini 客户端
        self.client = genai.Client(api_key=Config.GOOGLE_CLOUD_API_KEY)

        # 存储视频生成任务 {job_id: VideoJob}
        self._jobs: Dict[str, VideoJob] = {}

        # 存储已生成的视频对象 (用于视频延长)
        self._generated_videos: Dict[str, Any] = {}

        logger.info("视频服务初始化完成")

    async def generate_video(
        self,
        prompt: str,
        mode: str = "text2vid",
        aspect_ratio: str = "16:9",
        resolution: str = "720p",
        first_frame: Optional[str] = None,
        last_frame: Optional[str] = None
    ) -> str:
        """
        启动视频生成任务

        Args:
            prompt: 视频描述文本
            mode: 生成模式 (text2vid/img2vid/first_last)
            aspect_ratio: 宽高比 (16:9 或 9:16)
            resolution: 分辨率 (720p/1080p/4k)
            first_frame: 首帧图像 base64 (可选)
            last_frame: 尾帧图像 base64 (可选)

        Returns:
            str: 任务 ID

        Note:
            1080p 和 4k 分辨率仅支持 8 秒视频
        """
        job_id = str(uuid.uuid4())
        logger.info(f"创建视频生成任务: job_id={job_id}, mode={mode}")

        # 创建任务记录
        job = VideoJob(
            job_id=job_id,
            status=JobStatus.PENDING,
            created_at=time.time()
        )
        self._jobs[job_id] = job

        # 在后台启动生成任务
        asyncio.create_task(
            self._process_video_generation(
                job_id=job_id,
                prompt=prompt,
                mode=mode,
                aspect_ratio=aspect_ratio,
                resolution=resolution,
                first_frame=first_frame,
                last_frame=last_frame
            )
        )

        return job_id

    async def _process_video_generation(
        self,
        job_id: str,
        prompt: str,
        mode: str,
        aspect_ratio: str,
        resolution: str,
        first_frame: Optional[str],
        last_frame: Optional[str]
    ) -> None:
        """
        处理视频生成任务 (后台运行)

        Args:
            job_id: 任务 ID
            prompt: 视频描述
            mode: 生成模式
            aspect_ratio: 宽高比
            resolution: 分辨率
            first_frame: 首帧图像
            last_frame: 尾帧图像
        """
        job = self._jobs[job_id]
        job.status = JobStatus.PROCESSING
        job.progress = 10

        try:
            logger.info(f"开始处理视频生成: {job_id}")

            # 构建配置
            config = types.GenerateVideosConfig(
                aspect_ratio=aspect_ratio,
                resolution=resolution
            )

            # 准备图像参数
            image = None
            if mode == "img2vid" and first_frame:
                # 图生视频模式
                pil_image = decode_base64_image(first_frame)

                # 确保图像是RGB模式
                if pil_image.mode != 'RGB':
                    logger.info(f"转换图像模式: {pil_image.mode} -> RGB")
                    pil_image = pil_image.convert('RGB')

                image = pil_image
                logger.debug(f"使用首帧图像生成视频: mode={pil_image.mode}, size={pil_image.size}")

            elif mode == "first_last" and first_frame:
                # 首尾帧插值模式
                pil_image = decode_base64_image(first_frame)

                # 确保图像是RGB模式
                if pil_image.mode != 'RGB':
                    logger.info(f"转换首帧图像模式: {pil_image.mode} -> RGB")
                    pil_image = pil_image.convert('RGB')

                image = pil_image

                if last_frame:
                    last_pil_image = decode_base64_image(last_frame)

                    # 确保尾帧图像也是RGB模式
                    if last_pil_image.mode != 'RGB':
                        logger.info(f"转换尾帧图像模式: {last_pil_image.mode} -> RGB")
                        last_pil_image = last_pil_image.convert('RGB')

                    config = types.GenerateVideosConfig(
                        aspect_ratio=aspect_ratio,
                        resolution=resolution,
                        last_frame=last_pil_image
                    )
                logger.debug(f"使用首尾帧插值生成视频: first_mode={pil_image.mode}, first_size={pil_image.size}")

            job.progress = 20

            # 调用 API 生成视频
            logger.info(f"调用视频生成API: mode={mode}, image_type={type(image)}, has_image={image is not None}")
            if image:
                logger.debug(f"图像详情: mode={image.mode}, size={image.size}, format={image.format}")

            try:
                operation = self.client.models.generate_videos(
                    model=Config.VIDEO_MODEL,
                    prompt=prompt,
                    image=image,
                    config=config
                )
            except Exception as e:
                logger.error(f"视频生成API调用失败: {e}")
                logger.error(f"参数: prompt={prompt}, image_type={type(image)}, config={config}")
                raise

            job.operation = operation
            job.progress = 30

            # 轮询等待视频生成完成
            poll_count = 0
            while not operation.done:
                poll_count += 1
                # 更新进度 (30-90%)
                job.progress = min(30 + poll_count * 5, 90)
                logger.debug(f"视频生成中... 进度: {job.progress}%")

                await asyncio.sleep(10)
                operation = self.client.operations.get(operation)

            job.progress = 95

            # 下载并保存视频
            generated_video = operation.response.generated_videos[0]
            self.client.files.download(file=generated_video.video)

            # 保存视频文件
            filename = generate_filename("video", "mp4")
            file_path = Config.VIDEOS_DIR / filename
            generated_video.video.save(str(file_path))

            # 存储视频对象 (用于后续延长)
            self._generated_videos[job_id] = generated_video.video

            # 更新任务状态
            job.status = JobStatus.COMPLETED
            job.progress = 100
            job.video_filename = filename

            logger.info(f"视频生成完成: {filename}")

        except Exception as e:
            logger.error(f"视频生成失败: {e}")
            job.status = JobStatus.FAILED
            job.error_message = str(e)

    async def extend_video(
        self,
        video_id: str,
        prompt: str
    ) -> str:
        """
        延长视频

        Args:
            video_id: 原视频的任务 ID
            prompt: 延长部分的描述

        Returns:
            str: 新任务 ID

        Raises:
            ValueError: 如果原视频不存在或不可延长

        Note:
            - 仅支持 720p 分辨率的视频延长
            - 视频最长可延长至 148 秒
        """
        # 检查原视频是否存在
        if video_id not in self._generated_videos:
            raise ValueError(f"视频不存在或已过期: {video_id}")

        original_video = self._generated_videos[video_id]

        job_id = str(uuid.uuid4())
        logger.info(f"创建视频延长任务: job_id={job_id}")

        # 创建任务记录
        job = VideoJob(
            job_id=job_id,
            status=JobStatus.PENDING,
            created_at=time.time()
        )
        self._jobs[job_id] = job

        # 在后台启动延长任务
        asyncio.create_task(
            self._process_video_extension(job_id, original_video, prompt)
        )

        return job_id

    async def _process_video_extension(
        self,
        job_id: str,
        original_video: Any,
        prompt: str
    ) -> None:
        """
        处理视频延长任务 (后台运行)

        Args:
            job_id: 任务 ID
            original_video: 原视频对象
            prompt: 延长描述
        """
        job = self._jobs[job_id]
        job.status = JobStatus.PROCESSING
        job.progress = 10

        try:
            logger.info(f"开始处理视频延长: {job_id}")

            # 调用 API 延长视频
            operation = self.client.models.generate_videos(
                model=Config.VIDEO_MODEL,
                video=original_video,
                prompt=prompt,
                config=types.GenerateVideosConfig(
                    number_of_videos=1,
                    resolution="720p"
                )
            )

            job.progress = 30

            # 轮询等待完成
            poll_count = 0
            while not operation.done:
                poll_count += 1
                job.progress = min(30 + poll_count * 5, 90)
                await asyncio.sleep(10)
                operation = self.client.operations.get(operation)

            job.progress = 95

            # 下载并保存视频
            generated_video = operation.response.generated_videos[0]
            self.client.files.download(file=generated_video.video)

            filename = generate_filename("video_extended", "mp4")
            file_path = Config.VIDEOS_DIR / filename
            generated_video.video.save(str(file_path))

            # 存储新视频对象
            self._generated_videos[job_id] = generated_video.video

            job.status = JobStatus.COMPLETED
            job.progress = 100
            job.video_filename = filename

            logger.info(f"视频延长完成: {filename}")

        except Exception as e:
            logger.error(f"视频延长失败: {e}")
            job.status = JobStatus.FAILED
            job.error_message = str(e)

    def get_job_status(self, job_id: str) -> Optional[VideoJob]:
        """
        获取任务状态

        Args:
            job_id: 任务 ID

        Returns:
            Optional[VideoJob]: 任务对象，不存在则返回 None
        """
        return self._jobs.get(job_id)

    def cleanup_old_jobs(self, max_age_hours: int = 24) -> int:
        """
        清理过期任务

        Args:
            max_age_hours: 最大保留时间 (小时)

        Returns:
            int: 清理的任务数量
        """
        current_time = time.time()
        max_age_seconds = max_age_hours * 3600
        cleaned = 0

        job_ids_to_remove = []
        for job_id, job in self._jobs.items():
            if current_time - job.created_at > max_age_seconds:
                job_ids_to_remove.append(job_id)

        for job_id in job_ids_to_remove:
            del self._jobs[job_id]
            if job_id in self._generated_videos:
                del self._generated_videos[job_id]
            cleaned += 1

        if cleaned > 0:
            logger.info(f"清理了 {cleaned} 个过期任务")

        return cleaned


# 创建全局服务实例
video_service = VideoService()
