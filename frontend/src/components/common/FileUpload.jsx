/**
 * 文件上传组件
 *
 * 提供图片上传功能，支持预览和清除
 */

import React, { useRef, useEffect } from 'react';
import { Plus, X } from 'lucide-react';

/**
 * FileUpload 组件
 *
 * @param {Object} props - 组件属性
 * @param {string} props.label - 标签文本
 * @param {Function} props.onFileSelect - 文件选择回调，接收 {file, url, base64}
 * @param {string} props.preview - 预览图片 URL
 * @param {Function} props.onClear - 清除回调
 * @param {string} props.accept - 接受的文件类型
 * @param {string} props.className - 额外的 CSS 类名
 */
export function FileUpload({
  label,
  onFileSelect,
  preview,
  onClear,
  accept = 'image/*',
  className = '',
}) {
  // 文件输入引用
  const inputRef = useRef(null);
  // 记录当前创建的 object URL，便于清理释放内存
  const objectUrlRef = useRef(null);

  /**
   * 组件卸载时清理 object URL，防止内存泄漏
   */
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  /**
   * 计算图像宽高比
   * 根据实际宽高比找到最接近的预设宽高比
   *
   * @param {number} ratio - 实际宽高比 (width / height)
   * @returns {string} 最接近的宽高比字符串 (如 "16:9")
   */
  const calculateAspectRatio = (ratio) => {
    // 预设的宽高比及其数值
    const ratios = {
      '1:1': 1.0,
      '2:3': 0.667,
      '3:2': 1.5,
      '3:4': 0.75,
      '4:3': 1.333,
      '4:5': 0.8,
      '5:4': 1.25,
      '9:16': 0.5625,
      '16:9': 1.778,
      '21:9': 2.333
    };

    // 找到最接近的宽高比
    let closest = '3:2';
    let minDiff = Infinity;

    for (const [key, value] of Object.entries(ratios)) {
      const diff = Math.abs(ratio - value);
      if (diff < minDiff) {
        minDiff = diff;
        closest = key;
      }
    }

    return closest;
  };

  /**
   * 处理文件选择
   * 读取文件并转换为 base64,同时计算宽高比
   */
  const handleFile = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // 释放旧的 object URL，避免堆积
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }

      const url = URL.createObjectURL(file);
      objectUrlRef.current = url;

      // 读取文件为 base64
      const reader = new FileReader();
      reader.onload = () => {
        // 加载图像以获取尺寸
        const img = new window.Image();
        img.onload = () => {
          // 计算宽高比
          const ratio = img.width / img.height;
          const aspectRatio = calculateAspectRatio(ratio);

          // 回调返回文件信息,包含宽高比
          onFileSelect({
            file,
            url,
            base64: reader.result,
            aspectRatio,  // 新增:自动计算的宽高比
            width: img.width,
            height: img.height
          });
        };
        img.src = url;
      };
      reader.readAsDataURL(file);
    }
  };

  /**
   * 处理清除操作，确保释放 object URL
   */
  const handleClear = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    if (onClear) {
      onClear();
    }
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {/* 标签 */}
      <label className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">
        {label}
      </label>

      {/* 上传区域或预览 */}
      {!preview ? (
        // 上传区域
        <div
          onClick={() => inputRef.current.click()}
          className="
            border border-dashed border-slate-300 dark:border-zinc-700
            rounded-xl p-6
            flex flex-col items-center justify-center
            cursor-pointer
            hover:border-blue-500 dark:hover:border-zinc-400
            hover:bg-blue-50 dark:hover:bg-zinc-800/50
            transition-all group
            h-28
            bg-white dark:bg-zinc-900/30
          "
        >
          {/* 上传图标 */}
          <div className="p-2 rounded-full bg-slate-50 dark:bg-zinc-800 group-hover:bg-white dark:group-hover:bg-zinc-700 transition-colors mb-2 shadow-sm">
            <Plus
              className="text-slate-400 dark:text-zinc-400 group-hover:text-blue-600 dark:group-hover:text-zinc-200 transition-colors"
              size={16}
            />
          </div>
          <span className="text-xs text-slate-500 dark:text-zinc-500 group-hover:text-slate-700 dark:group-hover:text-zinc-300 transition-colors">
            选择参考图
          </span>

          {/* 隐藏的文件输入 */}
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={handleFile}
          />
        </div>
      ) : (
        // 预览区域
        <div className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-700 h-28 bg-slate-50 dark:bg-zinc-900 shadow-sm">
          {/* 预览图片 */}
          <img
            src={preview}
            alt="Upload"
            className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
          />

          {/* 清除按钮 */}
          <button
            onClick={handleClear}
            className="
              absolute top-2 right-2
              p-1.5
              bg-white/90 dark:bg-black/80
              hover:bg-red-50 dark:hover:bg-red-900/50
              hover:text-red-600 dark:hover:text-red-400
              rounded-md
              text-slate-600 dark:text-zinc-300
              shadow-sm transition-all
            "
          >
            <X size={12} />
          </button>
        </div>
      )}
    </div>
  );
}

export default FileUpload;
