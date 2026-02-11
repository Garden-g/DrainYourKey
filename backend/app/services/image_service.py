"""
图像生成服务模块

该模块负责:
- 调用 Gemini API 生成图像
- 管理多轮对话会话
- 处理图像保存和返回
- 管理后台图像生成任务
"""

import uuid
import base64
import time
import asyncio
from typing import List, Optional, Dict, Any
from dataclasses import dataclass
from enum import Enum
from PIL import Image
import io

from google import genai
from google.genai import types

from ..config import Config, logger
from ..utils import (
    generate_filename,
    save_image_from_base64,
    decode_base64_image,
    retry_async,
)
from .history_service import history_service


class JobStatus(str, Enum):
    """图像生成任务状态枚举"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class ImageJob:
    """
    图像生成任务数据类

    Attributes:
        job_id: 任务ID
        status: 任务状态
        progress: 进度百分比
        images: 生成的图像文件名列表
        session_id: 会话ID
        error_message: 错误消息
        created_at: 创建时间戳
        prompt: 生成图像使用的提示词
        aspect_ratio: 生成图像使用的宽高比
    """
    job_id: str
    status: JobStatus
    progress: int = 0
    images: List[str] = None
    session_id: Optional[str] = None
    error_message: Optional[str] = None
    created_at: float = 0
    prompt: str = ""
    aspect_ratio: str = "3:2"

    def __post_init__(self):
        """初始化后处理"""
        if self.images is None:
            self.images = []


class ImageService:
    """
    图像生成服务类

    提供图像生成、编辑和多轮对话功能
    """

    def __init__(self):
        """
        初始化图像服务

        创建 Gemini API 客户端和会话存储
        """
        # 延迟初始化 Gemini 客户端，避免配置缺失导致应用启动失败
        self.client: Optional[genai.Client] = None

        # 存储多轮对话会话 {session_id: chat_object}
        self._sessions: Dict[str, Any] = {}
        # 会话最近活跃时间 {session_id: timestamp}
        self._session_timestamps: Dict[str, float] = {}

        # 存储图像生成任务 {job_id: ImageJob}
        self._jobs: Dict[str, ImageJob] = {}

        logger.info("图像服务初始化完成")

    def _ensure_client(self) -> genai.Client:
        """
        确保 Gemini 客户端可用

        Returns:
            genai.Client: 可用的 Gemini 客户端

        Raises:
            ValueError: 当 API Key 未配置时
        """
        if self.client is None:
            if not Config.GOOGLE_CLOUD_API_KEY:
                raise ValueError("GOOGLE_CLOUD_API_KEY 未设置")
            # 延迟创建客户端，降低导入时失败的概率
            self.client = genai.Client(api_key=Config.GOOGLE_CLOUD_API_KEY)
            logger.info("Gemini 客户端已初始化")
        return self.client

    def _optimize_prompt_for_google_search(self, prompt: str) -> tuple[str, bool]:
        """
        优化提示词以适配谷歌搜索图像生成

        当用户启用谷歌搜索时，如果提示词不明确要求生成图像，
        API 可能只返回文本而不是图像。此方法自动检测并优化提示词。

        Args:
            prompt: 原始提示词

        Returns:
            tuple[str, bool]: (优化后的提示词, 是否进行了优化)
        """
        # 检测是否已经包含图像生成关键词
        image_keywords = [
            # 中文关键词
            "生成", "创建", "制作", "绘制", "画", "可视化", "图表", "信息图",
            "图片", "图像", "照片", "插图", "海报", "设计",
            # 英文关键词
            "generate", "create", "make", "draw", "paint", "visualize", "chart",
            "infographic", "image", "picture", "photo", "illustration", "poster", "design"
        ]

        prompt_lower = prompt.lower()
        has_keyword = any(keyword in prompt_lower for keyword in image_keywords)

        if has_keyword:
            # 提示词已经明确要求生成图像，无需优化
            return prompt, False

        # 检测提示词语言（简单判断：是否包含中文字符）
        has_chinese = any('\u4e00' <= char <= '\u9fff' for char in prompt)

        if has_chinese:
            # 中文提示词
            optimized = f"生成一张关于以下内容的信息图表：{prompt}"
        else:
            # 英文提示词
            optimized = f"Generate an infographic about: {prompt}"

        return optimized, True

    def _normalize_reference_images(
        self,
        reference_images: Optional[List[str]] = None,
        reference_image: Optional[str] = None
    ) -> List[str]:
        """
        归一化参考图输入，统一为多图列表

        兼容策略：
        1. 兼容旧字段 reference_image（单图）
        2. 支持新字段 reference_images（多图）
        3. 两者同时存在时，按顺序合并并去重
        4. 限制最多 14 张（Gemini 3 Pro Image 当前上限）

        Args:
            reference_images: 多图参考输入
            reference_image: 旧版单图参考输入

        Returns:
            List[str]: 清洗后的参考图 base64 列表

        Raises:
            ValueError: 当参考图数量超限或数据格式不合法时抛出异常
        """
        merged: List[str] = []

        if reference_image and reference_image.strip():
            merged.append(reference_image.strip())

        if reference_images:
            for image_data in reference_images:
                if not isinstance(image_data, str):
                    raise ValueError("reference_images 中存在非字符串项")
                cleaned = image_data.strip()
                if cleaned:
                    merged.append(cleaned)

        # 按输入顺序去重，避免同图重复传入影响稳定性
        deduplicated: List[str] = []
        seen = set()
        for image_data in merged:
            if image_data not in seen:
                seen.add(image_data)
                deduplicated.append(image_data)

        if len(deduplicated) > 14:
            raise ValueError("参考图最多支持 14 张")

        return deduplicated

    def _cleanup_expired(self) -> None:
        """
        清理过期任务和会话，避免内存膨胀
        """
        now = time.time()
        job_ttl_seconds = Config.JOB_TTL_HOURS * 3600
        session_ttl_seconds = Config.SESSION_TTL_HOURS * 3600

        # 清理过期任务
        for job_id, job in list(self._jobs.items()):
            age = now - job.created_at

            # 处理超时的进行中任务
            if job.status in {JobStatus.PENDING, JobStatus.PROCESSING} and age > Config.PROCESSING_JOB_MAX_SECONDS:
                job.status = JobStatus.FAILED
                job.error_message = "任务超时"
                job.progress = min(job.progress, 99)

            # 删除已完成或失败的历史任务
            if job.status in {JobStatus.COMPLETED, JobStatus.FAILED} and age > job_ttl_seconds:
                del self._jobs[job_id]

        # 清理过期会话
        for session_id, last_active in list(self._session_timestamps.items()):
            if now - last_active > session_ttl_seconds:
                self._sessions.pop(session_id, None)
                del self._session_timestamps[session_id]
                logger.info(f"清理过期会话: {session_id}")

    async def generate_images(
        self,
        prompt: str,
        aspect_ratio: str = "3:2",
        resolution: str = "2K",
        count: int = 1,
        use_google_search: bool = False,
        reference_images: Optional[List[str]] = None,
        reference_image: Optional[str] = None
    ) -> str:
        """
        启动图像生成任务(后台运行)

        Args:
            prompt: 图像描述文本
            aspect_ratio: 宽高比 (如 "16:9", "1:1")
            resolution: 分辨率 (必须大写: "1K", "2K", "4K")
            count: 生成数量 (1-10)
            use_google_search: 是否使用 Google 搜索增强
            reference_images: 参考图像 base64 列表 (可选, 最多 14 张)
            reference_image: 参考图像 base64（兼容旧字段，可选）

        Returns:
            str: 任务ID
        """
        # 先清理过期任务，避免长期运行导致内存膨胀
        self._cleanup_expired()
        normalized_reference_images = self._normalize_reference_images(
            reference_images=reference_images,
            reference_image=reference_image,
        )

        job_id = str(uuid.uuid4())
        logger.info(
            f"创建图像生成任务: job_id={job_id}, count={count}, "
            f"reference_count={len(normalized_reference_images)}"
        )

        # 创建任务记录,保存prompt和aspect_ratio以便状态查询时返回
        job = ImageJob(
            job_id=job_id,
            status=JobStatus.PENDING,
            created_at=time.time(),
            prompt=prompt,
            aspect_ratio=aspect_ratio
        )
        self._jobs[job_id] = job

        # 在后台启动生成任务
        asyncio.create_task(
            self._process_image_generation(
                job_id=job_id,
                prompt=prompt,
                aspect_ratio=aspect_ratio,
                resolution=resolution,
                count=count,
                use_google_search=use_google_search,
                reference_images=normalized_reference_images
            )
        )

        return job_id

    @retry_async(max_retries=3, delay=2.0)
    async def _process_image_generation(
        self,
        job_id: str,
        prompt: str,
        aspect_ratio: str,
        resolution: str,
        count: int,
        use_google_search: bool,
        reference_images: List[str]
    ) -> None:
        """
        处理图像生成任务(后台运行)

        Args:
            job_id: 任务ID
            prompt: 图像描述文本
            aspect_ratio: 宽高比
            resolution: 分辨率
            count: 生成数量
            use_google_search: 是否使用Google搜索
            reference_images: 参考图像列表
        """
        job = self._jobs[job_id]
        job.status = JobStatus.PROCESSING
        job.progress = 10

        try:
            logger.info(
                f"开始处理图像生成: job_id={job_id}, prompt={prompt[:50]}..., "
                f"count={count}, reference_count={len(reference_images)}"
            )

            generated_files: List[str] = []
            session_id = str(uuid.uuid4())

            # 如果使用谷歌搜索，优化提示词
            actual_prompt = prompt
            if use_google_search:
                optimized_prompt, was_optimized = self._optimize_prompt_for_google_search(prompt)
                if was_optimized:
                    logger.info(f"谷歌搜索提示词优化: '{prompt}' -> '{optimized_prompt}'")
                    actual_prompt = optimized_prompt
                else:
                    logger.debug(f"提示词已包含图像生成关键词，无需优化: '{prompt}'")

            # 构建请求内容
            contents = [actual_prompt]

            # 如果有参考图像，按顺序添加到输入内容中
            for index, reference_data in enumerate(reference_images, start=1):
                logger.debug(f"添加第 {index}/{len(reference_images)} 张参考图到请求")
                # 解码图像是 CPU 密集操作，放到线程中执行
                ref_image = await asyncio.to_thread(decode_base64_image, reference_data)
                contents.append(ref_image)

            # 构建配置
            config_dict: Dict[str, Any] = {
                "response_modalities": ["TEXT", "IMAGE"],
                "image_config": types.ImageConfig(
                    aspect_ratio=aspect_ratio,
                    image_size=resolution
                )
            }

            # 如果使用 Google 搜索
            if use_google_search:
                logger.debug("启用 Google 搜索增强")
                config_dict["tools"] = [{"google_search": {}}]

            # 创建多轮对话会话
            client = self._ensure_client()
            # 创建会话属于阻塞调用，使用线程池避免阻塞事件循环
            try:
                chat = await asyncio.wait_for(
                    asyncio.to_thread(
                        client.chats.create,
                        model=Config.IMAGE_MODEL,
                        config=types.GenerateContentConfig(**config_dict)
                    ),
                    timeout=Config.GENAI_IMAGE_TIMEOUT_SECONDS
                )
            except asyncio.TimeoutError:
                raise TimeoutError("图像生成初始化超时")

            # 存储会话
            self._sessions[session_id] = chat
            job.session_id = session_id
            self._session_timestamps[session_id] = time.time()

            job.progress = 20
            # 初始化 images 列表，用于实时更新（前端轮询时可以看到已生成的图片）
            job.images = []

            # 生成指定数量的图像
            # 注意：由于 Gemini API 使用同一个 chat 会话，不支持真正的并发
            # 但我们确保每生成一张就立即更新 job.images，让前端可以实时显示
            for i in range(count):
                logger.debug(f"生成第 {i + 1}/{count} 张图像")

                # 发送请求
                if i == 0:
                    # 发送请求为阻塞调用，需放线程执行并设置超时
                    try:
                        response = await asyncio.wait_for(
                            asyncio.to_thread(chat.send_message, contents),
                            timeout=Config.GENAI_IMAGE_TIMEOUT_SECONDS
                        )
                    except asyncio.TimeoutError:
                        raise TimeoutError("图像生成超时")
                else:
                    # 后续图像使用相同提示词
                    try:
                        response = await asyncio.wait_for(
                            asyncio.to_thread(chat.send_message, f"再生成一张类似的图像: {actual_prompt}"),
                            timeout=Config.GENAI_IMAGE_TIMEOUT_SECONDS
                        )
                    except asyncio.TimeoutError:
                        raise TimeoutError("图像生成超时")

                # 处理响应
                for part in response.parts:
                    if part.inline_data is not None:
                        # 获取图像数据
                        image = part.as_image()

                        # 生成文件名并保存
                        filename = generate_filename("image", "png")
                        file_path = Config.IMAGES_DIR / filename
                        # 图像保存属于磁盘 IO，放线程执行避免阻塞
                        await asyncio.to_thread(image.save, str(file_path))

                        # 立即添加到 job.images，让前端可以实时显示
                        job.images.append(filename)
                        generated_files.append(filename)
                        logger.info(f"图像已保存: {filename} (已完成 {len(job.images)}/{count})")

                # 更新进度（基于已生成的图片数量）
                job.progress = 20 + int(len(job.images) / count * 70)

            # 检查是否生成了图像
            if not generated_files:
                error_msg = "图像生成失败: API 未返回任何图像数据"
                if use_google_search:
                    error_msg += "（可能是谷歌搜索工具导致 API 返回文本而非图像）"
                logger.error(error_msg)
                raise Exception(error_msg)

            # 生成完成（job.images 已经在循环中实时更新了）
            job.status = JobStatus.COMPLETED
            job.progress = 100
            logger.info(f"图像生成完成: job_id={job_id}, 共 {len(job.images)} 张")

            # 保存历史记录 (生成完成后一次性写入)
            try:
                for filename in generated_files:
                    await history_service.add_record(
                        record_type="image",
                        prompt=prompt,
                        filename=filename,
                        params={
                            "aspect_ratio": aspect_ratio,
                            "resolution": resolution,
                            "count": count,
                            "use_google_search": use_google_search,
                            "reference_image_count": len(reference_images),
                            "session_id": session_id,
                        }
                    )
            except Exception as history_error:
                # 历史记录失败不影响主流程
                logger.warning(f"保存图像历史记录失败: {history_error}")

        except Exception as e:
            # 生成失败
            job.status = JobStatus.FAILED
            job.error_message = str(e) or "图像生成失败"
            logger.error(f"图像生成失败: job_id={job_id}, error={e}")

    def get_job_status(self, job_id: str) -> Optional[ImageJob]:
        """
        获取任务状态

        Args:
            job_id: 任务ID

        Returns:
            Optional[ImageJob]: 任务对象,如果不存在则返回None
        """
        # 查询前清理过期任务
        self._cleanup_expired()
        return self._jobs.get(job_id)

    @retry_async(max_retries=3, delay=2.0)
    async def generate_images_sync(
        self,
        prompt: str,
        aspect_ratio: str = "3:2",
        resolution: str = "2K",
        count: int = 1,
        use_google_search: bool = False,
        reference_images: Optional[List[str]] = None,
        reference_image: Optional[str] = None
    ) -> tuple[List[str], Optional[str]]:
        """
        生成图像

        Args:
            prompt: 图像描述文本
            aspect_ratio: 宽高比 (如 "16:9", "1:1")
            resolution: 分辨率 (必须大写: "1K", "2K", "4K")
            count: 生成数量 (1-10)
            use_google_search: 是否使用 Google 搜索增强
            reference_images: 参考图像 base64 列表 (可选, 最多 14 张)
            reference_image: 参考图像 base64（兼容旧字段，可选）

        Returns:
            tuple[List[str], Optional[str]]: (生成的图像文件名列表, 会话ID)

        Raises:
            Exception: 如果 API 调用失败
        """
        # 同步生成前清理过期任务
        self._cleanup_expired()
        normalized_reference_images = self._normalize_reference_images(
            reference_images=reference_images,
            reference_image=reference_image,
        )
        logger.info(f"开始生成图像: prompt={prompt[:50]}..., count={count}")

        generated_files: List[str] = []
        session_id = str(uuid.uuid4())

        # 如果使用谷歌搜索，优化提示词
        actual_prompt = prompt
        if use_google_search:
            optimized_prompt, was_optimized = self._optimize_prompt_for_google_search(prompt)
            if was_optimized:
                logger.info(f"谷歌搜索提示词优化: '{prompt}' -> '{optimized_prompt}'")
                actual_prompt = optimized_prompt
            else:
                logger.debug(f"提示词已包含图像生成关键词，无需优化: '{prompt}'")

        # 构建请求内容
        contents = [actual_prompt]

        # 如果有参考图像，按顺序添加到输入内容中
        for index, reference_data in enumerate(normalized_reference_images, start=1):
            logger.debug(f"添加第 {index}/{len(normalized_reference_images)} 张参考图到请求")
            ref_image = await asyncio.to_thread(decode_base64_image, reference_data)
            contents.append(ref_image)

        # 构建配置
        config_dict: Dict[str, Any] = {
            "response_modalities": ["TEXT", "IMAGE"],
            "image_config": types.ImageConfig(
                aspect_ratio=aspect_ratio,
                image_size=resolution
            )
        }

        # 如果使用 Google 搜索
        if use_google_search:
            logger.debug("启用 Google 搜索增强")
            config_dict["tools"] = [{"google_search": {}}]

        # 创建多轮对话会话
        client = self._ensure_client()
        try:
            chat = await asyncio.wait_for(
                asyncio.to_thread(
                    client.chats.create,
                    model=Config.IMAGE_MODEL,
                    config=types.GenerateContentConfig(**config_dict)
                ),
                timeout=Config.GENAI_IMAGE_TIMEOUT_SECONDS
            )
        except asyncio.TimeoutError:
            raise TimeoutError("图像生成初始化超时")

        # 存储会话
        self._sessions[session_id] = chat
        self._session_timestamps[session_id] = time.time()

        # 生成指定数量的图像
        for i in range(count):
            logger.debug(f"生成第 {i + 1}/{count} 张图像")

            # 发送请求
            if i == 0:
                try:
                    response = await asyncio.wait_for(
                        asyncio.to_thread(chat.send_message, contents),
                        timeout=Config.GENAI_IMAGE_TIMEOUT_SECONDS
                    )
                except asyncio.TimeoutError:
                    raise TimeoutError("图像生成超时")
            else:
                # 后续图像使用相同提示词
                try:
                    response = await asyncio.wait_for(
                        asyncio.to_thread(chat.send_message, f"再生成一张类似的图像: {actual_prompt}"),
                        timeout=Config.GENAI_IMAGE_TIMEOUT_SECONDS
                    )
                except asyncio.TimeoutError:
                    raise TimeoutError("图像生成超时")

            # 处理响应
            for part in response.parts:
                if part.inline_data is not None:
                    # 获取图像数据
                    image = part.as_image()

                    # 生成文件名并保存
                    filename = generate_filename("image", "png")
                    file_path = Config.IMAGES_DIR / filename
                    await asyncio.to_thread(image.save, str(file_path))

                    generated_files.append(filename)
                    logger.info(f"图像已保存: {filename}")

        logger.info(f"图像生成完成，共 {len(generated_files)} 张")
        # 同步模式也写入历史记录，保持一致性
        try:
            for filename in generated_files:
                await history_service.add_record(
                    record_type="image",
                    prompt=prompt,
                    filename=filename,
                    params={
                        "aspect_ratio": aspect_ratio,
                        "resolution": resolution,
                        "count": count,
                        "use_google_search": use_google_search,
                        "reference_image_count": len(normalized_reference_images),
                        "session_id": session_id,
                    }
                )
        except Exception as history_error:
            logger.warning(f"保存图像历史记录失败: {history_error}")
        return generated_files, session_id

    @retry_async(max_retries=3, delay=2.0)
    async def edit_image(
        self,
        session_id: str,
        prompt: str,
        aspect_ratio: str = "3:2",
        resolution: str = "2K"
    ) -> List[str]:
        """
        编辑图像 (多轮对话)

        在现有会话中继续编辑图像

        Args:
            session_id: 会话 ID
            prompt: 编辑指令
            aspect_ratio: 宽高比
            resolution: 分辨率

        Returns:
            List[str]: 生成的图像文件名列表

        Raises:
            ValueError: 如果会话不存在
        """
        logger.info(f"编辑图像: session_id={session_id}, prompt={prompt[:50]}...")

        # 获取会话
        # 编辑前清理过期会话，避免使用无效会话
        self._cleanup_expired()
        chat = self._sessions.get(session_id)
        if chat is None:
            raise ValueError(f"会话不存在: {session_id}")

        generated_files: List[str] = []

        # 发送编辑请求
        try:
            response = await asyncio.wait_for(
                asyncio.to_thread(
                    chat.send_message,
                    prompt,
                    config=types.GenerateContentConfig(
                        image_config=types.ImageConfig(
                            aspect_ratio=aspect_ratio,
                            image_size=resolution
                        )
                    )
                ),
                timeout=Config.GENAI_IMAGE_TIMEOUT_SECONDS
            )
        except asyncio.TimeoutError:
            raise TimeoutError("图像编辑超时")

        # 处理响应
        for part in response.parts:
            if part.inline_data is not None:
                image = part.as_image()
                filename = generate_filename("image", "png")
                file_path = Config.IMAGES_DIR / filename
                await asyncio.to_thread(image.save, str(file_path))
                generated_files.append(filename)
                logger.info(f"编辑后的图像已保存: {filename}")

        # 更新会话活跃时间，避免被误清理
        self._session_timestamps[session_id] = time.time()
        return generated_files

    def close_session(self, session_id: str) -> bool:
        """
        关闭会话

        Args:
            session_id: 会话 ID

        Returns:
            bool: 是否成功关闭
        """
        if session_id in self._sessions:
            del self._sessions[session_id]
            self._session_timestamps.pop(session_id, None)
            logger.info(f"会话已关闭: {session_id}")
            return True
        return False

    def get_session_count(self) -> int:
        """
        获取当前活跃会话数量

        Returns:
            int: 活跃会话数量
        """
        return len(self._sessions)


# 创建全局服务实例
image_service = ImageService()
