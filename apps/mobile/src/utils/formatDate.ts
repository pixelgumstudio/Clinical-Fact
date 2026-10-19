import i18n from '../i18n';
/** "Jan 5, 2026" — no time. */
export const formatDateShort = (dateString: string | Date): string => {
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return String(dateString);
  }
};

/** "Jan 5, 2026, 3:45 PM" — the full timestamp shown on quiz/flashcard/note history rows. */
export const formatDateTime = (dateString: string | Date): string => {
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return String(dateString);
  }
};

/** "2 min ago" / "3 hr ago" / "4d ago" / "Jan 5" — used by the quiz/flashcard group detail
 *  screens and the chat-embedded generated-content cards. */
export const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMin < 1) return i18n.t('utils.formatDate.justNow');
  if (diffMin < 60) return i18n.t('utils.formatDate.minAgo', { diffMin });
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return i18n.t('utils.formatDate.hrAgo', { diffHr });
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return i18n.t('utils.formatDate.dAgo', { diffDay });
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

/** "Created Today, 3:45 PM" / "Created Jan 5, 3:45 PM" — used on history list screens. */
export const formatCreatedLabel = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const isToday = date.toDateString() === new Date().toDateString();
    const day = isToday
      ? 'Today'
      : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return i18n.t('utils.formatDate.created', { day, time });
  } catch {
    return dateString;
  }
};
