/**
 * 下拉选择组件
 *
 * 提供统一样式的下拉选择框
 */

import React from 'react';

/**
 * Select 组件
 *
 * @param {Object} props - 组件属性
 * @param {string} props.label - 标签文本
 * @param {string} props.value - 当前选中值
 * @param {Function} props.onChange - 值变化回调
 * @param {Array} props.options - 选项列表 (字符串数组或 {label, value} 对象数组)
 * @param {string} props.placeholder - 占位文本
 * @param {string} props.className - 额外的 CSS 类名
 */
export function Select({
  label,
  value,
  onChange,
  options,
  placeholder = '请选择...',
  className = '',
}) {
  return (
    <div className={`flex flex-col gap-2 w-full ${className}`}>
      {/* 标签 */}
      {label && (
        <label className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">
          {label}
        </label>
      )}

      {/* 选择框容器 */}
      <div className="relative group">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="
            w-full bg-white dark:bg-zinc-900
            border border-slate-200 dark:border-zinc-800
            text-slate-900 dark:text-zinc-200 text-sm
            rounded-lg
            focus:ring-2 focus:ring-blue-500 dark:focus:ring-white
            focus:border-transparent
            block p-2.5
            appearance-none
            hover:border-blue-400 dark:hover:border-zinc-600
            transition-colors outline-none cursor-pointer
            shadow-sm
          "
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((opt) => {
            // 支持字符串和对象两种格式
            const isObj = typeof opt === 'object';
            const optValue = isObj ? opt.value : opt;
            const optLabel = isObj ? opt.label : opt;

            return (
              <option key={optValue} value={optValue}>
                {optLabel}
              </option>
            );
          })}
        </select>

        {/* 下拉箭头图标 */}
        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate-400 dark:text-zinc-600">
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

export default Select;
