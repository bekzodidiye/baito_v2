import React, { useState } from 'react';
import { ArrowLeft, HelpCircle, PlusCircle, Lock, Wifi } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addPaymentCardApi } from '../../api/queries';
import { getBankName, getBankColors } from '../../utils/cardUtils';

export const AddCardScreen: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const addCardMutation = useMutation({
    mutationFn: addPaymentCardApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentCards'] });
      window.dispatchEvent(new CustomEvent('global-toast', { detail: { message: "Karta muvaffaqiyatli qo'shildi!", type: 'success' } }));
      navigate('/payments');
    },
    onError: () => {
      window.dispatchEvent(new CustomEvent('global-toast', { detail: { message: "Karta qo'shishda xatolik yuz berdi", type: 'error' } }));
    }
  });
  
  const [cardNumber, setCardNumber] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [isDefault, setIsDefault] = useState(true);
  const [isAgreedToTerms, setIsAgreedToTerms] = useState(false);

  const getCardStyle = () => {
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

    if (bankName && bankName !== 'Bank nomi' && bankName !== 'O\'zbekiston Banki' && bankName !== 'Visa Card' && bankName !== 'Mastercard') {
      return getBankColors(bankName, defaultColors);
    }
    
    return defaultColors;
  };

  const cardStyle = getCardStyle();

  const getCardLogo = () => {
    const cleanNum = cardNumber.replace(/\s/g, '');
    if (cleanNum.startsWith('8600')) {
      return (
        <div className="flex items-center font-bold text-xl tracking-tighter drop-shadow-sm">
          <div className="bg-white text-[#046c4e] px-1 rounded-[3px] text-[12px] leading-none py-[3px] mr-0.5">UZ</div>CARD
        </div>
      );
    }
    if (cleanNum.startsWith('9860')) {
      return (
        <div className="flex items-center font-black text-2xl tracking-tighter lowercase drop-shadow-sm">
          humo
        </div>
      );
    }
    if (cleanNum.startsWith('4')) {
      return (
        <div className="text-3xl font-black italic tracking-tighter drop-shadow-sm">
          VISA
        </div>
      );
    }
    if (cleanNum.startsWith('5')) {
      return (
        <svg width="44" height="26" viewBox="0 0 40 24" fill="none" className="drop-shadow-sm">
          <circle cx="12" cy="12" r="12" fill="#EB001B"/>
          <circle cx="28" cy="12" r="12" fill="#F79E1B"/>
          <path d="M20 20.3C18 18.5 16.8 15.6 16.8 12c0-3.6 1.2-6.5 3.2-8.3 2 1.8 3.2 4.7 3.2 8.3 0 3.6-1.2 6.5-3.2 8.3z" fill="#FF5F00"/>
        </svg>
      );
    }
    return null;
  };
  
  const handleBack = () => {
    navigate('/payments');
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    let formattedValue = '';
    for (let i = 0; i < value.length; i++) {
      if (i > 0 && i % 4 === 0) formattedValue += ' ';
      formattedValue += value[i];
    }
    setCardNumber(formattedValue);
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 2) {
      value = value.substring(0, 2) + '/' + value.substring(2, 4);
    }
    setExpiryDate(value);
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCvv(e.target.value.replace(/\D/g, '').substring(0, 3));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cardNumber.replace(/\s/g, '').length >= 16 && expiryDate.length === 5) {
      addCardMutation.mutate({
        type: 'debit',
        last4: cardNumber.replace(/\s/g, '').slice(-4),
        bank: cardNumber.startsWith('8600') ? 'Uzcard' : cardNumber.startsWith('9860') ? 'Humo' : 'Visa/Mastercard'
      });
    }
  };

  const isSubmitDisabled = cardNumber.replace(/\s/g, '').length < 16 || expiryDate.length < 5 || cvv.length < 3 || cardholderName.trim().length === 0 || !isAgreedToTerms || addCardMutation.isPending;

  return (
    <div className="bg-brand-background text-brand-text antialiased min-h-[max(884px,100dvh)] flex flex-col mesh-bg">
      {/* Top App Bar */}
      <header className="bg-white/90 w-full top-0 sticky backdrop-blur-md shadow-[0px_4px_20px_rgba(26,35,126,0.04)] flex items-center justify-between px-6 h-[80px] z-50">
        <button
          onClick={handleBack}
          className="text-slate-900 hover:bg-slate-100 transition-colors active:scale-95 duration-200 p-2 rounded-full flex items-center justify-center"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="font-bold text-xl text-slate-900">Yangi karta qo'shish</h1>
        <div className="w-10"></div> {/* Spacer for centering */}
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-8 pb-32">
        {/* Visual Credit Card Preview */}
        <section className={`glass-card rounded-xl p-6 flex flex-col justify-between aspect-[1.586/1] relative overflow-hidden transition-all duration-500 transform hover:scale-[1.02] ${cardStyle.bg}`}>
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-brand-primary-container/20 rounded-full blur-2xl -ml-12 -mb-12 pointer-events-none"></div>

          {/* Top Row: Bank name & Card type */}
          <div className="flex justify-between items-start z-10">
            <span className={`font-extrabold text-sm tracking-widest uppercase opacity-90 drop-shadow-sm ${cardStyle.text}`}>
              {getBankName(cardNumber)}
            </span>
            <span className={cardStyle.text}>
              {getCardLogo()}
            </span>
          </div>

          {/* Middle Row: EMV Chip and Contactless */}
          <div className="flex flex-col gap-3 z-10 mt-6">
            <div className="flex items-center gap-3">
              {/* EMV Chip */}
              <svg className="w-11 h-9 opacity-90 drop-shadow-sm" viewBox="0 0 48 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="48" height="36" rx="6" fill="url(#chip-gradient)"/>
                <path d="M0 12h14v12H0zM34 12h14v12H34z" fill="#000" fillOpacity=".1"/>
                <path d="M14 0v36M34 0v36M0 18h48" stroke="#000" strokeOpacity=".2" strokeWidth="1.5"/>
                <rect x="14" y="10" width="20" height="16" rx="2" stroke="#000" strokeOpacity=".2" strokeWidth="1.5" fill="none"/>
                <defs>
                  <linearGradient id="chip-gradient" x1="0" y1="0" x2="48" y2="36" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#FDE68A"/>
                    <stop offset="1" stopColor="#D97706"/>
                  </linearGradient>
                </defs>
              </svg>
              {/* Contactless Icon */}
              <Wifi className={`w-6 h-6 rotate-90 ${cardStyle.icon}`} />
            </div>

            {/* Card Number */}
            <div className={`text-[22px] font-bold tracking-[0.15em] font-mono drop-shadow-sm ${cardStyle.text}`}>
              {cardNumber || '**** **** **** ****'}
            </div>
          </div>

          {/* Bottom Row */}
          <div className="flex justify-between items-end z-10 mt-auto">
            <div>
              <div className={`text-[9px] font-semibold mb-[2px] uppercase tracking-widest ${cardStyle.textMuted}`}>Karta egasi</div>
              <div className={`font-bold text-sm uppercase tracking-widest truncate max-w-[150px] drop-shadow-sm ${cardStyle.text}`}>{cardholderName || 'ISM SHARIF'}</div>
            </div>
            <div className="text-right">
              <div className={`text-[9px] font-semibold mb-[2px] uppercase tracking-widest ${cardStyle.textMuted}`}>Muddati</div>
              <div className={`font-bold text-sm tracking-widest drop-shadow-sm ${cardStyle.text}`}>{expiryDate || 'MM/YY'}</div>
            </div>
          </div>
        </section>

        {/* Input Form */}
        <section className="flex flex-col gap-5 bg-white p-6 rounded-xl shadow-[0px_4px_20px_rgba(26,35,126,0.02)] border border-slate-100">
          <form id="add-card-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Card Number */}
            <div className="flex flex-col gap-2">
              <label className="font-semibold text-sm text-slate-600" htmlFor="cardNumber">Karta raqami</label>
              <div className="relative flex items-center">
                <div className="absolute left-4 z-10 flex items-center justify-center w-6 h-6 bg-slate-200 rounded border border-slate-300">
                  <span className="w-4 h-1 bg-slate-400 rounded-full" />
                </div>
                <input 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-3 pl-12 pr-4 font-mono text-lg text-slate-800 placeholder:text-slate-400 focus:outline-none transition-all duration-200 input-glow" 
                  id="cardNumber" 
                  maxLength={19} 
                  inputMode="numeric"
                  placeholder="0000 0000 0000 0000" 
                  type="text"
                  value={cardNumber}
                  onChange={handleCardNumberChange}
                />
              </div>
            </div>

            {/* Expiry & CVV */}
            <div className="flex gap-4">
              <div className="flex flex-col gap-2 flex-1">
                <label className="font-semibold text-sm text-slate-600" htmlFor="expiryDate">Muddati</label>
                <input 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-3 px-4 font-mono text-lg text-slate-800 placeholder:text-slate-400 focus:outline-none transition-all duration-200 input-glow text-center" 
                  id="expiryDate" 
                  maxLength={5} 
                  inputMode="numeric"
                  placeholder="OO/YY" 
                  type="text"
                  value={expiryDate}
                  onChange={handleExpiryChange}
                />
              </div>
              
              <div className="flex flex-col gap-2 flex-1 relative">
                <label className="font-semibold text-sm text-slate-600 flex justify-between items-center" htmlFor="cvv">
                  CVV
                  <div title="Karta orqasidagi 3 xonali raqam">
                    <HelpCircle size={16} className="text-slate-400 cursor-help" />
                  </div>
                </label>
                <div className="relative">
                  <input 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-3 px-4 font-mono text-lg text-slate-800 placeholder:text-slate-400 focus:outline-none transition-all duration-200 input-glow text-center tracking-[0.2em]" 
                    id="cvv" 
                    maxLength={3} 
                    inputMode="numeric"
                    placeholder="***" 
                    type="password"
                    value={cvv}
                    onChange={handleCvvChange}
                  />
                </div>
              </div>
            </div>

            {/* Cardholder Name */}
            <div className="flex flex-col gap-2">
              <label className="font-semibold text-sm text-slate-600" htmlFor="cardholderName">Karta egasi (Ism sharif)</label>
              <input
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-3 px-4 text-slate-800 placeholder:text-slate-400 focus:outline-none transition-all duration-200 input-glow uppercase"
                id="cardholderName"
                placeholder="JOHN DOE"
                type="text"
                value={cardholderName}
                onChange={(e) => setCardholderName(e.target.value.toUpperCase())}
              />
            </div>

            {/* Save Card Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="font-semibold text-slate-800">Kartani saqlash</span>
                <span className="text-xs text-slate-500">Kelgusi to'lovlar uchun qulay</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer mr-2">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)} 
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary"></div>
              </label>
            </div>

            {/* Terms and conditions */}
            <div className="flex items-start gap-3 mt-2">
              <div className="flex items-center h-5">
                <input
                  id="terms"
                  type="checkbox"
                  checked={isAgreedToTerms}
                  onChange={(e) => setIsAgreedToTerms(e.target.checked)}
                  className="w-5 h-5 bg-white border-slate-300 rounded text-brand-primary focus:ring-brand-primary cursor-pointer transition-all"
                />
              </div>
              <div className="flex flex-col">
                <label htmlFor="terms" className="text-sm font-medium text-slate-700 cursor-pointer">
                  Karta saqlash <span className="text-brand-primary underline">qoidalariga</span> roziman
                </label>
                <p className="text-xs text-slate-500 mt-1">
                  Karta ma'lumotlari xavfsiz saqlanadi va uchinchi shaxslarga berilmaydi.
                </p>
              </div>
            </div>
            
          </form>
        </section>

        {/* Security Notice */}
        <div className="flex items-center gap-3 px-2 justify-center text-slate-500 bg-slate-50 p-4 rounded-lg border border-slate-100">
          <Lock size={20} className="text-[#4858ab] shrink-0" />
          <p className="text-xs leading-snug">
            Barcha to'lov ma'lumotlari xavfsiz shifrlangan. Biz sizning CVV kodingizni saqlamaymiz.
          </p>
        </div>
      </main>

      {/* Fixed Bottom Action */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 shadow-[0px_-8px_24px_rgba(0,0,0,0.05)] p-4 pb-safe z-40 backdrop-blur-xl bg-opacity-90">
        <button 
          type="submit"
          form="add-card-form"
          disabled={isSubmitDisabled}
          className="w-full bg-[#010766] text-white font-bold text-lg py-4 rounded-xl shadow-lg shadow-[#010766]/20 hover:scale-[1.02] active:scale-95 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:scale-100 disabled:active:scale-100"
        >
          {addCardMutation.isPending ? (
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <PlusCircle size={24} />
              Kartani bog'lash
            </>
          )}
        </button>
      </div>
    </div>
  );
};
