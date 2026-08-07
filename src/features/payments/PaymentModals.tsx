import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, PlusCircle, Wallet, CreditCard, CheckCircle2, AlertCircle, Trash2, Star, ChevronDown } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';

export type PaymentModalType = 'deposit' | 'withdraw' | 'addCard' | 'myCards' | null;

interface PaymentModalsProps {
  isOpen: boolean;
  onClose: () => void;
  type: PaymentModalType;
  currentBalance: number;
  savedCards: any[];
}

export const PaymentModals: React.FC<PaymentModalsProps> = ({ isOpen, onClose, type, currentBalance, savedCards }) => {
  const { language } = useApp();
  const [amount, setAmount] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const navigate = useNavigate();
  const [selectedCardId, setSelectedCardId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Set default selected card
  useEffect(() => {
    if (isOpen && savedCards.length > 0 && !selectedCardId) {
      const defaultCard = savedCards.find(c => c.isDefault) || savedCards[0];
      setSelectedCardId(defaultCard.id);
    }
  }, [isOpen, savedCards, selectedCardId]);

  const formatMoney = (val: number | string) => {
    return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    const formatted = val.replace(/(\d{4})/g, '$1 ').trim();
    setCardNumber(formatted.slice(0, 19)); // 16 digits + 3 spaces
  };

  const handleCardExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length >= 2) {
      val = val.slice(0, 2) + '/' + val.slice(2, 4);
    }
    setCardExpiry(val.slice(0, 5));
  };

  const t = {
    deposit: language === 'uz' ? "Hisobni to'ldirish" : language === 'ru' ? 'Пополнить счет' : 'Deposit',
    withdraw: language === 'uz' ? 'Yechib olish' : language === 'ru' ? 'Снять деньги' : 'Withdraw',
    addCard: language === 'uz' ? "Karta qo'shish" : language === 'ru' ? 'Добавить карту' : 'Add Card',
    myCards: language === 'uz' ? 'Mening kartalarim' : language === 'ru' ? 'Мои карты' : 'My Cards',
    amount: language === 'uz' ? 'Summa' : language === 'ru' ? 'Сумма' : 'Amount',
    cardNumber: language === 'uz' ? 'Karta raqami' : language === 'ru' ? 'Номер карты' : 'Card Number',
    expiry: language === 'uz' ? 'Amal qilish muddati (OO/YY)' : language === 'ru' ? 'Срок действия' : 'Expiry (MM/YY)',
    submit: language === 'uz' ? 'Tasdiqlash' : language === 'ru' ? 'Подтвердить' : 'Submit',
    payBtn: language === 'uz' ? "To'lovga o'tish" : language === 'ru' ? 'Оплатить' : 'Pay',
    withdrawBtn: language === 'uz' ? 'Summani yechish' : language === 'ru' ? 'Снять сумму' : 'Withdraw Amount',
    saveCardBtn: language === 'uz' ? 'Kartani saqlash' : language === 'ru' ? 'Сохранить карту' : 'Save Card',
    successTitle: language === 'uz' ? 'Muvaffaqiyatli!' : language === 'ru' ? 'Успешно!' : 'Success!',
    successDesc: language === 'uz' ? 'Amaliyot muvaffaqiyatli bajarildi.' : language === 'ru' ? 'Операция прошла успешно.' : 'Operation completed successfully.',
    close: language === 'uz' ? 'Yopish' : language === 'ru' ? 'Закрыть' : 'Close',
    noCards: language === 'uz' ? "Hali karta qo'shilmagan. To'lovlarni osonlashtirish uchun karta qo'shing." : language === 'ru' ? 'Карты еще не добавлены. Добавьте карту для удобных платежей.' : 'No cards added yet. Add a card to make payments easier.',
    insufficientFunds: language === 'uz' ? 'Mablag\' yetarli emas' : language === 'ru' ? 'Недостаточно средств' : 'Insufficient funds',
    selectCard: language === 'uz' ? 'Kartani tanlang' : language === 'ru' ? 'Выберите карту' : 'Select Card',
    makeDefault: language === 'uz' ? 'Asosiy qilish' : language === 'ru' ? 'Сделать основной' : 'Make Default',
    delete: language === 'uz' ? 'O\'chirish' : language === 'ru' ? 'Удалить' : 'Delete',
    addNewCardBtn: language === 'uz' ? 'Yangi karta qo\'shish' : language === 'ru' ? 'Добавить новую карту' : 'Add New Card',
  };

  const presetAmounts = [50000, 100000, 200000];

  const getCardType = (number: string) => {
    const clean = number.replace(/\s/g, '');
    if (clean.startsWith('8600')) return 'Uzcard';
    if (clean.startsWith('9860')) return 'Humo';
    if (clean.startsWith('4')) return 'Visa';
    if (clean.startsWith('5')) return 'Mastercard';
    return null;
  };

  const cardType = getCardType(cardNumber);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
    }, 1500);
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setAmount('');
      setCardNumber('');
      setCardExpiry('');
      setSuccess(false);
    }, 300);
  };

  const renderIcon = () => {
    switch (type) {
      case 'deposit': return <PlusCircle size={24} className="text-emerald-600" />;
      case 'withdraw': return <Wallet size={24} className="text-brand-primary" />;
      case 'addCard': return <CreditCard size={24} className="text-brand-primary" />;
      case 'myCards': return <CreditCard size={24} className="text-blue-600" />;
      default: return null;
    }
  };

  const renderTitle = () => {
    switch (type) {
      case 'deposit': return t.deposit;
      case 'withdraw': return t.withdraw;
      case 'addCard': return t.addCard;
      case 'myCards': return t.myCards;
      default: return '';
    }
  };
  
  const isWithdrawError = type === 'withdraw' && Number(amount) > currentBalance;
  const isDepositWithdrawDisabled = loading || !amount || Number(amount) <= 0 || isWithdrawError || savedCards.length === 0 || !selectedCardId;
  const isAddCardDisabled = loading || cardNumber.length < 19 || cardExpiry.length < 5;

  return (
    <AnimatePresence>
      {isOpen && type && (
        <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-[4px]"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative bg-white w-full max-w-md rounded-[24px] shadow-2xl border border-slate-100/50 overflow-hidden flex flex-col max-h-[90vh] z-10"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0">
              <h3 className="font-display text-xl font-bold text-slate-800 flex items-center gap-3">
                <div className="p-2 bg-slate-50 rounded-xl">
                  {renderIcon()}
                </div>
                <span>{renderTitle()}</span>
              </h3>
              <button
                onClick={handleClose}
                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600 active:scale-95"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 hide-scrollbar">
              {success ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-8 text-center space-y-4"
                >
                  <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 size={40} className="text-emerald-600" />
                  </div>
                  <h4 className="text-2xl font-display font-bold text-slate-800">{t.successTitle}</h4>
                  <p className="text-slate-500 text-lg">{t.successDesc}</p>
                  <button
                    onClick={handleClose}
                    className="w-full mt-8 bg-slate-100 text-slate-700 font-bold py-4 rounded-xl hover:bg-slate-200 active:scale-95 transition-all text-lg"
                  >
                    {t.close}
                  </button>
                </motion.div>
              ) : (
                <>
                  {(type === 'deposit' || type === 'withdraw') && (
                    <form onSubmit={handleSubmit} className="space-y-6">
                      {type === 'withdraw' && (
                        <div className="p-5 bg-slate-50/80 rounded-2xl border border-slate-200/60 flex flex-col gap-1">
                          <p className="text-slate-500 text-sm font-medium">Joriy balans</p>
                          <p className="text-3xl font-display font-bold text-slate-800 tracking-tight">
                            {formatMoney(currentBalance)} <span className="text-xl text-slate-400 font-medium">UZS</span>
                          </p>
                        </div>
                      )}
                      
                      {/* Card Selection */}
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">{t.selectCard}</label>
                        {savedCards.length > 0 ? (
                          <div className="relative">
                            <select
                              value={selectedCardId}
                              onChange={(e) => setSelectedCardId(e.target.value)}
                              className="w-full p-4 pr-12 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all appearance-none font-medium text-slate-800 cursor-pointer hover:border-slate-300"
                            >
                              {savedCards.map(card => (
                                <option key={card.id} value={card.id}>
                                  {card.bankName || 'Karta'} (**** {card.last4})
                                </option>
                              ))}
                            </select>
                            <ChevronDown size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                          </div>
                        ) : (
                          <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl text-orange-700 text-sm font-medium flex items-start gap-3">
                            <AlertCircle size={18} className="shrink-0 mt-0.5" />
                            <p>{t.noCards}</p>
                          </div>
                        )}
                      </div>

                      {type === 'deposit' && (
                        <div className="space-y-3">
                          <label className="text-sm font-semibold text-slate-700">Tezkor summa</label>
                          <div className="grid grid-cols-3 gap-2">
                            {presetAmounts.map(val => (
                              <button
                                key={val}
                                type="button"
                                onClick={() => setAmount(val.toString())}
                                className={`py-2 rounded-lg font-bold text-sm transition-all border ${
                                  amount === val.toString()
                                  ? 'bg-brand-primary text-white border-brand-primary'
                                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200'
                                }`}
                              >
                                {val / 1000}k
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">{t.amount}</label>
                        <div className="relative group">
                          <input
                            type="text"
                            inputMode="numeric"
                            required
                            value={amount}
                            onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
                            placeholder="0"
                            className={`w-full p-4 pr-16 bg-white border rounded-xl outline-none transition-all text-xl font-bold
                              ${isWithdrawError 
                                ? 'border-red-300 focus:ring-4 focus:ring-red-100 focus:border-red-500 text-red-600' 
                                : 'border-slate-200 hover:border-slate-300 focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary text-slate-800'
                              }
                            `}
                          />
                          <span className={`absolute right-4 top-1/2 -translate-y-1/2 font-medium ${isWithdrawError ? 'text-red-400' : 'text-slate-400'}`}>UZS</span>
                        </div>
                        {isWithdrawError && (
                          <motion.p 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="text-sm text-red-500 font-medium flex items-center gap-1.5 mt-2"
                          >
                            <AlertCircle size={14} /> {t.insufficientFunds}
                          </motion.p>
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={isDepositWithdrawDisabled}
                        className="w-full bg-brand-primary text-white font-bold text-lg py-4 rounded-xl shadow-lg shadow-brand-primary/20 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:active:scale-100 flex justify-center items-center min-h-[60px] disabled:shadow-none hover:bg-brand-primary/90"
                      >
                        {loading ? (
                          <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (type === 'deposit' ? t.payBtn : t.withdrawBtn)}
                      </button>
                    </form>
                  )}

                  {type === 'addCard' && (
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">{t.cardNumber}</label>
                        <div className="relative">
                          <input
                            type="text"
                            inputMode="numeric"
                            required
                            value={cardNumber}
                            onChange={handleCardNumberChange}
                            placeholder="8600 0000 0000 0000"
                            className="w-full p-4 pl-12 bg-white border border-slate-200 hover:border-slate-300 rounded-xl focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all font-mono text-lg tracking-wider text-slate-800"
                          />
                          {cardType ? (
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-xs text-brand-primary bg-brand-primary/10 px-1 py-0.5 rounded uppercase">{cardType}</span>
                          ) : (
                            <CreditCard size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">{t.expiry}</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          required
                          value={cardExpiry}
                          onChange={handleCardExpiryChange}
                          placeholder="MM/YY"
                          className="w-full p-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all font-mono text-lg text-slate-800"
                        />
                      </div>

                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={isAddCardDisabled}
                          className="w-full bg-brand-primary text-white font-bold text-lg py-4 rounded-xl shadow-lg shadow-brand-primary/20 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:active:scale-100 flex justify-center items-center min-h-[60px] disabled:shadow-none hover:bg-brand-primary/90"
                        >
                          {loading ? (
                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : t.saveCardBtn}
                        </button>
                      </div>
                    </form>
                  )}

                  {type === 'myCards' && (
                    <div className="space-y-4">
                      {savedCards.length > 0 ? (
                        <>
                          <div className="space-y-3">
                            {savedCards.map(card => (
                              <div key={card.id} className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden">
                                {card.isDefault && (
                                  <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-bl-full -z-0" />
                                )}
                                <div className="flex items-center justify-between relative z-10">
                                  <div className="flex items-center gap-4">
                                    <div className={`w-14 h-10 rounded-lg flex items-center justify-center shrink-0 ${card.isDefault ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                                      <CreditCard size={24} />
                                    </div>
                                    <div>
                                      <p className="font-semibold text-slate-800 text-lg tracking-wide">**** {card.last4}</p>
                                      <p className="text-sm text-slate-500 flex items-center gap-2">
                                        {card.bankName || 'Karta'}
                                        {card.isDefault && (
                                          <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                                            <Star size={10} className="fill-emerald-700" /> Asosiy
                                          </span>
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {!card.isDefault && (
                                      <button className="p-2 text-slate-400 hover:text-emerald-600 bg-slate-50 hover:bg-emerald-50 rounded-lg transition-colors" title={t.makeDefault}>
                                        <Star size={18} />
                                      </button>
                                    )}
                                    <button className="p-2 text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-red-50 rounded-lg transition-colors" title={t.delete}>
                                      <Trash2 size={18} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="py-16 px-6 text-center">
                          <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CreditCard size={48} className="text-slate-300" />
                          </div>
                          <p className="text-lg text-slate-500 mb-6 font-medium">{t.noCards}</p>
                        </div>
                      )}
                      
                      <button
                        onClick={() => {
                          onClose();
                          navigate('/payments/add-card');
                        }}
                        className="w-full mt-4 border-2 border-dashed border-slate-200 text-slate-600 hover:text-brand-primary hover:border-brand-primary hover:bg-brand-primary/5 font-bold py-4 rounded-2xl active:scale-[0.98] transition-all flex justify-center items-center gap-2"
                      >
                        <PlusCircle size={20} />
                        {t.addNewCardBtn}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
