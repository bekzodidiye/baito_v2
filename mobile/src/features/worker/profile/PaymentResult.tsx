import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle2, XCircle, ArrowLeft } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { translations } from '../../../translations';

export const PaymentResult: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useApp();
  const t = translations[language];
  
  const isSuccess = location.pathname.includes('success');

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 flex flex-col items-center text-center w-full max-w-sm">
        
        {isSuccess ? (
          <div className="w-20 h-20 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 size={40} className="stroke-[2.5]" />
          </div>
        ) : (
          <div className="w-20 h-20 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-6">
            <XCircle size={40} className="stroke-[2.5]" />
          </div>
        )}

        <h1 className="font-display font-black text-2xl text-slate-800 mb-2">
          {isSuccess 
            ? (language === 'uz' ? 'To\'lov muvaffaqiyatli!' : 'Оплата прошла успешно!')
            : (language === 'uz' ? 'To\'lovda xatolik' : 'Ошибка при оплате')
          }
        </h1>
        
        <p className="text-sm text-slate-500 font-medium mb-8">
          {isSuccess 
            ? (language === 'uz' ? 'Hisobingiz muvaffaqiyatli to\'ldirildi.' : 'Ваш счет успешно пополнен.')
            : (language === 'uz' ? 'To\'lov amalga oshmadi. Iltimos, qaytadan urinib ko\'ring.' : 'Оплата не удалась. Пожалуйста, попробуйте еще раз.')
          }
        </p>

        <button 
          onClick={() => navigate('/payments')}
          className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
        >
          <ArrowLeft size={18} />
          {language === 'uz' ? 'Orqaga qaytish' : 'Вернуться назад'}
        </button>
      </div>
    </div>
  );
};

export default PaymentResult;
