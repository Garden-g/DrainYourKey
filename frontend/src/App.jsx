/**
 * Gen_PhotoNVideo 主应用组件
 *
 * 整合所有子组件，管理全局状态
 */

import React, { useState, useEffect, useCallback } from 'react';

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
  const [vidFirstFrame, setVidFirstFrame] = useState(null);
  const [vidLastFrame, setVidLastFrame] = useState(null);
  const [isGeneratingVid, setIsGeneratingVid] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState(null);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoStatusMsg, setVideoStatusMsg] = useState('');
  const [currentJobId, setCurrentJobId] = useState(null);

  // ==================== 提示词优化弹窗状态 ====================

  const [isAssistOpen, setIsAssistOpen] = useState(false);

  // ==================== 副作用 ====================

  /**
   * 当参考图改变时,自动设置宽高比为"auto"
   */
  useEffect(() => {
    if (imgReference && imgReference.aspectRatio) {
      setImgRatio('auto');
    }
  }, [imgReference]);

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
   */
  const pollImageStatus = useCallback(async (jobId) => {
    const maxAttempts = 60; // 最多轮询60次(约3分钟)
    let attempts = 0;

    const poll = async () => {
      try {
        const status = await getImageStatus(jobId);

        // 更新任务状态
        setImageJobs(prev => prev.map(job =>
          job.jobId === jobId
            ? { ...job, status: status.status, progress: status.progress }
            : job
        ));

        if (status.status === 'completed') {
          // 生成完成,添加图像到画廊
          // 使用后端返回的prompt和aspect_ratio字段
          const newImages = status.images.map((filename, i) => ({
            id: `${Date.now()}-${i}`,
            url: getImageUrl(filename),
            filename,
            ratio: status.aspect_ratio || '3:2',
            prompt: status.prompt || '',
          }));
          setGeneratedImages(prev => [...newImages, ...prev]);

          // 保存session_id
          if (status.session_id) {
            setImgSessionId(status.session_id);
          }

          // 移除任务
          setImageJobs(prev => prev.filter(job => job.jobId !== jobId));

        } else if (status.status === 'failed') {
          alert(`图像生成失败: ${status.message}`);
          setImageJobs(prev => prev.filter(job => job.jobId !== jobId));

        } else if (attempts < maxAttempts) {
          // 继续轮询
          attempts++;
          setTimeout(poll, 3000); // 3秒后再次查询
        } else {
          // 超时
          alert('图像生成超时,请稍后查看');
          setImageJobs(prev => prev.filter(job => job.jobId !== jobId));
        }
      } catch (error) {
        console.error('查询图像状态失败:', error);
        if (attempts < maxAttempts) {
          attempts++;
          setTimeout(poll, 3000);
        }
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

    setIsGeneratingVid(true);
    setGeneratedVideo(null);
    setVideoProgress(0);
    setVideoStatusMsg('正在初始化...');

    try {
      const result = await generateVideo({
        prompt: vidPrompt,
        mode: videoMode,
        aspect_ratio: vidRatio,
        resolution: vidRes,
        first_frame: vidFirstFrame?.base64,
        last_frame: vidLastFrame?.base64,
      });

      if (result.success && result.job_id) {
        setCurrentJobId(result.job_id);
        // 开始轮询状态
        pollVideoStatus(result.job_id);
      }
    } catch (error) {
      console.error('视频生成失败:', error);
      alert(`生成失败: ${error.message}`);
      setIsGeneratingVid(false);
    }
  }, [vidPrompt, videoMode, vidRatio, vidRes, vidFirstFrame, vidLastFrame]);

  /**
   * 轮询视频生成状态
   */
  const pollVideoStatus = useCallback(async (jobId) => {
    try {
      const status = await getVideoStatus(jobId);

      setVideoProgress(status.progress);
      setVideoStatusMsg(status.message || '处理中...');

      if (status.status === 'completed' && status.video_url) {
        // 生成完成
        setGeneratedVideo({
          id: jobId,
          url: status.video_url,
          resolution: vidRes,
          ratio: vidRatio,
          prompt: vidPrompt,
        });
        setIsGeneratingVid(false);
        setCurrentJobId(null);
      } else if (status.status === 'failed') {
        // 生成失败
        alert(`视频生成失败: ${status.message}`);
        setIsGeneratingVid(false);
        setCurrentJobId(null);
      } else {
        // 继续轮询
        setTimeout(() => pollVideoStatus(jobId), 5000);
      }
    } catch (error) {
      console.error('查询状态失败:', error);
      // 继续尝试
      setTimeout(() => pollVideoStatus(jobId), 5000);
    }
  }, [vidRes, vidRatio, vidPrompt]);

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

          {/* 内容区 */}
          <div className="flex-1 overflow-y-auto p-4 lg:p-8 scrollbar-hide">
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
                  firstFrame={vidFirstFrame}
                  onFirstFrameChange={setVidFirstFrame}
                  lastFrame={vidLastFrame}
                  onLastFrameChange={setVidLastFrame}
                  isGenerating={isGeneratingVid}
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
                <VideoPlayer
                  video={generatedVideo}
                  isLoading={isGeneratingVid}
                  progress={videoProgress}
                  statusMessage={videoStatusMsg}
                />
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
