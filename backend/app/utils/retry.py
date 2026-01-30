"""
重试机制模块

提供自动重试功能，用于处理 API 调用失败的情况
"""

import asyncio
from functools import wraps
from typing import Callable, TypeVar, Any
from ..config import logger

T = TypeVar("T")


def retry_async(
    max_retries: int = 3,
    delay: float = 1.0,
    backoff: float = 2.0,
    exceptions: tuple = (Exception,)
) -> Callable:
    """
    异步函数重试装饰器

    当被装饰的函数抛出指定异常时，自动重试

    Args:
        max_retries: 最大重试次数
        delay: 初始延迟时间 (秒)
        backoff: 延迟时间的增长倍数
        exceptions: 需要重试的异常类型元组

    Returns:
        Callable: 装饰器函数

    Example:
        @retry_async(max_retries=3, delay=1.0)
        async def call_api():
            # API 调用代码
            pass
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> T:
            current_delay = delay
            last_exception = None

            for attempt in range(max_retries + 1):
                try:
                    return await func(*args, **kwargs)
                except exceptions as e:
                    last_exception = e
                    if attempt < max_retries:
                        logger.warning(
                            f"函数 {func.__name__} 执行失败 (尝试 {attempt + 1}/{max_retries + 1}): {e}"
                        )
                        logger.info(f"等待 {current_delay:.1f} 秒后重试...")
                        await asyncio.sleep(current_delay)
                        current_delay *= backoff
                    else:
                        logger.error(
                            f"函数 {func.__name__} 在 {max_retries + 1} 次尝试后仍然失败"
                        )

            # 如果所有重试都失败，抛出最后一个异常
            raise last_exception

        return wrapper
    return decorator


class RetryContext:
    """
    重试上下文管理器

    用于在代码块中实现重试逻辑

    Example:
        async with RetryContext(max_retries=3) as ctx:
            while ctx.should_retry():
                try:
                    result = await some_api_call()
                    break
                except Exception as e:
                    await ctx.handle_error(e)
    """

    def __init__(
        self,
        max_retries: int = 3,
        delay: float = 1.0,
        backoff: float = 2.0
    ):
        """
        初始化重试上下文

        Args:
            max_retries: 最大重试次数
            delay: 初始延迟时间 (秒)
            backoff: 延迟时间的增长倍数
        """
        self.max_retries = max_retries
        self.delay = delay
        self.backoff = backoff
        self.attempt = 0
        self.current_delay = delay
        self.last_error = None

    async def __aenter__(self) -> "RetryContext":
        """进入上下文"""
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> bool:
        """退出上下文"""
        return False

    def should_retry(self) -> bool:
        """
        检查是否应该继续重试

        Returns:
            bool: 如果还有重试次数则返回 True
        """
        return self.attempt <= self.max_retries

    async def handle_error(self, error: Exception) -> None:
        """
        处理错误并准备下一次重试

        Args:
            error: 捕获的异常

        Raises:
            Exception: 如果已达到最大重试次数
        """
        self.last_error = error
        self.attempt += 1

        if self.attempt > self.max_retries:
            logger.error(f"达到最大重试次数 ({self.max_retries})")
            raise error

        logger.warning(f"操作失败 (尝试 {self.attempt}/{self.max_retries + 1}): {error}")
        logger.info(f"等待 {self.current_delay:.1f} 秒后重试...")

        await asyncio.sleep(self.current_delay)
        self.current_delay *= self.backoff
