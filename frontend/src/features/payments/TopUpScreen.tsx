import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Lock, ShieldCheck, Plus, CreditCard } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useApp } from '../../context/AppContext';
import { useQuery } from '@tanstack/react-query';
import { fetchPaymentCardsApi } from '../../api/queries';
import { getBankName } from '../../utils/cardUtils';

export const TopUpScreen: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useApp();
  const user = useAuthStore((state) => state.userProfile);

  const [amount, setAmount] = useState<number | string>(500000);
  const [paymentMethod, setPaymentMethod] = useState<string>('');

  const { data: savedCards = [] } = useQuery({
    queryKey: ['paymentCards'],
    queryFn: fetchPaymentCardsApi,
  });

  useEffect(() => {
    if (savedCards.length > 0 && !paymentMethod) {
      const primary = savedCards.find((c: any) => c.isDefault) || savedCards[0];
      setPaymentMethod(primary.id);
    }
  }, [savedCards, paymentMethod]);

  const currentBalance = user?.balance || 0;

  const handleBack = () => {
    navigate(-1);
  };

  const handleAmountSelect = (val: number) => {
    setAmount(val);
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/,/g, '').replace(/\D/g, '');
    if (rawValue) {
      setAmount(Number(rawValue));
    } else {
      setAmount('');
    }
  };

  const handleCustomAmountFocus = () => {
    // Optionally clear predefined selection, but since custom input is always synced to state, it's fine.
  };

  const formatMoney = (val: number | string) => {
    if (!val) return '0';
    return Number(val).toLocaleString('en-US');
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleProceed = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    // Navigate to success or trigger payment API
    navigate('/payments/success');
  };

  return (
    <div className="bg-brand-background text-on-background font-sans antialiased min-h-screen flex flex-col md:hidden">
      {/* TopAppBar */}
      <header className="fixed top-0 left-0 w-full z-50 flex items-center px-4 h-header-height bg-surface/80 backdrop-blur-md shadow-[0px_4px_20px_rgba(26,35,126,0.04)]">
        <button 
          onClick={handleBack}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-low transition-all duration-300 active:scale-95 text-slate-600 mr-3 cursor-pointer"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="font-title-lg text-[20px] text-brand-primary flex-1 font-bold">
          {language === 'uz' ? "Balansni to'ldirish" : language === 'ru' ? 'Пополнение баланса' : 'Top up balance'}
        </h1>
      </header>
      
      {/* Main Canvas */}
      <main className="flex-1 pt-[100px] pb-32 px-4 space-y-6 overflow-y-auto">
        {/* Current Balance Card */}
        <section className="bg-gradient-to-br from-[#010766] via-[#1a237e] to-[#4858ab] shadow-[0_20px_40px_rgba(1,7,102,0.15)] rounded-2xl p-6 text-white relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#4858ab]/20 rounded-full blur-xl -ml-6 -mb-6"></div>
          
          <div className="relative z-10">
            <p className="font-label-lg text-[12px] text-blue-200/80 uppercase tracking-wider mb-2 font-bold">
              {language === 'uz' ? 'Joriy balans' : language === 'ru' ? 'Текущий баланс' : 'Current Balance'}
            </p>
            <div className="flex items-end gap-2">
              <h2 className="font-display-lg text-[36px] font-extrabold tracking-tight">
                {formatMoney(currentBalance)}
              </h2>
              <span className="font-title-lg text-[20px] pb-1 text-white/90 font-bold">
                {language === 'uz' ? "so'm" : "UZS"}
              </span>
            </div>
          </div>
        </section>
        
        {/* Select Amount */}
        <section className="space-y-4">
          <h3 className="font-title-md text-[16px] text-slate-900 font-semibold">
            {language === 'uz' ? "To'lov summasini tanlang" : language === 'ru' ? 'Выберите сумму оплаты' : 'Select payment amount'}
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {[50000, 100000, 500000, 1000000].map((val) => (
              <button 
                key={val}
                onClick={() => handleAmountSelect(val)}
                className={`border rounded-xl py-3 text-center transition-all duration-200 active:scale-95 font-title-md text-[16px] font-semibold cursor-pointer ${
                  amount === val 
                    ? 'bg-black text-white border-black' 
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {formatMoney(val)}
              </button>
            ))}
            <button 
              onClick={handleCustomAmountFocus}
              className={`border rounded-xl py-3 text-center transition-all duration-200 active:scale-95 font-title-md text-[16px] font-semibold col-span-2 cursor-pointer ${
                ![50000, 100000, 500000, 1000000].includes(Number(amount)) && amount !== ''
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {language === 'uz' ? 'Boshqa summa' : language === 'ru' ? 'Другая сумма' : 'Other amount'}
            </button>
          </div>
          
          {/* Custom Amount Input */}
          <div className="relative mt-2">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <span className="text-slate-500 font-title-md text-[16px] font-semibold">UZS</span>
            </div>
            <input 
              id="customAmount" 
              type="text" 
              value={formatMoney(amount)}
              onChange={handleCustomAmountChange}
              onFocus={handleCustomAmountFocus}
              className="block w-full pl-14 pr-4 py-4 bg-slate-100 border border-transparent rounded-xl focus:border-brand-primary focus:bg-white focus:ring-0 font-title-lg text-[20px] font-bold text-slate-900 transition-colors" 
              placeholder="0"
            />
          </div>
        </section>
        
        {/* Payment Method */}
        <section className="space-y-4">
          <h3 className="font-title-md text-[16px] text-slate-900 font-semibold">
            {language === 'uz' ? "To'lov usuli" : language === 'ru' ? 'Способ оплаты' : 'Payment method'}
          </h3>
          <div className="space-y-3">
            {savedCards.length > 0 ? (
              savedCards.map((card: any) => {
                const bankName = card.bankName || getBankName(card.cardNumber || card.last4);
                const isSelected = paymentMethod === card.id;

                return (
                  <label key={card.id} className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                    isSelected 
                      ? 'border-black bg-slate-100' 
                      : 'border-transparent bg-slate-100 hover:bg-slate-200/50'
                  }`}>
                    <div className={`w-12 h-8 bg-white rounded flex items-center justify-center mr-4 shadow-sm border border-slate-200/50 ${card.cardType === 'VISA' ? 'text-blue-800 italic' : 'text-slate-600'}`}>
                      <span className="font-label-lg text-[10px] font-bold">{card.cardType || bankName.substring(0, 4) || 'CARD'}</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-title-md text-[16px] font-semibold text-slate-900">{bankName || 'Karta'}</p>
                      <p className="font-body-md text-[14px] text-slate-500 text-xs mt-0.5">**** {card.last4}</p>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      isSelected ? 'border-brand-primary' : 'border-slate-300'
                    }`}>
                      {isSelected && <div className="w-3 h-3 bg-brand-primary rounded-full"></div>}
                    </div>
                    <input 
                      type="radio" 
                      name="payment_method" 
                      value={card.id} 
                      checked={isSelected} 
                      onChange={() => setPaymentMethod(card.id)}
                      className="hidden" 
                    />
                  </label>
                );
              })
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-3">
                  <CreditCard className="text-slate-300 w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800 mb-1">
                  {language === 'uz' ? "Sizda saqlangan kartalar yo'q" : language === 'ru' ? "У вас нет сохраненных карт" : "You have no saved cards"}
                </h3>
              </div>
            )}

            <button 
              onClick={() => navigate('/payments/add-card')}
              className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-white rounded-xl border border-dashed border-slate-300 hover:bg-slate-50 hover:border-brand-primary transition-colors active:scale-[0.98] cursor-pointer mt-4"
            >
              <Plus className="text-brand-primary w-5 h-5" />
              <span className="font-title-md text-[16px] text-brand-primary font-semibold">
                {language === 'uz' ? "Yangi karta qo'shish" : language === 'ru' ? "Добавить новую карту" : "Add new card"}
              </span>
            </button>
          </div>
        </section>
        
        {/* Security Badges */}
        <section className="flex justify-center items-center gap-6 py-4 border-t border-slate-200/50">
          <div className="flex items-center gap-1.5 text-slate-500">
            <Lock size={16} />
            <span className="font-label-lg text-[10px] uppercase font-bold">Secure Payment</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-500">
            <ShieldCheck size={16} />
            <span className="font-label-lg text-[10px] uppercase font-bold">SSL Encrypted</span>
          </div>
        </section>
      </main>
      
      {/* Bottom Action Area */}
      <div className="fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-md p-4 pb-safe border-t border-slate-200/50 shadow-[0px_-8px_20px_rgba(0,0,0,0.03)] z-40">
        <button 
          onClick={handleProceed}
          disabled={isSubmitting || !amount || Number(amount) <= 0 || !paymentMethod}
          className="w-full bg-brand-primary text-white font-title-md text-[16px] font-semibold py-4 rounded-xl shadow-lg shadow-brand-primary/20 hover:scale-[1.02] active:scale-95 transition-all duration-300 flex justify-center items-center gap-2 cursor-pointer disabled:opacity-50 disabled:active:scale-100 disabled:hover:scale-100"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {language === 'uz' ? "Yuklanmoqda..." : language === 'ru' ? 'Загрузка...' : 'Loading...'}
            </span>
          ) : (
            <>
              {language === 'uz' ? "To'lovni amalga oshirish" : language === 'ru' ? 'Выполнить платеж' : 'Proceed to payment'}
              <ArrowRight size={20} />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
