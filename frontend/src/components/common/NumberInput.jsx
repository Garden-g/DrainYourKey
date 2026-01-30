/**
 * 数字输入组件
 *
 * 提供带范围限制的数字输入框
 */

import React from 'react';

/**
 * NumberInput 组件
 *
 * @param {Object} props - 组件属性
 * @param {string} props.label - 标签文本
 * @param {number} props.value - 当前值
 * @param {Function} props.onChange - 值变化回调
 * @param {number} props.min - 最小值
 * @param {number} props.max - 最大值
 * @param {string} props.className - 额外的 CSS 类名
 */
export function NumberInput({
  label,
  value,
  onChange,
  min = 1,
  max = 100,
  className = '',
}) {
  /**
   * 处理输入变化
   * 确保值在有效范围内
   */
  const handleChange = (e) => {
    let val = parseInt(e.target.value, 10);

    // 处理无效输入
    if (isNaN(val)) {
      val = min;
    }

    // 限制范围
    if (val > max) val = max;
    if (val < min) val = min;

    onChange(val);
  };

  return (
    <div className={`flex flex-col gap-2 w-full ${className}`}>
      {/* 标签 */}
      {label && (
        <label className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">
          {label}
        </label>
      )}

      {/* 输入框 */}
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={handleChange}
        className="
          w-full bg-white dark:bg-zinc-900
          border border-slate-200 dark:border-zinc-800
          text-slate-900 dark:text-zinc-200 text-sm
          rounded-lg
          focus:ring-2 focus:ring-blue-500 dark:focus:ring-white
          focus:border-transparent
          block p-2.5
          hover:border-blue-400 dark:hover:border-zinc-600
          transition-colors outline-none
          shadow-sm
        "
      />
    </div>
  );
}

export default NumberInput;
