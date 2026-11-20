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

import { getApiBaseUrl, apiClient } from './client';

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

/** Request a short-lived (60s) single-use connection ticket for WebSocket authentication */
export const fetchWsTicket = async (chatId: string): Promise<string | null> => {
  try {
    const res = await apiClient(`/chats/${encodeURIComponent(chatId)}/ws-ticket`, {
      method: 'POST',
    });
    if (res && typeof res.ticket === 'string' && res.ticket.trim().length > 0) {
      return res.ticket.trim();
    }
    return null;
  } catch {
    return null;
  }
};

/** Constructs the WebSocket URL using configured backend API host and single-use connection ticket */
export const getChatWebSocketUrl = (chatId: string, ticket?: string | null): string => {
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

  const ticketQuery = ticket ? `?ticket=${encodeURIComponent(ticket)}` : '';
  return `${wsBase}/chats/ws/${encodeURIComponent(chatId)}${ticketQuery}`;
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
  let connectEpoch = 0;

  const connect = async () => {
    if (closedByUs) return;
    const currentEpoch = ++connectEpoch;

    // Acquire fresh single-use ticket over authenticated HTTPS
    let ticket: string | null = null;
    try {
      ticket = await fetchWsTicket(chatId);
    } catch {
      ticket = null;
    }

    // In-flight guard: user closed chat or another connect triggered while fetching ticket
    if (closedByUs || currentEpoch !== connectEpoch) {
      return;
    }

    if (!ticket) {
      // Ticket acquisition failed: schedule exponential backoff reconnect. Polling remains fallback.
      attempt += 1;
      const delay = Math.min(1000 * 2 ** Math.min(attempt, 5), 30000);
      retry = setTimeout(connect, delay);
      return;
    }

    const url = getChatWebSocketUrl(chatId, ticket);

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
      connectEpoch += 1;
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
