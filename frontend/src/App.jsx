/**
 * Gen_PhotoNVideo 主应用组件
 *
 * 整合所有子组件，管理全局状态
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';

// 布局组件
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';

// 图像组件
import { ImagePanel } from './components/image/ImagePanel';
import { ImageGallery } from './components/image/ImageGallery';
import { ImagePreview } from './components/image/ImagePreview';

// 视频组件
import { VideoPanel } from './components/video/VideoPanel';
import { VideoGallery } from './components/video/VideoGallery';
import { VideoPlayerModal } from './components/video/VideoPlayerModal';

// 弹窗组件
import { PromptAssistModal } from './components/modal/PromptAssistModal';

// Hooks
import { useTheme } from './hooks/useTheme';

// API 服务
import {
  generateImages,
  getImageStatus,
  getImageLibrary,
  generateVideo,
  getVideoStatus,
  getVideoLibrary,
  getImageUrl,
  extendVideo,
} from './services/api';

/**
 * 将日期格式化为本地时区的 YYYY-MM-DD
 *
 * @param {Date|string} source - 原始日期
 * @returns {string} 日期键
 */
function formatLocalDateKey(source = new Date()) {
  const date = source instanceof Date ? source : new Date(source);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 计算最接近的预设宽高比
 *
 * @param {number} ratio - 实际宽高比 (width / height)
 * @returns {string} 最接近的宽高比字符串
 */
function calculateAspectRatio(ratio) {
  if (!Number.isFinite(ratio) || ratio <= 0) {
    return '3:2';
  }

  const ratios = {
    '1:1': 1.0,
    '2:3': 0.667,
    '3:2': 1.5,
    '3:4': 0.75,
    '4:3': 1.333,
    '4:5': 0.8,
    '5:4': 1.25,
    '9:16': 0.5625,
    '16:9': 1.778,
    '21:9': 2.333,
  };

  let closest = '3:2';
  let minDiff = Infinity;

  Object.entries(ratios).forEach(([key, value]) => {
    const diff = Math.abs(ratio - value);
    if (diff < minDiff) {
      minDiff = diff;
      closest = key;
    }
  });

  return closest;
}

/**
 * 将 Blob 读取为 Data URL
 *
 * @param {Blob} blob - 图像二进制数据
 * @returns {Promise<string>} base64 Data URL
 */
function readBlobAsDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('读取图片数据失败'));
    reader.readAsDataURL(blob);
  });
}

/**
 * 从 object URL 读取图片尺寸并推导宽高比
 *
 * @param {string} objectUrl - URL.createObjectURL 返回值
 * @returns {Promise<{width:number, height:number, aspectRatio:string}>}
 */
function readImageMeta(objectUrl) {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      const width = img.width || 0;
      const height = img.height || 0;
      resolve({
        width,
        height,
        aspectRatio: calculateAspectRatio(width / Math.max(height, 1)),
      });
    };
    img.onerror = () => reject(new Error('解析图片尺寸失败'));
    img.src = objectUrl;
  });
}

/**
 * 合并同一天内的图片，并按文件名去重
 *
 * @param {Array<Object>} items - 图片列表
 * @returns {Array<Object>} 去重并按时间倒序后的列表
 */
