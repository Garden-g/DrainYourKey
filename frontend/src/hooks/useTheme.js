/**
 * 主题管理 Hook
 *
 * 提供深色/浅色主题切换功能
 * 支持跟随系统主题设置
 */

import { useState, useEffect } from 'react';

/**
 * 主题 Hook
 *
 * @returns {Object} - 包含主题状态和切换函数
 * @property {boolean} isDark - 当前是否为深色模式
 * @property {Function} setIsDark - 设置主题
 * @property {Function} toggleTheme - 切换主题
 */
export function useTheme() {
  // 初始化主题状态
  // 优先使用本地存储的设置，否则跟随系统
  const [isDark, setIsDark] = useState(() => {
    // 检查本地存储
    const saved = localStorage.getItem('theme');
    if (saved !== null) {
      return saved === 'dark';
    }

    // 跟随系统设置
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    return true; // 默认深色
  });

  // 监听系统主题变化
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e) => {
      // 只有在没有手动设置时才跟随系统
      if (localStorage.getItem('theme') === null) {
        setIsDark(e.matches);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // 应用主题到 DOM
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // 保存到本地存储
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  /**
   * 切换主题
   */
  const toggleTheme = () => {
    setIsDark((prev) => !prev);
  };

  return {
    isDark,
    setIsDark,
    toggleTheme,
  };
}

export default useTheme;
