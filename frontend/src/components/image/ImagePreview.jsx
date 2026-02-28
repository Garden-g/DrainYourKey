/**
 * 图像大图预览组件
 *
 * 全屏显示图像
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, Download, Film, ChevronDown, ChevronUp } from 'lucide-react';

// 缩放范围和步进
const MIN_SCALE = 0.5;
const MAX_SCALE = 12;
const ZOOM_STEP = 0.2;

/**
 * ImagePreview 组件
 *
 * @param {Object} props - 组件属性
 * @param {Object} props.image - 图像数据
 * @param {Function} props.onClose - 关闭回调
 * @param {Function} props.onMakeVideo - 生成视频回调
 */
export function ImagePreview({ image, onClose, onMakeVideo }) {
  // Prompt展开/收起状态
  const [isPromptExpanded, setIsPromptExpanded] = useState(false);
  // 当前缩放倍率
  const [scale, setScale] = useState(1);
  // 图片位移偏移量（像素）
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  // 是否正在拖拽
  const [isDragging, setIsDragging] = useState(false);

  // 图片可视区域容器引用
  const viewportRef = useRef(null);
  // 图片元素引用
  const imageRef = useRef(null);
  // 拖拽起点坐标
  const dragStartRef = useRef({ x: 0, y: 0 });
  // 拖拽开始时的图片位移
  const dragStartOffsetRef = useRef({ x: 0, y: 0 });

  /**
   * 将位移限制在可视区域边界内，避免图片被拖丢
   *
   * @param {{x:number,y:number}} nextOffset - 目标位移
   * @param {number} targetScale - 目标缩放倍率
   * @returns {{x:number,y:number}} 被钳制后的位移
   */
  const clampOffset = useCallback((nextOffset, targetScale) => {
    if (targetScale <= 1) {
      return { x: 0, y: 0 };
    }

    if (!viewportRef.current || !imageRef.current) {
      return nextOffset;
    }

    const viewportWidth = viewportRef.current.clientWidth;
    const viewportHeight = viewportRef.current.clientHeight;
    const imageWidth = imageRef.current.clientWidth;
    const imageHeight = imageRef.current.clientHeight;

    if (!viewportWidth || !viewportHeight || !imageWidth || !imageHeight) {
      return nextOffset;
    }

    const scaledWidth = imageWidth * targetScale;
    const scaledHeight = imageHeight * targetScale;

    const maxX = Math.max(0, (scaledWidth - viewportWidth) / 2);
    const maxY = Math.max(0, (scaledHeight - viewportHeight) / 2);

    return {
      x: Math.min(Math.max(nextOffset.x, -maxX), maxX),
      y: Math.min(Math.max(nextOffset.y, -maxY), maxY),
    };
  }, []);

  /**
   * 当图片变化时，重置缩放与位移
   */
  useEffect(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
    setIsDragging(false);
  }, [image?.url]);

  /**
   * 视口变化（如窗口尺寸变化）时，重新钳制位移
   */
  useEffect(() => {
    const handleResize = () => {
      setOffset((prev) => clampOffset(prev, scale));
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [clampOffset, scale]);

  /**
   * 处理滚轮缩放（仅在图片区域内生效）
   *
   * @param {React.WheelEvent<HTMLDivElement>} e - 滚轮事件
   */
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;

    setScale((prevScale) => {
      const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prevScale + delta));
      setOffset((prevOffset) => clampOffset(prevOffset, nextScale));
      return nextScale;
    });
  }, [clampOffset]);

  /**
   * 开始拖拽图片
   *
   * @param {React.MouseEvent<HTMLDivElement>} e - 鼠标按下事件
   */
  const handleMouseDown = useCallback((e) => {
    // 仅支持左键拖拽；未放大时禁用拖拽
    if (e.button !== 0 || scale <= 1) {
      return;
    }

    e.preventDefault();
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    dragStartOffsetRef.current = offset;
    setIsDragging(true);
  }, [offset, scale]);

  /**
   * 处理图片加载完成，确保首帧时位移在合法范围
   */
  const handleImageLoad = useCallback(() => {
    setOffset((prev) => clampOffset(prev, scale));
  }, [clampOffset, scale]);

  /**
   * 拖拽中的全局鼠标事件（保证移出图片区域也可拖动）
   */
  useEffect(() => {
    if (!isDragging) {
      return undefined;
    }

    const handleMouseMove = (e) => {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      const nextOffset = {
        x: dragStartOffsetRef.current.x + dx,
        y: dragStartOffsetRef.current.y + dy,
      };
      setOffset(clampOffset(nextOffset, scale));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [clampOffset, isDragging, scale]);

  if (!image) return null;

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
            <div
              ref={viewportRef}
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              className={`
                flex-1 min-h-0 rounded-xl bg-black overflow-hidden
                flex items-center justify-center p-3
                ${scale > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in'}
              `}
            >
              <img
                ref={imageRef}
                src={image.url}
                alt="Preview"
                onLoad={handleImageLoad}
                draggable={false}
                className={`
                  max-w-full max-h-full object-contain rounded-lg select-none
                  ${isDragging ? '' : 'transition-transform duration-75'}
                `}
                style={{
                  transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                  transformOrigin: 'center center',
                }}
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
