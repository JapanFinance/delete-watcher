import { settings } from '@devvit/web/server';

export type AppSettings = {
  detectionWindowHours: number;
  discordWebhookUrl: string;
  enableDiscord: boolean;
  enableModNote: boolean;
};

export const DEFAULT_WINDOW_HOURS = 24;
export const MAX_WINDOW_HOURS = 168;

export const WEBHOOK_URL_PATTERN =
  /^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\/\d+\/[\w-]+$/;

export function isValidWindowHours(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value > 0 &&
    value <= MAX_WINDOW_HOURS
  );
}

export async function getAppSettings(): Promise<AppSettings> {
  const [windowHours, webhookUrl, enableDiscord, enableModNote] =
    await Promise.all([
      settings.get<number>('detectionWindowHours'),
      settings.get<string>('discordWebhookUrl'),
      settings.get<boolean>('enableDiscord'),
      settings.get<boolean>('enableModNote'),
    ]);
  return {
    detectionWindowHours: isValidWindowHours(windowHours)
      ? windowHours
      : DEFAULT_WINDOW_HOURS,
    discordWebhookUrl: typeof webhookUrl === 'string' ? webhookUrl.trim() : '',
    enableDiscord: enableDiscord !== false,
    enableModNote: enableModNote !== false,
  };
}
