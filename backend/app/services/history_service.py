"""
历史记录服务模块

该模块负责:
- 保存生成历史记录到 JSON 文件
- 读取和查询历史记录
- 删除历史记录
"""

import uuid
import asyncio
from datetime import datetime, date
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
        # 使用异步锁保护读写，避免并发写入导致 JSON 损坏
        self._lock = asyncio.Lock()
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

        # 使用锁确保读取与写入的原子性
        async with self._lock:
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
        # 读取历史记录时也加锁，避免读写冲突
        async with self._lock:
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
        async with self._lock:
            items = await self._load_history()

        for item in items:
            if item.get("id") == record_id:
                return item

        return None

    async def get_image_library(
        self,
        days: int = 7,
        before: Optional[date] = None,
        limit_days: int = 7,
        generation_mode: str = "standard"
    ) -> Dict[str, Any]:
        """
        获取按天分组的图像图库数据

        数据来源策略：
        1. 以 output/images 目录中的实际文件为准（保证刷新后不丢失）
        2. 使用 history.json 为图片补全 prompt、aspect_ratio、resolution、image_model

        Args:
            days: 首次加载时返回最近多少天的数据
            before: 分页锚点，只返回该日期之前（更早）的数据
            limit_days: 分页时每次最多返回多少天
            generation_mode: 图像筛选模式（standard/pro）

        Returns:
            Dict[str, Any]: 图库响应数据，包含:
                - days: 按天分组的数据
                - next_before: 下一页锚点
                - total_images: 当前筛选条件下匹配的总图片数
        """
        # 读取历史记录（带锁），避免读写并发导致读取中间态
        async with self._lock:
            history_items = await self._load_history()

        # 构建 filename -> 元数据映射。
        # 历史记录默认是“新到旧”顺序，因此同名文件只保留第一条即可。
        image_meta_map: Dict[str, Dict[str, str]] = {}
        for item in history_items:
            if item.get("type") != "image":
                continue

            filename = item.get("filename")
            if not filename or filename in image_meta_map:
                continue

            params = item.get("params") or {}
            image_meta_map[filename] = {
                "prompt": item.get("prompt") or "",
                "ratio": params.get("aspect_ratio") or "3:2",
                "resolution": params.get("resolution") or "未知",
                "image_model": params.get("image_model") or "unknown",
                # 兼容旧数据：无标记时默认归类到 standard
                "generation_mode": params.get("generation_mode") or "standard",
            }

        image_entries: List[Dict[str, Any]] = []

        # 以输出目录中的文件为准扫描图片，保证页面刷新后仍可回显。
        # 同时支持 PNG/JPEG，避免专业模式选择 JPEG 时图库不可见。
        image_patterns = ("*.png", "*.jpg", "*.jpeg")
        image_paths = []
        for pattern in image_patterns:
            image_paths.extend(Config.IMAGES_DIR.glob(pattern))

        for image_path in image_paths:
            if not image_path.is_file():
                continue

            try:
                file_stat = image_path.stat()
            except OSError as exc:
                logger.warning(f"读取图像文件信息失败: {image_path}, error={exc}")
                continue

            created_at = datetime.fromtimestamp(file_stat.st_mtime)
            created_day = created_at.date()

            # 分页逻辑：只返回 before 指定日期之前的数据（更早日期）
            if before and created_day >= before:
                continue

            meta = image_meta_map.get(image_path.name, {})
            entry_generation_mode = meta.get("generation_mode", "standard")

            # 图库逻辑隔离：
            # - pro 页只看专业模式生成的图片
            # - standard 页显示普通模式 + 历史遗留未标记图片
            if generation_mode == "pro" and entry_generation_mode != "pro":
                continue
            if generation_mode == "standard" and entry_generation_mode == "pro":
                continue

            image_entries.append({
                "id": image_path.name,
                "filename": image_path.name,
                "url": f"/api/image/{image_path.name}",
                "created_at": created_at,
                "prompt": meta.get("prompt", ""),
                "ratio": meta.get("ratio", "3:2"),
                "resolution": meta.get("resolution", "未知"),
                "image_model": meta.get("image_model", "unknown"),
                "generation_mode": entry_generation_mode,
                "date": created_day.isoformat(),
            })

        # 按文件时间倒序，保证同一天内也按“新 -> 旧”展示
        image_entries.sort(key=lambda item: item["created_at"], reverse=True)
        total_images = len(image_entries)

        # 按天分组（依赖前面排序后的插入顺序）
        grouped_by_day: Dict[str, List[Dict[str, Any]]] = {}
        for entry in image_entries:
            grouped_by_day.setdefault(entry["date"], []).append(entry)

        day_keys = list(grouped_by_day.keys())
        window_days = days if before is None else limit_days
        selected_day_keys = day_keys[:window_days]

        day_groups: List[Dict[str, Any]] = []
        for day_key in selected_day_keys:
            day_items = []
            for item in grouped_by_day.get(day_key, []):
                day_items.append({
                    "id": item["id"],
                    "filename": item["filename"],
                    "url": item["url"],
                    "created_at": item["created_at"],
                    "prompt": item["prompt"],
                    "ratio": item["ratio"],
                    "resolution": item["resolution"],
                    "image_model": item["image_model"],
                })

            day_groups.append({
                "date": day_key,
                "items": day_items,
            })

        # next_before 使用“当前返回的最后一天”，下一次请求传该值即可加载更早日期
        next_before = None
        if selected_day_keys and len(day_keys) > len(selected_day_keys):
            next_before = selected_day_keys[-1]

        return {
            "days": day_groups,
            "next_before": next_before,
            "total_images": total_images,
        }

    async def get_video_library(
        self,
        days: int = 7,
        before: Optional[date] = None,
        limit_days: int = 7
    ) -> Dict[str, Any]:
        """
        获取按天分组的视频图库数据

        数据来源策略：
        1. 以 output/videos 目录中的实际文件为准（保证刷新后不丢失）
        2. 使用 history.json 为视频补全 prompt、分辨率、宽高比和模式

        Args:
            days: 首次加载时返回最近多少天的数据
            before: 分页锚点，只返回该日期之前（更早）的数据
            limit_days: 分页时每次最多返回多少天

        Returns:
            Dict[str, Any]: 图库响应数据，包含:
                - days: 按天分组的数据
                - next_before: 下一页锚点
                - total_videos: 当前筛选条件下匹配的视频总数
        """
        # 读取历史记录（带锁），避免读写并发导致读取中间态
        async with self._lock:
            history_items = await self._load_history()

        # 构建 filename -> 元数据映射。
        # 历史记录默认是“新到旧”顺序，因此同名文件只保留第一条即可。
        video_meta_map: Dict[str, Dict[str, Any]] = {}
        for item in history_items:
            if item.get("type") != "video":
                continue

            filename = item.get("filename")
            if not filename or filename in video_meta_map:
                continue

            params = item.get("params") or {}
            resolution = params.get("resolution") or "720p"
            ratio = params.get("aspect_ratio") or "16:9"
            mode = params.get("mode") or "text2vid"

            video_meta_map[filename] = {
                "prompt": item.get("prompt") or "",
                "resolution": resolution,
                "ratio": ratio,
                "mode": mode,
                "can_extend": resolution == "720p",
                "video_id": params.get("job_id"),
            }

        video_entries: List[Dict[str, Any]] = []

        # 以输出目录中的文件为准扫描视频，保证页面刷新后仍可回显。
        for video_path in Config.VIDEOS_DIR.glob("*.mp4"):
            if not video_path.is_file():
                continue

            try:
                file_stat = video_path.stat()
            except OSError as exc:
                logger.warning(f"读取视频文件信息失败: {video_path}, error={exc}")
                continue

            created_at = datetime.fromtimestamp(file_stat.st_mtime)
            created_day = created_at.date()

            # 分页逻辑：只返回 before 指定日期之前的数据（更早日期）
            if before and created_day >= before:
                continue

            meta = video_meta_map.get(video_path.name, {})
            video_entries.append({
                "id": video_path.name,
                "filename": video_path.name,
                "url": f"/api/video/{video_path.name}",
                "created_at": created_at,
                "prompt": meta.get("prompt", ""),
                "resolution": meta.get("resolution", "720p"),
                "ratio": meta.get("ratio", "16:9"),
                "mode": meta.get("mode", "text2vid"),
                "can_extend": meta.get("can_extend", False),
                "video_id": meta.get("video_id"),
                "date": created_day.isoformat(),
            })

        # 按文件时间倒序，保证同一天内也按“新 -> 旧”展示
        video_entries.sort(key=lambda item: item["created_at"], reverse=True)
        total_videos = len(video_entries)

        # 按天分组（依赖前面排序后的插入顺序）
        grouped_by_day: Dict[str, List[Dict[str, Any]]] = {}
        for entry in video_entries:
            grouped_by_day.setdefault(entry["date"], []).append(entry)

        day_keys = list(grouped_by_day.keys())
        window_days = days if before is None else limit_days
        selected_day_keys = day_keys[:window_days]

        day_groups: List[Dict[str, Any]] = []
        for day_key in selected_day_keys:
            day_items = []
            for item in grouped_by_day.get(day_key, []):
                day_items.append({
                    "id": item["id"],
                    "filename": item["filename"],
                    "url": item["url"],
                    "created_at": item["created_at"],
                    "prompt": item["prompt"],
                    "resolution": item["resolution"],
                    "ratio": item["ratio"],
                    "mode": item["mode"],
                    "can_extend": item["can_extend"],
                    "video_id": item["video_id"],
                })

            day_groups.append({
                "date": day_key,
                "items": day_items,
            })

        # next_before 使用“当前返回的最后一天”，下一次请求传该值即可加载更早日期
        next_before = None
        if selected_day_keys and len(day_keys) > len(selected_day_keys):
            next_before = selected_day_keys[-1]

        return {
            "days": day_groups,
            "next_before": next_before,
            "total_videos": total_videos,
        }

    async def delete_record(self, record_id: str) -> bool:
        """
        删除历史记录

        Args:
            record_id: 记录 ID

        Returns:
            bool: 是否成功删除
        """
        async with self._lock:
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
        async with self._lock:
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
