/**
 * VideoGallery 组件
 *
 * 整合视频任务和视频列表
 * - 显示正在生成的任务（使用 VideoJobCard）
 * - 显示已生成的视频（按天分组）
 * - 空状态提示
 * - 支持分页加载更早日期
 */

import React from 'react';
import { VideoJobCard } from './VideoJobCard';
import { VideoCard } from './VideoCard';
import { Loader2, Video } from 'lucide-react';

/**
 * VideoGallery 组件
 *
 * @param {Object} props - 组件属性
 * @param {Array} props.dayGroups - 按天分组的视频列表
 * @param {Array} props.videoJobs - 正在生成的任务列表
 * @param {Function} props.onPlay - 播放视频回调
 * @param {Function} props.onExtend - 延长视频回调
 * @param {Function} props.onDownload - 下载视频回调
 * @param {boolean} props.hasMoreDays - 是否还有更早日期数据
 * @param {Function} props.onLoadMoreDays - 加载更早日期回调
 * @param {boolean} props.isLoading - 是否正在加载首屏数据
 * @param {boolean} props.isLoadingMore - 是否正在加载更早日期
 */
export function VideoGallery({
  dayGroups = [],
  videoJobs = [],
  onPlay,
  onExtend,
  onDownload,
  hasMoreDays = false,
  onLoadMoreDays,
  isLoading = false,
  isLoadingMore = false,
}) {
  /**
   * 将 YYYY-MM-DD 转为更友好的中文日期
   *
   * @param {string} dateKey - 日期键
   * @returns {string} 可读日期
   */
  const formatDateLabel = (dateKey) => {
    const date = new Date(`${dateKey}T00:00:00`);
    if (Number.isNaN(date.getTime())) return dateKey;

    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
    });
  };

  const hasAnyVideo = dayGroups.some((group) => group.items && group.items.length > 0);
  const hasContent = hasAnyVideo || videoJobs.length > 0;

  return (
    <div className="flex-1 min-w-0 overflow-y-auto scrollbar-hide bg-white dark:bg-zinc-900/50 rounded-2xl border border-slate-200 dark:border-zinc-800 p-8 min-h-[600px] shadow-sm relative">
      {/* 首屏加载状态 */}
      {isLoading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/60 dark:bg-zinc-950/50 backdrop-blur-sm rounded-2xl">
          <Loader2 className="animate-spin text-blue-600 dark:text-white mb-4" size={32} />
          <span className="text-xs font-bold tracking-widest uppercase text-slate-500 dark:text-zinc-400">
            处理中
          </span>
        </div>
      )}

      {/* 空状态 */}
      {!hasContent && !isLoading && (
        <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-zinc-600">
          <Video className="w-24 h-24 mb-4 opacity-50" />
          <p className="text-lg font-medium">暂无视频</p>
          <p className="text-sm mt-2">点击左侧生成按钮开始创作</p>
        </div>
      )}

      {/* 视频内容 */}
      {hasContent && (
        <div className="flex flex-col gap-8">
          {/* 正在生成的任务 */}
          {videoJobs.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-zinc-300">进行中</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {videoJobs.map((job) => (
                  <VideoJobCard key={job.jobId} job={job} />
                ))}
              </div>
            </section>
          )}

          {/* 已生成视频按天展示 */}
          {dayGroups.map((group) => (
            <section key={group.date} className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-zinc-300">
                  {formatDateLabel(group.date)}
                </h3>
                <span className="text-xs text-slate-400 dark:text-zinc-500">
                  {group.items.length} 条
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.items.map((video) => (
                  <VideoCard
                    key={video.id}
                    video={video}
                    onPlay={onPlay}
                    onExtend={onExtend}
                    onDownload={onDownload}
                  />
                ))}
              </div>
            </section>
          ))}

          {/* 加载更早日期 */}
          {hasMoreDays && (
            <div className="mt-2 flex justify-center">
              <button
                onClick={onLoadMoreDays}
                disabled={isLoadingMore}
                className="
                  inline-flex items-center gap-2
                  px-4 py-2 rounded-lg
                  bg-white dark:bg-zinc-900
                  border border-slate-200 dark:border-zinc-700
                  text-sm text-slate-600 dark:text-zinc-300
                  hover:bg-slate-50 dark:hover:bg-zinc-800
                  disabled:opacity-60 disabled:cursor-not-allowed
                  transition-colors
                "
              >
                {isLoadingMore && <Loader2 size={14} className="animate-spin" />}
                {isLoadingMore ? '加载中...' : '加载更后面的'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
