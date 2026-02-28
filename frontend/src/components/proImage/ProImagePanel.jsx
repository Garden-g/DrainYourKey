/**
 * 专业生图参数面板组件
 *
 * 设计目标：
 * 1. 视觉结构尽量对齐 `专业模式.html`；
 * 2. 仅展示当前后端 + Google SDK 可真实生效的参数；
 * 3. 所有参数均由父组件托管，保证状态单一来源。
 */

import React from 'react';
import { HelpCircle, Wand2, Dices } from 'lucide-react';

// 图片模型下拉选项（与后端 image_model 保持一致）
const IMAGE_MODELS = [
  { label: 'Nano Banana Pro', value: 'nano_banana_pro' },
  { label: 'Nano Banana 2', value: 'nano_banana_2' },
];

// 模型能力表：用于动态限制可选分辨率和宽高比，避免提交非法组合
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
 * 浮点数展示格式化
 *
 * @param {number} value - 数值
 * @param {number} digits - 小数位数
 * @returns {string} 格式化后的字符串
 */
function formatFloat(value, digits = 2) {
  if (!Number.isFinite(value)) return '0.00';
  return value.toFixed(digits);
}

/**
 * 区间滑杆 + 数字输入联动控件
 *
 * @param {Object} props - 组件参数
 * @param {string} props.label - 标签文本
 * @param {string} props.hint - 提示信息
 * @param {number} props.min - 最小值
 * @param {number} props.max - 最大值
 * @param {number} props.step - 步长
 * @param {number} props.value - 当前值
 * @param {Function} props.onChange - 变更回调
 * @param {number} [props.digits=2] - 展示小数位
 */
function RangeField({ label, hint, min, max, step, value, onChange, digits = 2 }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-[10px] text-slate-500">
        <div className="flex items-center">
          <span>{label}</span>
          <div className="group relative inline-flex items-center justify-center ml-1 z-10" tabIndex={0}>
            <HelpCircle className="w-3 h-3 text-slate-300 hover:text-slate-500 cursor-help transition-colors outline-none" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block group-focus:block w-44 p-2.5 bg-slate-800 text-white text-[10px] rounded-md shadow-xl leading-relaxed pointer-events-none text-center font-normal whitespace-normal">
              {hint}
            </div>
          </div>
        </div>
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={formatFloat(value, digits)}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (Number.isFinite(next)) onChange(next);
          }}
          className="w-12 px-1 py-0.5 bg-gray-50 border border-gray-200 rounded font-mono text-slate-700 text-right focus:outline-none focus:ring-1 focus:ring-blue-100"
        />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (Number.isFinite(next)) onChange(next);
        }}
        className="w-full accent-blue-600 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
      />
    </div>
  );
}

/**
 * 专业生图左侧参数面板
 *
 * @param {Object} props - 组件属性
 * @returns {JSX.Element} 面板组件
 */
