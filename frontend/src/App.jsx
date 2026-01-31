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
import { VideoPlayer } from './components/video/VideoPlayer';
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
  generateVideo,
  getVideoStatus,
  getImageUrl,
  getVideoUrl,
  extendVideo,
} from './services/api';

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
  const [imgCount, setImgCount] = useState(2);
  const [imgRatio, setImgRatio] = useState('3:2');
  const [imgRes, setImgRes] = useState('2K');
  const [useGoogleSearch, setUseGoogleSearch] = useState(false);
  const [imgReference, setImgReference] = useState(null);
  const [isGeneratingImg, setIsGeneratingImg] = useState(false);
  const [generatedImages, setGeneratedImages] = useState([]);
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

  // 已生成的视频列表
  const [generatedVideos, setGeneratedVideos] = useState([]);
  // 格式: [{id, url, filename, resolution, ratio, prompt, videoId, canExtend}]

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
    if (imgReference && imgReference.aspectRatio) {
      setImgRatio('auto');
    }
  }, [imgReference]);

  /**
   * 当视频分辨率变化时，自动调整秒数
   * 1080p 和 4k 仅支持 8 秒
   */
  useEffect(() => {
    if (vidRes !== '720p') {
      setVidDuration('8');
    }
  }, [vidRes]);

  // ==================== 图像生成处理 ====================

  /**
   * 处理图像生成
   */
  const handleGenerateImage = useCallback(async () => {
    if (!imgPrompt && !imgReference) return;

    setIsGeneratingImg(true);

    try {
      // 处理宽高比:如果选择了"auto"且有参考图,使用参考图的宽高比
      let finalRatio = imgRatio;
      if (imgRatio === 'auto' && imgReference?.aspectRatio) {
        finalRatio = imgReference.aspectRatio;
      }

      const result = await generateImages({
        prompt: imgPrompt,
        aspect_ratio: finalRatio,
        resolution: imgRes,
        count: imgCount,
        use_google_search: useGoogleSearch,
        reference_image: imgReference?.base64,
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
  }, [imgPrompt, imgRatio, imgRes, imgCount, useGoogleSearch, imgReference]);

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
          const newImages = status.images
            .slice(lastImageCount)  // 只取新增的图片
            .map((filename, i) => ({
              id: `${jobId}-${lastImageCount + i}`,
              url: getImageUrl(filename),
              filename,
              ratio: status.aspect_ratio || '3:2',
              prompt: status.prompt || '',
            }));

          setGeneratedImages(prev => [...newImages, ...prev]);
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
                videoId: jobId, // 用于延长
                canExtend: job.params.resolution === '720p', // 仅 720p 支持延长
              };
              setGeneratedVideos(prev => [newVideo, ...prev]);
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
                videoId: jobId,
                canExtend: true,
              };
              setGeneratedVideos(prev => [newVideo, ...prev]);
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
      const result = await extendVideo(video.videoId, extendPrompt);

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
                  referenceImage={imgReference}
                  onReferenceImageChange={setImgReference}
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
                  images={generatedImages}
                  isLoading={isGeneratingImg}
                  imageJobs={imageJobs}
                  onMakeVideo={transferToVideo}
                  onPreview={setPreviewImage}
                />
              ) : (
                <VideoGallery
                  videos={generatedVideos}
                  videoJobs={videoJobs}
                  onPlay={setPlayingVideo}
                  onExtend={handleExtendVideo}
                  onDownload={handleDownloadVideo}
                />
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
