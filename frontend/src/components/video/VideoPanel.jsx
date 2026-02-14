/**
 * 视频生成面板组件
 *
 * 包含视频生成的所有控制选项
 */

import React from 'react';
import { Sparkles } from 'lucide-react';
import { Select } from '../common/Select';
import { FileUpload } from '../common/FileUpload';
import { Button } from '../common/Button';

// 常量定义
const VID_ASPECT_RATIOS = ['16:9', '9:16'];
const VID_RESOLUTIONS = [
  { label: '720p (默认)', value: '720p' },
  { label: '1080p (仅支持 8 秒)', value: '1080p' },
  { label: '4k (仅支持 8 秒)', value: '4k' },
];

// 720p 支持的秒数选项
const VID_DURATIONS_720P = [
  { label: '4 秒', value: '4' },
  { label: '6 秒', value: '6' },
  { label: '8 秒', value: '8' },
];

// 1080p/4k 仅支持 8 秒
const VID_DURATIONS_HIGH_RES = [
  { label: '8 秒', value: '8' },
];

/**
 * VideoPanel 组件
 *
 * @param {Object} props - 组件属性
 * @param {string} props.prompt - 提示词
 * @param {Function} props.onPromptChange - 提示词变化回调
 * @param {string} props.mode - 生成模式 (text2vid/img2vid/first_last)
 * @param {Function} props.onModeChange - 模式变化回调
 * @param {string} props.aspectRatio - 宽高比
 * @param {Function} props.onAspectRatioChange - 宽高比变化回调
 * @param {string} props.resolution - 分辨率
 * @param {Function} props.onResolutionChange - 分辨率变化回调
 * @param {string} props.duration - 视频秒数 ("4"/"6"/"8")
 * @param {Function} props.onDurationChange - 秒数变化回调
 * @param {Object} props.firstFrame - 首帧图像
 * @param {Function} props.onFirstFrameChange - 首帧变化回调
 * @param {Object} props.lastFrame - 尾帧图像
 * @param {Function} props.onLastFrameChange - 尾帧变化回调
 * @param {boolean} props.isGenerating - 是否正在生成
 * @param {Function} props.onGenerate - 生成回调
 * @param {Function} props.onOpenAssist - 打开提示词优化弹窗
 */
export function VideoPanel({
  prompt,
  onPromptChange,
  mode,
  onModeChange,
  aspectRatio,
  onAspectRatioChange,
  resolution,
  onResolutionChange,
  duration,
  onDurationChange,
  firstFrame,
  onFirstFrameChange,
  lastFrame,
  onLastFrameChange,
  isGenerating,
  onGenerate,
  onOpenAssist,
}) {
  // 模式选项
  const modes = [
    { key: 'text2vid', label: '文生视频' },
    { key: 'img2vid', label: '图生视频' },
    { key: 'first_last', label: '首尾帧' },
  ];

  // 根据分辨率动态获取秒数选项
  // 720p 支持 4/6/8 秒，1080p/4k 仅支持 8 秒
  const durationOptions = resolution === '720p'
    ? VID_DURATIONS_720P
    : VID_DURATIONS_HIGH_RES;

  return (
    <div className="w-full lg:w-[380px] shrink-0 flex flex-col gap-6">
      <div className="flex flex-col gap-6">
        {/* 提示词输入 */}
        <div className="relative group">
          <div className="flex justify-between items-center mb-2">
            <label className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">
              描述词
            </label>
            <span className="text-[10px] text-slate-400 dark:text-zinc-600 font-mono">
              {prompt.length}/2000
            </span>
          </div>
          <textarea
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            placeholder="描述视频的动作和场景..."
            className="
              w-full bg-white dark:bg-zinc-900
              border border-slate-200 dark:border-zinc-800
              rounded-xl p-4
              text-sm text-slate-900 dark:text-zinc-200
              placeholder-slate-400 dark:placeholder-zinc-600
              focus:ring-2 focus:ring-blue-500/50 dark:focus:ring-white
              focus:border-blue-500 dark:focus:border-transparent
              outline-none resize-none h-40
              transition-all font-normal leading-relaxed
              shadow-sm hover:border-slate-300 dark:hover:border-zinc-700
            "
            maxLength={2000}
          />
          {/* AI 优化按钮 */}
          <div className="absolute bottom-3 right-3">
            <button
              onClick={onOpenAssist}
              className="
                p-2 bg-slate-50 dark:bg-zinc-800
                hover:bg-blue-100 hover:text-blue-600
                dark:hover:bg-zinc-700
                rounded-lg text-slate-500 dark:text-zinc-400
                transition-all shadow-sm group-hover:shadow-md
              "
              title="AI 提示词优化"
            >
              <Sparkles size={14} className="group-hover:scale-110 transition-transform" />
            </button>
          </div>
        </div>

        {/* 模式选择 */}
        <div className="flex p-1 bg-slate-100 dark:bg-zinc-900 rounded-lg border border-slate-200 dark:border-zinc-800">
          {modes.map((m) => (
            <button
              key={m.key}
              onClick={() => onModeChange(m.key)}
              className={`
                flex-1 py-2 text-[10px] uppercase font-bold tracking-wider
                rounded-md transition-all
                ${
                  mode === m.key
                    ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                    : 'text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300'
                }
              `}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* 分辨率和宽高比 */}
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="视频分辨率"
            value={resolution}
            onChange={onResolutionChange}
            options={VID_RESOLUTIONS}
          />
          <Select
            label="宽高比"
            value={aspectRatio}
            onChange={onAspectRatioChange}
            options={VID_ASPECT_RATIOS}
          />
        </div>

        {/* 视频秒数选择 */}
        <Select
          label="视频时长"
          value={duration}
          onChange={onDurationChange}
          options={durationOptions}
          disabled={resolution !== '720p'}
        />

        {/* 图生视频模式 - 参考图片 */}
        {mode === 'img2vid' && (
          <FileUpload
            label="参考图片"
            preview={firstFrame?.url}
            onFileSelect={onFirstFrameChange}
            onClear={() => onFirstFrameChange(null)}
          />
        )}

        {/* 首尾帧模式 - 首帧和尾帧 */}
        {mode === 'first_last' && (
          <div className="grid grid-cols-2 gap-4">
            <FileUpload
              label="首帧图片"
              preview={firstFrame?.url}
              onFileSelect={onFirstFrameChange}
              onClear={() => onFirstFrameChange(null)}
            />
            <FileUpload
              label="尾帧图片"
              preview={lastFrame?.url}
              onFileSelect={onLastFrameChange}
              onClear={() => onLastFrameChange(null)}
            />
          </div>
        )}

        {/* 生成按钮 */}
        <div className="pt-4 border-t border-slate-200 dark:border-zinc-900">
          <Button
            onClick={onGenerate}
            disabled={isGenerating || (mode === 'text2vid' && !prompt)}
            className="w-full h-12 text-base shadow-lg shadow-blue-500/20 dark:shadow-none"
          >
            {isGenerating ? '渲染中...' : '生成视频'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default VideoPanel;
