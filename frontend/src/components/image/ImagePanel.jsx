/**
 * 图像生成面板组件
 *
 * 包含图像生成的所有控制选项
 */

import React from 'react';
import { Sparkles, Search, Check } from 'lucide-react';
import { Select } from '../common/Select';
import { NumberInput } from '../common/NumberInput';
import { ReferenceImagesUpload } from './ReferenceImagesUpload';
import { Button } from '../common/Button';

// 常量定义：图片模型选项
const IMAGE_MODELS = [
  { label: 'Nano Banana Pro', value: 'nano_banana_pro' },
  { label: 'Nano Banana 2', value: 'nano_banana_2' },
];

// 模型能力表：用于前端动态渲染可选分辨率与宽高比
const IMAGE_MODEL_CAPABILITIES = {
  nano_banana_pro: {
    aspectRatios: ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'],
    resolutions: ['1K', '2K', '4K'],
  },
  nano_banana_2: {
    aspectRatios: ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9', '1:4', '4:1', '1:8', '8:1'],
    resolutions: ['0.5K', '1K', '2K', '4K'],
  },
};

/**
 * ImagePanel 组件
 *
 * @param {Object} props - 组件属性
 * @param {string} props.prompt - 提示词
 * @param {Function} props.onPromptChange - 提示词变化回调
 * @param {string} props.imageModel - 图片模型
 * @param {Function} props.onImageModelChange - 图片模型变化回调
 * @param {string} props.aspectRatio - 宽高比
 * @param {Function} props.onAspectRatioChange - 宽高比变化回调
 * @param {string} props.resolution - 分辨率
 * @param {Function} props.onResolutionChange - 分辨率变化回调
 * @param {number} props.count - 生成数量
 * @param {Function} props.onCountChange - 数量变化回调
 * @param {boolean} props.useGoogleSearch - 是否使用 Google 搜索
 * @param {Function} props.onGoogleSearchChange - Google 搜索变化回调
 * @param {Array<Object>} props.referenceImages - 参考图像数组
 * @param {Function} props.onReferenceImagesChange - 参考图像变化回调
 * @param {boolean} props.isGenerating - 是否正在生成
 * @param {Function} props.onGenerate - 生成回调
 * @param {Function} props.onOpenAssist - 打开提示词优化弹窗
 */
export function ImagePanel({
  prompt,
  onPromptChange,
  imageModel,
  onImageModelChange,
  aspectRatio,
  onAspectRatioChange,
  resolution,
  onResolutionChange,
  count,
  onCountChange,
  useGoogleSearch,
  onGoogleSearchChange,
  referenceImages,
  onReferenceImagesChange,
  isGenerating,
  onGenerate,
  onOpenAssist,
}) {
  // 多图模式下，auto 宽高比默认以第一张参考图为准
  const firstReferenceImage = referenceImages?.[0] || null;
  const modelCapabilities =
    IMAGE_MODEL_CAPABILITIES[imageModel] || IMAGE_MODEL_CAPABILITIES.nano_banana_pro;

  return (
    <div className="w-full lg:w-[380px] lg:h-full min-h-0 shrink-0 flex flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        <div className="flex flex-col gap-6">
        {/* 提示词输入 */}
        <div className="relative group">
          <div className="flex justify-between items-center mb-2">
            <label className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">
              描述词
            </label>
            <span className="text-[10px] text-slate-400 dark:text-zinc-600 font-mono">
              {prompt.length}
            </span>
          </div>
          <textarea
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            placeholder="在此输入您的创意描述..."
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

        {/* 模型选择 */}
        <Select
          label="图片模型"
          value={imageModel}
          onChange={onImageModelChange}
          options={IMAGE_MODELS}
        />

        {/* 宽高比和分辨率 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest block mb-2">
              宽高比
              {firstReferenceImage?.aspectRatio && (
                <span className="ml-2 text-xs text-blue-500 dark:text-blue-400 normal-case">
                  (第1张: {firstReferenceImage.aspectRatio})
                </span>
              )}
            </label>
            <select
              value={aspectRatio}
              onChange={(e) => onAspectRatioChange(e.target.value)}
              className="
                w-full h-[42px] px-3
                bg-white dark:bg-zinc-900
                border border-slate-200 dark:border-zinc-800
                rounded-lg
                text-sm text-slate-900 dark:text-zinc-200
                focus:ring-2 focus:ring-blue-500/50 dark:focus:ring-white
                focus:border-blue-500 dark:focus:border-transparent
                outline-none transition-all shadow-sm
                hover:border-slate-300 dark:hover:border-zinc-700
              "
            >
              {firstReferenceImage?.aspectRatio && (
                <option value="auto">自动 ({firstReferenceImage.aspectRatio})</option>
              )}
              {modelCapabilities.aspectRatios.map((ratio) => (
                <option key={ratio} value={ratio}>{ratio}</option>
              ))}
            </select>
          </div>
          <Select
            label="分辨率"
            value={resolution}
            onChange={onResolutionChange}
            options={modelCapabilities.resolutions}
          />
        </div>

        {/* 生成数量和 Google 搜索 */}
        <div className="grid grid-cols-2 gap-4 items-end">
          <NumberInput
            label="生成数量 (Max 10)"
            min={1}
            max={10}
            value={count}
            onChange={onCountChange}
          />

          {/* Google 搜索开关 */}
          <div
            className={`
              h-[42px] border rounded-lg px-3
              flex items-center justify-between
              cursor-pointer transition-all shadow-sm
              ${
                useGoogleSearch
                  ? 'bg-blue-600 border-blue-600 text-white dark:bg-white dark:border-white dark:text-black'
                  : 'bg-white border-slate-200 text-slate-500 hover:border-blue-400 hover:text-slate-700 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400'
              }
            `}
            onClick={() => onGoogleSearchChange(!useGoogleSearch)}
          >
            <span className="text-xs font-medium flex items-center gap-2">
              <Search size={14} />
              谷歌搜索
            </span>
            <div
              className={`
                flex items-center justify-center w-4 h-4 rounded-full
                ${
                  useGoogleSearch
                    ? 'bg-white text-blue-600 dark:bg-black dark:text-white'
                    : 'bg-slate-200 dark:bg-zinc-800'
                }
              `}
            >
              {useGoogleSearch && <Check size={10} strokeWidth={4} />}
            </div>
          </div>
        </div>

        {/* 参考图上传（支持拖拽 + 多图） */}
        <ReferenceImagesUpload
          label="风格参考图"
          files={referenceImages}
          onChange={onReferenceImagesChange}
          maxFiles={14}
        />

        </div>
      </div>

      {/* 生成按钮固定在面板底部，避免被可滚动内容挤出视区 */}
      <div className="shrink-0 pt-4 border-t border-slate-200 dark:border-zinc-900 bg-slate-50/95 dark:bg-black/95 backdrop-blur supports-[backdrop-filter]:bg-slate-50/80">
        <Button
          onClick={onGenerate}
          disabled={isGenerating || (!prompt && (!referenceImages || referenceImages.length === 0))}
          className="w-full h-12 text-base shadow-lg shadow-blue-500/20 dark:shadow-none"
        >
          {isGenerating ? '生成中...' : '生成图像'}
        </Button>
      </div>
    </div>
  );
}

export default ImagePanel;
