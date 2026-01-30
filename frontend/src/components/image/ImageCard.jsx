/**
 * 图像卡片组件
 *
 * 显示单张生成的图像，支持预览和操作
 */

import React from 'react';
import { Film, Download, ZoomIn } from 'lucide-react';

/**
 * ImageCard 组件
 *
 * @param {Object} props - 组件属性
 * @param {Object} props.img - 图像数据
 * @param {string} props.img.url - 图像 URL
 * @param {string} props.img.prompt - 生成提示词
 * @param {string} props.img.ratio - 宽高比
 * @param {Function} props.onMakeVideo - 生成视频回调
 * @param {Function} props.onPreview - 预览回调
 * @param {Function} props.onDownload - 下载回调
 */
export function ImageCard({ img, onMakeVideo, onPreview, onDownload }) {
  /**
   * 处理下载
   */
  const handleDownload = () => {
    if (onDownload) {
      onDownload(img);
    } else {
      // 默认下载行为
      const link = document.createElement('a');
      link.href = img.url;
      link.download = `image_${Date.now()}.png`;
      link.click();
    }
  };

  return (
    <div
      className="
        group relative rounded-xl overflow-hidden
        bg-slate-100 dark:bg-zinc-950
        border border-slate-200 dark:border-zinc-800
        aspect-[4/3]
        hover:shadow-lg hover:shadow-blue-900/5 dark:hover:shadow-none
        transition-all duration-300
      "
    >
      {/* 图像 */}
      <img
        src={img.url}
        alt="Generated"
        className="w-full h-full object-cover transition-all duration-500"
      />

      {/* 悬停遮罩 */}
      <div
        className="
          absolute inset-0
          bg-white/90 dark:bg-black/80
          opacity-0 group-hover:opacity-100
          transition-opacity duration-200
          flex flex-col justify-center items-center gap-3 p-4
          backdrop-blur-[2px]
        "
      >
        {/* 提示词 */}
        {img.prompt && (
          <p className="text-xs text-center text-slate-600 dark:text-zinc-400 line-clamp-2 px-2 italic">
            "{img.prompt}"
          </p>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-2 mt-2 scale-95 group-hover:scale-100 transition-transform duration-300 delay-75">
          {/* 生成视频按钮 */}
          <button
            onClick={() => onMakeVideo && onMakeVideo(img)}
            className="
              flex items-center gap-2
              px-4 py-2
              bg-blue-600 dark:bg-white
              text-white dark:text-black
              text-xs font-bold rounded-full
              hover:scale-105 transition-transform
              shadow-lg shadow-blue-600/20 dark:shadow-none
            "
          >
            <Film size={12} />
            生成视频
          </button>

          {/* 预览按钮 */}
          {onPreview && (
            <button
              onClick={() => onPreview(img)}
              className="
                p-2
                bg-white dark:bg-zinc-900
                border border-slate-200 dark:border-zinc-700
                rounded-full
                hover:bg-slate-50 dark:hover:bg-zinc-800
                transition-colors
                text-slate-700 dark:text-white
              "
            >
              <ZoomIn size={14} />
            </button>
          )}

          {/* 下载按钮 */}
          <button
            onClick={handleDownload}
            className="
              p-2
              bg-white dark:bg-zinc-900
              border border-slate-200 dark:border-zinc-700
              rounded-full
              hover:bg-slate-50 dark:hover:bg-zinc-800
              transition-colors
              text-slate-700 dark:text-white
            "
          >
            <Download size={14} />
          </button>
        </div>
      </div>

      {/* 宽高比标签 */}
      <div
        className="
          absolute top-3 left-3
          px-2 py-1
          bg-white/90 dark:bg-black/90
          text-slate-900 dark:text-white
          text-[9px] font-bold uppercase tracking-wider
          rounded-sm backdrop-blur-md
          opacity-0 group-hover:opacity-100
          transition-opacity duration-300 delay-100
        "
      >
        {img.ratio}
      </div>
    </div>
  );
}

export default ImageCard;
