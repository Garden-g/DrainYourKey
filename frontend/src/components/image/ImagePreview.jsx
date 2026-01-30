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
        bg-black/90
        p-4
      "
      onClick={handleBackdropClick}
    >
      {/* 关闭按钮 */}
      <button
        onClick={onClose}
        className="
          absolute top-4 right-4
          p-2 rounded-full
          bg-white/10 hover:bg-white/20
          text-white
          transition-colors
        "
      >
        <X size={24} />
      </button>

      {/* 图像容器 */}
      <div className="relative max-w-[90vw] max-h-[90vh]">
        <img
          src={image.url}
          alt="Preview"
          className="max-w-full max-h-[85vh] object-contain rounded-lg"
        />

        {/* 底部操作栏 */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3">
          {/* 生成视频按钮 */}
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
              shadow-lg
            "
          >
            <Film size={16} />
            生成视频
          </button>

          {/* 下载按钮 */}
          <button
            onClick={handleDownload}
            className="
              flex items-center gap-2
              px-4 py-2
              bg-white/10 text-white
              rounded-full
              hover:bg-white/20
              transition-colors
            "
          >
            <Download size={16} />
            下载
          </button>
        </div>

        {/* Prompt显示 - 可展开/收起 */}
        {image.prompt && (
          <div className={`absolute top-4 left-4 max-w-md transition-all duration-300 ${
            isPromptExpanded ? 'max-h-64' : 'max-h-16'
          }`}>
            <div className="bg-black/60 backdrop-blur-sm rounded-lg px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <p className={`text-white/90 text-sm ${
                  isPromptExpanded ? '' : 'line-clamp-2'
                } ${isPromptExpanded ? 'overflow-y-auto max-h-56' : ''}`}>
                  {image.prompt}
                </p>
                {image.prompt.length > 80 && (
                  <button
                    onClick={() => setIsPromptExpanded(!isPromptExpanded)}
                    className="flex-shrink-0 text-white/70 hover:text-white transition-colors"
                  >
                    {isPromptExpanded ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ImagePreview;
