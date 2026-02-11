/**
 * 多参考图上传组件
 *
 * 功能说明：
 * 1. 支持点击和拖拽上传图片
 * 2. 支持一次选择多张图片并追加到已有列表
 * 3. 支持删除单张图片和清空全部图片
 * 4. 自动提取图片宽高比，供外层业务做 auto 宽高比推导
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, Upload, X, Trash2 } from 'lucide-react';

/**
 * 计算最接近的预设宽高比
 *
 * @param {number} ratio - 实际宽高比 (width / height)
 * @returns {string} 最接近的宽高比字符串
 * @throws {Error} 当 ratio 非法时抛出异常
 */
function calculateAspectRatio(ratio) {
  if (!Number.isFinite(ratio) || ratio <= 0) {
    throw new Error('无效的宽高比');
  }

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
    '21:9': 2.333,
  };

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
}

/**
 * 读取文件为 Data URL
 *
 * @param {File} file - 待读取文件
 * @returns {Promise<string>} base64 Data URL
 * @throws {Error} 当读取失败时抛出异常
 */
function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error(`读取文件失败: ${file.name}`));
    reader.readAsDataURL(file);
  });
}

/**
 * 读取图片尺寸信息
 *
 * @param {string} objectUrl - 由 URL.createObjectURL 创建的 URL
 * @returns {Promise<{width:number, height:number, aspectRatio:string}>}
 * @throws {Error} 当图片加载失败时抛出异常
 */
function readImageMeta(objectUrl) {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      const width = img.width;
      const height = img.height;
      const aspectRatio = calculateAspectRatio(width / height);
      resolve({ width, height, aspectRatio });
    };
    img.onerror = () => reject(new Error('解析图片尺寸失败'));
    img.src = objectUrl;
  });
}

/**
 * 将 File 转换为上传项数据
 *
 * @param {File} file - 原始文件
 * @returns {Promise<Object>} 上传项对象
 * @throws {Error} 当文件处理失败时抛出异常
 */
async function parseImageFile(file) {
  const url = URL.createObjectURL(file);
  try {
    const [base64, meta] = await Promise.all([
      readFileAsDataUrl(file),
      readImageMeta(url),
    ]);

    return {
      file,
      url,
      base64,
      aspectRatio: meta.aspectRatio,
      width: meta.width,
      height: meta.height,
      signature: `${file.name}-${file.size}-${file.lastModified}`,
    };
  } catch (error) {
    // 失败时立即释放 URL，避免临时对象泄漏
    URL.revokeObjectURL(url);
    throw error;
  }
}

/**
 * ReferenceImagesUpload 组件
 *
 * @param {Object} props - 组件属性
 * @param {string} props.label - 标签文本
 * @param {Array<Object>} props.files - 当前已上传的文件数组
 * @param {Function} props.onChange - 文件数组变化回调
 * @param {number} props.maxFiles - 最大文件数量
 * @param {string} props.accept - 接受的文件类型
 */
