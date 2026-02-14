/**
 * VideoCard 组件
 *
 * 显示已生成的视频缩略图
 * - 视频元素（不自动播放，preload="metadata"）
 * - 中心播放图标覆盖层
 * - 悬停显示操作按钮：播放、延长（仅 720p）、下载
 * - 左上角显示参数标签（分辨率、宽高比、延长次数）
 * - 左下角显示视频时长
 * - 点击触发放大播放
 */

import React, { useState } from 'react';
import { Play, Download, ArrowRightCircle } from 'lucide-react';

/**
 * 格式化视频时长为 "分:秒" 格式
 *
 * @param {number} seconds - 视频时长（秒）
 * @returns {string} 格式化后的时长字符串，如 "0:08" 或 "1:23"
 */
const formatDuration = (seconds) => {
  if (!seconds || isNaN(seconds)) return '';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * 计算视频延长次数
 * 根据 Veo API 规则：初始 8 秒，每次延长 +7 秒
 *
 * @param {number} duration - 视频时长（秒）
 * @returns {number} 延长次数
 */
const calculateExtensionCount = (duration) => {
  if (!duration || duration <= 8) return 0;
  return Math.floor((duration - 8) / 7);
};

// 最大延长次数（根据 Veo API：最大 148 秒，(148-8)/7 = 20）
const MAX_EXTENSIONS = 20;

/**
 * VideoCard 组件
 *
 * @param {Object} props - 组件属性
 * @param {Object} props.video - 视频对象
 * @param {string} props.video.id - 视频 ID
 * @param {string} props.video.url - 视频 URL
 * @param {string} props.video.filename - 文件名
 * @param {string} props.video.resolution - 分辨率
 * @param {string} props.video.ratio - 宽高比
 * @param {string} props.video.prompt - 提示词
 * @param {string} props.video.videoId - 用于延长的视频 ID
 * @param {boolean} props.video.canExtend - 是否可以延长
 * @param {Function} props.onPlay - 点击播放回调
 * @param {Function} props.onExtend - 点击延长回调
 * @param {Function} props.onDownload - 点击下载回调
 */
export function VideoCard({ video, onPlay, onExtend, onDownload }) {
  const [isHovered, setIsHovered] = useState(false);
  // 视频时长状态，通过 loadedmetadata 事件获取
  const [duration, setDuration] = useState(null);

  // 计算延长次数（基于视频时长）
  const extensionCount = calculateExtensionCount(duration);
  // 判断是否还能继续延长（720p 且未达到最大次数）
  const canStillExtend = video.canExtend && extensionCount < MAX_EXTENSIONS;

  /**
   * 处理下载
   */
  const handleDownload = (e) => {
    e.stopPropagation(); // 阻止触发播放
    onDownload(video);
  };

  /**
   * 处理延长
   */
  const handleExtend = (e) => {
    e.stopPropagation(); // 阻止触发播放
    onExtend(video);
  };

  /**
   * 处理视频元数据加载完成
   * 获取视频时长
   */
  const handleLoadedMetadata = (e) => {
    setDuration(Math.round(e.target.duration));
  };

  return (
    <div
      className="relative aspect-square rounded-lg overflow-hidden bg-slate-200 dark:bg-zinc-800 cursor-pointer group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onPlay(video)}
    >
      {/* 视频元素 */}
      <video
        src={video.url}
        className="w-full h-full object-cover"
        preload="metadata"
        muted
        onLoadedMetadata={handleLoadedMetadata}
      />

      {/* 参数标签（左上角） */}
      <div className="absolute top-2 left-2 flex flex-wrap gap-1 z-10">
        <span className="px-2 py-0.5 bg-black/70 text-white text-xs rounded backdrop-blur-sm">
          {video.resolution}
        </span>
        <span className="px-2 py-0.5 bg-black/70 text-white text-xs rounded backdrop-blur-sm">
          {video.ratio}
        </span>
        {/* 延长次数标签（如果已延长） */}
        {extensionCount > 0 && (
          <span className="px-2 py-0.5 bg-orange-500/80 text-white text-xs rounded backdrop-blur-sm">
            延长 {extensionCount}/{MAX_EXTENSIONS}
          </span>
        )}
      </div>

      {/* 视频时长（左下角） */}
      {duration && (
        <div className="absolute bottom-2 left-2 z-10">
          <span className="px-2 py-0.5 bg-black/70 text-white text-xs rounded backdrop-blur-sm">
            {formatDuration(duration)}
          </span>
        </div>
      )}

      {/* 播放图标覆盖层 */}
      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
        <Play className="w-16 h-16 text-white opacity-80 group-hover:opacity-100 transition-opacity" fill="white" />
      </div>

      {/* 悬停操作按钮 */}
      {isHovered && (
        <div className="absolute bottom-2 right-2 flex gap-2 z-10">
          {/* 延长按钮（仅 720p 且未达上限时显示） */}
          {canStillExtend && (
            <button
              onClick={handleExtend}
              className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-colors shadow-lg"
              title={`延长视频 (${extensionCount}/${MAX_EXTENSIONS})`}
            >
              <ArrowRightCircle className="w-5 h-5" />
            </button>
          )}

          {/* 下载按钮 */}
          <button
            onClick={handleDownload}
            className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-colors shadow-lg"
            title="下载视频"
          >
            <Download className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
