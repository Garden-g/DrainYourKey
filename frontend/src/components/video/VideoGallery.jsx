/**
 * VideoGallery 组件
 *
 * 整合视频任务和视频列表
 * - 显示正在生成的任务（使用 VideoJobCard）
 * - 显示已生成的视频网格（使用 VideoCard）
 * - 空状态提示
 * - 响应式网格布局（1/2/3 列）
 */

import React from 'react';
import { VideoJobCard } from './VideoJobCard';
import { VideoCard } from './VideoCard';
import { Video } from 'lucide-react';

/**
 * VideoGallery 组件
 *
 * @param {Object} props - 组件属性
 * @param {Array} props.videos - 已生成的视频列表
 * @param {Array} props.videoJobs - 正在生成的任务列表
 * @param {Function} props.onPlay - 播放视频回调
 * @param {Function} props.onExtend - 延长视频回调
 * @param {Function} props.onDownload - 下载视频回调
 */
export function VideoGallery({ videos = [], videoJobs = [], onPlay, onExtend, onDownload }) {
  // 判断是否有内容
  const hasContent = videos.length > 0 || videoJobs.length > 0;

  return (
    <div className="flex-1 min-w-0 overflow-y-auto scrollbar-hide bg-white dark:bg-zinc-900/50 rounded-2xl border border-slate-200 dark:border-zinc-800 p-8 min-h-[600px] shadow-sm">
      {/* 空状态 */}
      {!hasContent && (
        <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-zinc-600">
          <Video className="w-24 h-24 mb-4 opacity-50" />
          <p className="text-lg font-medium">暂无视频</p>
          <p className="text-sm mt-2">点击左侧生成按钮开始创作</p>
        </div>
      )}

      {/* 视频网格 */}
      {hasContent && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 正在生成的任务 */}
          {videoJobs.map((job) => (
            <VideoJobCard key={job.jobId} job={job} />
          ))}

          {/* 已生成的视频 */}
          {videos.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              onPlay={onPlay}
              onExtend={onExtend}
              onDownload={onDownload}
            />
          ))}
        </div>
      )}
    </div>
  );
}
