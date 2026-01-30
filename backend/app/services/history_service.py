"""
历史记录服务模块

该模块负责:
- 保存生成历史记录到 JSON 文件
- 读取和查询历史记录
- 删除历史记录
"""

import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any

from ..config import Config, logger
from ..utils import read_json_file, write_json_file


class HistoryService:
    """
    历史记录服务类

    管理图像和视频生成的历史记录
    """

    def __init__(self):
        """
        初始化历史记录服务
        """
        self._history_file = Config.HISTORY_FILE
        logger.info("历史记录服务初始化完成")

    async def _load_history(self) -> List[Dict[str, Any]]:
        """
        加载历史记录

        Returns:
            List[Dict[str, Any]]: 历史记录列表
        """
        data = await read_json_file(self._history_file)
        if data is None:
            return []
        return data.get("items", [])

    async def _save_history(self, items: List[Dict[str, Any]]) -> None:
        """
        保存历史记录

        Args:
            items: 历史记录列表
        """
        await write_json_file(self._history_file, {"items": items})

    async def add_record(
        self,
        record_type: str,
        prompt: str,
        filename: str,
        params: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        添加历史记录

        Args:
            record_type: 记录类型 ("image" 或 "video")
            prompt: 使用的提示词
            filename: 生成的文件名
            params: 生成参数 (可选)

        Returns:
            str: 记录 ID
        """
        record_id = str(uuid.uuid4())

        record = {
            "id": record_id,
            "type": record_type,
            "prompt": prompt,
            "filename": filename,
            "created_at": datetime.now().isoformat(),
            "params": params or {}
        }

        # 加载现有记录
        items = await self._load_history()

        # 添加新记录到开头 (最新的在前)
        items.insert(0, record)

        # 限制历史记录数量 (最多保留 1000 条)
        if len(items) > 1000:
            items = items[:1000]

        # 保存
        await self._save_history(items)

        logger.info(f"添加历史记录: {record_id}, type={record_type}")
        return record_id

    async def get_history(
        self,
        record_type: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> tuple[List[Dict[str, Any]], int]:
        """
        获取历史记录

        Args:
            record_type: 筛选类型 (可选，"image" 或 "video")
            limit: 返回数量限制
            offset: 偏移量

        Returns:
            tuple[List[Dict[str, Any]], int]: (记录列表, 总数)
        """
        items = await self._load_history()

        # 按类型筛选
        if record_type:
            items = [item for item in items if item.get("type") == record_type]

        total = len(items)

        # 分页
        items = items[offset:offset + limit]

        return items, total

    async def get_record(self, record_id: str) -> Optional[Dict[str, Any]]:
        """
        获取单条历史记录

        Args:
            record_id: 记录 ID

        Returns:
            Optional[Dict[str, Any]]: 记录数据，不存在则返回 None
        """
        items = await self._load_history()

        for item in items:
            if item.get("id") == record_id:
                return item

        return None

    async def delete_record(self, record_id: str) -> bool:
        """
        删除历史记录

        Args:
            record_id: 记录 ID

        Returns:
            bool: 是否成功删除
        """
        items = await self._load_history()

        # 查找并删除
        for i, item in enumerate(items):
            if item.get("id") == record_id:
                del items[i]
                await self._save_history(items)
                logger.info(f"删除历史记录: {record_id}")
                return True

        return False

    async def clear_history(self, record_type: Optional[str] = None) -> int:
        """
        清空历史记录

        Args:
            record_type: 要清空的类型 (可选，不指定则清空全部)

        Returns:
            int: 删除的记录数量
        """
        items = await self._load_history()
        original_count = len(items)

        if record_type:
            # 只删除指定类型
            items = [item for item in items if item.get("type") != record_type]
        else:
            # 清空全部
            items = []

        await self._save_history(items)

        deleted_count = original_count - len(items)
        logger.info(f"清空历史记录: 删除 {deleted_count} 条")

        return deleted_count


# 创建全局服务实例
history_service = HistoryService()
