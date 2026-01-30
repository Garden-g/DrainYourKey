/**
 * 图像画廊组件
 *
 * 显示生成的图像列表
 */

import React from 'react';
import { Loader2, Image as ImageIcon } from 'lucide-react';
import { ImageCard } from './ImageCard';

/**
 * ImageGallery 组件
 *
 * @param {Object} props - 组件属性
 * @param {Array} props.images - 图像列表
 * @param {boolean} props.isLoading - 是否正在加载
 * @param {Array} props.imageJobs - 正在生成的任务列表
 * @param {Function} props.onMakeVideo - 生成视频回调
 * @param {Function} props.onPreview - 预览回调
 */
export function ImageGallery({ images, isLoading, imageJobs, onMakeVideo, onPreview }) {
  return (
    <div
      className="
        flex-1 bg-white dark:bg-zinc-900/50
        rounded-2xl border border-slate-200 dark:border-zinc-800
        p-8 min-h-[600px]
        flex flex-col relative shadow-sm
      "
    >
      {/* 空状态 */}
      {images.length === 0 && !isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center opacity-40 select-none pointer-events-none">
          <div className="w-24 h-24 bg-slate-50 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-6">
            <ImageIcon size={32} className="text-slate-300 dark:text-zinc-700" />
          </div>
          <p className="text-slate-300 dark:text-zinc-700 font-bold text-2xl tracking-tighter">
            等待输入
          </p>
        </div>
      )}

      {/* 加载状态 */}
      {isLoading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/60 dark:bg-zinc-950/50 backdrop-blur-sm rounded-2xl">
          <Loader2 className="animate-spin text-blue-600 dark:text-white mb-4" size={32} />
          <span className="text-xs font-bold tracking-widest uppercase text-slate-500 dark:text-zinc-400">
            处理中
          </span>
        </div>
      )}

      {/* 显示正在生成的任务 */}
      {imageJobs && imageJobs.length > 0 && (
        <div className="mb-6 space-y-3">
          {imageJobs.map(job => (
            <div key={job.jobId} className="bg-slate-50 dark:bg-zinc-800/50 rounded-xl p-4 border border-slate-200 dark:border-zinc-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-700 dark:text-zinc-300 font-medium">
                  正在生成: {job.prompt.substring(0, 50)}{job.prompt.length > 50 ? '...' : ''}
                </span>
                <span className="text-sm text-blue-600 dark:text-blue-400 font-bold">{job.progress}%</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-zinc-700 rounded-full h-2">
                <div
                  className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${job.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 图像网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 z-10">
        {images.map((img) => (
          <ImageCard
            key={img.id}
            img={img}
            onMakeVideo={onMakeVideo}
            onPreview={onPreview}
          />
        ))}
      </div>
    </div>
  );
}

export default ImageGallery;
