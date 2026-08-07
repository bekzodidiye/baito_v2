import { useQuery } from '@tanstack/react-query';
import { fetchChats, fetchChatMessages } from '../api/queries';
import { Chat, Message } from '../types';
import { useCallback, useRef, useEffect, useState } from 'react';
import { useApp } from './AppContext';

export function useChatsData(language: 'uz' | 'ru' | 'en') {
  const { userProfile } = useApp();
  const isLoggedIn = !!localStorage.getItem('baito_token');
  
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [messagesMap, setMessagesMap] = useState<Record<string, Message[]>>({});

  const { data: chats = [], refetch } = useQuery({
    queryKey: ['chats'],
    queryFn: async () => {
      const data = await fetchChats();
      return data.map((c: any) => ({
        id: c.id,
        jobId: c.jobId,
        companyName: c.otherUserName || 'Kompaniya',
        companyLogo: c.otherUserAvatar || '',
        lastMessage: c.lastMessage || 'Chat boshlandi',
        lastMessageTime: c.lastMessageTime ? new Date(c.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
        messages: [],
        unreadCount: 0
      }));
    },
    initialData: [],
    refetchInterval: false,
    enabled: isLoggedIn,
  });

  // When activeChatId changes, fetch messages and connect WS
  useEffect(() => {
    if (!activeChatId || !userProfile?.id) return;
    
    let isMounted = true;
    
    const loadAndConnect = async () => {
      try {
        const msgs = await fetchChatMessages(activeChatId);
        if (isMounted) {
          const mapped: Message[] = msgs.map((m: any) => ({
            id: m.id,
            sender: m.senderId === userProfile.id ? 'user' : 'recruiter',
            text: m.text,
            time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            hasMap: m.hasMap,
            mapLocation: m.mapLocation
          }));
          setMessagesMap(prev => ({ ...prev, [activeChatId]: mapped }));
        }

        if (wsRef.current) wsRef.current.close();
        
        const wsUrl = `ws://${window.location.hostname}:8000/api/v1/chats/ws/${activeChatId}`;
        const ws = new WebSocket(wsUrl);
        ws.onmessage = (event) => {
          const m = JSON.parse(event.data);
          const newMsg: Message = {
            id: m.id,
            sender: m.senderId === userProfile.id ? 'user' : 'recruiter',
            text: m.text,
            time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            hasMap: m.hasMap,
            mapLocation: m.mapLocation
          };
          setMessagesMap(prev => {
            const existing = prev[activeChatId] || [];
            if (existing.find(x => x.id === newMsg.id)) return prev;
            return { ...prev, [activeChatId]: [...existing, newMsg] };
          });
        };
        wsRef.current = ws;
      } catch (err) {
        console.error(err);
      }
    };
    loadAndConnect();

    return () => {
      isMounted = false;
      if (wsRef.current) wsRef.current.close();
    };
  }, [activeChatId, userProfile?.id]);

  const sendMessage = useCallback((chatId: string, text: string) => {
    if (!text.trim() || !userProfile?.id) return;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        senderId: userProfile.id,
        text: text.trim(),
        hasMap: false
      }));
    }
  }, [userProfile?.id]);
  
  const setChats = (updater: any) => {}; 
  const addNewMessage = () => {}; 

  const chatsWithMessages = chats.map((c: any) => ({
    ...c,
    messages: messagesMap[c.id] || []
  }));

  return { chats: chatsWithMessages as Chat[], setChats, sendMessage, addNewMessage, setActiveChatId };
}
