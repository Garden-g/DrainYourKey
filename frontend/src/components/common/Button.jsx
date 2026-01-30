/**
 * 通用按钮组件
 *
 * 提供多种样式变体的按钮
 */

import React from 'react';

/**
 * Button 组件
 *
 * @param {Object} props - 组件属性
 * @param {React.ReactNode} props.children - 按钮内容
 * @param {Function} props.onClick - 点击事件处理函数
 * @param {string} props.variant - 按钮样式变体 (primary/secondary/ghost/outline)
 * @param {string} props.className - 额外的 CSS 类名
 * @param {boolean} props.disabled - 是否禁用
 * @param {React.ComponentType} props.icon - 图标组件
 * @param {string} props.type - 按钮类型 (button/submit/reset)
 */
export function Button({
  children,
  onClick,
  variant = 'primary',
  className = '',
  disabled = false,
  icon: Icon,
  type = 'button',
}) {
  // 基础样式
  const baseStyle = `
    px-4 py-2.5 rounded-lg font-medium text-sm
    transition-all duration-200
    flex items-center justify-center gap-2
    disabled:opacity-50 disabled:cursor-not-allowed
    active:scale-95
  `;

  // 变体样式
  const variants = {
    // 主要按钮: 浅色模式蓝色，深色模式白色
    primary: `
      bg-blue-600 text-white hover:bg-blue-700
      shadow-md shadow-blue-500/20
      dark:bg-white dark:text-black dark:hover:bg-zinc-200 dark:shadow-none
    `,
    // 次要按钮: 白色/灰色背景
    secondary: `
      bg-white text-slate-700 border border-slate-200
      hover:bg-slate-50 hover:text-slate-900
      dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-700
    `,
    // 幽灵按钮: 透明背景
    ghost: `
      bg-transparent hover:bg-slate-100 text-slate-500 hover:text-slate-900
      dark:hover:bg-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100
    `,
    // 轮廓按钮: 边框样式
    outline: `
      border border-slate-200 text-slate-600
      hover:border-blue-500 hover:text-blue-600
      dark:border-zinc-700 dark:text-zinc-300
      dark:hover:border-zinc-500 dark:hover:text-white
      bg-transparent
    `,
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyle} ${variants[variant]} ${className}`}
    >
      {Icon && <Icon size={16} />}
      {children}
    </button>
  );
}

export default Button;
