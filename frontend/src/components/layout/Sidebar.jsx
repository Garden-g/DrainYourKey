/**
 * 侧边栏组件
 *
 * 提供导航和主题切换功能
 */

import React from 'react';
import { Image as ImageIcon, Video, Moon, Sun, ArrowRight } from 'lucide-react';

/**
 * 导航按钮组件
 */
function NavButton({ active, onClick, icon: Icon, label, expanded }) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center p-3 rounded-lg
        transition-all duration-200 group
        ${
          active
            ? 'bg-blue-50 text-blue-600 dark:bg-zinc-900 dark:text-white'
            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-zinc-500 dark:hover:bg-zinc-900/50 dark:hover:text-zinc-300'
        }
      `}
    >
      <Icon
        size={18}
        className={`
          ${
            active
              ? 'text-blue-600 dark:text-white'
              : 'text-slate-400 dark:text-zinc-600 group-hover:text-slate-600 dark:group-hover:text-zinc-400'
          }
          transition-colors
        `}
      />

      <span
        className={`
          ml-3 font-medium text-sm whitespace-nowrap overflow-hidden
          transition-all duration-300
          ${expanded ? 'opacity-100 max-w-[150px]' : 'opacity-0 max-w-0'}
        `}
      >
        {label}
      </span>
    </button>
  );
}

/**
 * Sidebar 组件
 *
 * @param {Object} props - 组件属性
 * @param {string} props.activeTab - 当前激活的标签页 (image/video)
 * @param {Function} props.onTabChange - 标签页切换回调
 * @param {boolean} props.isDark - 是否为深色模式
 * @param {Function} props.onThemeToggle - 主题切换回调
 * @param {boolean} props.isOpen - 侧边栏是否展开
 * @param {Function} props.onToggle - 侧边栏展开/收起回调
 */
export function Sidebar({
  activeTab,
  onTabChange,
  isDark,
  onThemeToggle,
  isOpen,
  onToggle,
}) {
  return (
    <div
      className={`
        ${isOpen ? 'w-64' : 'w-18'}
        bg-white dark:bg-black
        border-r border-slate-200 dark:border-zinc-800
        flex flex-col
        transition-all duration-300
        z-20
      `}
    >
      {/* Logo 区域 */}
      <div className="h-16 flex items-center justify-center border-b border-slate-100 dark:border-zinc-900">
        {isOpen ? (
          <span className="font-bold tracking-tight text-xl flex items-center gap-2 text-slate-900 dark:text-white">
            <div className="w-5 h-5 bg-blue-600 rounded-md"></div>
            AI<span className="text-slate-400 dark:text-zinc-600">Studio</span>
          </span>
        ) : (
          <div className="w-6 h-6 bg-blue-600 rounded-md"></div>
        )}
      </div>

      {/* 导航菜单 */}
      <nav className="flex-1 p-3 space-y-1 mt-4">
        <NavButton
          active={activeTab === 'image'}
          onClick={() => onTabChange('image')}
          icon={ImageIcon}
          label="图像生成"
          expanded={isOpen}
        />
        <NavButton
          active={activeTab === 'video'}
          onClick={() => onTabChange('video')}
          icon={Video}
          label="视频生成"
          expanded={isOpen}
        />
      </nav>

      {/* 底部控制区 */}
      <div className="p-3 border-t border-slate-100 dark:border-zinc-900 space-y-2">
        {/* 主题切换按钮 */}
        {isOpen ? (
          <button
            onClick={onThemeToggle}
            className="
              w-full flex items-center justify-between
              p-2.5 rounded-lg text-sm font-medium
              bg-slate-100 dark:bg-zinc-900
              text-slate-600 dark:text-zinc-400
              hover:text-blue-600 dark:hover:text-white
              hover:bg-blue-50 dark:hover:bg-zinc-800
              transition-colors
            "
          >
            <span className="flex items-center gap-3">
              {isDark ? <Moon size={16} /> : <Sun size={16} />}
              {isDark ? '深色模式' : '浅色模式'}
            </span>
          </button>
        ) : (
          <button
            onClick={onThemeToggle}
            className="
              w-full flex items-center justify-center
              p-2.5 rounded-lg
              bg-slate-100 dark:bg-zinc-900
              text-slate-600 dark:text-zinc-400
              hover:text-blue-600 dark:hover:text-white
              hover:bg-blue-50 dark:hover:bg-zinc-800
              transition-colors
            "
          >
            {isDark ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        )}

        {/* 展开/收起按钮 */}
        <button
          onClick={onToggle}
          className="
            w-full flex items-center justify-center
            p-2 rounded-lg
            hover:bg-slate-100 dark:hover:bg-zinc-900
            text-slate-400 dark:text-zinc-500
            hover:text-slate-900 dark:hover:text-zinc-300
            transition-colors
          "
        >
          <ArrowRight
            className={isOpen ? 'rotate-180' : ''}
            size={16}
          />
        </button>
      </div>
    </div>
  );
}

export default Sidebar;