export function ReferenceImagesUpload({
  label = '风格参考图',
  files = [],
  onChange,
  maxFiles = 14,
  accept = 'image/*',
}) {
  const inputRef = useRef(null);
  const previousFilesRef = useRef(files);
  const filesRef = useRef(files);
  const [isDragOver, setIsDragOver] = useState(false);

  /**
   * 持续同步最新文件列表，并在外层移除文件时释放失效 URL
   */
  useEffect(() => {
    const previousUrls = new Set(
      (previousFilesRef.current || [])
        .map((item) => item?.url)
        .filter(Boolean)
    );
    const currentUrls = new Set(
      (files || [])
        .map((item) => item?.url)
        .filter(Boolean)
    );

    // 仅释放“上一轮存在、本轮不存在”的 URL，避免误释放仍在使用的资源
    previousUrls.forEach((url) => {
      if (!currentUrls.has(url)) {
        URL.revokeObjectURL(url);
      }
    });

    previousFilesRef.current = files;
    filesRef.current = files;
  }, [files]);

  /**
   * 组件卸载时释放所有 object URL
   */
  useEffect(() => {
    return () => {
      filesRef.current.forEach((item) => {
        if (item?.url) {
          URL.revokeObjectURL(item.url);
        }
      });
    };
  }, []);

  /**
   * 批量添加文件（追加模式）
   *
   * 处理规则：
   * 1. 仅接受图片类型
   * 2. 超出 maxFiles 时只截取可用数量
   * 3. 根据 signature 去重，避免重复添加同一文件
   *
   * @param {FileList|File[]} incomingFiles - 新上传的文件集合
   * @returns {Promise<void>}
   */
  const appendFiles = useCallback(async (incomingFiles) => {
    if (!incomingFiles || incomingFiles.length === 0) {
      return;
    }

    const imageFiles = Array.from(incomingFiles).filter((file) => file.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      alert('仅支持上传图片文件');
      return;
    }

    const restSlots = maxFiles - files.length;
    if (restSlots <= 0) {
      alert(`最多上传 ${maxFiles} 张参考图`);
      return;
    }

    const selected = imageFiles.slice(0, restSlots);
    if (imageFiles.length > selected.length) {
      alert(`已达到上限，仅追加前 ${selected.length} 张`);
    }

    try {
      const parsedItems = await Promise.all(selected.map((file) => parseImageFile(file)));
      const existingSignatures = new Set(files.map((item) => item.signature));
      const uniqueItems = parsedItems.filter((item) => !existingSignatures.has(item.signature));

      // 对重复文件对应的 object URL 立即释放，避免资源泄漏
      parsedItems
        .filter((item) => existingSignatures.has(item.signature))
        .forEach((item) => URL.revokeObjectURL(item.url));

      if (uniqueItems.length === 0) {
        alert('这些图片已在参考列表中');
        return;
      }

      onChange([...files, ...uniqueItems]);
    } catch (error) {
      console.error('处理参考图失败:', error);
      alert(`上传失败: ${error.message}`);
    }
  }, [files, maxFiles, onChange]);

  /**
   * 处理 input 文件选择
   *
   * @param {React.ChangeEvent<HTMLInputElement>} event - 输入事件
   */
  const handleInputChange = async (event) => {
    await appendFiles(event.target.files);
    // 重置 input，允许重复选择同一文件时也触发 onChange
    event.target.value = '';
  };

  /**
   * 处理拖拽悬停
   *
   * @param {React.DragEvent<HTMLDivElement>} event - 拖拽事件
   */
  const handleDragOver = (event) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  /**
   * 处理拖拽离开
   *
   * @param {React.DragEvent<HTMLDivElement>} event - 拖拽事件
   */
  const handleDragLeave = (event) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  /**
   * 处理文件拖放
   *
   * @param {React.DragEvent<HTMLDivElement>} event - 拖拽事件
   */
  const handleDrop = async (event) => {
    event.preventDefault();
    setIsDragOver(false);
    await appendFiles(event.dataTransfer.files);
  };

  /**
   * 删除单张图片
   *
   * @param {number} index - 待删除项索引
   */
  const handleRemove = (index) => {
    const target = files[index];
    if (target?.url) {
      URL.revokeObjectURL(target.url);
    }
    onChange(files.filter((_, fileIndex) => fileIndex !== index));
  };

  /**
   * 清空全部图片
   */
  const handleClearAll = () => {
    files.forEach((item) => {
      if (item?.url) {
        URL.revokeObjectURL(item.url);
      }
    });
    onChange([]);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">
          {label}
        </label>
        <span className="text-[10px] text-slate-400 dark:text-zinc-600 font-mono">
          {files.length}/{maxFiles}
        </span>
      </div>

      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border border-dashed rounded-xl p-4 cursor-pointer transition-all
          ${isDragOver
            ? 'border-blue-500 bg-blue-50 dark:bg-zinc-800/60'
            : 'border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900/30 hover:border-blue-500 dark:hover:border-zinc-400'}
        `}
      >
        <div className="flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-zinc-400">
          {isDragOver ? <Upload size={14} /> : <Plus size={14} />}
          <span>点击或拖拽上传参考图（支持追加）</span>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple
          className="hidden"
          onChange={handleInputChange}
        />
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          <div className="grid grid-cols-4 gap-2">
            {files.map((item, index) => (
              <div
                key={item.signature || `${item.url}-${index}`}
                className="relative h-16 rounded-lg overflow-hidden border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900"
              >
                <img
                  src={item.url}
                  alt={`参考图 ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    handleRemove(index);
                  }}
                  className="
                    absolute top-1 right-1 p-1 rounded bg-black/65 text-white
                    hover:bg-red-500 transition-colors
                  "
                  title="移除该参考图"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={handleClearAll}
            type="button"
            className="
              w-full h-8 rounded-lg border border-slate-200 dark:border-zinc-700
              text-xs text-slate-600 dark:text-zinc-300
              hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40
              transition-all flex items-center justify-center gap-1
            "
          >
            <Trash2 size={12} />
            清空全部参考图
          </button>
        </div>
      )}
    </div>
  );
}

export default ReferenceImagesUpload;
