import React, { useState } from 'react';
import { SupportTicket } from './types';
import { Headphones, User } from 'lucide-react';
import { SupportTicketChat } from './SupportTicketChat';

const mockTickets: SupportTicket[] = [
  {
    id: 'TICK-101',
    userName: 'Otabek Qodirov',
    userRole: 'worker',
    subject: 'E\'lon rasmi yuborilmadi va balansdan pul yechildi',
    category: 'payment',
    status: 'new',
    priority: 'high',
    createdAt: '2026-07-24 10:15',
    messages: [
      { sender: 'user', text: 'Assalomu alaykum! E\'lon berish uchun 15 000 UZS to\'ladim, lekin e\'lon hali ham kutilmoqda holatida.', timestamp: '10:15' },
    ],
  },
  {
    id: 'TICK-102',
    userName: 'Shaxnoza Karimova',
    userRole: 'employer',
    subject: 'Ishchi topshiriqni yakunlamay ketib qoldi',
    category: 'dispute',
    status: 'in_progress',
    priority: 'urgent',
    createdAt: '2026-07-24 09:30',
    messages: [
      { sender: 'user', text: 'Santexnika bo\'yicha usta kelib ishni yarmida qoldirdi. To\'lov qaytarilishini so\'rayman.', timestamp: '09:30' },
      { sender: 'admin', text: 'Assalomu alaykum! Muammoingiz qabul qilindi. Ishchi va siz bilan bog\'lanmoqdamiz.', timestamp: '09:45' },
    ],
  },
  {
    id: 'TICK-103',
    userName: 'Jasur Bekmirzayev',
    userRole: 'worker',
    subject: 'Pasport verifikatsiyasi necha kun davom etadi?',
    category: 'account',
    status: 'resolved',
    priority: 'medium',
    createdAt: '2026-07-23 16:20',
    messages: [
      { sender: 'user', text: 'Hujjatlarimni yukladim, qachon tasdiqlanadi?', timestamp: '16:20' },
      { sender: 'admin', text: 'Verifikatsiya odatda 1-2 soat ichida ko\'rib chiqiladi. Hujjatlaringiz tasdiqlandi!', timestamp: '16:35' },
    ],
  },
];

export const AdminSupport: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>(mockTickets);
  const [activeTab, setActiveTab] = useState<'all' | 'new' | 'in_progress' | 'resolved'>('all');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState('');

  const quickReplies = [
    'Assalomu alaykum! Murojaatingiz qabul qilindi, 15 daqiqa ichida o\'rganib chiqamiz.',
    'To\'lovingiz muvaffaqiyatli tekshirildi va balansga qaytarildi.',
    'Iltimos, hodisa joyidan olingan fotosuratlarni yuboring.',
  ];

  const filteredTickets = tickets.filter((t) => activeTab === 'all' || t.status === activeTab);

  const handleSendReply = (text: string) => {
    if (!selectedTicket || !text.trim()) return;

    const updated = tickets.map((t) => {
      if (t.id === selectedTicket.id) {
        return {
          ...t,
          status: 'in_progress' as const,
          messages: [
            ...t.messages,
            { sender: 'admin' as const, text, timestamp: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }) },
          ],
        };
      }
      return t;
    });

    setTickets(updated);
    setSelectedTicket(updated.find((t) => t.id === selectedTicket.id) || null);
    setReplyText('');
  };

  const handleResolve = (id: string) => {
    setTickets(tickets.map((t) => (t.id === id ? { ...t, status: 'resolved' } : t)));
    if (selectedTicket?.id === id) setSelectedTicket(null);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Headphones size={20} className="text-blue-600" />
            <span>Support Ticketlar va Yordam Chat</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Foydalanuvchilardan kelgan murojaatlar va nizoli holatlarga tezkor javob bering
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {(['all', 'new', 'in_progress', 'resolved'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize cursor-pointer ${
                activeTab === tab ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab === 'all' ? 'Barchasi' : tab === 'new' ? 'Yangi' : tab === 'in_progress' ? 'Jarayonda' : 'Hal etildi'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 space-y-2.5">
          {filteredTickets.map((t) => (
            <div
              key={t.id}
              onClick={() => setSelectedTicket(t)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                selectedTicket?.id === t.id
                  ? 'bg-blue-50/80 border-blue-300 shadow-sm'
                  : 'bg-white border-slate-200/80 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-mono text-[11px] font-bold text-slate-400">{t.id}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                  t.priority === 'urgent' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {t.priority.toUpperCase()}
                </span>
              </div>
              <h3 className="font-bold text-slate-900 text-xs line-clamp-1">{t.subject}</h3>
              <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-500">
                <span className="flex items-center gap-1 font-semibold text-slate-700"><User size={12} /> {t.userName}</span>
                <span>•</span>
                <span>{t.createdAt.split(' ')[1]}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-2">
          <SupportTicketChat
            ticket={selectedTicket}
            onClose={() => setSelectedTicket(null)}
            onResolve={handleResolve}
            onSendReply={handleSendReply}
            replyText={replyText}
            setReplyText={setReplyText}
            quickReplies={quickReplies}
          />
        </div>
      </div>
    </div>
  );
};
