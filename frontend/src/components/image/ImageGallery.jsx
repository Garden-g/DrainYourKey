/**
 * 图像画廊组件
 *
 * 显示生成的图像列表
 */

import React from 'react';
import { Loader2, Image as ImageIcon } from 'lucide-react';
import { ImageCard } from './ImageCard';
import { ImageJobCard } from './ImageJobCard';

/**
 * ImageGallery 组件
 *
 * @param {Object} props - 组件属性
 * @param {Array} props.dayGroups - 按天分组的图像列表
 * @param {boolean} props.isLoading - 是否正在加载
 * @param {Array} props.imageJobs - 正在生成的任务列表
 * @param {Function} props.onMakeVideo - 生成视频回调
 * @param {Function} props.onAddReference - 添加为参考图回调
 * @param {Function} props.onPreview - 预览回调
 * @param {boolean} props.hasMoreDays - 是否还有更早日期数据
 * @param {Function} props.onLoadMoreDays - 加载更早日期回调
 * @param {boolean} props.isLoadingMore - 是否正在加载更早日期
 */
export function ImageGallery({
  dayGroups,
  isLoading,
  imageJobs,
  onMakeVideo,
  onAddReference,
  onPreview,
  hasMoreDays,
  onLoadMoreDays,
  isLoadingMore,
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

  const hasAnyImage = dayGroups.some((group) => group.items && group.items.length > 0);

  return (
    <div
      className="
        flex-1 bg-white dark:bg-zinc-900/50
        rounded-2xl border border-slate-200 dark:border-zinc-800
        p-8 min-h-[600px]
        flex flex-col relative shadow-sm
        overflow-y-auto scrollbar-hide
      "
    >
      {/* 空状态 */}
      {!hasAnyImage && !isLoading && (!imageJobs || imageJobs.length === 0) && (
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
        <div className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {imageJobs.map(job => (
              <ImageJobCard key={job.jobId} job={job} />
            ))}
          </div>
        </div>
      )}

      {/* 按天显示图像网格 */}
      <div className="z-10 flex flex-col gap-8">
        {dayGroups.map((group) => (
          <section key={group.date} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-zinc-300">
                {formatDateLabel(group.date)}
              </h3>
              <span className="text-xs text-slate-400 dark:text-zinc-500">
                {group.items.length} 张
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {group.items.map((img) => (
                <ImageCard
                  key={img.id}
                  img={img}
                  onMakeVideo={onMakeVideo}
                  onAddReference={onAddReference}
                  onPreview={onPreview}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* 加载更早日期 */}
      {hasMoreDays && (
        <div className="mt-8 flex justify-center">
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

      {/* 正在加载更多时的底部提示 */}
      {isLoadingMore && !hasMoreDays && (
        <div className="mt-4 text-center text-xs text-slate-400 dark:text-zinc-500">
          正在整理更早数据...
        </div>
      )}
    </div>
  );
}

export default ImageGallery;
