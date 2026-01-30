"""
提示词优化服务模块

该模块负责:
- 使用 Gemini 模型优化用户输入的提示词
- 将简单描述扩展为详细的生成提示词
"""

from google import genai
from google.genai import types

from ..config import Config, logger
from ..utils import retry_async


class PromptService:
    """
    提示词优化服务类

    使用 Gemini 模型将简单的用户输入扩展为
    适合图像/视频生成的详细提示词
    """

    def __init__(self):
        """
        初始化提示词服务
        """
        self.client = genai.Client(api_key=Config.GOOGLE_CLOUD_API_KEY)
        logger.info("提示词服务初始化完成")

    @retry_async(max_retries=2, delay=1.0)
    async def enhance_prompt(
        self,
        prompt: str,
        target_type: str = "image"
    ) -> str:
        """
        优化提示词

        将用户的简单描述扩展为详细的、适合 AI 生成的提示词

        Args:
            prompt: 用户输入的原始提示词
            target_type: 目标类型 ("image" 或 "video")

        Returns:
            str: 优化后的提示词

        Example:
            输入: "一只猫在太空中"
            输出: "A majestic cat floating gracefully in the vast expanse of space,
                   surrounded by twinkling stars and distant galaxies..."
        """
        logger.info(f"开始优化提示词: {prompt[:50]}...")

        # 根据目标类型构建系统提示
        if target_type == "image":
            system_prompt = """你是一个专业的 AI 图像生成提示词优化专家。
你的任务是将用户的简单描述扩展为详细的、适合 AI 图像生成的提示词。

优化规则:
1. 保持原始意图不变
2. 添加视觉细节描述 (光线、色彩、构图、风格)
3. 使用英文输出 (AI 图像生成模型对英文效果更好)
4. 控制在 200 词以内
5. 不要添加负面提示词
6. 描述要具体、生动、有画面感

直接输出优化后的提示词，不要有任何解释或前缀。"""
        else:
            system_prompt = """你是一个专业的 AI 视频生成提示词优化专家。
你的任务是将用户的简单描述扩展为详细的、适合 AI 视频生成的提示词。

优化规则:
1. 保持原始意图不变
2. 添加动作描述 (运动方向、速度、镜头移动)
3. 添加场景细节 (环境、光线、氛围)
4. 使用英文输出 (AI 视频生成模型对英文效果更好)
5. 控制在 200 词以内
6. 描述要有时间顺序感，适合视频叙事

直接输出优化后的提示词，不要有任何解释或前缀。"""

        # 调用 Gemini API
        response = self.client.models.generate_content(
            model=Config.PROMPT_MODEL,
            contents=f"请优化以下提示词:\n\n{prompt}",
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                thinking_config=types.ThinkingConfig(thinking_level="low")
            )
        )

        enhanced = response.text.strip()
        logger.info(f"提示词优化完成，长度: {len(enhanced)}")

        return enhanced


# 创建全局服务实例
prompt_service = PromptService()
