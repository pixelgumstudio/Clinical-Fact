export const API_ROUTES = {
  AUTH: {
    REGISTER: '/api/v1/auth/register',
    LOGIN: '/api/v1/auth/login',
    REFRESH: '/api/v1/auth/refresh',
    LOGOUT: '/api/v1/auth/logout',
  },
  NOTES: {
    CREATE: '/api/v1/notes',
    GET_ALL: '/api/v1/notes',
    GET_ONE: '/api/v1/notes/:id',
    UPDATE: '/api/v1/notes/:id',
    DELETE: '/api/v1/notes/:id',
  },
  FOLDERS: {
    CREATE: '/api/v1/folders',
    GET_ALL: '/api/v1/folders',
    UPDATE: '/api/v1/folders/:id',
    DELETE: '/api/v1/folders/:id',
  },
  QUIZ: {
    GENERATE: '/api/v1/quizzes/generate',
    GET_ALL: '/api/v1/quizzes',
    GET_BY_NOTE: '/api/v1/quizzes/note/:noteId',
    GET_ONE: '/api/v1/quizzes/:id',
    SUBMIT: '/api/v1/quizzes/:id/submit',
    DELETE: '/api/v1/quizzes/:id',
  },
  FLASHCARDS: {
    GENERATE: '/api/v1/flashcards/generate',
    GET_ALL: '/api/v1/flashcards',
    GET_ONE: '/api/v1/flashcards/:setId',
    UPDATE_CARD: '/api/v1/flashcards/:setId/cards/:cardId',
    REVIEW_CARD: '/api/v1/flashcards/:setId/cards/:cardId/review',
    GET_STATS: '/api/v1/flashcards/:setId/statistics',
    DELETE: '/api/v1/flashcards/:setId',
  },
  CHAT: {
    CREATE_FROM_NOTE: '/api/v1/chat/create-from-note',
    CREATE_FROM_DOCUMENT: '/api/v1/chat/create-from-document',
    GET_ALL: '/api/v1/chat',
    GET_ONE: '/api/v1/chat/:sessionId',
    SEND_MESSAGE: '/api/v1/chat/:sessionId/message',
    GET_STATS: '/api/v1/chat/:sessionId/statistics',
    MOVE_TO_FOLDER: '/api/v1/chat/:sessionId/move-to-folder',
    DELETE: '/api/v1/chat/:sessionId',
  },
  OTP: {
    SEND_SIGNUP: '/api/v1/otp/send/signup',
    SEND_LOGIN: '/api/v1/otp/send/login',
    VERIFY_SIGNUP: '/api/v1/otp/verify/signup',
    VERIFY_LOGIN: '/api/v1/otp/verify/login',
    RESEND: '/api/v1/otp/resend',
  },
  YOUTUBE: {
    GET_INFO: '/api/v1/youtube/info',
    CHECK_TRANSCRIPT: '/api/v1/youtube/check-transcript',
  },
};

export const SUBSCRIPTION_LIMITS = {
  FREE: {
    MAX_NOTES: 50,
    MAX_STORAGE_MB: 100,
    AI_REQUESTS_PER_MONTH: 50,
  },
  PRO: {
    MAX_NOTES: -1, // Unlimited
    MAX_STORAGE_MB: 10000, // 10GB
    AI_REQUESTS_PER_MONTH: 1000,
  },
};

export const FILE_UPLOAD_LIMITS = {
  MAX_FILE_SIZE_MB: 50,
  ALLOWED_AUDIO_TYPES: ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/m4a'],
  ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/quicktime'],
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  ALLOWED_PDF_TYPES: ['application/pdf'],
};
