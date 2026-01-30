"""
文件工具函数模块

提供文件操作相关的工具函数:
- 生成带时间戳的文件名
- 保存图像和视频文件
- 读取和写入 JSON 文件
"""

import os
import base64
import json
import asyncio
import aiofiles
from datetime import datetime
from pathlib import Path
from typing import Optional, Any, Iterable
from PIL import Image
import io

from ..config import Config, logger


def generate_filename(prefix: str, extension: str) -> str:
    """
    生成带时间戳的文件名

    Args:
        prefix: 文件名前缀，如 "image" 或 "video"
        extension: 文件扩展名，如 "png" 或 "mp4"

    Returns:
        str: 格式为 "{prefix}_{timestamp}.{extension}" 的文件名

    Example:
        >>> generate_filename("image", "png")
        "image_20240115_143052_123456.png"
    """
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    return f"{prefix}_{timestamp}.{extension}"


async def save_image_from_base64(
    base64_data: str,
    directory: Path,
    filename: Optional[str] = None
) -> str:
    """
    将 base64 编码的图像保存到文件

    Args:
        base64_data: base64 编码的图像数据
        directory: 保存目录
        filename: 文件名 (可选，不提供则自动生成)

    Returns:
        str: 保存的文件名

    Raises:
        ValueError: 如果 base64 数据无效
    """
    try:
        # 移除可能的 data URL 前缀
        if "," in base64_data:
            base64_data = base64_data.split(",")[1]

        # 解码 base64 数据
        image_data = base64.b64decode(base64_data)

        # 生成文件名
        if filename is None:
            filename = generate_filename("image", "png")

        # 确保目录存在
        directory.mkdir(parents=True, exist_ok=True)

        # 保存文件
        file_path = directory / filename
        async with aiofiles.open(file_path, "wb") as f:
            await f.write(image_data)

        logger.info(f"图像已保存: {filename}")
        return filename

    except Exception as e:
        logger.error(f"保存图像失败: {e}")
        raise ValueError(f"无法保存图像: {e}")


async def save_video_from_bytes(
    video_bytes: bytes,
    directory: Path,
    filename: Optional[str] = None
) -> str:
    """
    将视频字节数据保存到文件

    Args:
        video_bytes: 视频字节数据
        directory: 保存目录
        filename: 文件名 (可选，不提供则自动生成)

    Returns:
        str: 保存的文件名
    """
    try:
        # 生成文件名
        if filename is None:
            filename = generate_filename("video", "mp4")

        # 确保目录存在
        directory.mkdir(parents=True, exist_ok=True)

        # 保存文件
        file_path = directory / filename
        async with aiofiles.open(file_path, "wb") as f:
            await f.write(video_bytes)

        logger.info(f"视频已保存: {filename}")
        return filename

    except Exception as e:
        logger.error(f"保存视频失败: {e}")
        raise ValueError(f"无法保存视频: {e}")


def decode_base64_image(base64_data: str) -> Image.Image:
    """
    将 base64 编码的图像解码为 PIL Image 对象

    Args:
        base64_data: base64 编码的图像数据

    Returns:
        Image.Image: PIL Image 对象

    Raises:
        ValueError: 如果解码失败
    """
    try:
        # 移除可能的 data URL 前缀
        if "," in base64_data:
            base64_data = base64_data.split(",")[1]

        # 解码并创建 Image 对象
        image_data = base64.b64decode(base64_data)
        image = Image.open(io.BytesIO(image_data))
        return image

    except Exception as e:
        logger.error(f"解码图像失败: {e}")
        raise ValueError(f"无法解码图像: {e}")


