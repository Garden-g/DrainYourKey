"""
历史记录 API 路由模块

提供历史记录的查询和删除功能
"""

from typing import Optional
from fastapi import APIRouter, HTTPException, Query

from ..config import logger
from ..models import HistoryResponse, ErrorResponse
from ..services import history_service

# 创建路由器
router = APIRouter(prefix="/api/history", tags=["历史记录"])


@router.get(
    "",
    response_model=HistoryResponse,
    summary="获取历史记录",
    description="获取图像和视频生成的历史记录"
)
async def get_history(
    type: Optional[str] = Query(None, description="筛选类型: image 或 video"),
    limit: int = Query(50, ge=1, le=100, description="返回数量"),
    offset: int = Query(0, ge=0, description="偏移量")
) -> HistoryResponse:
    """
    获取历史记录 API

    Args:
        type: 筛选类型 (可选，"image" 或 "video")
        limit: 返回数量限制 (1-100)
        offset: 偏移量

    Returns:
        HistoryResponse: 包含历史记录列表和总数
    """
    try:
        items, total = await history_service.get_history(
            record_type=type,
            limit=limit,
            offset=offset
        )

        return HistoryResponse(items=items, total=total)

    except Exception as e:
        logger.error(f"获取历史记录失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete(
    "/{record_id}",
    summary="删除历史记录",
    description="删除指定的历史记录"
)
async def delete_history(record_id: str) -> dict:
    """
    删除历史记录 API

    Args:
        record_id: 记录 ID

    Returns:
        dict: 操作结果
    """
    try:
        success = await history_service.delete_record(record_id)

        if success:
            return {"success": True, "message": "记录已删除"}
        else:
            raise HTTPException(status_code=404, detail="记录不存在")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"删除历史记录失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete(
    "",
    summary="清空历史记录",
    description="清空所有或指定类型的历史记录"
)
async def clear_history(
    type: Optional[str] = Query(None, description="要清空的类型: image 或 video")
) -> dict:
    """
    清空历史记录 API

    Args:
        type: 要清空的类型 (可选，不指定则清空全部)

    Returns:
        dict: 操作结果，包含删除的记录数量
    """
    try:
        deleted_count = await history_service.clear_history(record_type=type)

        return {
            "success": True,
            "message": f"已删除 {deleted_count} 条记录",
            "deleted_count": deleted_count
        }

    except Exception as e:
        logger.error(f"清空历史记录失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))
