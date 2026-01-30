"""
Gen_PhotoNVideo 后端配置管理模块

该模块负责:
- 加载环境变量
- 管理应用配置
- 设置日志系统
"""

import os
import logging
from pathlib import Path
from dotenv import load_dotenv

# 加载 .env 文件中的环境变量
load_dotenv()


class Config:
    """
    应用配置类

    集中管理所有配置项，包括:
    - API 密钥
    - 文件路径
    - 服务器设置
    """

    # Google Cloud API 密钥
    GOOGLE_CLOUD_API_KEY: str = os.getenv("GOOGLE_CLOUD_API_KEY", "")

    # 项目根目录 (backend 的父目录)
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent

    # 输出目录
    OUTPUT_DIR: Path = BASE_DIR / "output"
    IMAGES_DIR: Path = OUTPUT_DIR / "images"
    VIDEOS_DIR: Path = OUTPUT_DIR / "videos"

    # 数据目录
    DATA_DIR: Path = BASE_DIR / "data"
    HISTORY_FILE: Path = DATA_DIR / "history.json"

    # 日志目录
    LOGS_DIR: Path = BASE_DIR / "logs"
    LOG_FILE: Path = LOGS_DIR / "app.log"

    # 服务器配置
    HOST: str = "0.0.0.0"
    PORT: int = 8080

    # API 模型名称
    IMAGE_MODEL: str = "gemini-3-pro-image-preview"
    VIDEO_MODEL: str = "veo-3.1-generate-preview"
    PROMPT_MODEL: str = "gemini-3-pro-preview"

    @classmethod
    def ensure_directories(cls) -> None:
        """
        确保所有必要的目录存在

        如果目录不存在则创建它们
        """
        cls.IMAGES_DIR.mkdir(parents=True, exist_ok=True)
        cls.VIDEOS_DIR.mkdir(parents=True, exist_ok=True)
        cls.DATA_DIR.mkdir(parents=True, exist_ok=True)
        cls.LOGS_DIR.mkdir(parents=True, exist_ok=True)

    @classmethod
    def validate(cls) -> bool:
        """
        验证配置是否有效

        Returns:
            bool: 配置是否有效
        """
        if not cls.GOOGLE_CLOUD_API_KEY:
            logging.warning("GOOGLE_CLOUD_API_KEY 未设置")
            return False
        return True


def setup_logging() -> logging.Logger:
    """
    设置日志系统

    配置日志格式、级别和输出位置

    Returns:
        logging.Logger: 配置好的日志记录器
    """
    # 确保日志目录存在
    Config.LOGS_DIR.mkdir(parents=True, exist_ok=True)

    # 创建日志记录器
    logger = logging.getLogger("gen_photo_n_video")
    logger.setLevel(logging.DEBUG)

    # 日志格式
    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    # 文件处理器 - 记录所有级别的日志
    file_handler = logging.FileHandler(
        Config.LOG_FILE,
        encoding="utf-8"
    )
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(formatter)

    # 控制台处理器 - 只记录 INFO 及以上级别
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(formatter)

    # 添加处理器
    logger.addHandler(file_handler)
    logger.addHandler(console_handler)

    return logger


# 初始化日志记录器
logger = setup_logging()
