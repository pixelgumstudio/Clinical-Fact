import i18n from '../i18n';

/** The app's language doubles as the date locale (the codes are BCP-47: "es", "pt-PT", "ar-EG"...). */
const dateLocale = (): string => i18n.language || 'en';

const toLocaleDate = (date: Date, options: Intl.DateTimeFormatOptions): string => {
  try {
    return date.toLocaleDateString(dateLocale(), options);
  } catch {
    return date.toLocaleDateString('en', options); // runtime without that locale's data
  }
};

const toLocaleTime = (date: Date): string => {
  try {
    return date.toLocaleTimeString(dateLocale(), { hour: 'numeric', minute: '2-digit' });
  } catch {
    return date.toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' });
  }
};

/** "Jan 5, 2026" in the user's language — no time. */
export const formatDateShort = (dateString: string | Date): string => {
  try {
    return toLocaleDate(new Date(dateString), { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return String(dateString);
  }
};

/** "Jan 5, 2026, 3:45 PM" in the user's language (12/24-hour clock follows the locale). */
export const formatDateTime = (dateString: string | Date): string => {
  try {
    return toLocaleDate(new Date(dateString), {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return String(dateString);
  }
};

/** "Jan 5" in the user's language. */
export const formatMonthDay = (dateString: string | Date): string => toLocaleDate(new Date(dateString), { month: 'short', day: 'numeric' });

/** The two halves of a "Created Today, 3:45 PM" label: "Today" or "Jan 5", and the time. */
export const formatDayAndTime = (dateString: string | Date): { day: string; time: string } => {
  const date = new Date(dateString);
  const isToday = date.toDateString() === new Date().toDateString();
  return { day: isToday ? i18n.t('utils.formatDate.today') : formatMonthDay(date), time: toLocaleTime(date) };
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
  return formatMonthDay(date);
};

/** "Created Today, 3:45 PM" / "Created Jan 5, 3:45 PM" — used on history list screens. */
export const formatCreatedLabel = (dateString: string): string => {
  try {
    const { day, time } = formatDayAndTime(dateString);
    return i18n.t('utils.formatDate.created', { day, time });
  } catch {
    return dateString;
  }
};
