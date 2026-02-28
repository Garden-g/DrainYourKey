/**
 * 头部组件
 *
 * 显示当前页面标题和状态信息
 */

import React from 'react';
import { Monitor } from 'lucide-react';

/**
 * Header 组件
 *
 * @param {Object} props - 组件属性
 * @param {string} props.activeTab - 当前激活的标签页 (image/video/pro-image)
 * @param {boolean} props.isConnected - API 是否已连接
 */
export function Header({ activeTab, isConnected = true }) {
  // 根据标签页显示不同标题
  const titleMap = {
    image: '图像工作室',
    video: '视频工作室',
    'pro-image': '专业生图探索',
  };
  const title = titleMap[activeTab] || '图像工作室';

  return (
    <header
      className="
        h-16 border-b border-slate-200 dark:border-zinc-800
        bg-white/80 dark:bg-black/80 backdrop-blur-md
        flex items-center justify-between px-8
        sticky top-0 z-10
      "
    >
      {/* 左侧标题 */}
      <div>
        <h1 className="text-base font-semibold text-slate-900 dark:text-zinc-100">
          {title}
        </h1>
        <p className="text-xs text-slate-400 dark:text-zinc-500 font-medium">
          AI 图像与视频生成服务
          <span className="mx-1">•</span>
          {isConnected ? '已连接' : '未连接'}
        </p>
      </div>

      {/* 右侧状态 */}
      <div className="flex items-center gap-4">
        {/* 系统状态指示器 */}
        <div
          className="
            hidden md:flex items-center gap-2
            text-xs font-mono
            text-slate-400 dark:text-zinc-600
            bg-slate-100 dark:bg-zinc-900
            px-3 py-1.5 rounded-full
          "
        >
          <Monitor size={12} />
          <span>系统就绪</span>
        </div>

        {/* 用户头像占位 */}
        <div
          className="
            w-8 h-8 rounded-full
            bg-slate-200 dark:bg-zinc-800
            border border-slate-300 dark:border-zinc-700
          "
        />
      </div>
    </header>
  );
}

export default Header;
