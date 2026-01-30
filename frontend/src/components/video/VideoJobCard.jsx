/**
 * VideoJobCard 组件
 *
 * 显示正在生成的视频任务
 * - 虚化封面（使用首帧图或渐变色背景）
 * - 加载动画（旋转图标）
 * - 进度条（白色，带百分比）
 * - 提示词预览（最多 2 行）
 */

import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * VideoJobCard 组件
 *
 * @param {Object} props - 组件属性
 * @param {Object} props.job - 任务对象
 * @param {string} props.job.jobId - 任务 ID
 * @param {string} props.job.status - 任务状态 (pending/processing/completed/failed)
 * @param {number} props.job.progress - 任务进度 (0-100)
 * @param {string} props.job.prompt - 提示词
 * @param {Object} props.job.params - 生成参数
 * @param {string} [props.job.firstFrame] - 首帧图像 URL（用于缩略图）
 * @param {boolean} [props.job.isExtension] - 是否为延长任务
 */
export function VideoJobCard({ job }) {
  const { progress = 0, prompt, params, firstFrame, isExtension } = job;

  return (
    <div className="relative aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-blue-500/20 to-purple-500/20 dark:from-blue-600/30 dark:to-purple-600/30">
      {/* 背景图（如果有首帧） */}
      {firstFrame && (
        <div
          className="absolute inset-0 bg-cover bg-center blur-sm opacity-40"
          style={{ backgroundImage: `url(${firstFrame})` }}
        />
      )}

      {/* 内容层 */}
      <div className="relative h-full flex flex-col items-center justify-center p-4 backdrop-blur-sm">
        {/* 加载动画 */}
        <Loader2 className="w-12 h-12 text-white animate-spin mb-4" />

        {/* 进度条 */}
        <div className="w-full max-w-[80%] mb-3">
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-white text-sm text-center mt-2 font-medium">
            {progress}%
          </p>
        </div>

        {/* 提示词预览 */}
        <p className="text-white text-xs text-center line-clamp-2 max-w-full px-2">
          {isExtension && '🔄 '}
          {prompt}
        </p>

        {/* 参数标签 */}
        <div className="absolute top-2 left-2 flex gap-1">
          <span className="px-2 py-0.5 bg-black/50 text-white text-xs rounded">
            {params.resolution}
          </span>
          <span className="px-2 py-0.5 bg-black/50 text-white text-xs rounded">
            {params.ratio}
          </span>
        </div>
      </div>
    </div>
  );
}
