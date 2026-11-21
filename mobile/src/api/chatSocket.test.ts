import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getChatWebSocketUrl, fetchWsTicket, openChatSocket } from './chatSocket';
import * as clientModule from './client';

describe('mobile chatSocket utilities', () => {
  beforeEach(() => {
    vi.spyOn(clientModule, 'getApiBaseUrl').mockReturnValue('https://api.baito.uz/api/v1');
    vi.spyOn(clientModule, 'getStoredToken').mockReturnValue('jwt-mobile-test-token');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('constructs clean wss URL without query parameters', () => {
    const url = getChatWebSocketUrl('chat-999');
    expect(url).toBe('wss://api.baito.uz/api/v1/chats/ws/chat-999');
    expect(url).not.toContain('?');
    expect(url).not.toContain('jwt-mobile-test-token');
  });

  it('constructs clean ws URL when backend uses http', () => {
    vi.spyOn(clientModule, 'getApiBaseUrl').mockReturnValue('http://192.168.1.5:8000/api/v1');
    const url = getChatWebSocketUrl('chat-888');
    expect(url).toBe('ws://192.168.1.5:8000/api/v1/chats/ws/chat-888');
    expect(url).not.toContain('?');
  });

  it('omits query parameter completely from WebSocket URL', () => {
    const url = getChatWebSocketUrl('chat-777');
    expect(url).toBe('wss://api.baito.uz/api/v1/chats/ws/chat-777');
    expect(url).not.toContain('?ticket=');
    expect(url).not.toContain('?token=');
  });

  it('never places reusable JWT or ticket into the URL query string', () => {
    const url1 = getChatWebSocketUrl('chat-001');
    const url2 = getChatWebSocketUrl('chat-002');
    expect(url1).not.toContain('?');
    expect(url2).not.toContain('?');
    expect(url1).not.toContain('jwt-mobile-test-token');
    expect(url2).not.toContain('jwt-mobile-test-token');
  });

  it('fetchWsTicket acquires ticket from /chats/{chat_id}/ws-ticket via apiClient', async () => {
    const apiSpy = vi.spyOn(clientModule, 'apiClient').mockResolvedValue({
      ticket: 'mock-ticket-token-999',
      expires_in: 60,
    });

    const ticket = await fetchWsTicket('chat-456');
    expect(apiSpy).toHaveBeenCalledWith('/chats/chat-456/ws-ticket', { method: 'POST' });
    expect(ticket).toBe('mock-ticket-token-999');
  });

  it('fetchWsTicket returns null when endpoint returns error or fails', async () => {
    vi.spyOn(clientModule, 'apiClient').mockRejectedValue(new Error('Network error'));
    const ticket = await fetchWsTicket('chat-456');
    expect(ticket).toBeNull();
  });

  it('openChatSocket acquires ticket and connects with RFC 6455 subprotocol', async () => {
    vi.spyOn(clientModule, 'apiClient').mockResolvedValue({
      ticket: 'ticket-session-1',
      expires_in: 60,
    });

    const createdSockets: any[] = [];
    class MockWebSocket {
      url: string;
      protocols: string | string[] | undefined;
      readyState = 0;
      onopen: any = null;
      onmessage: any = null;
      onclose: any = null;
      onerror: any = null;
      constructor(url: string, protocols?: string | string[]) {
        this.url = url;
        this.protocols = protocols;
        createdSockets.push(this);
      }
      close() {
        this.readyState = 3;
      }
    }
    vi.stubGlobal('WebSocket', MockWebSocket);

    const onMessage = vi.fn();
    const handle = openChatSocket('chat-123', onMessage);

    // Wait for async ticket acquisition
    await new Promise((r) => setTimeout(r, 20));

    expect(createdSockets.length).toBe(1);
    expect(createdSockets[0].url).toBe('wss://api.baito.uz/api/v1/chats/ws/chat-123');
    expect(createdSockets[0].url).not.toContain('?');
    expect(createdSockets[0].protocols).toEqual(['baito-ticket', 'ticket-session-1']);

    handle.close();
    vi.unstubAllGlobals();
  });

  it('openChatSocket close prevents WebSocket connection if ticket fetch is in-flight', async () => {
    let resolveTicket: any;
    vi.spyOn(clientModule, 'apiClient').mockReturnValue(
      new Promise((res) => {
        resolveTicket = res;
      })
    );

    const createdSockets: any[] = [];
    class MockWebSocket {
      url: string;
      constructor(url: string) {
        this.url = url;
        createdSockets.push(this);
      }
      close() {}
    }
    vi.stubGlobal('WebSocket', MockWebSocket);

    const onMessage = vi.fn();
    const handle = openChatSocket('chat-abandon', onMessage);

    // User closes before ticket resolution
    handle.close();

    // Now resolve ticket
    resolveTicket({ ticket: 'late-ticket', expires_in: 60 });
    await new Promise((r) => setTimeout(r, 20));

    // No WebSocket must have been created
    expect(createdSockets.length).toBe(0);

    vi.unstubAllGlobals();
  });
});
