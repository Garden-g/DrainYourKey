/**
 * 专业生图结果画廊组件
 *
 * 视觉风格参考 `专业模式.html` 的右侧结果区：
 * - 顶部日期与数量
 * - 空状态提示
 * - 参数摘要
 * - 列表滚动展示
 */

import React from 'react';
import { Image as ImageIcon, Loader2 } from 'lucide-react';
import { ImageCard } from '../image/ImageCard';
import { ImageJobCard } from '../image/ImageJobCard';

/**
 * 将 YYYY-MM-DD 转换为中文日期标签
 *
 * @param {string} dateKey - 日期键
 * @returns {string} 可读日期
 */
function formatDateLabel(dateKey) {
  const date = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateKey || '';
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });
}

/**
 * 专业生图画廊组件
 *
 * @param {Object} props - 组件属性
 * @returns {JSX.Element} 画廊组件
 */
export function ProImageGallery({
  dayGroups,
  isLoading,
  imageJobs,
  onMakeVideo,
  onPreview,
  onAddReference,
  hasMoreDays,
  onLoadMoreDays,
  isLoadingMore,
  previewSummary = [],
}) {
  const totalImages = dayGroups.reduce((sum, group) => sum + (group.items?.length || 0), 0);
  const latestDate = dayGroups[0]?.date || '';
  const hasAnyImage = totalImages > 0;

  return (
    <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden min-h-0">
      <div className="p-6 flex justify-between items-center border-b border-gray-50 shrink-0">
        <h3 className="font-bold text-slate-800 text-lg">
          {latestDate ? formatDateLabel(latestDate) : '专业生图结果'}
        </h3>
        <span className="text-xs text-slate-400">{totalImages} 张</span>
      </div>

      <div className="flex-1 p-6 overflow-y-auto bg-gray-50/50 relative">
        {/* 初始加载遮罩 */}
        {isLoading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/60 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3 text-slate-500">
              <Loader2 className="animate-spin" size={24} />
              <span className="text-xs">正在加载专业图库...</span>
            </div>
          </div>
        )}

        {/* 任务区 */}
        {imageJobs && imageJobs.length > 0 && (
          <div className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {imageJobs.map((job) => (
                <ImageJobCard key={job.jobId} job={job} />
              ))}
            </div>
          </div>
        )}

        {/* 空状态 */}
        {!hasAnyImage && (!imageJobs || imageJobs.length === 0) && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
            <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center bg-white">
              <ImageIcon className="w-6 h-6 text-slate-300" />
            </div>
            <p className="text-sm">调整左侧专业参数并点击生成，在此处预览结果</p>
            {previewSummary.length > 0 && (
              <div className="flex gap-2 text-[10px] font-mono opacity-60 flex-wrap justify-center">
                {previewSummary.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 按天分组内容 */}
        {hasAnyImage && (
          <div className="space-y-8">
            {dayGroups.map((group) => (
              <section key={group.date} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-700">{formatDateLabel(group.date)}</h4>
                  <span className="text-xs text-slate-400">{group.items.length} 张</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {group.items.map((img) => (
                    <ImageCard
                      key={img.id}
                      img={img}
                      onMakeVideo={onMakeVideo}
                      onPreview={onPreview}
                      onAddReference={onAddReference}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {/* 加载更多 */}
        {hasMoreDays && (
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={onLoadMoreDays}
              disabled={isLoadingMore}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {isLoadingMore && <Loader2 size={14} className="animate-spin" />}
              {isLoadingMore ? '加载中...' : '加载更后面的'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProImageGallery;