function normalizeDayItems(items = []) {
  const itemMap = new Map();

  items.forEach((item) => {
    const filename = item.filename;
    if (!filename) return;

    itemMap.set(filename, {
      id: item.id || filename,
      url: item.url,
      filename,
      ratio: item.ratio || '3:2',
      prompt: item.prompt || '',
      createdAt: item.createdAt || item.created_at || new Date().toISOString(),
    });
  });

  return Array.from(itemMap.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * 规范化按天分组的图库数据
 *
 * @param {Array<Object>} dayGroups - 原始分组数据
 * @returns {Array<Object>} 规范化后的分组数据
 */
function normalizeLibraryDayGroups(dayGroups = []) {
  return dayGroups
    .filter((group) => group?.date)
    .map((group) => ({
      date: group.date,
      items: normalizeDayItems(group.items || []),
    }))
    .sort((a, b) => new Date(`${b.date}T00:00:00`).getTime() - new Date(`${a.date}T00:00:00`).getTime());
}

/**
 * 合并现有分组与新分组
 *
 * @param {Array<Object>} currentGroups - 当前分组
 * @param {Array<Object>} incomingGroups - 新分组
 * @returns {Array<Object>} 合并后的分组
 */
function mergeImageDayGroups(currentGroups, incomingGroups) {
  const dayMap = new Map();

  [...currentGroups, ...incomingGroups].forEach((group) => {
    const existing = dayMap.get(group.date);
    if (!existing) {
      dayMap.set(group.date, {
        date: group.date,
        items: normalizeDayItems(group.items || []),
      });
      return;
    }

    existing.items = normalizeDayItems([...(existing.items || []), ...(group.items || [])]);
  });

  return Array.from(dayMap.values()).sort(
    (a, b) => new Date(`${b.date}T00:00:00`).getTime() - new Date(`${a.date}T00:00:00`).getTime()
  );
}

/**
 * 将实时生成的图片插入到“今天”的分组顶部
 *
 * @param {Array<Object>} currentGroups - 当前分组
 * @param {Array<Object>} images - 新生成的图片
 * @returns {Array<Object>} 更新后的分组
 */
function prependImagesToToday(currentGroups, images) {
  if (!images || images.length === 0) {
    return currentGroups;
  }

  const todayDate = formatLocalDateKey(new Date());
  const todayGroup = [{ date: todayDate, items: images }];
  return mergeImageDayGroups(currentGroups, todayGroup);
}

/**
 * 合并同一天内的视频，并按文件名去重
 *
 * @param {Array<Object>} items - 视频列表
 * @returns {Array<Object>} 去重并按时间倒序后的列表
 */
function normalizeVideoDayItems(items = []) {
  const itemMap = new Map();

  items.forEach((item) => {
    const filename = item.filename;
    if (!filename) return;

    const resolution = item.resolution || '720p';
    itemMap.set(filename, {
      id: item.id || filename,
      url: item.url,
      filename,
      resolution,
      ratio: item.ratio || '16:9',
      prompt: item.prompt || '',
      mode: item.mode || 'text2vid',
      videoId: item.videoId || item.video_id || item.id || filename,
      canExtend: item.canExtend ?? item.can_extend ?? resolution === '720p',
      createdAt: item.createdAt || item.created_at || new Date().toISOString(),
    });
  });

  return Array.from(itemMap.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * 规范化按天分组的视频图库数据
 *
 * @param {Array<Object>} dayGroups - 原始分组数据
 * @returns {Array<Object>} 规范化后的分组数据
 */
function normalizeVideoLibraryDayGroups(dayGroups = []) {
  return dayGroups
    .filter((group) => group?.date)
    .map((group) => ({
      date: group.date,
      items: normalizeVideoDayItems(group.items || []),
    }))
    .sort((a, b) => new Date(`${b.date}T00:00:00`).getTime() - new Date(`${a.date}T00:00:00`).getTime());
}

/**
 * 合并现有视频分组与新分组
 *
 * @param {Array<Object>} currentGroups - 当前分组
 * @param {Array<Object>} incomingGroups - 新分组
 * @returns {Array<Object>} 合并后的分组
 */
function mergeVideoDayGroups(currentGroups, incomingGroups) {
  const dayMap = new Map();

  [...currentGroups, ...incomingGroups].forEach((group) => {
    const existing = dayMap.get(group.date);
    if (!existing) {
      dayMap.set(group.date, {
        date: group.date,
        items: normalizeVideoDayItems(group.items || []),
      });
      return;
    }

    existing.items = normalizeVideoDayItems([...(existing.items || []), ...(group.items || [])]);
  });

  return Array.from(dayMap.values()).sort(
    (a, b) => new Date(`${b.date}T00:00:00`).getTime() - new Date(`${a.date}T00:00:00`).getTime()
  );
}

/**
 * 将实时生成的视频插入到“今天”的分组顶部
 *
 * @param {Array<Object>} currentGroups - 当前分组
 * @param {Array<Object>} videos - 新生成的视频
 * @returns {Array<Object>} 更新后的分组
 */
function prependVideosToToday(currentGroups, videos) {
  if (!videos || videos.length === 0) {
    return currentGroups;
  }

  const todayDate = formatLocalDateKey(new Date());
  const todayGroup = [{ date: todayDate, items: videos }];
  return mergeVideoDayGroups(currentGroups, todayGroup);
}

/**
 * App 主组件
 */
export default function App() {
  // ==================== 全局状态 ====================

  // 当前标签页 (image/video)
  const [activeTab, setActiveTab] = useState('image');
  // 侧边栏是否展开
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  // 主题
  const { isDark, toggleTheme } = useTheme();

  // ==================== 图像生成状态 ====================

  const [imgPrompt, setImgPrompt] = useState('');
  const [imgCount, setImgCount] = useState(1);
  const [imgRatio, setImgRatio] = useState('3:2');
  const [imgRes, setImgRes] = useState('2K');
  const [useGoogleSearch, setUseGoogleSearch] = useState(false);
  // 图像参考图（多图）
  // 每项格式: { file, url, base64, aspectRatio, width, height, signature }
  const [imgReferences, setImgReferences] = useState([]);
  const [isGeneratingImg, setIsGeneratingImg] = useState(false);
  const [imageDayGroups, setImageDayGroups] = useState([]);
  const [imageLibraryBefore, setImageLibraryBefore] = useState(null);
  const [isLoadingImageLibrary, setIsLoadingImageLibrary] = useState(false);
  const [isLoadingMoreImageDays, setIsLoadingMoreImageDays] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [imgSessionId, setImgSessionId] = useState(null);
  // 图像生成任务列表
  const [imageJobs, setImageJobs] = useState([]);
  // 格式: [{jobId, status, progress, prompt, params}]

  // ==================== 视频生成状态 ====================

  const [videoMode, setVideoMode] = useState('text2vid');
  const [vidPrompt, setVidPrompt] = useState('');
  const [vidRes, setVidRes] = useState('720p');
  const [vidRatio, setVidRatio] = useState('16:9');
  const [vidDuration, setVidDuration] = useState('8'); // 视频秒数，默认 8 秒
  const [vidFirstFrame, setVidFirstFrame] = useState(null);
  const [vidLastFrame, setVidLastFrame] = useState(null);

  // 视频任务列表（类似 imageJobs）
  const [videoJobs, setVideoJobs] = useState([]);
  // 格式: [{jobId, status, progress, prompt, params, firstFrame, isExtension}]

  // 视频图库（按天分组）及分页状态
  const [videoDayGroups, setVideoDayGroups] = useState([]);
  const [videoLibraryBefore, setVideoLibraryBefore] = useState(null);
  const [isLoadingVideoLibrary, setIsLoadingVideoLibrary] = useState(false);
  const [isLoadingMoreVideoDays, setIsLoadingMoreVideoDays] = useState(false);

  // 当前播放的视频（用于放大播放）
  const [playingVideo, setPlayingVideo] = useState(null);

  // ==================== 提示词优化弹窗状态 ====================

  const [isAssistOpen, setIsAssistOpen] = useState(false);

  // ==================== 副作用 ====================
  // 轮询定时器缓存，用于清理避免内存泄漏
  const imagePollTimeouts = useRef(new Map());
  const videoPollTimeouts = useRef(new Map()); // 改为 Map 支持多任务

  /**
   * 清理所有轮询定时器，避免组件卸载后继续运行
   */
  useEffect(() => {
    return () => {
      imagePollTimeouts.current.forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });
      imagePollTimeouts.current.clear();

      // 清理所有视频轮询定时器
      videoPollTimeouts.current.forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });
      videoPollTimeouts.current.clear();
    };
  }, []);

  /**
   * 当参考图改变时,自动设置宽高比为"auto"
   */
  useEffect(() => {
    const firstReference = imgReferences?.[0];
    if (firstReference?.aspectRatio) {
      setImgRatio('auto');
    }
  }, [imgReferences]);

  /**
   * 当视频分辨率变化时，自动调整秒数
   * 1080p 和 4k 仅支持 8 秒
   */
  useEffect(() => {
    if (vidRes !== '720p') {
      setVidDuration('8');
    }
  }, [vidRes]);

  /**
   * 加载图库（按天分组）
   */
  const loadImageLibrary = useCallback(async ({ before = null, append = false } = {}) => {
    if (append) {
      setIsLoadingMoreImageDays(true);
    } else {
      setIsLoadingImageLibrary(true);
    }

    try {
      const result = await getImageLibrary({
        days: 7,
        before,
        limit_days: 7,
      });

      const normalizedGroups = normalizeLibraryDayGroups(result.days || []);

      setImageDayGroups((prev) => (
        append ? mergeImageDayGroups(prev, normalizedGroups) : normalizedGroups
      ));
      setImageLibraryBefore(result.next_before || null);
    } catch (error) {
      console.error('加载图片图库失败:', error);
      if (!append) {
        setImageDayGroups([]);
      }
    } finally {
      if (append) {
        setIsLoadingMoreImageDays(false);
      } else {
        setIsLoadingImageLibrary(false);
      }
    }
  }, []);

  /**
   * 首次进入页面时自动加载最近 7 天图片
   */
  useEffect(() => {
    loadImageLibrary();
  }, [loadImageLibrary]);

  /**
   * 加载更早日期的图片
   */
  const handleLoadMoreImageDays = useCallback(() => {
    if (!imageLibraryBefore || isLoadingMoreImageDays) return;
    loadImageLibrary({ before: imageLibraryBefore, append: true });
  }, [imageLibraryBefore, isLoadingMoreImageDays, loadImageLibrary]);

  /**
   * 加载视频图库（按天分组）
   */
  const loadVideoLibrary = useCallback(async ({ before = null, append = false } = {}) => {
    if (append) {
      setIsLoadingMoreVideoDays(true);
    } else {
      setIsLoadingVideoLibrary(true);
    }

    try {
      const result = await getVideoLibrary({
        days: 7,
        before,
        limit_days: 7,
      });

      const normalizedGroups = normalizeVideoLibraryDayGroups(result.days || []);

      setVideoDayGroups((prev) => (
        append ? mergeVideoDayGroups(prev, normalizedGroups) : normalizedGroups
      ));
      setVideoLibraryBefore(result.next_before || null);
    } catch (error) {
      console.error('加载视频图库失败:', error);
      if (!append) {
        setVideoDayGroups([]);
      }
    } finally {
      if (append) {
        setIsLoadingMoreVideoDays(false);
      } else {
        setIsLoadingVideoLibrary(false);
      }
    }
  }, []);

  /**
   * 首次进入页面时自动加载最近 7 天视频
   */
  useEffect(() => {
    loadVideoLibrary();
  }, [loadVideoLibrary]);

  /**
   * 加载更早日期的视频
   */
  const handleLoadMoreVideoDays = useCallback(() => {
    if (!videoLibraryBefore || isLoadingMoreVideoDays) return;
    loadVideoLibrary({ before: videoLibraryBefore, append: true });
  }, [videoLibraryBefore, isLoadingMoreVideoDays, loadVideoLibrary]);

  // ==================== 图像生成处理 ====================

  /**
   * 处理图像生成
   */
  const handleGenerateImage = useCallback(async () => {
    if (!imgPrompt && imgReferences.length === 0) return;

    setIsGeneratingImg(true);

    try {
      // 处理宽高比:如果选择了"auto"且有参考图,使用参考图的宽高比
      let finalRatio = imgRatio;
      const firstReference = imgReferences?.[0];
      if (imgRatio === 'auto' && firstReference?.aspectRatio) {
        finalRatio = firstReference.aspectRatio;
      }

      const result = await generateImages({
        prompt: imgPrompt,
        aspect_ratio: finalRatio,
        resolution: imgRes,
        count: imgCount,
        use_google_search: useGoogleSearch,
        // 新字段：支持多参考图（最多 14 张）
        reference_images: imgReferences.length > 0
          ? imgReferences.map((item) => item.base64)
          : undefined,
        // 兼容字段：保留首张参考图给旧版后端
        reference_image: imgReferences?.[0]?.base64,
      });

      if (result.success && result.job_id) {
        // 添加到任务列表
        const newJob = {
          jobId: result.job_id,
          status: 'pending',
          progress: 0,
          prompt: imgPrompt,
          params: { ratio: finalRatio, resolution: imgRes, count: imgCount }
        };
        setImageJobs(prev => [...prev, newJob]);

        // 开始轮询
        pollImageStatus(result.job_id);

        // 立即解除加载状态,允许用户继续操作
        setIsGeneratingImg(false);
      }
    } catch (error) {
      console.error('启动图像生成失败:', error);
      alert(`启动失败: ${error.message}`);
      setIsGeneratingImg(false);
    }
  }, [imgPrompt, imgRatio, imgRes, imgCount, useGoogleSearch, imgReferences]);

  /**
   * 轮询图像生成状态
   * 支持增量显示：每生成一张图片就立即显示在画廊中
   */
  const pollImageStatus = useCallback(async (jobId) => {
    const maxDurationMs = 10 * 60 * 1000; // 最长轮询 10 分钟
    const startTime = Date.now();
    // 记录已添加到画廊的图片数量，用于增量显示
    let lastImageCount = 0;

    const poll = async () => {
      // 超时保护
      if (Date.now() - startTime > maxDurationMs) {
        alert('图像生成超时，请稍后查看');
        setImageJobs(prev => prev.filter(job => job.jobId !== jobId));
        if (imagePollTimeouts.current.has(jobId)) {
          clearTimeout(imagePollTimeouts.current.get(jobId));
          imagePollTimeouts.current.delete(jobId);
        }
        return;
      }

      try {
        const status = await getImageStatus(jobId);

        // 更新任务状态
        setImageJobs(prev => prev.map(job =>
          job.jobId === jobId
            ? { ...job, status: status.status, progress: status.progress }
            : job
        ));

        // 增量添加新生成的图片到画廊（不等任务完成）
        if (status.images && status.images.length > lastImageCount) {
          const createdAt = new Date().toISOString();
          const newImages = status.images
            .slice(lastImageCount)  // 只取新增的图片
            .map((filename, i) => ({
              id: `${jobId}-${lastImageCount + i}-${filename}`,
              url: getImageUrl(filename),
              filename,
              ratio: status.aspect_ratio || '3:2',
              prompt: status.prompt || '',
              createdAt,
            }));

          setImageDayGroups(prev => prependImagesToToday(prev, newImages));
          lastImageCount = status.images.length;

          // 保存session_id（如果有）
          if (status.session_id) {
            setImgSessionId(status.session_id);
          }
        }

        if (status.status === 'completed') {
          // 生成完成，移除任务卡片
          setImageJobs(prev => prev.filter(job => job.jobId !== jobId));
          // 清理该任务的轮询定时器
          if (imagePollTimeouts.current.has(jobId)) {
            clearTimeout(imagePollTimeouts.current.get(jobId));
            imagePollTimeouts.current.delete(jobId);
          }

        } else if (status.status === 'failed') {
          alert(`图像生成失败: ${status.message}`);
          setImageJobs(prev => prev.filter(job => job.jobId !== jobId));
          if (imagePollTimeouts.current.has(jobId)) {
            clearTimeout(imagePollTimeouts.current.get(jobId));
            imagePollTimeouts.current.delete(jobId);
          }

        } else {
          // 继续轮询
          const timeoutId = window.setTimeout(poll, 3000); // 3秒后再次查询
          imagePollTimeouts.current.set(jobId, timeoutId);
        }
      } catch (error) {
        console.error('查询图像状态失败:', error);
        // 继续尝试
        const timeoutId = window.setTimeout(poll, 3000);
        imagePollTimeouts.current.set(jobId, timeoutId);
      }
    };

    poll();
  }, []);

  // ==================== 视频生成处理 ====================

  /**
   * 处理视频生成
   */
  const handleGenerateVideo = useCallback(async () => {
    if (videoMode === 'text2vid' && !vidPrompt) return;

    try {
      const result = await generateVideo({
        prompt: vidPrompt,
        mode: videoMode,
        aspect_ratio: vidRatio,
        resolution: vidRes,
        duration_seconds: vidDuration,
        first_frame: vidFirstFrame?.base64,
        last_frame: vidLastFrame?.base64,
      });

      if (result.success && result.job_id) {
        // 添加到任务列表
        const newJob = {
          jobId: result.job_id,
          status: 'pending',
          progress: 0,
          prompt: vidPrompt,
          params: { mode: videoMode, ratio: vidRatio, resolution: vidRes, duration: vidDuration },
          firstFrame: vidFirstFrame?.url, // 用于缩略图
          isExtension: false,
        };
        setVideoJobs(prev => [...prev, newJob]);

        // 开始轮询
        pollVideoStatus(result.job_id);
      }
    } catch (error) {
      console.error('启动视频生成失败:', error);
      alert(`启动失败: ${error.message}`);
    }
  }, [vidPrompt, videoMode, vidRatio, vidRes, vidDuration, vidFirstFrame, vidLastFrame]);

  /**
   * 轮询视频生成状态
   */
  const pollVideoStatus = useCallback(async (jobId) => {
    const maxDurationMs = 20 * 60 * 1000; // 最长轮询 20 分钟
    const startTime = Date.now();

    const poll = async () => {
      // 超时保护，避免无限轮询
      if (Date.now() - startTime > maxDurationMs) {
        setVideoJobs(prev => prev.filter(job => job.jobId !== jobId));
        alert('视频生成超时，请稍后重试');
        if (videoPollTimeouts.current.has(jobId)) {
          clearTimeout(videoPollTimeouts.current.get(jobId));
          videoPollTimeouts.current.delete(jobId);
        }
        return;
      }

      try {
        const status = await getVideoStatus(jobId);

        // 更新任务状态
        setVideoJobs(prev => prev.map(job =>
          job.jobId === jobId
            ? { ...job, status: status.status, progress: status.progress }
            : job
        ));

        if (status.status === 'completed' && status.video_url) {
          // 提取文件名
          const filename = status.video_url.split('/').pop();
          const createdAt = new Date().toISOString();

          // 使用函数形式获取最新的 videoJobs 状态，避免闭包问题
          // React 的 setState 函数形式可以获取到最新的状态值
          setVideoJobs(prevJobs => {
            const job = prevJobs.find(j => j.jobId === jobId);

            if (job) {
              // 找到任务，使用任务中保存的参数
              const newVideo = {
                id: jobId,
                url: status.video_url,
                filename: filename,
                resolution: job.params.resolution,
                ratio: job.params.ratio,
                prompt: job.prompt,
                mode: job.params.mode || 'text2vid',
                videoId: jobId, // 用于延长
                canExtend: job.params.resolution === '720p', // 仅 720p 支持延长
                createdAt,
              };
              setVideoDayGroups(prev => prependVideosToToday(prev, [newVideo]));
            } else {
              // 如果找不到任务（不应该发生），使用默认值并打印警告
              console.warn(`找不到任务 ${jobId}，使用默认值`);
              const newVideo = {
                id: jobId,
                url: status.video_url,
                filename: filename,
                resolution: '720p',
                ratio: '16:9',
                prompt: '',
                mode: 'text2vid',
                videoId: jobId,
                canExtend: true,
                createdAt,
              };
              setVideoDayGroups(prev => prependVideosToToday(prev, [newVideo]));
            }

            // 返回过滤后的任务列表（移除已完成的任务）
            return prevJobs.filter(j => j.jobId !== jobId);
          });

          // 清理轮询定时器
          if (videoPollTimeouts.current.has(jobId)) {
            clearTimeout(videoPollTimeouts.current.get(jobId));
            videoPollTimeouts.current.delete(jobId);
          }
        } else if (status.status === 'failed') {
          alert(`视频生成失败: ${status.message}`);
          setVideoJobs(prev => prev.filter(j => j.jobId !== jobId));
          if (videoPollTimeouts.current.has(jobId)) {
            clearTimeout(videoPollTimeouts.current.get(jobId));
            videoPollTimeouts.current.delete(jobId);
          }
        } else {
          // 继续轮询
          const timeoutId = window.setTimeout(poll, 5000);
          videoPollTimeouts.current.set(jobId, timeoutId);
        }
      } catch (error) {
        console.error('查询状态失败:', error);
        // 继续尝试
        const timeoutId = window.setTimeout(poll, 5000);
        videoPollTimeouts.current.set(jobId, timeoutId);
      }
    };

    poll();
  }, []); // 移除 videoJobs 依赖，因为现在使用 setVideoJobs 函数形式获取最新状态

  /**
   * 处理视频延长
   */
  const handleExtendVideo = useCallback(async (video, extendPrompt) => {
    if (!video.videoId) {
      alert('该视频不支持延长');
      return;
    }

    if (video.resolution !== '720p') {
      alert('仅支持 720p 视频延长');
      return;
    }

    if (!extendPrompt || !extendPrompt.trim()) {
      alert('请输入延长描述');
      return;
    }

    try {
      const result = await extendVideo(video.videoId, extendPrompt, video.ratio);

      if (result.success && result.job_id) {
        // 添加到任务列表
        const newJob = {
          jobId: result.job_id,
          status: 'pending',
          progress: 0,
          prompt: `延长: ${extendPrompt}`,
          params: {
            mode: 'extend',
            ratio: video.ratio,
            resolution: video.resolution
          },
          firstFrame: video.url, // 使用原视频作为缩略图
          isExtension: true,
        };
        setVideoJobs(prev => [...prev, newJob]);

        // 开始轮询
        pollVideoStatus(result.job_id);
      }
    } catch (error) {
      console.error('启动视频延长失败:', error);
      alert(`延长失败: ${error.message}`);
    }
  }, [pollVideoStatus]);

  /**
   * 处理视频下载
   */
  const handleDownloadVideo = useCallback((video) => {
    const link = document.createElement('a');
    link.href = video.url;
    link.download = video.filename || 'video.mp4';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  /**
   * 将已生成图片直接添加到参考图列表
   *
   * @param {Object} img - 已生成图片对象
   */
  const handleAddImageAsReference = useCallback(async (img) => {
    if (!img?.url) {
      return;
    }

    const MAX_REFERENCE_IMAGES = 14;
    if (imgReferences.length >= MAX_REFERENCE_IMAGES) {
      alert(`最多上传 ${MAX_REFERENCE_IMAGES} 张参考图`);
      return;
    }

    // 先按文件名做快速去重，避免无意义请求
    if (img.filename && imgReferences.some((item) => item?.file?.name === img.filename)) {
      alert('该图片已在参考图列表中');
      return;
    }

    let objectUrl = '';
    try {
      const response = await fetch(img.url);
      if (!response.ok) {
        throw new Error('获取图片失败');
      }

      const blob = await response.blob();
      const filename = img.filename || `reference_${Date.now()}.png`;
      objectUrl = URL.createObjectURL(blob);

      const [base64, meta] = await Promise.all([
        readBlobAsDataUrl(blob),
        readImageMeta(objectUrl),
      ]);

      const file = new File([blob], filename, {
        type: blob.type || 'image/png',
        lastModified: Date.now(),
      });

      const signature = `${filename}-${blob.size}`;

      setImgReferences((prev) => {
        if (prev.length >= MAX_REFERENCE_IMAGES) {
          alert(`最多上传 ${MAX_REFERENCE_IMAGES} 张参考图`);
          // 未加入列表时立即释放，避免临时 object URL 泄漏
          URL.revokeObjectURL(objectUrl);
          return prev;
        }

        if (prev.some((item) => item.signature === signature || item?.file?.name === filename)) {
          alert('该图片已在参考图列表中');
          // 重复项不入列，释放临时 object URL
          URL.revokeObjectURL(objectUrl);
          return prev;
        }

        return [
          ...prev,
          {
            file,
            url: objectUrl,
            base64,
            aspectRatio: img.ratio || meta.aspectRatio || '3:2',
            width: meta.width,
            height: meta.height,
            signature,
          },
        ];
      });
    } catch (error) {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
      console.error('添加参考图失败:', error);
      alert(`添加失败: ${error.message}`);
    }
  }, [imgReferences]);

  // ==================== 图片转视频 ====================

  /**
   * 将图片转换为视频
   * 从URL重新获取图像并转换为base64
   */
  const transferToVideo = useCallback(async (img) => {
    setActiveTab('video');
    setVideoMode('img2vid');

    try {
      // 从URL重新获取图像并转换为base64
      const response = await fetch(img.url);
      const blob = await response.blob();

      // 转换为base64
      const reader = new FileReader();
      reader.onloadend = () => {
        setVidFirstFrame({
          url: img.url,
          base64: reader.result,  // 完整的base64数据(包含data:image/png;base64,前缀)
        });
      };
      reader.readAsDataURL(blob);

      // 如果有提示词,也复制过去
      if (img.prompt) {
        setVidPrompt(img.prompt);
      }
    } catch (error) {
      console.error('获取图像数据失败:', error);
      alert('无法加载图像,请重试');
    }
  }, []);

  // ==================== 提示词优化 ====================

  /**
   * 应用优化后的提示词
   */
  const handleAssistApply = useCallback((enhancedPrompt) => {
    if (activeTab === 'image') {
      setImgPrompt(enhancedPrompt);
    } else {
      setVidPrompt(enhancedPrompt);
    }
  }, [activeTab]);

  // ==================== 渲染 ====================

  return (
    <div className={`${isDark ? 'dark' : ''} h-screen w-full transition-colors duration-300`}>
      {/* 提示词优化弹窗 */}
      <PromptAssistModal
        isOpen={isAssistOpen}
        onClose={() => setIsAssistOpen(false)}
        onApply={handleAssistApply}
        targetType={activeTab}
      />

      {/* 图像预览弹窗 */}
      {previewImage && (
        <ImagePreview
          image={previewImage}
          onClose={() => setPreviewImage(null)}
          onMakeVideo={transferToVideo}
        />
      )}

      {/* 视频播放弹窗 */}
      {playingVideo && (
        <VideoPlayerModal
          video={playingVideo}
          onClose={() => setPlayingVideo(null)}
          onExtend={handleExtendVideo}
          onDownload={handleDownloadVideo}
        />
      )}

      <div className="flex h-full bg-slate-50 dark:bg-black text-slate-900 dark:text-zinc-200 font-sans overflow-hidden antialiased selection:bg-blue-100 dark:selection:bg-zinc-800">
        {/* 侧边栏 */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isDark={isDark}
          onThemeToggle={toggleTheme}
          isOpen={isSidebarOpen}
          onToggle={() => setSidebarOpen(!isSidebarOpen)}
        />

        {/* 主内容区 */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* 头部 */}
          <Header activeTab={activeTab} />

          {/* 内容区 - 移除整体滚动，让画廊独立滚动 */}
          <div className="flex-1 overflow-hidden p-4 lg:p-8">
            <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row gap-8 h-full">
              {/* 左侧控制面板 */}
              {activeTab === 'image' ? (
                <ImagePanel
                  prompt={imgPrompt}
                  onPromptChange={setImgPrompt}
                  aspectRatio={imgRatio}
                  onAspectRatioChange={setImgRatio}
                  resolution={imgRes}
                  onResolutionChange={setImgRes}
                  count={imgCount}
                  onCountChange={setImgCount}
                  useGoogleSearch={useGoogleSearch}
                  onGoogleSearchChange={setUseGoogleSearch}
                  referenceImages={imgReferences}
                  onReferenceImagesChange={setImgReferences}
                  isGenerating={isGeneratingImg}
                  onGenerate={handleGenerateImage}
                  onOpenAssist={() => setIsAssistOpen(true)}
                />
              ) : (
                <VideoPanel
                  prompt={vidPrompt}
                  onPromptChange={setVidPrompt}
                  mode={videoMode}
                  onModeChange={setVideoMode}
                  aspectRatio={vidRatio}
                  onAspectRatioChange={setVidRatio}
                  resolution={vidRes}
                  onResolutionChange={setVidRes}
                  duration={vidDuration}
                  onDurationChange={setVidDuration}
                  firstFrame={vidFirstFrame}
                  onFirstFrameChange={setVidFirstFrame}
                  lastFrame={vidLastFrame}
                  onLastFrameChange={setVidLastFrame}
                  isGenerating={false}
                  onGenerate={handleGenerateVideo}
                  onOpenAssist={() => setIsAssistOpen(true)}
                />
              )}

              {/* 右侧展示区 */}
              {activeTab === 'image' ? (
                <ImageGallery
                  dayGroups={imageDayGroups}
                  isLoading={isLoadingImageLibrary && imageDayGroups.length === 0}
                  imageJobs={imageJobs}
                  onMakeVideo={transferToVideo}
                  onAddReference={handleAddImageAsReference}
                  onPreview={setPreviewImage}
                  hasMoreDays={Boolean(imageLibraryBefore)}
                  onLoadMoreDays={handleLoadMoreImageDays}
                  isLoadingMore={isLoadingMoreImageDays}
                />
              ) : (
                <VideoGallery
                  dayGroups={videoDayGroups}
                  videoJobs={videoJobs}
                  onPlay={setPlayingVideo}
                  onExtend={handleExtendVideo}
                  onDownload={handleDownloadVideo}
                  hasMoreDays={Boolean(videoLibraryBefore)}
                  onLoadMoreDays={handleLoadMoreVideoDays}
                  isLoading={isLoadingVideoLibrary && videoDayGroups.length === 0}
                  isLoadingMore={isLoadingMoreVideoDays}
                />
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
