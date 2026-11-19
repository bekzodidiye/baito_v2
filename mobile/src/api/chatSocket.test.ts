import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getChatWebSocketUrl } from './chatSocket';
import * as clientModule from './client';

describe('mobile chatSocket utilities', () => {
  beforeEach(() => {
    vi.spyOn(clientModule, 'getApiBaseUrl').mockReturnValue('https://api.baito.uz/api/v1');
    vi.spyOn(clientModule, 'getStoredToken').mockReturnValue('jwt-mobile-test-token');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('constructs wss URL with query token when backend uses https', () => {
    const url = getChatWebSocketUrl('chat-999');
    expect(url).toBe('wss://api.baito.uz/api/v1/chats/ws/chat-999?token=jwt-mobile-test-token');
  });

  it('constructs ws URL when backend uses http', () => {
    vi.spyOn(clientModule, 'getApiBaseUrl').mockReturnValue('http://192.168.1.5:8000/api/v1');
    const url = getChatWebSocketUrl('chat-888');
    expect(url).toBe('ws://192.168.1.5:8000/api/v1/chats/ws/chat-888?token=jwt-mobile-test-token');
  });

  it('omits token query parameter when getStoredToken returns null', () => {
    vi.spyOn(clientModule, 'getStoredToken').mockReturnValue(null);
    const url = getChatWebSocketUrl('chat-777');
    expect(url).toBe('wss://api.baito.uz/api/v1/chats/ws/chat-777');
    expect(url).not.toContain('?token=');
  });
});
