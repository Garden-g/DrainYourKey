/**
 * API 调用 Hook
 *
 * 封装 API 调用的状态管理
 * 提供加载状态、错误处理等功能
 */

import { useState, useCallback } from 'react';

/**
 * API 调用 Hook
 *
 * @param {Function} apiFunction - API 调用函数
 * @returns {Object} - 包含执行函数和状态
 * @property {Function} execute - 执行 API 调用
 * @property {any} data - 响应数据
 * @property {boolean} loading - 是否正在加载
 * @property {Error|null} error - 错误对象
 * @property {Function} reset - 重置状态
 */
export function useApi(apiFunction) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * 执行 API 调用
   *
   * @param {...any} args - 传递给 API 函数的参数
   * @returns {Promise<any>} - API 响应数据
   */
  const execute = useCallback(
    async (...args) => {
      setLoading(true);
      setError(null);

      try {
        const result = await apiFunction(...args);
        setData(result);
        return result;
      } catch (err) {
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [apiFunction]
  );

  /**
   * 重置状态
   */
  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    execute,
    data,
    loading,
    error,
    reset,
  };
}

/**
 * 轮询 Hook
 *
 * 用于轮询视频生成状态等场景
 *
 * @param {Function} pollFunction - 轮询函数
 * @param {Function} shouldStop - 判断是否停止轮询的函数
 * @param {number} interval - 轮询间隔 (毫秒)
 * @returns {Object} - 包含开始和停止轮询的函数
 */
export function usePolling(pollFunction, shouldStop, interval = 5000) {
  const [isPolling, setIsPolling] = useState(false);
  const [data, setData] = useState(null);

  /**
   * 开始轮询
   *
   * @param {...any} args - 传递给轮询函数的参数
   */
  const startPolling = useCallback(
    async (...args) => {
      setIsPolling(true);

      const poll = async () => {
        try {
          const result = await pollFunction(...args);
          setData(result);

          if (shouldStop(result)) {
            setIsPolling(false);
            return;
          }

          // 继续轮询
          setTimeout(poll, interval);
        } catch (err) {
          console.error('轮询出错:', err);
          setIsPolling(false);
        }
      };

      poll();
    },
    [pollFunction, shouldStop, interval]
  );

  /**
   * 停止轮询
   */
  const stopPolling = useCallback(() => {
    setIsPolling(false);
  }, []);

  return {
    startPolling,
    stopPolling,
    isPolling,
    data,
  };
}

export default useApi;
