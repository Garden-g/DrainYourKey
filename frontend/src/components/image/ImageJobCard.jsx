/**
 * ImageJobCard 组件
 *
 * 改进图片任务展示
 * - 虚化背景（渐变色）
 * - 加载动画 + 进度条
 * - 提示词预览
 */

import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * ImageJobCard 组件
 *
 * @param {Object} props - 组件属性
 * @param {Object} props.job - 任务对象
 * @param {string} props.job.jobId - 任务 ID
 * @param {string} props.job.status - 任务状态 (pending/processing/completed/failed)
 * @param {number} props.job.progress - 任务进度 (0-100)
 * @param {string} props.job.prompt - 提示词
 * @param {Object} props.job.params - 生成参数
 */
export function ImageJobCard({ job }) {
  const { progress = 0, prompt, params } = job;

  return (
    <div className="relative aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-blue-500/20 to-cyan-500/20 dark:from-blue-600/30 dark:to-cyan-600/30">
      {/* 内容层 */}
      <div className="relative h-full flex flex-col items-center justify-center p-4 backdrop-blur-sm">
        {/* 加载动画 */}
        <Loader2 className="w-12 h-12 text-blue-500 dark:text-blue-400 animate-spin mb-4" />

        {/* 进度条 */}
        <div className="w-full max-w-[80%] mb-3">
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-slate-700 dark:text-zinc-300 text-sm text-center mt-2 font-medium">
            {progress}%
          </p>
        </div>

        {/* 提示词预览 */}
        <p className="text-slate-600 dark:text-zinc-400 text-xs text-center line-clamp-2 max-w-full px-2">
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
          <span className="px-2 py-0.5 bg-black/50 text-white text-xs rounded">
            x{params.count}
          </span>
        </div>
      </div>
    </div>
  );
}
