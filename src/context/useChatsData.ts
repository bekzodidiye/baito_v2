import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchChats, updateChatsStorage } from '../api/queries';
import { initialChats } from '../mockData';
import { Chat, Message } from '../types';
import { useCallback } from 'react';

export function useChatsData(language: 'uz' | 'ru' | 'en') {
  const queryClient = useQueryClient();

  const { data: chats = [] } = useQuery({
    queryKey: ['chats'],
    queryFn: fetchChats,
    initialData: () => {
      try {
        const saved = localStorage.getItem('baito_chats');
        if (saved) return JSON.parse(saved);
      } catch (e) {}
      return initialChats;
    },
    refetchInterval: false,
  });

  const setChats = useCallback((action: React.SetStateAction<Chat[]>) => {
    queryClient.setQueryData<Chat[]>(['chats'], (old = []) => {
      const newChats = typeof action === 'function' ? action(old) : action;
      updateChatsStorage(newChats);
      return newChats;
    });
  }, [queryClient]);

  const addNewMessage = useCallback((chatId: string, sender: 'user' | 'recruiter', text: string, hasMap?: boolean, mapLocation?: string) => {
    const timeNow = new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
    const newMsg: Message = {
      id: Math.random().toString(),
      sender,
      text,
      time: timeNow,
      hasMap,
      mapLocation
    };

    setChats(prevChats =>
      prevChats.map(c => {
        if (c.id === chatId) {
          return {
            ...c,
            messages: [...(c.messages || []), newMsg],
            lastMessageTime: timeNow,
            unreadCount: sender === 'recruiter' ? c.unreadCount + 1 : c.unreadCount
          };
        }
        return c;
      })
    );
  }, [setChats]);

  const sendMessage = useCallback((chatId: string, text: string) => {
    addNewMessage(chatId, 'user', text);

    // Recruiters reply sequence simulation
    setTimeout(() => {
      let reply = 'Tushunarli. Batafsil ma\'lumot va yo\'llanma bo\'yicha tez orada xabar beramiz.';
      if (language === 'ru') {
        reply = 'Понятно. Скоро мы сообщим вам подробную информацию и инструкции.';
      } else if (language === 'en') {
        reply = 'Understood. We will inform you about the details and instructions shortly.';
      }
      
      let hasMap = false;
      let mapLocation = '';
      const txt = text.toLowerCase();

      if (txt.includes('salom') || txt.includes('assalom') || txt.includes('hello')) {
        reply = language === 'ru' 
          ? 'Здравствуйте! Спасибо за сообщение.' 
          : language === 'en' 
          ? 'Hello! Thank you for your message.' 
          : 'Assalomu alaykum! Xabaringiz uchun rahmat.';
      } else if (txt.includes('manzil') || txt.includes('qayerda') || txt.includes('location')) {
        reply = language === 'ru'
          ? 'Вы можете посмотреть адрес рабочего места на карте.'
          : language === 'en'
          ? 'You can see the address of the workplace on this map.'
          : 'Ish joyi manzilini xarita orqali ko\'rib olishingiz mumkin.';
        hasMap = true;
        mapLocation = 'Tashkent, O\'zbekiston';
      }

      addNewMessage(chatId, 'recruiter', reply, hasMap, mapLocation);
    }, 2500);
  }, [addNewMessage, language]);

  return { chats, setChats, addNewMessage, sendMessage };
}
