import { describe, it, expect } from 'vitest';
import { getNotificationTranslations } from './Notifications.data';

describe('Notification translations', () => {
  it('provides earlier group translation across all languages', () => {
    const uz = getNotificationTranslations('uz');
    const ru = getNotificationTranslations('ru');
    const en = getNotificationTranslations('en');

    expect(uz.earlier).toBe('Oldingi');
    expect(ru.earlier).toBe('Ранее');
    expect(en.earlier).toBe('Earlier');
  });
});
