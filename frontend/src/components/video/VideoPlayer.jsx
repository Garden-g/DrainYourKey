/**
 * 视频播放器组件
 *
 * 显示生成的视频
 */

import React from 'react';
import { Film, Download } from 'lucide-react';

/**
 * VideoPlayer 组件
 *
 * @param {Object} props - 组件属性
 * @param {Object} props.video - 视频数据
 * @param {boolean} props.isLoading - 是否正在加载
 * @param {number} props.progress - 加载进度 (0-100)
 * @param {string} props.statusMessage - 状态消息
 */
export function VideoPlayer({ video, isLoading, progress = 0, statusMessage }) {
  /**
   * 处理下载
   */
  const handleDownload = () => {
    if (!video?.url) return;
    const link = document.createElement('a');
    link.href = video.url;
    link.download = `video_${Date.now()}.mp4`;
    link.click();
  };

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
      {!video && !isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center opacity-40 select-none pointer-events-none">
          <div className="w-24 h-24 bg-slate-50 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-6">
            <Film size={32} className="text-slate-300 dark:text-zinc-700" />
          </div>
          <p className="text-slate-300 dark:text-zinc-700 font-bold text-2xl tracking-tighter">
            等待输入
          </p>
        </div>
      )}

      {/* 加载状态 */}
      {isLoading && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          {/* 进度条 */}
          <div className="w-64 h-1 bg-slate-200 dark:bg-zinc-800 overflow-hidden rounded-full">
            <div
              className="h-full bg-blue-600 dark:bg-white transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400 dark:text-zinc-500">
            {statusMessage || '正在渲染帧缓冲区'}
          </p>
          <p className="text-sm text-slate-500 dark:text-zinc-400">
            {progress}%
          </p>
        </div>
      )}

      {/* 视频播放器 */}
      {video && !isLoading && (
        <div className="flex-1 flex flex-col z-10 h-full justify-center">
          <div
            className="
              w-full aspect-video
              bg-black rounded-xl overflow-hidden
              relative shadow-2xl
              ring-1 ring-slate-900/5 dark:ring-white/10
              group
            "
          >
            <video
              src={video.url}
              controls
              autoPlay
              loop
              className="w-full h-full object-contain"
            />

            {/* 视频信息 */}
            <div className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col gap-1">
              {video.resolution && (
                <span className="px-2 py-1 bg-white/10 backdrop-blur-md text-white text-[10px] font-mono border border-white/20 rounded-md inline-block self-start">
                  {video.resolution}
                </span>
              )}
              {video.ratio && (
                <span className="px-2 py-1 bg-white/10 backdrop-blur-md text-white text-[10px] font-mono border border-white/20 rounded-md inline-block self-start">
                  {video.ratio}
                </span>
              )}
            </div>

            {/* 下载按钮 */}
            <button
              onClick={handleDownload}
              className="
                absolute top-4 right-4
                opacity-0 group-hover:opacity-100
                transition-opacity duration-300
                p-2 bg-white/10 backdrop-blur-md
                text-white rounded-md
                hover:bg-white/20
              "
            >
              <Download size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default VideoPlayer;
