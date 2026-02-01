/**
 * API 服务模块
 *
 * 封装所有与后端 API 的通信
 * 包括图像生成、视频生成、历史记录等功能
 */

// API 基础 URL
const API_BASE = '/api';

/**
 * 通用请求函数
 *
 * @param {string} endpoint - API 端点
 * @param {Object} options - fetch 选项
 * @returns {Promise<any>} - 响应数据
 * @throws {Error} - 请求失败时抛出错误
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;

  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const response = await fetch(url, { ...defaultOptions, ...options });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `请求失败: ${response.status}`);
  }

  return response.json();
}

// ==================== 图像相关 API ====================

/**
 * 生成图像
 *
 * @param {Object} params - 生成参数
 * @param {string} params.prompt - 图像描述
 * @param {string} params.aspect_ratio - 宽高比
 * @param {string} params.resolution - 分辨率 (1K/2K/4K)
 * @param {number} params.count - 生成数量
 * @param {boolean} params.use_google_search - 是否使用 Google 搜索
 * @param {string} [params.reference_image] - 参考图 base64
 * @returns {Promise<Object>} - 包含图像文件名列表和会话 ID
 */
export async function generateImages(params) {
  return request('/image/generate', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

/**
 * 编辑图像 (多轮对话)
 *
 * @param {Object} params - 编辑参数
 * @param {string} params.session_id - 会话 ID
 * @param {string} params.prompt - 编辑指令
 * @param {string} params.aspect_ratio - 宽高比
 * @param {string} params.resolution - 分辨率
 * @returns {Promise<Object>} - 包含编辑后的图像文件名列表
 */
export async function editImage(params) {
  return request('/image/edit', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

/**
 * 优化提示词
 *
 * @param {string} prompt - 原始提示词
 * @param {string} targetType - 目标类型 (image/video)
 * @returns {Promise<Object>} - 包含优化后的提示词
 */
export async function enhancePrompt(prompt, targetType = 'image') {
  return request('/image/enhance-prompt', {
    method: 'POST',
    body: JSON.stringify({ prompt, target_type: targetType }),
  });
}

/**
 * 获取图像 URL
 *
 * @param {string} filename - 图像文件名
 * @returns {string} - 图像 URL
 */
export function getImageUrl(filename) {
  return `${API_BASE}/image/${filename}`;
}

/**
 * 查询图像生成状态
 *
 * @param {string} jobId - 任务ID
 * @returns {Promise<Object>} - 包含状态、进度和图像列表
 */
export async function getImageStatus(jobId) {
  return request(`/image/status/${jobId}`);
}

/**
 * 关闭会话
 *
 * @param {string} sessionId - 会话 ID
 * @returns {Promise<Object>} - 操作结果
 */
export async function closeSession(sessionId) {
  return request(`/image/session/${sessionId}`, {
    method: 'DELETE',
  });
}

// ==================== 视频相关 API ====================

/**
 * 生成视频
 *
 * @param {Object} params - 生成参数
 * @param {string} params.prompt - 视频描述
 * @param {string} params.mode - 生成模式 (text2vid/img2vid/first_last)
 * @param {string} params.aspect_ratio - 宽高比 (16:9/9:16)
 * @param {string} params.resolution - 分辨率 (720p/1080p/4k)
 * @param {string} [params.first_frame] - 首帧图像 base64
 * @param {string} [params.last_frame] - 尾帧图像 base64
 * @returns {Promise<Object>} - 包含任务 ID
 */
export async function generateVideo(params) {
  return request('/video/generate', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

/**
 * 延长视频
 *
 * @param {string} videoId - 原视频任务 ID
 * @param {string} prompt - 延长描述
 * @param {string} aspectRatio - 视频宽高比 (16:9 或 9:16)
 * @returns {Promise<Object>} - 包含新任务 ID
 */
export async function extendVideo(videoId, prompt, aspectRatio = '16:9') {
  return request('/video/extend', {
    method: 'POST',
    body: JSON.stringify({
      video_id: videoId,
      prompt,
      aspect_ratio: aspectRatio
    }),
  });
}

/**
 * 查询视频生成状态
 *
 * @param {string} jobId - 任务 ID
 * @returns {Promise<Object>} - 包含状态、进度和视频 URL
 */
export async function getVideoStatus(jobId) {
  return request(`/video/status/${jobId}`);
}

/**
 * 获取视频 URL
 *
 * @param {string} filename - 视频文件名
 * @returns {string} - 视频 URL
 */
export function getVideoUrl(filename) {
  return `${API_BASE}/video/${filename}`;
}

// ==================== 历史记录 API ====================

/**
 * 获取历史记录
 *
 * @param {Object} params - 查询参数
 * @param {string} [params.type] - 筛选类型 (image/video)
 * @param {number} [params.limit] - 返回数量
 * @param {number} [params.offset] - 偏移量
 * @returns {Promise<Object>} - 包含历史记录列表和总数
 */
export async function getHistory(params = {}) {
  const query = new URLSearchParams();
  if (params.type) query.append('type', params.type);
  if (params.limit) query.append('limit', params.limit);
  if (params.offset) query.append('offset', params.offset);

  const queryString = query.toString();
  return request(`/history${queryString ? `?${queryString}` : ''}`);
}

/**
 * 删除历史记录
 *
 * @param {string} recordId - 记录 ID
 * @returns {Promise<Object>} - 操作结果
 */
export async function deleteHistory(recordId) {
  return request(`/history/${recordId}`, {
    method: 'DELETE',
  });
}

/**
 * 清空历史记录
 *
 * @param {string} [type] - 要清空的类型 (可选)
 * @returns {Promise<Object>} - 操作结果
 */
export async function clearHistory(type) {
  const query = type ? `?type=${type}` : '';
  return request(`/history${query}`, {
    method: 'DELETE',
  });
}
