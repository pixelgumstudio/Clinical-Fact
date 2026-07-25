// apps/mobile/src/services/api.ts

import { Platform } from 'react-native';
import EventSource from 'react-native-sse';
import { getAccessToken, getRefreshToken, saveTokens, clearTokens } from './tokenStorage';

// Get API URL from environment variable or use platform-specific defaults
const getApiUrl = () => {
  const envApiUrl = process.env.EXPO_PUBLIC_API_URL;

  if (envApiUrl) {
    const standardized = envApiUrl.endsWith('/') ? envApiUrl.slice(0, -1) : envApiUrl;
    if (__DEV__) console.log('Using API URL from .env:', standardized);
    return standardized;
  }

  if (__DEV__) console.warn('EXPO_PUBLIC_API_URL not set in .env, using platform defaults');

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3002/api/v1';
  }
  if (Platform.OS === 'ios') {
    return 'http://localhost:3002/api/v1';
  }
  return 'http://localhost:3002/api/v1';
};

const API_URL = getApiUrl();

if (__DEV__) {
  console.log('API URL Base:', API_URL);
}

// --- Interfaces ---

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  quotaExceeded?: boolean;
  feature?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  username: string;
  subscription: 'FREE' | 'PRO';
  profilePicture?: string;
  authProvider: 'local' | 'google' | 'phone';
  isEmailVerified: boolean;
  isPhoneVerified?: boolean;
  hasCompletedSignup: boolean;
  goals?: string[];
  contentTypes?: string[];
  reviewStyle?: string;
  preferredLanguage?: string;
  studyLanguage?: string | null;
  createdAt: string;
}

export interface CompleteSignupData {
  goals?: string[];
  contentTypes?: string[];
  reviewStyle?: string;
  frustrations?: string[];
  referralSource?: string;
  name?: string;
  username?: string;
}

// --- API Client ---

class ApiClient {
  private baseUrl: string;
  private defaultTimeout: number = 30000;

  // ── Token-refresh queue ───────────────────────────────────────────────────
  // When an access token expires, multiple in-flight requests may all receive
  // a 401 simultaneously. Without a queue they would each trigger an independent
  // refresh call, causing a race where only the last rotation "wins" and the
  // others get revoked tokens. The queue serialises the refresh: the first 401
  // triggers one real refresh call; every subsequent 401 that arrives while the
  // refresh is in progress is parked here and replayed with the new token once
  // the single refresh resolves.
  private isRefreshing = false;
  private refreshQueue: Array<(newToken: string | null) => void> = [];

  // Registered by App.tsx after mount to avoid a circular dependency between
  // api.ts (which imports tokenStorage) and authStore.ts (which imports api).
  private forceLogoutHandler: (() => Promise<void>) | null = null;

  setForceLogoutHandler(handler: () => Promise<void>): void {
    this.forceLogoutHandler = handler;
  }

  constructor() {
    this.baseUrl = API_URL;
  }

