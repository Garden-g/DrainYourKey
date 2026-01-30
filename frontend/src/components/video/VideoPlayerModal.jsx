/**
 * VideoPlayerModal 组件
 *
 * 全屏播放视频
 * - 黑色半透明背景 + 背景模糊
 * - 视频播放器（自动播放 + 循环）
 * - 视频信息显示（分辨率、宽高比、提示词）
 * - 延长功能（折叠输入框，仅 720p 显示）
 * - 下载按钮
 * - 关闭按钮
 */

import React, { useState, useRef, useEffect } from 'react';
import { X, Download, ArrowRightCircle, ChevronDown, ChevronUp } from 'lucide-react';

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
  const [showExtendInput, setShowExtendInput] = useState(false);
  const [extendPrompt, setExtendPrompt] = useState('');
  const videoRef = useRef(null);

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
   * 处理延长
   */
  const handleExtend = () => {
    if (!extendPrompt.trim()) {
      alert('请输入延长描述');
      return;
    }
    onExtend(video, extendPrompt);
    setExtendPrompt('');
    setShowExtendInput(false);
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl w-full bg-slate-100 dark:bg-zinc-900 rounded-lg overflow-hidden shadow-2xl"
        onClick={handleContentClick}
      >
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
          title="关闭"
        >
          <X className="w-6 h-6" />
        </button>

        {/* 视频播放器 */}
        <div className="relative bg-black">
          <video
            ref={videoRef}
            src={video.url}
            className="w-full max-h-[70vh] object-contain"
            controls
            loop
            autoPlay
          />
        </div>

        {/* 视频信息 */}
        <div className="p-6 space-y-4">
          {/* 参数信息 */}
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-blue-500 text-white text-sm rounded-full">
              {video.resolution}
            </span>
            <span className="px-3 py-1 bg-purple-500 text-white text-sm rounded-full">
              {video.ratio}
            </span>
          </div>

          {/* 提示词 */}
          {video.prompt && (
            <div>
              <p className="text-sm text-slate-500 dark:text-zinc-500 mb-1">提示词</p>
              <p className="text-slate-900 dark:text-zinc-100">{video.prompt}</p>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex gap-3">
            {/* 延长按钮（仅 720p 显示） */}
            {video.canExtend && (
              <button
                onClick={() => setShowExtendInput(!showExtendInput)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                <ArrowRightCircle className="w-5 h-5" />
                <span>延长视频</span>
                {showExtendInput ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
            )}

            {/* 下载按钮 */}
            <button
              onClick={handleDownload}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
            >
              <Download className="w-5 h-5" />
              <span>下载视频</span>
            </button>
          </div>

          {/* 延长输入框（折叠） */}
          {showExtendInput && video.canExtend && (
            <div className="space-y-3 p-4 bg-slate-200 dark:bg-zinc-800 rounded-lg">
              <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300">
                延长描述
              </label>
              <textarea
                value={extendPrompt}
                onChange={(e) => setExtendPrompt(e.target.value)}
                placeholder="描述视频接下来的内容..."
                className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-lg text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={3}
              />
              <button
                onClick={handleExtend}
                className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                开始延长
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
