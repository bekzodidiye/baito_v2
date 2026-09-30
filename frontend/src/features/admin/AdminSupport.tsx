import React, { useState } from 'react';
import { ADMIN_TEXTS } from './admin.i18n';
import { useAuthStore } from '../../store/useAuthStore';
import { SupportTicket, SupportTicketDetail } from './types';
import { Headphones, User } from 'lucide-react';
import { SupportTicketChat } from './SupportTicketChat';
import { fetchAdminTicketApi, replyToTicketApi, updateTicketStatusApi } from '../../api/queries';
import { showToast } from '../../utils/toast';

interface AdminSupportProps {
  supportTickets: SupportTicket[];
}

const formatTicketTime = (raw?: string): string => {
  if (!raw) return '';
  const d = new Date(raw.replace(' ', 'T'));
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

export const AdminSupport: React.FC<AdminSupportProps> = ({ supportTickets }) => {
  const language = useAuthStore(st => st.language);
  const a = ADMIN_TEXTS[language] || ADMIN_TEXTS.uz;
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'new' | 'open' | 'resolved'>('all');
  // The list carries no messages, so selecting a ticket has to fetch it.
  // Handing a list row straight to the chat view is what crashed the screen:
  // it read `ticket.messages.map(...)` on a value that had no messages.
  const [selectedTicket, setSelectedTicket] = useState<SupportTicketDetail | null>(null);
  const [loadingTicket, setLoadingTicket] = useState(false);
  const [replyText, setReplyText] = useState('');

  const openTicket = async (id: string) => {
    setLoadingTicket(true);
    try {
      setSelectedTicket(await fetchAdminTicketApi(id));
    } catch (e) {
      console.error('Could not load the ticket', e);
      showToast("Murojaatni yuklab bo'lmadi. Qaytadan urinib ko'ring.");
      setSelectedTicket(null);
    } finally {
      setLoadingTicket(false);
    }
  };

  React.useEffect(() => {
    setTickets(supportTickets);
  }, [supportTickets]);

  const quickReplies = [
    'Assalomu alaykum! Murojaatingiz qabul qilindi, 15 daqiqa ichida o\'rganib chiqamiz.',
    'To\'lovingiz muvaffaqiyatli tekshirildi va balansga qaytarildi.',
    'Iltimos, hodisa joyidan olingan fotosuratlarni yuboring.',
  ];

  const filteredTickets = tickets.filter((t) => activeTab === 'all' || t.status === activeTab);

  /** Reply, and move the ticket along. This only ever changed local state
   *  before, so nothing an administrator wrote was sent anywhere. */
  const handleSendReply = async (text: string) => {
    if (!selectedTicket || !text.trim()) return;
    const id = selectedTicket.id;
    setReplyText('');
    try {
      await replyToTicketApi(id, { text: text.trim(), status: 'open' });
      setSelectedTicket(await fetchAdminTicketApi(id));
      setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, status: 'open' } : t)));
    } catch (e) {
      console.error('Could not send the reply', e);
      showToast("Javobni yuborib bo'lmadi. Qaytadan urinib ko'ring.");
      setReplyText(text);
    }
  };

  const handleResolve = async (id: string) => {
    try {
      await updateTicketStatusApi(id, 'resolved');
      setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, status: 'resolved' } : t)));
      if (selectedTicket?.id === id) setSelectedTicket(null);
    } catch (e) {
      console.error('Could not resolve the ticket', e);
      showToast("Holatni o'zgartirib bo'lmadi.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Headphones size={20} className="text-blue-600" />
            <span>{a.supportTitle}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Foydalanuvchilardan kelgan murojaatlar va nizoli holatlarga tezkor javob bering
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {(['all', 'new', 'open', 'resolved'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize cursor-pointer ${
                activeTab === tab ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab === 'all' ? a.statusAll : tab === 'new' ? a.ticketNew : tab === 'open' ? a.chipInProgress : a.ticketResolved}
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 space-y-2.5">
          {filteredTickets.length === 0 && (
            <div className="text-center text-slate-500 text-xs py-12 bg-white border border-slate-200 rounded-2xl">
              {tickets.length === 0
                ? 'Hozircha murojaatlar yo\'q'
                : 'Ushbu holatda murojaat topilmadi'}
            </div>
          )}
          {filteredTickets.map((t) => (
            <div
              key={t.id}
              onClick={() => openTicket(t.id)}
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
                <span>{formatTicketTime(t.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-2">
          <SupportTicketChat
            ticket={selectedTicket}
            loading={loadingTicket}
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
