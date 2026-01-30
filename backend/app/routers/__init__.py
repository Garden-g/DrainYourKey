"""
路由模块包
"""

from .image import router as image_router
from .video import router as video_router
from .history import router as history_router

__all__ = [
    "image_router",
    "video_router",
    "history_router",
]
