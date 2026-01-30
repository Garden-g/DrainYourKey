"""
错误处理工具模块

提供统一的内部错误处理逻辑:
- 生成可追踪的 error_id
- 记录完整异常堆栈到日志
- 返回对外安全的错误信息
"""

import uuid
from fastapi import HTTPException

from ..config import logger


def raise_internal_error(context: str, error: Exception) -> None:
    """
    记录异常并抛出统一的 500 错误

    Args:
        context: 发生错误的上下文描述
        error: 捕获到的异常对象
    """
    # 生成唯一错误 ID，便于日志定位
    error_id = str(uuid.uuid4())

    # 记录完整堆栈，避免向客户端泄露内部细节
    logger.exception(f"{context} | error_id={error_id} | error={error}")

    # 对外返回统一的内部错误信息
    raise HTTPException(
        status_code=500,
        detail=f"服务器内部错误 (error_id={error_id})"
    )
