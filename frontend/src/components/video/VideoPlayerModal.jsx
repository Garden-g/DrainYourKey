/**
 * VideoPlayerModal 组件
 *
 * 全屏播放视频
 * - 左侧视频播放器
 * - 右侧信息区（Prompt + 延长描述输入）
 * - 底部操作区（延长/下载/关闭）
 * - 布局风格与图片预览保持一致
 */

import React, { useState, useRef, useEffect } from 'react';
import { X, Download, ArrowRightCircle, ChevronDown, ChevronUp } from 'lucide-react';

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
 * VideoPlayerModal 组件
 *
 * @param {Object} props - 组件属性
 * @param {Object} props.video - 视频对象
 * @param {Function} props.onClose - 关闭回调
 * @param {Function} props.onExtend - 延长回调
 * @param {Function} props.onDownload - 下载回调
 */
export function VideoPlayerModal({ video, onClose, onExtend, onDownload }) {
  // 延长描述输入值
  const [extendPrompt, setExtendPrompt] = useState('');
  const [duration, setDuration] = useState(null); // 视频时长
  const [isPromptExpanded, setIsPromptExpanded] = useState(false);
  const videoRef = useRef(null);

  // 计算延长次数
  const extensionCount = calculateExtensionCount(duration);
  // 判断是否还能继续延长
  const canStillExtend = video.canExtend && extensionCount < MAX_EXTENSIONS;

  /**
   * 自动播放视频
   */
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch((err) => {
        console.error('自动播放失败:', err);
      });
    }
  }, []);

  /**
   * 处理视频元数据加载完成
   * 获取视频时长
   */
  const handleLoadedMetadata = (e) => {
    setDuration(Math.round(e.target.duration));
  };

  /**
   * 处理延长
   */
  const handleExtend = () => {
    if (!canStillExtend) {
      return;
    }

    if (!extendPrompt.trim()) {
      alert('请输入延长描述');
      return;
    }

    onExtend(video, extendPrompt);
    setExtendPrompt('');
    onClose(); // 关闭弹窗
  };

  /**
   * 处理下载
   */
  const handleDownload = () => {
    onDownload(video);
  };

  /**
   * 阻止点击视频区域时关闭弹窗
   */
  const handleContentClick = (e) => {
    e.stopPropagation();
  };

  /**
   * 获取延长按钮文案
   *
   * @returns {string} 按钮文案
   */
  const getExtendButtonLabel = () => {
    if (!video.canExtend) return '仅 720p 视频支持延长';
    if (extensionCount >= MAX_EXTENSIONS) return '已达最大延长次数';
    return `开始延长 (${extensionCount + 1}/${MAX_EXTENSIONS})`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
      onClick={onClose}
    >
      <div
        className="
          relative w-full max-w-6xl h-[90vh]
          bg-white dark:bg-white border border-slate-200
          rounded-2xl shadow-2xl
          flex flex-col
        "
        onClick={handleContentClick}
      >
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="
            absolute top-4 right-4 z-10
            p-2 rounded-full
            bg-slate-100 hover:bg-slate-200
            text-slate-700 transition-colors
          "
          title="关闭"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 上半部分：左侧视频 + 右侧信息 */}
        <div className="flex-1 min-h-0 p-4 lg:p-5">
          <div className="h-full min-h-0 flex flex-col lg:flex-row gap-4">
            {/* 左侧视频区 */}
            <div className="flex-1 min-h-0 rounded-xl bg-black flex items-center justify-center p-3">
              <video
                ref={videoRef}
                src={video.url}
                className="max-w-full max-h-full object-contain rounded-lg"
                controls
                loop
                autoPlay
                onLoadedMetadata={handleLoadedMetadata}
              />
            </div>

            {/* 右侧信息区 */}
            <aside
              className="
                w-full lg:w-96 lg:max-w-96 shrink-0
                rounded-xl border border-slate-700/80
                bg-slate-900/80
                p-4 text-slate-200
                flex flex-col min-h-48 lg:min-h-0
                gap-4
              "
            >
              {/* 参数标签 */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-1 bg-blue-600 text-white text-xs rounded-full">
                  {video.resolution}
                </span>
                <span className="px-2.5 py-1 bg-indigo-600 text-white text-xs rounded-full">
                  {video.ratio}
                </span>
                {extensionCount > 0 && (
                  <span className="px-2.5 py-1 bg-orange-500 text-white text-xs rounded-full">
                    已延长 {extensionCount}/{MAX_EXTENSIONS}
                  </span>
                )}
              </div>

              {/* Prompt 信息 */}
              <section className="min-h-0 flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-slate-100">Prompt</h3>
                  {video.prompt && video.prompt.length > 120 && (
                    <button
                      onClick={() => setIsPromptExpanded(!isPromptExpanded)}
                      className="text-slate-400 hover:text-slate-200 transition-colors"
                      title={isPromptExpanded ? '收起' : '展开'}
                    >
                      {isPromptExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                  <p className={`text-sm leading-relaxed whitespace-pre-wrap ${
                    video.prompt && !isPromptExpanded ? 'line-clamp-5' : ''
                  }`}>
                    {video.prompt || '暂无提示词记录'}
                  </p>
                </div>
              </section>

              {/* 延长输入 */}
              <section className="space-y-2">
                <label className="block text-sm font-medium text-slate-200">
                  延长描述
                </label>
                <textarea
                  value={extendPrompt}
                  onChange={(e) => setExtendPrompt(e.target.value)}
                  placeholder={canStillExtend ? '描述视频接下来的内容...' : '当前视频不可继续延长'}
                  disabled={!canStillExtend}
                  className="
                    w-full px-3 py-2 rounded-lg resize-none
                    bg-zinc-950 border border-zinc-700
                    text-slate-100 placeholder:text-zinc-500
                    focus:outline-none focus:ring-2 focus:ring-blue-500/60
                    disabled:opacity-60 disabled:cursor-not-allowed
                  "
                  rows={4}
                />
                <p className="text-xs text-slate-400">
                  {video.canExtend
                    ? (extensionCount >= MAX_EXTENSIONS
                      ? `已达最大延长次数（${MAX_EXTENSIONS}）`
                      : `当前将执行第 ${extensionCount + 1} 次延长`)
                    : '仅 720p 视频支持延长'}
                </p>
              </section>
            </aside>
          </div>
        </div>

        {/* 底部操作区 */}
        <div className="border-t border-slate-200 p-4">
          <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              onClick={handleExtend}
              disabled={!canStillExtend || !extendPrompt.trim()}
              className="
                flex items-center gap-2
                px-4 py-2 rounded-full
                bg-blue-600 text-white
                hover:bg-blue-700 transition-colors
                disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed
              "
            >
              <ArrowRightCircle className="w-4 h-4" />
              {getExtendButtonLabel()}
            </button>

            <button
              onClick={handleDownload}
              className="
                flex items-center gap-2
                px-4 py-2 rounded-full
                bg-slate-100 text-slate-800 border border-slate-300
                hover:bg-slate-200 transition-colors
              "
            >
              <Download className="w-4 h-4" />
              下载视频
            </button>

            <button
              onClick={onClose}
              className="
                flex items-center gap-2
                px-4 py-2 rounded-full
                bg-slate-700/70 text-slate-100
                hover:bg-slate-600/80 transition-colors
              "
            >
              <X className="w-4 h-4" />
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
