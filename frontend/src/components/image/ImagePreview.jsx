/**
 * 图像大图预览组件
 *
 * 全屏显示图像
 */

import React, { useState } from 'react';
import { X, Download, Film, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * ImagePreview 组件
 *
 * @param {Object} props - 组件属性
 * @param {Object} props.image - 图像数据
 * @param {Function} props.onClose - 关闭回调
 * @param {Function} props.onMakeVideo - 生成视频回调
 */
export function ImagePreview({ image, onClose, onMakeVideo }) {
  if (!image) return null;

  // Prompt展开/收起状态
  const [isPromptExpanded, setIsPromptExpanded] = useState(false);

  /**
   * 处理下载
   */
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = image.url;
    link.download = `image_${Date.now()}.png`;
    link.click();
  };

  /**
   * 处理背景点击关闭
   */
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="
        fixed inset-0 z-50
        flex items-center justify-center
        bg-black/85
        p-4
      "
      onClick={handleBackdropClick}
    >
      <div
        className="
          relative w-full max-w-6xl h-[90vh]
          bg-white dark:bg-white border border-slate-200
          rounded-2xl shadow-2xl
          flex flex-col
        "
        onClick={(e) => e.stopPropagation()}
      >
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="
            absolute top-4 right-4 z-10
            p-2 rounded-full
            bg-slate-100 hover:bg-slate-200
            text-slate-700
            transition-colors
          "
        >
          <X size={22} />
        </button>

        {/* 上半部分：左图右文（移动端自动变为上下） */}
        <div className="flex-1 min-h-0 p-4 lg:p-5">
          <div className="h-full min-h-0 flex flex-col lg:flex-row gap-4">
            {/* 图片区 */}
            <div className="flex-1 min-h-0 rounded-xl bg-black flex items-center justify-center p-3">
              <img
                src={image.url}
                alt="Preview"
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            </div>

            {/* Prompt 侧边区 */}
            <aside
              className="
                w-full lg:w-80 lg:max-w-80 shrink-0
                rounded-xl border border-slate-700/80
                bg-slate-900/80
                p-4 text-slate-200
                flex flex-col min-h-40 lg:min-h-0
              "
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-100">Prompt</h3>
                {image.prompt && image.prompt.length > 80 && (
                  <button
                    onClick={() => setIsPromptExpanded(!isPromptExpanded)}
                    className="text-slate-400 hover:text-slate-200 transition-colors"
                    title={isPromptExpanded ? '收起' : '展开'}
                  >
                    {isPromptExpanded ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </button>
                )}
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                <p className={`text-sm leading-relaxed whitespace-pre-wrap ${
                  image.prompt && !isPromptExpanded ? 'line-clamp-5' : ''
                }`}>
                  {image.prompt || '暂无提示词记录'}
                </p>
              </div>
            </aside>
          </div>
        </div>

        {/* 下方操作区（不覆盖在图像上） */}
        <div className="border-t border-slate-200 p-4">
          <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              onClick={() => {
                onMakeVideo(image);
                onClose();
              }}
              className="
                flex items-center gap-2
                px-4 py-2
                bg-blue-600 text-white
                rounded-full
                hover:bg-blue-700
                transition-colors
              "
            >
              <Film size={16} />
              生成视频
            </button>

            <button
              onClick={handleDownload}
              className="
                flex items-center gap-2
                px-4 py-2
                bg-slate-100 text-slate-800 border border-slate-300
                rounded-full
                hover:bg-slate-200
                transition-colors
              "
            >
              <Download size={16} />
              下载
            </button>

            <button
              onClick={onClose}
              className="
                flex items-center gap-2
                px-4 py-2
                bg-slate-700/70 text-slate-100
                rounded-full
                hover:bg-slate-600/80
                transition-colors
              "
            >
              <X size={16} />
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ImagePreview;
