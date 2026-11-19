/**
 * Live chat updates.
 *
 * Messages arrived by polling — every five seconds while a conversation was
 * open — because that was the plainer of the two and enough to get the feature
 * working. The socket has been on the backend the whole time, and nginx was
 * fixed to pass the Upgrade header earlier, so a reply can land immediately
 * instead of up to five seconds later.
 *
 * Deliberately receive-only. Sending still goes over HTTP, which already
 * handles the optimistic update and reports its own failures; a socket that
 * drops mid-send would have to reproduce all of that. If the socket never
 * connects, polling still carries the conversation.
 */

import { getApiBaseUrl, getStoredToken } from './client';

export interface SocketMessage {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  hasMap?: boolean;
  mapLocation?: string | null;
  createdAt?: string | null;
}

export interface ChatSocket {
  close: () => void;
}

/** Constructs the WebSocket URL using configured backend API host and auth token */
export const getChatWebSocketUrl = (chatId: string): string => {
  const baseUrl = getApiBaseUrl().replace(/\/$/, '');
  let wsBase = baseUrl;
  if (wsBase.startsWith('https://')) {
    wsBase = 'wss://' + wsBase.slice(8);
  } else if (wsBase.startsWith('http://')) {
    wsBase = 'ws://' + wsBase.slice(7);
  } else {
    const scheme = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host = typeof window !== 'undefined' ? window.location.host : 'localhost';
    wsBase = `${scheme}://${host}${wsBase.startsWith('/') ? '' : '/'}${wsBase}`;
  }

  const token = getStoredToken();
  const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : '';
  return `${wsBase}/chats/ws/${encodeURIComponent(chatId)}${tokenQuery}`;
};

/** Open a socket for one conversation. Returns a handle that closes it. */
export const openChatSocket = (
  chatId: string,
  onMessage: (msg: SocketMessage) => void,
): ChatSocket => {
  let socket: WebSocket | null = null;
  let closedByUs = false;
  let retry: ReturnType<typeof setTimeout> | null = null;
  let attempt = 0;

  const connect = () => {
    if (closedByUs) return;
    const url = getChatWebSocketUrl(chatId);

    try {
      socket = new WebSocket(url);
    } catch {
      return; // Polling remains the fallback.
    }

    socket.onopen = () => {
      attempt = 0;
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data && typeof data === 'object') {
          if ((data.type === 'delete' && data.messageId) || (data.id && data.text !== undefined)) {
            onMessage(data as SocketMessage);
          }
        }
      } catch {
        // A frame we cannot read is not worth tearing the connection down for.
      }
    };

    socket.onclose = () => {
      socket = null;
      if (closedByUs) return;
      attempt += 1;
      const delay = Math.min(1000 * 2 ** Math.min(attempt, 5), 30000);
      retry = setTimeout(connect, delay);
    };

    socket.onerror = () => {
      socket?.close();
    };
  };

  const handleWakeup = () => {
    if (closedByUs) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    if (!socket || socket.readyState === WebSocket.CLOSED || socket.readyState === WebSocket.CLOSING) {
      attempt = 0;
      if (retry) {
        clearTimeout(retry);
        retry = null;
      }
      connect();
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('online', handleWakeup);
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleWakeup);
  }

  connect();

  return {
    close: () => {
      closedByUs = true;
      if (retry) clearTimeout(retry);
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleWakeup);
      }
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleWakeup);
      }
      socket?.close();
      socket = null;
    },
  };
};
