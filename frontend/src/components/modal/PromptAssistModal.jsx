/**
 * 提示词优化弹窗组件
 *
 * 使用 AI 优化用户输入的提示词
 */

import React, { useState, useEffect } from 'react';
import { Sparkles, X, Loader2, Wand2 } from 'lucide-react';
import { Button } from '../common/Button';
import { enhancePrompt } from '../../services/api';

/**
 * PromptAssistModal 组件
 *
 * @param {Object} props - 组件属性
 * @param {boolean} props.isOpen - 是否显示弹窗
 * @param {Function} props.onClose - 关闭回调
 * @param {Function} props.onApply - 应用优化后的提示词回调
 * @param {string} props.targetType - 目标类型 (image/video)
 */
export function PromptAssistModal({ isOpen, onClose, onApply, targetType = 'image' }) {
  // 用户输入的原始提示词
  const [input, setInput] = useState('');
  // 是否正在处理
  const [isProcessing, setIsProcessing] = useState(false);
  // 错误信息
  const [error, setError] = useState('');

  // 弹窗打开时重置状态
  useEffect(() => {
    if (isOpen) {
      setInput('');
      setError('');
    }
  }, [isOpen]);

  /**
   * 处理优化请求
   */
  const handleEnhance = async () => {
    if (!input.trim()) return;

    setIsProcessing(true);
    setError('');

    try {
      const result = await enhancePrompt(input, targetType);
      onApply(result.enhanced_prompt);
      onClose();
    } catch (err) {
      setError(err.message || '优化失败，请重试');
    } finally {
      setIsProcessing(false);
    }
  };

  // 不显示时返回 null
  if (!isOpen) return null;

  return (
    <div
      className="
        fixed inset-0 z-50
        flex items-center justify-center
        bg-black/20 dark:bg-black/60
        backdrop-blur-sm p-4
        animate-in fade-in duration-200
      "
    >
      <div
        className="
          bg-white dark:bg-zinc-900
          w-full max-w-md
          rounded-2xl shadow-2xl
          border border-white/20 dark:border-zinc-800
          p-6
          transform transition-all scale-100
        "
      >
        {/* 标题栏 */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="text-blue-500" size={18} />
            AI 提示词优化
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* 说明文字 */}
        <p className="text-sm text-slate-500 dark:text-zinc-400 mb-4">
          输入一个简单的想法，Gemini 将为您扩写成适合生成的详细描述性提示词。
        </p>

        {/* 输入框 */}
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="例如：一只在太空中的猫..."
          className="
            w-full h-32
            bg-slate-50 dark:bg-zinc-950
            border border-slate-200 dark:border-zinc-800
            rounded-xl p-3
            text-sm text-slate-900 dark:text-zinc-200
            focus:ring-2 focus:ring-blue-500 focus:border-transparent
            outline-none resize-none mb-4
          "
          autoFocus
        />

        {/* 错误提示 */}
        {error && (
          <p className="text-sm text-red-500 mb-4">{error}</p>
        )}

        {/* 按钮区 */}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button
            onClick={handleEnhance}
            disabled={!input.trim() || isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <Wand2 size={16} />
            )}
            {isProcessing ? '魔法生成中...' : '优化'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default PromptAssistModal;
