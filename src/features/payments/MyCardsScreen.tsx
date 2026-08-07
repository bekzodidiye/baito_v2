import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Star, EyeOff, Snowflake, Trash2, CreditCard, X, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuthStore } from '../../store/useAuthStore';
import { useCurrentScreen } from '../../hooks/useCurrentScreen';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchPaymentCardsApi, deletePaymentCardApi, updatePaymentCardApi } from '../../api/queries';
import { useApp } from '../../context/AppContext';
import { getBankName, getBankColors } from '../../utils/cardUtils';

export const MyCardsScreen: React.FC = () => {
  const navigate = useNavigate();
  const { setCurrentScreen } = useCurrentScreen();
  const { language } = useApp();
  const user = useAuthStore(state => state.userProfile);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; type: 'delete' | 'freeze'; cardId: string | null; isActive?: boolean }>({ isOpen: false, type: 'delete', cardId: null });

  const { data: savedCards = [] } = useQuery({
    queryKey: ['paymentCards'],
    queryFn: fetchPaymentCardsApi,
  });
  const queryClient = useQueryClient();

  const deleteCardMutation = useMutation({
    mutationFn: deletePaymentCardApi,
    onSuccess: () => {
      window.dispatchEvent(new CustomEvent('global-toast', { detail: { message: "Karta muvaffaqiyatli o'chirildi", type: 'success' } }));
      queryClient.invalidateQueries({ queryKey: ['paymentCards'] });
    },
    onError: () => {
      window.dispatchEvent(new CustomEvent('global-toast', { detail: { message: "Xatolik yuz berdi", type: 'error' } }));
    }
  });

  const updateCardMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => updatePaymentCardApi(id, data),
    onSuccess: (data) => {
      window.dispatchEvent(new CustomEvent('global-toast', { 
        detail: { 
          message: data.isActive === false ? "Karta muzlatildi" : "Karta faollashtirildi", 
          type: 'success' 
        } 
      }));
      queryClient.invalidateQueries({ queryKey: ['paymentCards'] });
    },
    onError: () => {
      window.dispatchEvent(new CustomEvent('global-toast', { detail: { message: "Xatolik yuz berdi", type: 'error' } }));
    }
  });

  const handleBack = () => {
    navigate('/payments');
  };

  const handleAddCard = () => {
    navigate('/payments/add-card');
  };

  const getCardStyle = (cardNumber: string) => {
    const cleanNum = cardNumber.replace(/\s/g, '');
    const bankName = getBankName(cardNumber);

    let defaultColors: any = {
      bg: 'bg-gradient-to-br from-white to-slate-200 border-slate-300 shadow-[0_20px_40px_rgba(0,0,0,0.05)]',
      text: 'text-slate-800',
      textMuted: 'text-slate-500',
      icon: 'text-slate-600'
    };

    if (cleanNum.startsWith('8600')) {
      defaultColors = {
        bg: 'bg-gradient-to-br from-[#0e9f6e] to-[#046c4e] shadow-[0_20px_40px_rgba(4,108,78,0.2)]',
        text: 'text-white',
        textMuted: 'text-white/70',
        icon: 'text-white/80'
      };
    } else if (cleanNum.startsWith('9860')) {
      defaultColors = {
        bg: 'bg-gradient-to-br from-[#ff5a5f] to-[#e01a4f] shadow-[0_20px_40px_rgba(224,26,79,0.2)]',
        text: 'text-white',
        textMuted: 'text-white/70',
        icon: 'text-white/80'
      };
    } else if (cleanNum.startsWith('4')) {
      defaultColors = {
        bg: 'bg-gradient-to-br from-[#1a56db] to-[#1e40af] shadow-[0_20px_40px_rgba(30,64,175,0.2)]',
        text: 'text-white',
        textMuted: 'text-white/70',
        icon: 'text-white/80'
      };
    } else if (cleanNum.startsWith('5')) {
      defaultColors = {
        bg: 'bg-gradient-to-br from-[#e02424] to-[#9b1c1c] shadow-[0_20px_40px_rgba(155,28,28,0.2)]',
        text: 'text-white',
        textMuted: 'text-white/70',
        icon: 'text-white/80'
      };
    }

    return getBankColors(bankName, defaultColors);
  };

  const primaryCard = savedCards.length > 0 ? (selectedCardId ? savedCards.find((c: any) => c.id === selectedCardId) : (savedCards.find((c: any) => c.isDefault) || savedCards[0])) : null;
  const otherCards = savedCards.filter((c: any) => c.id !== primaryCard?.id);

  return (
    <div className="bg-brand-background text-on-background font-sans antialiased min-h-screen pb-24 w-full max-w-4xl mx-auto">
      {/* TopAppBar */}
      <header className="w-full top-0 bg-surface/80 backdrop-blur-md shadow-[0px_4px_20px_rgba(1,7,102,0.04)] shadow-sm fixed z-40 flex items-center px-4 h-16 max-w-4xl">
        <button 
          onClick={handleBack}
          className="mr-4 text-primary active:scale-95 transition-transform p-2 rounded-full hover:bg-slate-200 cursor-pointer"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="font-title-lg text-[20px] text-primary-container flex-1 font-bold">
          {language === 'uz' ? 'Mening kartalarim' : language === 'ru' ? 'Мои карты' : 'My Cards'}
        </h1>
      </header>
      
      <main className="pt-24 px-4 space-y-6">
        {/* Add New Card CTA */}
        <button 
          onClick={handleAddCard}
          className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-white rounded-xl border border-dashed border-slate-300 hover:bg-slate-50 hover:border-brand-primary transition-colors active:scale-[0.98] cursor-pointer"
        >
          <Plus className="text-brand-primary w-5 h-5" />
          <span className="font-title-md text-[16px] text-brand-primary font-semibold">
            {language === 'uz' ? "Yangi karta qo'shish" : language === 'ru' ? "Добавить новую карту" : "Add new card"}
          </span>
        </button>
        
        {primaryCard && (() => {
          const style = getCardStyle(primaryCard.cardNumber || primaryCard.last4); // fallback to last4 if full number isn't returned
          
          return (
            <div className={`rounded-2xl p-6 shadow-2xl relative overflow-hidden group ${style.bg}`}>
              <div className="absolute inset-0 rounded-2xl border border-white/20" style={{ background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0) 100%)', backdropFilter: 'blur(10px)' }}></div>
              <div className="relative z-10 flex flex-col justify-between h-48">
                <div className="flex justify-between items-start">
                  <div>
                    <p className={`font-label-lg text-[12px] uppercase tracking-wider mb-1 font-bold ${style.textMuted}`}>Joriy balans</p>
                    <p className={`font-headline-lg text-[24px] font-extrabold tracking-tight ${style.text}`}>
                      {primaryCard.balance ? primaryCard.balance.toLocaleString() : '0'} UZS
                    </p>
                  </div>
                  <div className={`w-12 h-8 rounded backdrop-blur-sm flex items-center justify-center font-bold italic opacity-80 text-[10px] ${style.bg.includes('from-white') ? 'bg-slate-200 text-slate-800' : 'bg-white/20 text-white'}`}>
                    {primaryCard.cardType || getBankName(primaryCard.cardNumber || primaryCard.last4) || 'CARD'}
                  </div>
                </div>
                <div className="mt-auto">
                  <p className={`font-body-lg text-[18px] font-mono tracking-widest mb-2 opacity-90 ${style.text}`}>
                    **** **** **** {primaryCard.last4}
                  </p>
                  <div className="flex justify-between items-center text-sm">
                    <span className={`font-label-lg text-[12px] font-bold uppercase truncate max-w-[150px] ${style.text}`}>
                      {primaryCard.cardholderName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'ALIYEV VALI'}
                    </span>
                    <span className={`font-label-lg text-[12px] font-mono font-bold ${style.text}`}>
                      {primaryCard.expiry || '09/26'}
                    </span>
                  </div>
                </div>
              </div>
              {/* Abstract decorative elements */}
              <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
              <div className="absolute -left-12 top-4 w-24 h-24 bg-black/10 rounded-full blur-xl"></div>
            </div>
          );
        })()}

        {!primaryCard && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4">
              <CreditCard className="text-slate-300 w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">
              {language === 'uz' ? "Sizda saqlangan kartalar yo'q" : language === 'ru' ? "У вас нет сохраненных карт" : "You have no saved cards"}
            </h3>
            <p className="text-slate-500 text-sm">
              {language === 'uz' ? "Yangi karta qo'shish uchun yuqoridagi tugmani bosing" : language === 'ru' ? "Нажмите кнопку выше, чтобы добавить новую карту" : "Click the button above to add a new card"}
            </p>
          </div>
        )}
        
        {/* Quick Actions (only show if there's a primary card) */}
        {primaryCard && (
          <div className="flex justify-between items-center px-2">
            <button 
              onClick={() => {
                window.dispatchEvent(new CustomEvent('global-toast', { detail: { message: "Asosiy karta qilib belgilandi", type: 'success' } }));
              }}
              className="flex flex-col items-center gap-2 group cursor-pointer"
            >
              <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-800 shadow-sm group-hover:bg-amber-50 group-hover:text-amber-500 transition-colors group-active:scale-95">
                <Star className="w-6 h-6" />
              </div>
              <span className="text-[12px] font-bold text-slate-600">Asosiy qilish</span>
            </button>
            
            <button 
              onClick={() => {
                window.dispatchEvent(new CustomEvent('global-toast', { detail: { message: "Karta yashirildi (faqat sizga ko'rinmaydi)", type: 'success' } }));
              }}
              className="flex flex-col items-center gap-2 group cursor-pointer"
            >
              <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-800 shadow-sm group-hover:bg-slate-200 transition-colors group-active:scale-95">
                <EyeOff className="w-6 h-6" />
              </div>
              <span className="text-[12px] font-bold text-slate-600">Yashirish</span>
            </button>
            
            <button 
              onClick={() => {
                setConfirmModal({ isOpen: true, type: 'freeze', cardId: primaryCard.id, isActive: primaryCard.isActive });
              }}
              className="flex flex-col items-center gap-2 group cursor-pointer"
              disabled={updateCardMutation.isPending}
            >
              <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-sm transition-colors group-active:scale-95 ${
                primaryCard.isActive === false 
                  ? 'bg-blue-100 text-blue-600 group-hover:bg-blue-200' 
                  : 'bg-slate-100 text-slate-800 group-hover:bg-slate-200'
              }`}>
                <Snowflake className={`w-6 h-6 ${primaryCard.isActive === false ? 'animate-pulse' : ''}`} />
              </div>
              <span className={`text-[12px] font-bold ${primaryCard.isActive === false ? 'text-blue-600' : 'text-slate-600'}`}>
                {primaryCard.isActive === false ? 'Faollashtirish' : 'Muzlatish'}
              </span>
            </button>
            
            <button 
              onClick={() => {
                setConfirmModal({ isOpen: true, type: 'delete', cardId: primaryCard.id });
              }}
              disabled={deleteCardMutation.isPending}
              className="flex flex-col items-center gap-2 group cursor-pointer"
            >
              <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center text-red-600 shadow-sm group-hover:bg-red-100 transition-colors group-active:scale-95">
                <Trash2 className="w-6 h-6" />
              </div>
              <span className="text-[12px] font-bold text-red-600">O'chirish</span>
            </button>
          </div>
        )}
        
        {/* Other Cards List */}
        {otherCards.length > 0 && (
          <div className="pt-4 space-y-4">
            <h2 className="font-semibold text-[16px] text-slate-800 px-1">Boshqa kartalar</h2>
            <div className="space-y-3">
              {otherCards.map((card: any) => {
                const bankName = card.bankName || getBankName(card.cardNumber || card.last4);
                
                return (
                  <div key={card.id} onClick={() => setSelectedCardId(card.id)} className="flex items-center justify-between p-4 bg-white rounded-xl shadow-[0px_2px_8px_rgba(0,0,0,0.04)] border border-slate-100 active:scale-[0.98] transition-transform cursor-pointer hover:border-brand-primary/30">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-8 bg-slate-100 flex items-center justify-center rounded border border-slate-200 text-[10px] font-bold ${card.cardType === 'VISA' ? 'text-blue-800 italic' : 'text-slate-600'}`}>
                        {card.cardType || bankName.substring(0, 4) || 'CARD'}
                      </div>
                      <div>
                        <p className="text-[14px] font-medium text-slate-800">{bankName || 'Karta'}</p>
                        <p className="text-[12px] text-slate-500 font-mono">**** {card.last4}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[16px] text-brand-primary font-semibold">
                        {card.balance ? card.balance.toLocaleString() : '0'} UZS
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Security Notice */}
        <div className="mt-8 mb-6 p-4 bg-slate-50 rounded-xl flex items-start gap-3 border border-slate-200/60">
          <div className="mt-0.5 text-blue-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <p className="text-[14px] text-slate-600">
            <strong className="text-slate-800">Xavfsizlik kafolati</strong> - Barcha tranzaksiyalar PCI DSS standarti asosida shifrlangan.
          </p>
        </div>
      </main>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmModal.isOpen && confirmModal.cardId && (
          <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-[4px]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-sm rounded-[24px] shadow-2xl overflow-hidden flex flex-col z-10"
            >
              <div className="p-6 text-center">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${confirmModal.type === 'delete' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                  {confirmModal.type === 'delete' ? <Trash2 size={32} /> : <Snowflake size={32} />}
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">
                  {confirmModal.type === 'delete' 
                    ? "Kartani o'chirish" 
                    : (confirmModal.isActive === false ? "Kartani faollashtirish" : "Kartani muzlatish")}
                </h3>
                <p className="text-slate-500 mb-6">
                  {confirmModal.type === 'delete' 
                    ? "Rostdan ham ushbu kartani o'chirib tashlamoqchimisiz? Bu amalni ortga qaytarib bo'lmaydi." 
                    : (confirmModal.isActive === false ? "Karta qayta faollashtirilsinmi?" : "Karta vaqtincha muzlatib qo'yilsinmi?")}
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                    className="flex-1 py-3 rounded-xl font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all"
                  >
                    Bekor qilish
                  </button>
                  <button 
                    onClick={() => {
                      if (confirmModal.type === 'delete') {
                        deleteCardMutation.mutate(confirmModal.cardId!);
                      } else {
                        updateCardMutation.mutate({ id: confirmModal.cardId!, data: { isActive: confirmModal.isActive === false ? true : false } });
                      }
                      setConfirmModal({ ...confirmModal, isOpen: false });
                    }}
                    className={`flex-1 py-3 rounded-xl font-semibold text-white active:scale-95 transition-all shadow-lg ${
                      confirmModal.type === 'delete' 
                        ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20' 
                        : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
                    }`}
                  >
                    Tasdiqlash
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