def decode_base64_to_image_bytes(base64_data: str) -> tuple[bytes, str]:
    """
    将 base64 编码的图像解码为二进制字节，并规范化为 PNG

    Args:
        base64_data: base64 编码的图像数据 (可包含 data URL 前缀)

    Returns:
        tuple[bytes, str]: (图像字节, mime 类型)

    Raises:
        ValueError: 如果解码失败
    """
    try:
        # 解析 data URL 头部
        mime_type = "image/png"
        if "," in base64_data and base64_data.strip().startswith("data:"):
            header, base64_data = base64_data.split(",", 1)
            # header 格式: data:image/png;base64
            if ";" in header:
                mime_type = header[5:].split(";")[0] or mime_type

        # 解码 base64 为原始字节
        raw_bytes = base64.b64decode(base64_data)

        # 使用 PIL 规范化为 PNG，避免 RGB/Alpha 兼容问题
        image = Image.open(io.BytesIO(raw_bytes))
        if image.mode != "RGB":
            image = image.convert("RGB")

        buffer = io.BytesIO()
        image.save(buffer, format="PNG")
        return buffer.getvalue(), "image/png"

    except Exception as e:
        logger.error(f"解码图像字节失败: {e}")
        raise ValueError(f"无法解码图像: {e}")


def safe_resolve_path(
    base_dir: Path,
    filename: str,
    allowed_extensions: Optional[Iterable[str]] = None
) -> Path:
    """
    安全解析文件路径，防止路径穿越

    Args:
        base_dir: 允许访问的基础目录
        filename: 用户提供的文件名
        allowed_extensions: 允许的扩展名集合 (如 [".png", ".mp4"])，None 表示不限制

    Returns:
        Path: 解析后的安全路径

    Raises:
        ValueError: 如果文件名非法或越权访问
    """
    # 基础目录必须存在，避免解析到非预期位置
    base_dir_resolved = base_dir.resolve()

    # 拒绝空值、当前/上级目录等高风险输入
    if not filename or filename in {".", ".."}:
        raise ValueError("非法文件名")

    # 拒绝包含路径分隔符的输入，强制仅允许纯文件名
    if "/" in filename or "\\" in filename:
        raise ValueError("非法文件名")

    # 拒绝路径片段，确保只保留文件名
    if Path(filename).name != filename:
        raise ValueError("非法文件名")

    # 扩展名白名单校验，防止任意类型读取
    if allowed_extensions is not None:
        suffix = Path(filename).suffix.lower()
        allowed = {ext.lower() for ext in allowed_extensions}
        if suffix not in allowed:
            raise ValueError("不允许的文件类型")

    # 解析最终路径并验证在基础目录内
    file_path = (base_dir_resolved / filename).resolve()
    if not file_path.is_relative_to(base_dir_resolved):
        raise ValueError("非法路径访问")

    return file_path


async def read_json_file(file_path: Path) -> Any:
    """
    异步读取 JSON 文件

    Args:
        file_path: JSON 文件路径

    Returns:
        Any: 解析后的 JSON 数据

    Raises:
        FileNotFoundError: 如果文件不存在
        json.JSONDecodeError: 如果 JSON 格式无效
    """
    if not file_path.exists():
        return None

    async with aiofiles.open(file_path, "r", encoding="utf-8") as f:
        content = await f.read()
        return json.loads(content)


async def write_json_file(file_path: Path, data: Any) -> None:
    """
    异步写入 JSON 文件

    Args:
        file_path: JSON 文件路径
        data: 要写入的数据
    """
    # 确保目录存在
    file_path.parent.mkdir(parents=True, exist_ok=True)

    # 使用临时文件写入，避免并发写导致文件损坏
    temp_path = file_path.with_suffix(file_path.suffix + ".tmp")

    async with aiofiles.open(temp_path, "w", encoding="utf-8") as f:
        await f.write(json.dumps(data, ensure_ascii=False, indent=2, default=str))

    # 原子替换，保证写入过程可恢复
    await asyncio.to_thread(os.replace, temp_path, file_path)


def get_file_url(filename: str, file_type: str) -> str:
    """
    获取文件的 URL 路径

    Args:
        filename: 文件名
        file_type: 文件类型 ("image" 或 "video")

    Returns:
        str: 文件的 URL 路径
    """
    if file_type == "image":
        return f"/api/image/{filename}"
    elif file_type == "video":
        return f"/api/video/{filename}"
    else:
        raise ValueError(f"未知的文件类型: {file_type}")
