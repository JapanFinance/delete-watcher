import { Hono } from 'hono';
import type { SettingsValidationRequest, SettingsValidationResponse } from '@devvit/web/shared';
import { isValidWindowHours, MAX_WINDOW_HOURS, WEBHOOK_URL_PATTERN } from '../core/settings';

export const settingsRoutes = new Hono();

settingsRoutes.post('/validate-window', async (c) => {
  const request = await c.req.json<SettingsValidationRequest<number>>();
  if (request.value !== undefined && !isValidWindowHours(request.value)) {
    return c.json<SettingsValidationResponse>({
      success: false,
      error: `Must be a number greater than 0 and at most ${MAX_WINDOW_HOURS} (one week).`,
    });
  }
  return c.json<SettingsValidationResponse>({ success: true });
});

settingsRoutes.post('/validate-webhook', async (c) => {
  const request = await c.req.json<SettingsValidationRequest<string>>();
  const value = request.value?.trim() ?? '';
  if (value !== '' && !WEBHOOK_URL_PATTERN.test(value)) {
    return c.json<SettingsValidationResponse>({
      success: false,
      error:
        'Must be a Discord webhook URL (https://discord.com/api/webhooks/...) or empty to disable.',
    });
  }
  return c.json<SettingsValidationResponse>({ success: true });
});
