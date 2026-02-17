export type BriefboardFrequency =
  | 'never'
  | 'hourly'
  | 'four_times_daily'
  | 'twice_daily'
  | 'daily'
  | 'every_3_days'
  | 'weekly'
  | 'monthly';

export interface BriefboardSettings {
  frequency: BriefboardFrequency;
  allowedDays: string[];
  allowedTimes: string[];
  specificDates: string[];
  briefingNotifications: boolean;
}

export const defaultBriefboardSettings: BriefboardSettings = {
  frequency: 'daily',
  allowedDays: [],
  allowedTimes: [],
  specificDates: [],
  briefingNotifications: true,
};

const TIME_WINDOW_MINUTES = 60;

const frequencyToMinutes = (frequency: BriefboardFrequency) => {
  switch (frequency) {
    case 'hourly':
      return 60;
    case 'four_times_daily':
      return 360;
    case 'twice_daily':
      return 720;
    case 'daily':
      return 1440;
    case 'every_3_days':
      return 4320;
    case 'weekly':
      return 10080;
    case 'monthly':
      return 43200;
    case 'never':
    default:
      return Number.POSITIVE_INFINITY;
  }
};

const getStorageKey = (userId?: string | null) =>
  userId ? `briefboard_settings_${userId}` : 'briefboard_settings';

const getLastSeenKey = (userId?: string | null) =>
  userId ? `briefboard_last_seen_${userId}` : 'briefboard_last_seen';

const parseTimeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
};

export const loadBriefboardSettings = (userId?: string | null): BriefboardSettings => {
  if (typeof window === 'undefined') return defaultBriefboardSettings;
  const stored = localStorage.getItem(getStorageKey(userId));
  if (!stored) return defaultBriefboardSettings;
  try {
    return { ...defaultBriefboardSettings, ...JSON.parse(stored) };
  } catch {
    return defaultBriefboardSettings;
  }
};

export const saveBriefboardSettings = (
  settings: BriefboardSettings,
  userId?: string | null
) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(getStorageKey(userId), JSON.stringify(settings));
};

export const recordBriefboardVisit = (userId?: string | null) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(getLastSeenKey(userId), new Date().toISOString());
};

export const shouldShowBriefboard = (
  settings: BriefboardSettings,
  userId?: string | null,
  now: Date = new Date()
) => {
  if (settings.frequency === 'never') return false;

  if (settings.specificDates.length > 0) {
    const today = now.toISOString().slice(0, 10);
    if (!settings.specificDates.includes(today)) return false;
  }

  if (settings.allowedDays.length > 0) {
    const day = now.toLocaleDateString('en-US', { weekday: 'short' });
    if (!settings.allowedDays.includes(day)) return false;
  }

  if (settings.allowedTimes.length > 0) {
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const withinWindow = settings.allowedTimes.some((time) => {
      const minutes = parseTimeToMinutes(time);
      if (minutes === null) return false;
      return Math.abs(nowMinutes - minutes) <= TIME_WINDOW_MINUTES;
    });
    if (!withinWindow) return false;
  }

  if (typeof window === 'undefined') return true;
  const lastSeenRaw = localStorage.getItem(getLastSeenKey(userId));
  if (!lastSeenRaw) return true;

  const lastSeen = new Date(lastSeenRaw);
  const minutesSinceLast = (now.getTime() - lastSeen.getTime()) / 60000;
  const requiredMinutes = frequencyToMinutes(settings.frequency);

  return minutesSinceLast >= requiredMinutes;
};