  private async fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeout: number = this.defaultTimeout
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);
      return response;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timed out. Please check your network connection.');
      }
      throw error;
    }
  }

  private async getAuthToken(): Promise<string | null> {
    return getAccessToken();
  }

  private async attemptTokenRefresh(): Promise<string | null> {
    try {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) return null;

      const response = await this.request<{ tokens: { accessToken: string; refreshToken: string } }>(
        '/auth/refresh-token',
        { method: 'POST', body: JSON.stringify({ refreshToken }) }
      );

      if (response.success && response.data?.tokens) {
        const { accessToken, refreshToken: newRefresh } = response.data.tokens;
        await saveTokens(accessToken, newRefresh);
        return accessToken;
      }
      return null;
    } catch {
      return null;
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    requiresAuth = false,
    timeout?: number
  ): Promise<ApiResponse<T>> {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const fullUrl = `${this.baseUrl}${cleanEndpoint}`;

    const buildHeaders = (token?: string | null): Record<string, string> => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
      };
      if (options.body instanceof FormData) {
        delete headers['Content-Type'];
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      return headers;
    };

    try {
      let token = requiresAuth ? await this.getAuthToken() : null;

      if (__DEV__) console.log(`📡 API Request: ${options.method || 'GET'} ${fullUrl}`);
      const response = await this.fetchWithTimeout(
        fullUrl,
        { ...options, headers: buildHeaders(token) },
        timeout
      );
      if (__DEV__) console.log(`📥 Response status: ${response.status}`);

      const contentType = response.headers.get('content-type');
      let body: any;
      if (contentType && contentType.includes('application/json')) {
        body = await response.json();
      } else {
        const text = await response.text();
        return {
          success: false,
          message: `Server returned non-JSON response (${response.status})`,
          error: text,
        } as any;
      }

      // ── Token-expired interceptor ───────────────────────────────────────
      if (requiresAuth && response.status === 401 && body?.code === 'TOKEN_EXPIRED') {
        // Park this request if another refresh is already in flight.
        if (this.isRefreshing) {
          return new Promise<ApiResponse<T>>((resolve) => {
            this.refreshQueue.push((newToken) => {
              (async () => {
                if (newToken) {
                  try {
                    const retryRes = await this.fetchWithTimeout(
                      fullUrl,
                      { ...options, headers: buildHeaders(newToken) },
                      timeout
                    );
                    if (retryRes.headers.get('content-type')?.includes('application/json')) {
                      resolve(await retryRes.json());
                      return;
                    }
                  } catch { /* fall through */ }
                }
                resolve(body as ApiResponse<T>);
              })();
            });
          });
        }

        // This is the first 401 — own the refresh.
        this.isRefreshing = true;
        let newToken: string | null = null;
        try {
          if (__DEV__) console.log('🔄 Access token expired — refreshing...');
          newToken = await this.attemptTokenRefresh();
        } finally {
          // Drain the queue regardless of success or failure so parked requests
          // are never left hanging.
          const waiters = [...this.refreshQueue];
          this.refreshQueue = [];
          this.isRefreshing = false;
          waiters.forEach((cb) => cb(newToken));
        }

        if (newToken) {
          if (__DEV__) console.log('✅ Token refreshed — retrying original request');
          const retryRes = await this.fetchWithTimeout(
            fullUrl,
            { ...options, headers: buildHeaders(newToken) },
            timeout
          );
          if (retryRes.headers.get('content-type')?.includes('application/json')) {
            return retryRes.json();
          }
        } else {
          // Refresh failed (token revoked or expired) — scorched-earth logout
          if (__DEV__) console.log('❌ Token refresh failed — forcing logout');
          if (this.forceLogoutHandler) {
            await this.forceLogoutHandler();
          }
        }
      }
      // ── End token-expired interceptor ───────────────────────────────────

      return body;
    } catch (error: any) {
      if (__DEV__) console.error('❌ API request error:', error);
      return {
        success: false,
        message: error.message || 'Network error. Please check your connection.',
      };
    }
  }


  // --- Auth / OTP / Google Endpoints ---

  async sendOtp(email: string): Promise<ApiResponse<{ email: string; expiresIn: number }>> {
    return this.request('/otp/send', { method: 'POST', body: JSON.stringify({ email }) });
  }

  async verifyOtp(email: string, otp: string): Promise<ApiResponse<{
    user: User;
    tokens: { accessToken: string; refreshToken: string };
    isNewUser: boolean;
    needsProfileSetup: boolean;
  }>> {
    return this.request('/otp/verify/signup', { method: 'POST', body: JSON.stringify({ email, otp }) });
  }

  async googleAuth(idToken?: string, accessToken?: string): Promise<ApiResponse<{
    user: User;
    tokens: { accessToken: string; refreshToken: string };
    isNewUser: boolean;
    needsProfileSetup: boolean;
  }>> {
    return this.request('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken, accessToken }),
    });
  }

  async appleAuth(identityToken: string, firstName?: string, lastName?: string, email?: string): Promise<ApiResponse<{
    user: User;
    tokens: { accessToken: string; refreshToken: string };
    isNewUser: boolean;
    needsProfileSetup: boolean;
  }>> {
    return this.request('/auth/apple', {
      method: 'POST',
      body: JSON.stringify({ identityToken, firstName, lastName, email }),
    });
  }

  async restoreUserPremium(data: {
    googleId: string;
    email: string;
    name: string;
  }): Promise<ApiResponse<{
    user: User;
    tokens: { accessToken: string; refreshToken: string };
    isRestored: boolean;
    subscription: 'FREE' | 'PRO';
  }>> {
    return this.request('/auth/restore-user', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async refreshToken(refreshToken: string): Promise<ApiResponse<{
    tokens: { accessToken: string; refreshToken: string };
  }>> {
    return this.request('/auth/refresh-token', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  }

  async getMe(): Promise<ApiResponse<{ user: User }>> {
    return this.request('/auth/me', { method: 'GET' }, true);
  }

  async updateProfile(data: {
    name?: string;
    username?: string;
    preferredLanguage?: string;
    studyLanguage?: string | null;
  }): Promise<ApiResponse<{ user: User }>> {
    return this.request('/auth/profile', { method: 'PUT', body: JSON.stringify(data) }, true);
  }

  async updateUserLanguage(languageCode: string): Promise<ApiResponse<{ user: User }>> {
    return this.updateProfile({ preferredLanguage: languageCode });
  }

  async updateUserStudyLanguage(languageCode: string | null): Promise<ApiResponse<{ user: User }>> {
    return this.updateProfile({ studyLanguage: languageCode });
  }

  async updateNoteStudyLanguage(noteId: string, languageCode: string | null): Promise<ApiResponse<any>> {
    return this.request(`/notes/${noteId}`, {
      method: 'PATCH',
      body: JSON.stringify({ studyLanguage: languageCode }),
    }, true);
  }

  async uploadProfilePicture(file: {
    uri: string;
    name: string;
    type: string;
  }): Promise<ApiResponse<{ user: { id: string; profilePicture: string } }>> {
    const formData = new FormData();
    const ext = file.name?.split('.').pop()?.toLowerCase();
    const mimeMap: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      heic: 'image/heic',
    };
    const safeMimeType = mimeMap[ext || ''] || 'image/jpeg';
    formData.append('file', { uri: file.uri, name: file.name, type: safeMimeType } as any);
    return this.request('/auth/profile/picture', { method: 'POST', body: formData }, true, 30000);
  }

  async completeSignup(data: CompleteSignupData): Promise<ApiResponse<{ user: User }>> {
    return this.request('/auth/complete-signup', {
      method: 'POST',
      body: JSON.stringify(data),
    }, true);
  }

  async skipSignup(): Promise<ApiResponse<{ user: User }>> {
    return this.request('/auth/skip-signup', { method: 'POST' }, true);
  }

  async checkUsernameAvailability(
    username: string
  ): Promise<ApiResponse<{ available: boolean; username: string }>> {
    return this.request('/auth/check-username', {
      method: 'POST',
      body: JSON.stringify({ username }),
    });
  }

  async deleteAccount(): Promise<ApiResponse<{ deleted: boolean }>> {
    return this.request('/auth/account', { method: 'DELETE' }, true);
  }

  // --- File Upload Endpoints ---

 async uploadImageWithOCR(file: {
    uri: string;
    name: string;
    type: string;
  }): Promise<ApiResponse<{
    fileId: string;
    fileKey: string;
    fileName: string;
    originalName: string;
    size: number;
    fileType: string;
    mimeType: string;
    ocrResult: { text: string; confidence: number; error?: string };
  }>> {
    const formData = new FormData();

    // 📸 The Android MIME Type Fix
    const extension = file.name?.split('.').pop()?.toLowerCase();
    const imageMimeTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'webp': 'image/webp',
      'heic': 'image/heic',
    };
    
    // Check our dictionary based on the extension. If it's unknown, fallback to a safe image/jpeg.
    const safeMimeType = imageMimeTypes[extension || ''] || 'image/jpeg';

    formData.append('file', { 
      uri: file.uri, 
      name: file.name, 
      type: safeMimeType // 🛡️ Replaced the raw file.type with our safe type!
    } as any);

    return this.request('/upload/image-ocr', { method: 'POST', body: formData }, true, 60000);
  }

  
  async uploadPDFWithExtraction(formData: FormData): Promise<ApiResponse<{
    fileId: string;
    fileKey: string;
    fileName: string;
    originalName: string;
    size: number;
    fileType: string;
    mimeType: string;
    extractionResult: { text: string; pageCount?: number; error?: string };
  }>> {
    return this.request('/upload/pdf-extract', { method: 'POST', body: formData }, true, 120000);
  }

  async uploadAudioWithTranscription(file: {
    uri: string;
    name: string;
    type: string;
  }): Promise<ApiResponse<{
    fileId: string;
    fileKey: string;
    fileName: string;
    originalName: string;
    size: number;
    fileType: string;
    mimeType: string;
    transcription: { text: string; language?: string; duration?: number; error?: string };
  }>> {
    const formData = new FormData();
    formData.append('file', { uri: file.uri, name: file.name, type: file.type } as any);
    return this.request('/upload/audio-transcribe', { method: 'POST', body: formData }, true, 60000);
  }

  // --- Notes Endpoints ---

  async createNote(
    data: { content: string; sourceType: string; title?: string; metadata?: any; folderId?: string } | FormData
  ): Promise<ApiResponse<any>> {
    const isFormData = data instanceof FormData;
    const timeout = isFormData ? 600000 : 30000;
    return this.request('/notes/generate', {
      method: 'POST',
      body: isFormData ? (data as any) : JSON.stringify(data),
    }, true, timeout);
  }

  async getNotes(params?: {
    page?: number;
    limit?: number;
    folderId?: string;
    sourceType?: string;
    status?: string;
  }): Promise<ApiResponse<{
    notes: any[];
    pagination: { page: number; limit: number; total: number; pages: number };
  }>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.folderId) queryParams.append('folderId', params.folderId);
    if (params?.sourceType) queryParams.append('sourceType', params.sourceType);
    if (params?.status) queryParams.append('status', params.status);

    const query = queryParams.toString();
    return this.request(query ? `/notes?${query}` : '/notes', { method: 'GET' }, true);
  }

  async getNoteById(noteId: string): Promise<ApiResponse<any>> {
    return this.request(`/notes/${noteId}`, { method: 'GET' }, true);
  }

  async updateNote(
    noteId: string,
    data: { title?: string; content?: string; summary?: string; folderId?: string }
  ): Promise<ApiResponse<any>> {
    return this.request(`/notes/${noteId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, true);
  }

  async deleteNote(noteId: string): Promise<ApiResponse<any>> {
    return this.request(`/notes/${noteId}`, { method: 'DELETE' }, true);
  }

  async searchNotes(query: string, limit?: number): Promise<ApiResponse<any>> {
    const params = new URLSearchParams({ q: query });
    if (limit) params.append('limit', limit.toString());
    return this.request(`/notes/search?${params.toString()}`, { method: 'GET' }, true);
  }

  async shareNote(noteId: string): Promise<ApiResponse<{ isShared: boolean; shareableLink?: string; url?: string }>> {
    return this.request(`/notes/${noteId}/share`, { method: 'POST' }, true);
  }

  async getSharedNote(shareableLink: string): Promise<ApiResponse<any>> {
    return this.request(`/notes/shared/${shareableLink}`, { method: 'GET' }, false);
  }

  async saveSharedNote(shareableLink: string): Promise<ApiResponse<any>> {
    return this.request(`/notes/shared/${shareableLink}/save`, { method: 'POST' }, true);
  }

  async exportNote(
    noteId: string,
    exportType: string,
    format: string,
    targetLanguage?: string
  ): Promise<ApiResponse<{ title: string; textContent: string; htmlContent: string; filename: string }>> {
    return this.request(`/notes/${noteId}/export`, {
      method: 'POST',
      body: JSON.stringify({ exportType, format, ...(targetLanguage ? { targetLanguage } : {}) }),
    }, true);
  }

  async translateNote(
    noteId: string,
    targetLanguage: string,
    sourceLanguage?: string
  ): Promise<ApiResponse<any>> {
    return this.request(`/notes/${noteId}/translate`, {
      method: 'PUT',
      body: JSON.stringify({ targetLanguage, sourceLanguage }),
    }, true, 60000);
  }

  async retranscribeNote(noteId: string): Promise<ApiResponse<any>> {
    return this.request(`/notes/${noteId}/retranscribe`, { method: 'PUT' }, true, 120000);
  }

  async moveNoteToFolder(noteId: string, folderId: string | null): Promise<ApiResponse<any>> {
    return this.request(`/notes/${noteId}/move`, {
      method: 'POST',
      body: JSON.stringify({ folderId }),
    }, true);
  }

  // --- Folder Endpoints ---

  async getFolders(params?: { folderType?: 'note' | 'chat' }): Promise<ApiResponse<any>> {
    const query = params?.folderType ? `?folderType=${params.folderType}` : '';
    return this.request(`/folders${query}`, { method: 'GET' }, true);
  }

  async createFolder(data: { name: string; color?: string; folderType?: 'note' | 'chat' }): Promise<ApiResponse<any>> {
    return this.request('/folders', { method: 'POST', body: JSON.stringify(data) }, true);
  }

  async updateFolder(
    folderId: string,
    data: { name?: string; color?: string }
  ): Promise<ApiResponse<any>> {
    return this.request(`/folders/${folderId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, true);
  }

  async deleteFolder(folderId: string): Promise<ApiResponse<any>> {
    return this.request(`/folders/${folderId}`, { method: 'DELETE' }, true);
  }

  // --- Quiz Endpoints ---

  async generateQuiz(
    noteId: string,
    questionCount: number = 10,
    difficulty: string = 'medium',
    questionTypes: string[] = ['multiple-choice'],
    quizType: string = 'standard',
    targetLanguage?: string
  ): Promise<ApiResponse<any>> {
    return this.request('/quizzes/generate', {
      method: 'POST',
      body: JSON.stringify({ noteId, questionCount, difficulty, questionTypes, quizType, targetLanguage }),
    }, true, 90000);
  }

  async getQuizzes(page: number = 1, limit: number = 20): Promise<ApiResponse<any>> {
    return this.request(`/quizzes?page=${page}&limit=${limit}`, { method: 'GET' }, true);
  }

  async getQuizzesByNote(noteId: string): Promise<ApiResponse<any>> {
    return this.request(`/quizzes/note/${noteId}`, { method: 'GET' }, true);
  }

  async getQuizById(quizId: string): Promise<ApiResponse<any>> {
    return this.request(`/quizzes/${quizId}`, { method: 'GET' }, true);
  }

  async submitQuiz(quizId: string, answers: any[]): Promise<ApiResponse<any>> {
    return this.request(`/quizzes/${quizId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    }, true);
  }

  async deleteQuiz(quizId: string): Promise<ApiResponse<any>> {
    return this.request(`/quizzes/${quizId}`, { method: 'DELETE' }, true);
  }

  // Quiz Export Methods
  async exportQuizQuestions(quizId: string, format: 'pdf' | 'txt' = 'pdf'): Promise<any> {
    const response = await this.request<{ content: string; encoding: string; mimeType: string; filename: string }>(
      `/quizzes/${quizId}/export/questions?format=${format}`,
      { method: 'GET' },
      true
    );
    return response.data;
  }

  async exportQuizAnswers(quizId: string, format: 'pdf' | 'txt' = 'pdf'): Promise<any> {
    const response = await this.request<{ content: string; encoding: string; mimeType: string; filename: string }>(
      `/quizzes/${quizId}/export/answers?format=${format}`,
      { method: 'GET' },
      true
    );
    return response.data;
  }

  // --- Flashcard Endpoints ---

  async generateFlashcards(
    noteId: string,
    cardCount: number = 20,
    difficulty: string = 'medium',
    focusTopics: string[] = [],
    targetLanguage?: string
  ): Promise<ApiResponse<any>> {
    return this.request('/flashcards/generate', {
      method: 'POST',
      body: JSON.stringify({ noteId, cardCount, difficulty, focusTopics, targetLanguage }),
    }, true, 90000);
  }

  async getFlashcardSets(noteId?: string): Promise<ApiResponse<any>> {
    const query = noteId ? `?noteId=${noteId}` : '';
    return this.request(`/flashcards${query}`, { method: 'GET' }, true);
  }

  /**
   * Get flashcard sets for a specific note
   * GET /api/v1/flashcards?noteId={noteId}
   */
  async getFlashcardsByNote(noteId: string): Promise<ApiResponse<any[]>> {
    return this.request(`/flashcards?noteId=${noteId}`, { method: 'GET' }, true);
  }

  async getFlashcardSet(setId: string): Promise<ApiResponse<any>> {
    return this.request(`/flashcards/${setId}`, { method: 'GET' }, true);
  }

  async updateFlashcard(
    setId: string,
    cardId: string,
    updates: { front?: string; back?: string; color?: string; mastered?: boolean }
  ): Promise<ApiResponse<any>> {
    return this.request(`/flashcards/${setId}/cards/${cardId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }, true);
  }

  async reviewFlashcard(
    setId: string,
    cardId: string,
    mastered: boolean
  ): Promise<ApiResponse<any>> {
    return this.request(`/flashcards/${setId}/cards/${cardId}/review`, {
      method: 'POST',
      body: JSON.stringify({ mastered }),
    }, true);
  }

  async getFlashcardStatistics(setId: string): Promise<ApiResponse<any>> {
    return this.request(`/flashcards/${setId}/statistics`, { method: 'GET' }, true);
  }

  async deleteFlashcardSet(setId: string): Promise<ApiResponse<any>> {
    return this.request(`/flashcards/${setId}`, { method: 'DELETE' }, true);
  }

  // Flashcard Export Methods
  async exportFlashcardQuestions(setId: string, format: 'pdf' | 'txt' = 'pdf'): Promise<any> {
    const response = await this.request<{ content: string; encoding: string; mimeType: string; filename: string }>(
      `/flashcards/${setId}/export/questions?format=${format}`,
      { method: 'GET' },
      true
    );
    return response.data;
  }

  async exportFlashcardAnswers(setId: string, format: 'pdf' | 'txt' = 'pdf'): Promise<any> {
    const response = await this.request<{ content: string; encoding: string; mimeType: string; filename: string }>(
      `/flashcards/${setId}/export/answers?format=${format}`,
      { method: 'GET' },
      true
    );
    return response.data;
  }

  // --- YouTube Endpoints ---

  async getYouTubeVideoInfo(youtubeUrl: string): Promise<ApiResponse<{
    videoId: string;
    title: string;
    description: string;
    thumbnail: string;
    duration: string;
    durationSeconds: number;
    channelTitle: string;
    viewCount?: string;
    publishedAt?: string;
  }>> {
    return this.request('/youtube/info', {
      method: 'POST',
      body: JSON.stringify({ youtubeUrl }),
    }, false, 90000);
  }

  async getYouTubeTranscript(youtubeUrl: string): Promise<ApiResponse<{
    videoId: string;
    transcript: string;
    duration: number;
    segments?: Array<{ text: string; start: number; duration: number }>;
  }>> {
    return this.request('/youtube/transcript', {
      method: 'POST',
      body: JSON.stringify({ youtubeUrl }),
    }, false, 90000);
  }

  async checkYouTubeTranscript(youtubeUrl: string): Promise<ApiResponse<{ hasTranscript: boolean }>> {
    return this.request('/youtube/check-transcript', {
      method: 'POST',
      body: JSON.stringify({ youtubeUrl }),
    }, false, 45000);
  }

  async generateNoteFromYouTube(youtubeUrl: string): Promise<ApiResponse<{
    noteId: string;
    title?: string;
    summary?: string;
    content?: string;
    createdAt?: string;
    metadata?: any;
    processingStatus: string;
  }>> {
    return this.request('/youtube/generate-note', {
      method: 'POST',
      body: JSON.stringify({ youtubeUrl }),
    }, true, 120000);
  }

  async getYouTubeNoteStatus(noteId: string): Promise<ApiResponse<{
    noteId: string;
    title: string;
    summary: string;
    content: string;
    processingStatus: string;
    processingProgress: number;
    error?: string;
  }>> {
    return this.request(`/youtube/note-status/${noteId}`, { method: 'GET' }, true);
  }

  async getFullYouTubeData(youtubeUrl: string): Promise<ApiResponse<{
    info: {
      videoId: string;
      title: string;
      description: string;
      thumbnail: string;
      duration: string;
      durationHuman: string;
      channelTitle: string;
    } | null;
    transcript: { videoId: string; transcript: string; duration: number };
  }>> {
    return this.request('/youtube/full-data', {
      method: 'POST',
      body: JSON.stringify({ youtubeUrl }),
    }, false, 120000);
  }

  // --- Chat Endpoints ---

  async createChatSessionFromNote(noteId: string, folderId?: string): Promise<ApiResponse<any>> {
    return this.request('/chat/create-from-note', {
      method: 'POST',
      body: JSON.stringify({ noteId, folderId }),
    }, true);
  }

  async createChatSessionFromDocument(fileId: string, folderId?: string): Promise<ApiResponse<any>> {
    return this.request('/chat/create-from-document', {
      method: 'POST',
      body: JSON.stringify({ fileId, folderId }),
    }, true);
  }

  async getChatSessions(params?: {
    page?: number;
    limit?: number;
    folderId?: string;
  }): Promise<ApiResponse<{
    sessions: any[];
    pagination: { page: number; limit: number; total: number; pages: number };
  }>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.folderId) queryParams.append('folderId', params.folderId);

    const query = queryParams.toString();
    return this.request(query ? `/chat?${query}` : '/chat', { method: 'GET' }, true);
  }

  async getChatSession(sessionId: string): Promise<ApiResponse<any>> {
    return this.request(`/chat/${sessionId}`, { method: 'GET' }, true);
  }

  async sendChatMessage(
    sessionId: string,
    message: string,
    deepResearch = false
  ): Promise<ApiResponse<{ jobId: string }>> {
    return this.request(`/chat/${sessionId}/message`, {
      method: 'POST',
      body: JSON.stringify({ message, deepResearch }),
    }, true, 30000);
  }

  async getJobStatus(jobId: string): Promise<ApiResponse<{
    jobId: string;
    status: 'pending' | 'active' | 'completed' | 'failed';
    result: any;
    error: string | null;
  }>> {
    return this.request(`/jobs/${jobId}`, { method: 'GET' }, true);
  }

  listenToJobStream(
    jobId: string,
    onUpdate: (data: { jobId: string; status: 'completed' | 'failed'; result: any; error: string | null }) => void,
    onError: (error: any) => void,
    timeoutMs?: number
  ): () => void {
    let es: InstanceType<typeof EventSource> | null = null;
    let closed = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const close = () => {
      closed = true;
      if (timeoutId) clearTimeout(timeoutId);
      es?.close();
    };

    (async () => {
      const token = await this.getAuthToken();
      if (closed) return;

      const url = token
        ? `${this.baseUrl}/jobs/${jobId}/stream?token=${encodeURIComponent(token)}`
        : `${this.baseUrl}/jobs/${jobId}/stream`;
      es = new EventSource(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (timeoutMs) {
        timeoutId = setTimeout(() => {
          if (!closed) {
            onError(new Error('Stream timed out'));
            close();
          }
        }, timeoutMs);
      }

      es.addEventListener('message', (event: any) => {
        try {
          const data = JSON.parse(event.data);
          if (data.status === 'completed' || data.status === 'failed') {
            onUpdate(data);
            close();
          }
        } catch {
          // ignore malformed frames
        }
      });

      es.addEventListener('error', (event: any) => {
        if (!closed) {
          onError(event);
          close();
        }
      });
    })();

    return close;
  }

  async moveChatToFolder(sessionId: string, folderId: string | null): Promise<ApiResponse<any>> {
    return this.request(`/chat/${sessionId}/move-to-folder`, {
      method: 'PUT',
      body: JSON.stringify({ folderId }),
    }, true);
  }

  async getChatStatistics(sessionId: string): Promise<ApiResponse<{
    totalMessages: number;
    userMessages: number;
    assistantMessages: number;
    embeddingStatus: string;
    chunksCount: number;
    createdAt: string;
    lastActivity: string;
  }>> {
    return this.request(`/chat/${sessionId}/statistics`, { method: 'GET' }, true);
  }

  async updateChatSession(sessionId: string, data: { title: string }): Promise<ApiResponse<any>> {
    return this.request(`/chat/${sessionId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, true);
  }

  async deleteChatSession(sessionId: string): Promise<ApiResponse<any>> {
    return this.request(`/chat/${sessionId}`, { method: 'DELETE' }, true);
  }

  async submitFeedback(payload: {
    noteId?: string;
    isPositive: boolean;
    comment?: string;
  }): Promise<ApiResponse<null>> {
    return this.request('/internal-feedback', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, true);
  }

  // --- Referral Endpoints ---

  async validateReferralCode(code: string): Promise<ApiResponse<{ valid: boolean; type?: 'partner' | 'user' }>> {
    return this.request('/referrals/validate', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  async applyReferralCode(code: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.request('/referrals/apply', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }, true);
  }

  async getReferredFriends(page: number = 1, limit: number = 20): Promise<ApiResponse<any>> {
    return this.request(`/referrals/friends?page=${page}&limit=${limit}`, { method: 'GET' }, true);
  }

  // --- Quiz & Flashcard Export Endpoints ---

  async getQuizExport(
    quizId: string,
    type: 'questions' | 'answers',
    format: 'pdf' | 'docx'
  ): Promise<ArrayBuffer> {
    const token = await this.getAuthToken();
    const url = `${this.baseUrl}/quizzes/${quizId}/export/${type}?format=${format}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to export quiz: ${response.statusText}`);
    }

    return response.arrayBuffer();
  }

  async getFlashcardExport(
    setId: string,
    type: 'questions' | 'answers',
    format: 'pdf' | 'docx'
  ): Promise<ArrayBuffer> {
    const token = await this.getAuthToken();
    const url = `${this.baseUrl}/flashcards/${setId}/export/${type}?format=${format}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to export flashcard: ${response.statusText}`);
    }

    return response.arrayBuffer();
  }

  // --- Flashcard Sync Endpoints ---

  async getFlashcards(): Promise<ApiResponse<any>> {
    return this.request('/flashcards', { method: 'GET' }, true);
  }

  async createFlashcard(data: {
    title: string;
    cards: any[];
    totalCards: number;
    noteId?: string;
  }): Promise<ApiResponse<any>> {
    return this.request('/flashcards', {
      method: 'POST',
      body: JSON.stringify(data),
    }, true);
  }
}

export const api = new ApiClient();
export default api;