export function ProImagePanel({
  prompt,
  onPromptChange,
  negativePrompt,
  onNegativePromptChange,
  imageModel,
  onImageModelChange,
  aspectRatio,
  onAspectRatioChange,
  resolution,
  onResolutionChange,
  count,
  onCountChange,
  outputMimeType,
  onOutputMimeTypeChange,
  outputCompressionQuality,
  onOutputCompressionQualityChange,
  safetyFilterLevel,
  onSafetyFilterLevelChange,
  temperature,
  onTemperatureChange,
  topP,
  onTopPChange,
  topK,
  onTopKChange,
  presencePenalty,
  onPresencePenaltyChange,
  frequencyPenalty,
  onFrequencyPenaltyChange,
  maxOutputTokens,
  onMaxOutputTokensChange,
  seed,
  onSeedChange,
  isGenerating,
  onGenerate,
  onOpenAssist,
}) {
  const modelCapabilities =
    IMAGE_MODEL_CAPABILITIES[imageModel] || IMAGE_MODEL_CAPABILITIES.nano_banana_pro;

  return (
    <div className="w-full lg:w-[460px] lg:h-full min-h-0 shrink-0 flex flex-col">
      <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full min-h-0 overflow-hidden">
        <div className="p-5 flex-1 min-h-0 overflow-y-auto space-y-5">
          {/* Prompt 区域 */}
          <div className="space-y-3">
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(event) => onPromptChange(event.target.value)}
                className="w-full h-20 p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 resize-none transition-all pr-12"
                placeholder="正向描述词..."
              />
              <button
                type="button"
                onClick={onOpenAssist}
                className="absolute bottom-2 right-2 p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-md transition-colors"
                title="AI 提示词优化"
              >
                <Wand2 className="w-3.5 h-3.5" />
              </button>
              <span className="absolute top-2 right-2 text-[10px] text-slate-400">
                {prompt.length}/2000
              </span>
            </div>
            <textarea
              value={negativePrompt}
              onChange={(event) => onNegativePromptChange(event.target.value)}
              className="w-full h-12 p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none"
              placeholder="负面描述词（将自动拼接到提示词）..."
            />
          </div>

          <div className="h-px bg-gray-100" />

          {/* 图像参数区 */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-700">图像专属控制 (Vision SDK)</label>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-medium">模型版本</label>
                <select
                  value={imageModel}
                  onChange={(event) => onImageModelChange(event.target.value)}
                  className="w-full p-1.5 bg-gray-50 border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-100"
                >
                  {IMAGE_MODELS.map((model) => (
                    <option key={model.value} value={model.value}>
                      {model.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-medium">宽高比 (AR)</label>
                <select
                  value={aspectRatio}
                  onChange={(event) => onAspectRatioChange(event.target.value)}
                  className="w-full p-1.5 bg-gray-50 border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-100"
                >
                  {modelCapabilities.aspectRatios.map((ratio) => (
                    <option key={ratio} value={ratio}>
                      {ratio}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-medium">分辨率</label>
                <select
                  value={resolution}
                  onChange={(event) => onResolutionChange(event.target.value)}
                  className="w-full p-1.5 bg-gray-50 border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-100"
                >
                  {modelCapabilities.resolutions.map((res) => (
                    <option key={res} value={res}>
                      {res}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-medium">输出格式</label>
                <select
                  value={outputMimeType}
                  onChange={(event) => onOutputMimeTypeChange(event.target.value)}
                  className="w-full p-1.5 bg-gray-50 border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-100"
                >
                  <option value="image/png">PNG</option>
                  <option value="image/jpeg">JPEG</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-medium">生成数量</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={count}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    if (Number.isFinite(next)) onCountChange(next);
                  }}
                  className="w-full p-1.5 bg-gray-50 border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-100 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-medium">JPEG 质量</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={outputCompressionQuality}
                  disabled={outputMimeType !== 'image/jpeg'}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    if (Number.isFinite(next)) onOutputCompressionQualityChange(next);
                  }}
                  className="w-full p-1.5 bg-gray-50 border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-100 font-mono disabled:opacity-40"
                />
              </div>

              <div className="space-y-1 col-span-3">
                <label className="text-[10px] text-slate-500 font-medium">安全过滤等级</label>
                <select
                  value={safetyFilterLevel}
                  onChange={(event) => onSafetyFilterLevelChange(event.target.value)}
                  className="w-full p-1.5 bg-gray-50 border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-100"
                >
                  <option value="block_medium_and_above">block_medium_and_above</option>
                  <option value="block_low_and_above">block_low_and_above</option>
                  <option value="block_only_high">block_only_high</option>
                </select>
                <p className="text-[10px] text-slate-400">
                  当前使用 Gemini 兼容安全分类（自动降级），不同模型效果可能略有差异。
                </p>
              </div>
            </div>
          </div>

          <div className="h-px bg-gray-100" />

          {/* 高级参数区 */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-700">高级参数控制 (LLM DANGER ZONE)</label>
            </div>

            <div className="grid grid-cols-2 gap-x-5 gap-y-3">
              <RangeField
                label="Temperature"
                hint="控制随机性。值越高越发散，值越低越稳定。"
                min={0}
                max={2}
                step={0.01}
                value={temperature}
                onChange={onTemperatureChange}
              />
              <RangeField
                label="Top P"
                hint="Nucleus 采样。越小越保守，越大越多样。"
                min={0}
                max={1}
                step={0.01}
                value={topP}
                onChange={onTopPChange}
              />
              <RangeField
                label="Presence"
                hint="存在惩罚。正值鼓励新话题，负值更容易复用已有内容。"
                min={-2}
                max={2}
                step={0.1}
                value={presencePenalty}
                onChange={onPresencePenaltyChange}
                digits={1}
              />
              <RangeField
                label="Frequency"
                hint="频率惩罚。正值会抑制重复词。"
                min={-2}
                max={2}
                step={0.1}
                value={frequencyPenalty}
                onChange={onFrequencyPenaltyChange}
                digits={1}
              />
            </div>

            <div className="grid grid-cols-4 gap-2 pt-1">
              <div className="space-y-1">
                <label className="text-[9px] text-slate-500 uppercase font-medium">Top K</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={topK}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    if (Number.isFinite(next)) onTopKChange(next);
                  }}
                  className="w-full p-1.5 bg-gray-50 border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-100 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-slate-500 uppercase font-medium">Count</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={count}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    if (Number.isFinite(next)) onCountChange(next);
                  }}
                  className="w-full p-1.5 bg-gray-50 border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-100 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-slate-500 uppercase font-medium">Tokens</label>
                <input
                  type="number"
                  min={1}
                  max={8192}
                  value={maxOutputTokens}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    if (Number.isFinite(next)) onMaxOutputTokensChange(next);
                  }}
                  className="w-full p-1.5 bg-gray-50 border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-100 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-slate-500 uppercase font-medium">Seed</label>
                <div className="relative">
                  <input
                    type="number"
                    value={seed}
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      if (Number.isFinite(next)) onSeedChange(next);
                    }}
                    className="w-full p-1.5 pr-6 bg-gray-50 border border-gray-200 rounded-md text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-100 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => onSeedChange(Math.floor(Math.random() * 2147483647))}
                    className="absolute right-1 top-1 p-0.5 text-slate-400 hover:text-blue-500 bg-white rounded shadow-sm border border-gray-100"
                    title="随机种子"
                  >
                    <Dices className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 固定底部操作区 */}
        <div className="p-4 bg-white border-t border-gray-100 mt-auto">
          <button
            type="button"
            onClick={onGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl shadow-sm shadow-blue-200 transition-all active:scale-[0.98]"
          >
            {isGenerating ? '生成中...' : '生成专业图像'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProImagePanel;
