import { describe, it, expect } from 'vitest';
import { calculateBackoffDelay, getChatWebSocketUrl } from './chatSocket';

describe('chatSocket utilities', () => {
  describe('calculateBackoffDelay', () => {
    it('scales exponentially with attempt count and includes positive jitter', () => {
      // With baseDelay = 1000 and jitter in [0, 500]:
      // Attempt 0: 1000 to 1500
      // Attempt 1: 2000 to 2500
      // Attempt 2: 4000 to 4500
      // Attempt 3: 8000 to 8500
      for (let i = 0; i < 4; i++) {
        const expectedBase = 1000 * Math.pow(2, i);
        const delay = calculateBackoffDelay(i);
        expect(delay).toBeGreaterThanOrEqual(expectedBase);
        expect(delay).toBeLessThanOrEqual(expectedBase + 500);
      }
    });

    it('caps delay at maxDelay (30000ms)', () => {
      // At attempt 10, 1000 * 2^10 = 1024000, which exceeds 30000
      const delayAt10 = calculateBackoffDelay(10);
      expect(delayAt10).toBeLessThanOrEqual(30500);

      const delayAt50 = calculateBackoffDelay(50);
      expect(delayAt50).toBeLessThanOrEqual(30500);
      expect(delayAt50).toBeGreaterThanOrEqual(30000);
    });

    it('respects custom baseDelay and maxDelay', () => {
      const delay = calculateBackoffDelay(0, 500, 2000);
      expect(delay).toBeGreaterThanOrEqual(500);
      expect(delay).toBeLessThanOrEqual(1000);

      const capped = calculateBackoffDelay(10, 500, 2000);
      expect(capped).toBeGreaterThanOrEqual(2000);
      expect(capped).toBeLessThanOrEqual(2500);
    });
  });

  describe('getChatWebSocketUrl', () => {
    it('constructs correct ws URL based on current protocol and host', () => {
      const url = getChatWebSocketUrl('chat-123');
      expect(url).toContain('/api/v1/chats/ws/chat-123');
      expect(url.startsWith('ws://') || url.startsWith('wss://')).toBe(true);
    });

    it('appends auth token as query parameter when provided', () => {
      const url = getChatWebSocketUrl('chat-456', 'mock-jwt-token-abc');
      expect(url).toContain('/api/v1/chats/ws/chat-456?token=mock-jwt-token-abc');
    });

    it('does not include ?token query when token is omitted or empty', () => {
      const url = getChatWebSocketUrl('chat-789', '');
      expect(url).not.toContain('?token=');
      expect(url).not.toContain('&token=');
    });
  });
});
