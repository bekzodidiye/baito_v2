import { useState, useEffect, useRef } from 'react';
import { useEmployer } from './useEmployer';
import { fetchChats, fetchChatMessages, createChatApi } from '../api/queries';

export interface ChatMessage {
  id: string;
  senderId: string;
  sender: 'user' | 'recruiter'; // We will derive this based on current user id
  text: string;
  time: string;
  hasMap?: boolean;
  mapLocation?: string;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  jobId?: string;
  candidateName: string;
  candidateAvatar: string;
  lastMessage: string;
  time: string;
  messages: ChatMessage[];
}

export const useEmployerChat = (initialTargetCandidate?: string | null, onClearTargetCandidate?: () => void) => {
  const { language, employer } = useEmployer();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // Load all sessions on mount
  useEffect(() => {
    const loadChats = async () => {
      try {
        const chatsData = await fetchChats();
        const mappedSessions: ChatSession[] = chatsData.map((c: any) => ({
          id: c.id,
          jobId: c.jobId,
          candidateName: c.otherUserName || 'Unknown',
          candidateAvatar: c.otherUserAvatar || '',
          lastMessage: c.lastMessage || 'Chat started',
          time: new Date(c.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          messages: []
        }));
        setSessions(mappedSessions);
      } catch (err) {
        console.error("Failed to load chats:", err);
      }
    };
    loadChats();
  }, []);

  // When a session is selected, fetch messages and open WebSocket
  useEffect(() => {
    if (!selectedSessionId || !employer?.id) return;

    let isMounted = true;

    const loadMessagesAndConnect = async () => {
      try {
        const msgs = await fetchChatMessages(selectedSessionId);
        
        if (isMounted) {
          const mappedMsgs: ChatMessage[] = msgs.map((m: any) => ({
            id: m.id,
            senderId: m.senderId,
            sender: m.senderId === employer.id ? 'recruiter' : 'user',
            text: m.text,
            time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            hasMap: m.hasMap,
            mapLocation: m.mapLocation,
            createdAt: m.createdAt
          }));

          setSessions(prev => prev.map(s => 
            s.id === selectedSessionId ? { ...s, messages: mappedMsgs } : s
          ));
        }

        // Connect WS
        if (wsRef.current) {
          wsRef.current.close();
        }
        
        // Use relative path or env variable for WS in a real app, here we assume it runs on same host
        const wsUrl = `ws://${window.location.hostname}:8000/api/v1/chats/ws/${selectedSessionId}`;
        const ws = new WebSocket(wsUrl);
        
        ws.onmessage = (event) => {
          const m = JSON.parse(event.data);
          const newMsg: ChatMessage = {
            id: m.id,
            senderId: m.senderId,
            sender: m.senderId === employer.id ? 'recruiter' : 'user',
            text: m.text,
            time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            hasMap: m.hasMap,
            mapLocation: m.mapLocation,
            createdAt: m.createdAt
          };

          setSessions(prev => prev.map(s => {
            if (s.id === selectedSessionId) {
              // Ensure no duplicates
              if (s.messages.find(msg => msg.id === newMsg.id)) return s;
              return { 
                ...s, 
                messages: [...s.messages, newMsg],
                lastMessage: newMsg.text,
                time: newMsg.time
              };
            }
            return s;
          }));
        };

        wsRef.current = ws;
      } catch (err) {
        console.error("Failed to load messages or connect WS:", err);
      }
    };

    loadMessagesAndConnect();

    return () => {
      isMounted = false;
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [selectedSessionId, employer?.id]);

  const activeSession = sessions?.find(s => s.id === selectedSessionId);

  const sendMessage = (text: string) => {
    if (!text.trim() || !selectedSessionId || !employer?.id) return;
    
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        senderId: employer.id,
        text: text.trim(),
        hasMap: false
      }));
    } else {
      console.error("WebSocket is not open");
    }
  };

  const createSession = async (candidateName: string, initialMessage: string, targetUserId?: string, jobId?: string) => {
    try {
      // In a real app, you'd need the real targetUserId. Using a dummy if not provided.
      const newChatData = await createChatApi(targetUserId || 'dummy_user_id', jobId);
      
      const newSession: ChatSession = {
        id: newChatData.id,
        candidateName: candidateName.trim(),
        candidateAvatar: '',
        lastMessage: initialMessage.trim(),
        time: 'Hozir',
        messages: []
      };

      setSessions(prev => [newSession, ...prev]);
      setSelectedSessionId(newSession.id);
      
      // Delay to allow WS connection to establish, then send first message
      setTimeout(() => {
        sendMessage(initialMessage);
      }, 1000);

    } catch (err) {
      console.error("Failed to create chat:", err);
    }
  };

  return {
    sessions,
    selectedSessionId,
    setSelectedSessionId,
    activeSession,
    isTyping,
    sendMessage,
    createSession,
    language
  };
};
